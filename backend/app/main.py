from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from . import models, schemas, crud, database
from .database import engine
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from fastapi import APIRouter, Depends, HTTPException


models.Base.metadata.create_all(bind=engine)
# Konfiguracja JWT
SECRET_KEY = "tajny-klucz"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"], # Zezwala na GET, POST, itp.
    allow_headers=["*"], # Zezwala na wszystkie nagłówki (w tym tokeny)
)

# funkcja sprawdzająca i zwracająca aktualnie zalogowanego użytkownika
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nie można zweryfikować uprawnień",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.Uzytkownik).filter(models.Uzytkownik.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# funkcja weryfikująca czy zalogowany użytkownik posiada rolę kierownika lub administratora
def wymagaj_kierownika(current_user: models.Uzytkownik = Depends(get_current_user)):
    if current_user.rola not in (models.RolaUzytkownika.kierownik, models.RolaUzytkownika.administrator):
        raise HTTPException(status_code=403, detail="Brak uprawnień kierownika")
    return current_user

# endpoint generujący token dostępowy JWT podczas logowania użytkownika
@app.post("/token")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), # Swagger używa formularza
    db: Session = Depends(database.get_db)
):
    # Logujemy użytkownika (email to 'username' w formularzu Swaggera)
    user = crud.autentykacja_uzytkownika(
        db, 
        schemas.UzytkownikLogin(email=form_data.username, haslo=form_data.password)
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Błędny email lub hasło")
    
    token_data = {"sub": user.email, "rola": user.rola}
    encoded_jwt = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"access_token": encoded_jwt, "token_type": "bearer"}

# endpoint umożliwiający administratorowi utworzenie nowego konta użytkownika
@app.post("/admin/dodaj-pracownika", response_model=schemas.UzytkownikResponse)
def dodaj_pracownika(
    user_data: schemas.UzytkownikCreate, 
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
    
    return crud.utworz_uzytkownika(db=db, user=user_data)

# endpoint uruchamiający nową sesję rejestracji czasu pracy pracownika
@app.post("/czas/start", response_model=schemas.SesjaPracyResponse)
def rozpocznij_prace(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    aktywna = db.query(models.SesjaPracy).filter(
        models.SesjaPracy.uzytkownik_id == current_user.id,
        models.SesjaPracy.koniec_sesji == None
    ).first()
    
    if aktywna:
        raise HTTPException(status_code=400, detail="Sesja już trwa")
        
    return crud.start_sesji(db, current_user.id) 

# endpoint zatrzymujący trwającą sesję rejestracji czasu pracy pracownika
@app.post("/czas/stop", response_model=schemas.SesjaPracyResponse)
def zakoncz_prace(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    wynik = crud.stop_sesji(db, current_user.id)
    if not wynik:
        raise HTTPException(status_code=400, detail="Brak aktywnej sesji")
    return wynik

# endpoint zwracający administratorowi listę wszystkich zarejestrowanych użytkowników
@app.get("/admin/uzytkownicy", response_model=List[schemas.UzytkownikResponse])
def get_wszyscy_uzytkownicy(
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
    return crud.pobierz_wszystkich_uzytkownikow(db)

# endpoint zwracający zalogowanemu użytkownikowi historię jego własnych sesji pracy
@app.get("/czas/moje-sesje", response_model=List[schemas.SesjaPracyResponse])
def get_moje_sesje(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    return crud.pobierz_sesje_uzytkownika(db, uzytkownik_id=current_user.id)

# endpoint generujący pełne, szczegółowe podsumowanie finansowo-godzinowe dla zalogowanego użytkownika
@app.get("/czas/moje-podsumowanie", response_model=schemas.MojePodsumowanieResponse)
def get_moje_podsumowanie(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    dni, miesiace, aktywna = crud.oblicz_moje_podsumowanie(db, current_user)
    return schemas.MojePodsumowanieResponse(
        norma_godzinowa=current_user.norma_godzinowa,
        stawka_godzinowa=current_user.stawka_godzinowa,
        stawka_nadgodzinowa=current_user.stawka_nadgodzinowa,
        aktywna_sesja=aktywna,
        miesiace=[schemas.MiesiacZarobkowResponse(**m) for m in miesiace],
        dni=[schemas.DzienZSesjamiResponse(
            data=d["data"],
            sesje=[schemas.SesjaPracyInfo(**s) for s in d["sesje"]],
            godziny_przepracowane=d["godziny_przepracowane"],
            godziny_normalne=d["godziny_normalne"],
            godziny_nadgodzin=d["godziny_nadgodzin"],
            zarobek=d["zarobek"],
            zarobek_normalny=d["zarobek_normalny"],
            zarobek_nadgodzin=d["zarobek_nadgodzin"],
        ) for d in dni],
    )

# endpoint pobierający kierownikowi listę podległych mu pracowników z podstawowymi danymi płacowymi
@app.get("/kierownik/pracownicy", response_model=List[schemas.PracownikKierownikaResponse])
def get_pracownicy_kierownika(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(wymagaj_kierownika)
):
    pracownicy = crud.pobierz_pracownikow(db)
    wynik = []
    for pracownik in pracownicy:
        _, pensja = crud.oblicz_szczegoly_pracownika(db, pracownik)
        wynik.append(schemas.PracownikKierownikaResponse(
            id=pracownik.id,
            imie=pracownik.imie,
            nazwisko=pracownik.nazwisko,
            norma_godzinowa=pracownik.norma_godzinowa,
            stawka_godzinowa=pracownik.stawka_godzinowa,
            pensja_do_wyplaty=pensja,
        ))
    return wynik

# endpoint zwracający kierownikowi pełne podsumowanie dni pracy i zarobków konkretnego pracownika
@app.get("/kierownik/pracownicy/{pracownik_id}", response_model=schemas.SzczegolyPracownikaResponse)
def get_szczegoly_pracownika(
    pracownik_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(wymagaj_kierownika)
):
    pracownik = crud.pobierz_uzytkownika_po_id(db, pracownik_id)
    if not pracownik or pracownik.rola != models.RolaUzytkownika.pracownik:
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")
    dni, pensja = crud.oblicz_szczegoly_pracownika(db, pracownik)
    return schemas.SzczegolyPracownikaResponse(
        id=pracownik.id,
        imie=pracownik.imie,
        nazwisko=pracownik.nazwisko,
        norma_godzinowa=pracownik.norma_godzinowa,
        stawka_godzinowa=pracownik.stawka_godzinowa,
        stawka_nadgodzinowa=pracownik.stawka_nadgodzinowa,
        pensja_do_wyplaty=pensja,
        dni=[schemas.DzienPracyResponse(
            data=dzien["data"],
            godziny_przepracowane=dzien["godziny_przepracowane"],
            godziny_normalne=dzien["godziny_normalne"],
            godziny_nadgodzin=dzien["godziny_nadgodzin"],
            zarobek=dzien["zarobek"],
            zarobek_normalny=dzien["zarobek_normalny"],
            zarobek_nadgodzin=dzien["zarobek_nadgodzin"],
        ) for dzien in dni],
    )

# endpoint umożliwiający kierownikowi aktualizację norm i stawek finansowych pracownika
@app.put("/kierownik/pracownicy/{pracownik_id}/ustawienia", response_model=schemas.SzczegolyPracownikaResponse)
def aktualizuj_ustawienia_pracownika(
    pracownik_id: int,
    ustawienia: schemas.UstawieniaPlacowUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(wymagaj_kierownika)
):
    pracownik = crud.pobierz_uzytkownika_po_id(db, pracownik_id)
    if not pracownik or pracownik.rola != models.RolaUzytkownika.pracownik:
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")
    crud.aktualizuj_ustawienia_placow(db, pracownik_id, ustawienia)
    db.refresh(pracownik)
    dni, pensja = crud.oblicz_szczegoly_pracownika(db, pracownik)
    return schemas.SzczegolyPracownikaResponse(
        id=pracownik.id,
        imie=pracownik.imie,
        nazwisko=pracownik.nazwisko,
        norma_godzinowa=pracownik.norma_godzinowa,
        stawka_godzinowa=pracownik.stawka_godzinowa,
        stawka_nadgodzinowa=pracownik.stawka_nadgodzinowa,
        pensja_do_wyplaty=pensja,
        dni=[schemas.DzienPracyResponse(
            data=dzien["data"],
            godziny_przepracowane=dzien["godziny_przepracowane"],
            godziny_normalne=dzien["godziny_normalne"],
            godziny_nadgodzin=dzien["godziny_nadgodzin"],
            zarobek=dzien["zarobek"],
            zarobek_normalny=dzien["zarobek_normalny"],
            zarobek_nadgodzin=dzien["zarobek_nadgodzin"],
        ) for dzien in dni],
    )

# endpoint umożliwiający administratorowi aktywację lub blokowanie konta użytkownika
@app.put("/admin/uzytkownicy/{uzytkownik_id}/status", response_model=schemas.UzytkownikResponse)
def zmien_status_uzytkownika(
    uzytkownik_id: int, 
    status: schemas.StatusKontaUpdate, 
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
        
    zaktualizowany = crud.zmien_status_konta(db, uzytkownik_id, status.aktywny)
    if not zaktualizowany:
        raise HTTPException(status_code=404, detail="Nie znaleziono użytkownika")
    return zaktualizowany


# endpoint umożliwiający administratorowi ręczne dodanie pominiętej sesji pracy użytkownika
@app.post("/admin/uzytkownicy/{uzytkownik_id}/sesje", response_model=schemas.SesjaPracyResponse)
def dodaj_brakujaca_sesje(
    uzytkownik_id: int, 
    sesja: schemas.SesjaPracyManual, 
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
        
    return crud.dodaj_sesje_recznie(db, uzytkownik_id, sesja)


# endpoint umożliwiający administratorowi modyfikację (korektę) istniejącej sesji pracy
@app.put("/admin/sesje/{sesja_id}", response_model=schemas.SesjaPracyResponse)
def popraw_bledna_sesje(
    sesja_id: int, 
    sesja: schemas.SesjaPracyManual, 
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
        
    zaktualizowana = crud.edytuj_sesje(db, sesja_id, sesja)
    if not zaktualizowana:
        raise HTTPException(status_code=404, detail="Nie znaleziono sesji")
    return zaktualizowana

# endpoint pobierający administratorowi historię sesji pracy konkretnego użytkownika
@app.get("/admin/uzytkownicy/{uzytkownik_id}/sesje", response_model=List[schemas.SesjaPracyResponse])
def get_sesje_pracownika_admin(
    uzytkownik_id: int,
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
        
    return crud.pobierz_sesje_uzytkownika(db, uzytkownik_id)

# endpoint generujący kierownikowi miesięczny raport zbiorczy z podsumowaniem czasu pracy i płac wszystkich pracowników
@app.get("/kierownik/raport-zbiorczy")
def generuj_raport_zbiorczy(
    rok: int,
    miesiac: int,
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(wymagaj_kierownika)
):
    if current_user.rola not in ("kierownik", "administrator"): 
        raise HTTPException(status_code=403, detail="Brak uprawnień kierownika")

    pracownicy = crud.pobierz_pracownikow(db)
    raport = []
    
    for pracownik in pracownicy:
        # Pobieramy dni pracownika
        dni, _ = crud.oblicz_szczegoly_pracownika(db, pracownik)
        
        # Filtrujemy tylko te dni, które należą do wybranego roku i miesiąca
        dni_w_miesiacu = [
            d for d in dni 
            if d["data"].year == rok and d["data"].month == miesiac
        ]
        
        # Sumujemy wartości tylko dla tego jednego, wybranego miesiąca
        total_normalne = sum(d["godziny_normalne"] for d in dni_w_miesiacu)
        total_nadgodziny = sum(d["godziny_nadgodzin"] for d in dni_w_miesiacu)
        total_godziny = sum(d["godziny_przepracowane"] for d in dni_w_miesiacu)
        total_zarobek = sum(d["zarobek"] for d in dni_w_miesiacu)
        
        raport.append({
            "pracownik_id": pracownik.id,
            "imie": pracownik.imie,
            "nazwisko": pracownik.nazwisko,
            "email": pracownik.email,
            "suma_godzin": round(total_godziny, 2),
            "godziny_normalne": round(total_normalne, 2),
            "godziny_nadgodzin": round(total_nadgodziny, 2),
            "pensja_do_wyplaty": round(total_zarobek, 2)
        })
        
    return raport
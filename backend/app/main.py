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

models.Base.metadata.create_all(bind=engine)
# Konfiguracja JWT
SECRET_KEY = "tajny-klucz"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Adres Twojego Reacta
    allow_credentials=True,
    allow_methods=["*"], # Zezwala na GET, POST, itp.
    allow_headers=["*"], # Zezwala na wszystkie nagłówki (w tym tokeny)
)

# Funkcja do sprawdzania, kto jest zalogowany
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

# --- LOGOWANIE (Generuje Token) ---
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

# --- DODAWANIE PRACOWNIKA (Tylko dla Admina) ---
@app.post("/admin/dodaj-pracownika", response_model=schemas.UzytkownikResponse)
def dodaj_pracownika(
    user_data: schemas.UzytkownikCreate, 
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    # 1. Sprawdzamy, czy ten, kto klika, to na pewno administrator
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
    
    # 2. Przekazujemy CAŁY obiekt user_data do CRUDA, 
    # a jako rolę podajemy to, co przyszło w formularzu
    return crud.utworz_uzytkownika(db=db, user=user_data)

@app.post("/czas/start", response_model=schemas.SesjaPracyResponse)
def rozpocznij_prace(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    # Szukamy aktywnej sesji
    aktywna = db.query(models.SesjaPracy).filter(
        models.SesjaPracy.uzytkownik_id == current_user.id,
        models.SesjaPracy.koniec_sesji == None
    ).first()
    
    if aktywna:
        raise HTTPException(status_code=400, detail="Sesja już trwa")
        
    return crud.start_sesji(db, current_user.id) 

@app.post("/czas/stop", response_model=schemas.SesjaPracyResponse)
def zakoncz_prace(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    wynik = crud.stop_sesji(db, current_user.id)
    if not wynik:
        raise HTTPException(status_code=400, detail="Brak aktywnej sesji")
    return wynik

@app.get("/admin/uzytkownicy", response_model=List[schemas.UzytkownikResponse])
def get_wszyscy_uzytkownicy(
    db: Session = Depends(database.get_db),
    current_admin: models.Uzytkownik = Depends(get_current_user)
):
    if current_admin.rola != "administrator":
        raise HTTPException(status_code=403, detail="Brak uprawnień administratora")
    return crud.pobierz_wszystkich_uzytkownikow(db)

@app.get("/czas/moje-sesje", response_model=List[schemas.SesjaPracyResponse])
def get_moje_sesje(
    db: Session = Depends(database.get_db),
    current_user: models.Uzytkownik = Depends(get_current_user)
):
    return crud.pobierz_sesje_uzytkownika(db, uzytkownik_id=current_user.id)
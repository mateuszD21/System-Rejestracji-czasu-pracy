import bcrypt
from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime

# 1. Funkcje pomocnicze do czystego bcrypta
def zahashuj_haslo(haslo: str) -> str:
    # Bcrypt wymaga bajtów, więc musimy zamienić tekst na bajty
    bajty_hasla = haslo.encode('utf-8')
    # Generujemy "sól" (losowy dodatek do hasła)
    sol = bcrypt.gensalt()
    # Haszujemy
    hasz = bcrypt.hashpw(bajty_hasla, sol)
    # Zwracamy jako zwykły tekst, żeby zapisać w bazie
    return hasz.decode('utf-8')

def zweryfikuj_haslo(haslo_jawne: str, haslo_z_bazy: str) -> bool:
    bajty_hasla = haslo_jawne.encode('utf-8')
    bajty_hasza = haslo_z_bazy.encode('utf-8')
    return bcrypt.checkpw(bajty_hasla, bajty_hasza)

# 2. Operacje na bazie danych
def utworz_uzytkownika(db: Session, user: schemas.UzytkownikCreate):
    haslo_zaszyfrowane = zahashuj_haslo(user.haslo)
    
    db_user = models.Uzytkownik(
        imie=user.imie,
        nazwisko=user.nazwisko,
        email=user.email,
        haslo_hash=haslo_zaszyfrowane,
        rola=user.rola.lower()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def autentykacja_uzytkownika(db: Session, dane_logowania: schemas.UzytkownikLogin):
    uzytkownik = db.query(models.Uzytkownik).filter(models.Uzytkownik.email == dane_logowania.email).first()
    
    # Używamy naszej nowej funkcji weryfikującej
    if not uzytkownik or not zweryfikuj_haslo(dane_logowania.haslo, uzytkownik.haslo_hash):
        return False
        
    return uzytkownik
def start_sesji(db: Session, user_id: int):
    # Tworzymy nową sesję z aktualną godziną
    nowa_sesja = models.SesjaPracy(
        uzytkownik_id=user_id,
        start_sesji=datetime.now()  # <--- Nowa nazwa kolumny
    )
    db.add(nowa_sesja)
    db.commit()
    db.refresh(nowa_sesja)
    return nowa_sesja

def stop_sesji(db: Session, user_id: int):
    # Szukamy aktywnej sesji (gdzie koniec_sesji to None)
    sesja = db.query(models.SesjaPracy).filter(
        models.SesjaPracy.uzytkownik_id == user_id,
        models.SesjaPracy.koniec_sesji == None  # <--- Nowa nazwa kolumny
    ).first()
    
    if sesja:
        sesja.koniec_sesji = datetime.now()  # <--- Nowa nazwa kolumny
        db.commit()
        db.refresh(sesja)
        return sesja
    return None
def pobierz_wszystkich_uzytkownikow(db: Session):
    return db.query(models.Uzytkownik).all()

def pobierz_sesje_uzytkownika(db: Session, uzytkownik_id: int):
    # Sortujemy od najnowszych (desc - descending), żeby ostatnie sesje były na górze
    return db.query(models.SesjaPracy).filter(
        models.SesjaPracy.uzytkownik_id == uzytkownik_id
    ).order_by(models.SesjaPracy.start_sesji.desc()).all()
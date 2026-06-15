import bcrypt
from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, date
from collections import defaultdict
from typing import Optional

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

def pobierz_pracownikow(db: Session):
    return db.query(models.Uzytkownik).filter(
        models.Uzytkownik.rola == models.RolaUzytkownika.pracownik
    ).all()

def pobierz_uzytkownika_po_id(db: Session, uzytkownik_id: int):
    return db.query(models.Uzytkownik).filter(
        models.Uzytkownik.id == uzytkownik_id
    ).first()

def aktualizuj_ustawienia_placow(
    db: Session,
    uzytkownik_id: int,
    ustawienia: schemas.UstawieniaPlacowUpdate
):
    uzytkownik = pobierz_uzytkownika_po_id(db, uzytkownik_id)
    if not uzytkownik:
        return None
    uzytkownik.stawka_godzinowa = ustawienia.stawka_godzinowa
    uzytkownik.stawka_nadgodzinowa = ustawienia.stawka_nadgodzinowa
    uzytkownik.norma_godzinowa = ustawienia.norma_godzinowa
    db.commit()
    db.refresh(uzytkownik)
    return uzytkownik

def _dlugosc_sesji_w_godzinach(sesja: models.SesjaPracy) -> Optional[float]:
    if sesja.koniec_sesji is None:
        return None
    roznica = sesja.koniec_sesji - sesja.start_sesji
    return roznica.total_seconds() / 3600

def _oblicz_podsumowanie_dni(
    sesje: list,
    norma_godzinowa: Optional[int],
    stawka_godzinowa: Optional[float],
    stawka_nadgodzinowa: Optional[float],
):
    godziny_po_dniach: dict[date, float] = defaultdict(float)
    sesje_po_dniach: dict[date, list] = defaultdict(list)

    for sesja in sesje:
        godziny = _dlugosc_sesji_w_godzinach(sesja)
        dzien = sesja.start_sesji.date()
        sesje_po_dniach[dzien].append({
            "id": sesja.id,
            "start_sesji": sesja.start_sesji,
            "koniec_sesji": sesja.koniec_sesji,
            "godziny": round(godziny, 2) if godziny is not None else None,
        })
        if godziny is not None:
            godziny_po_dniach[dzien] += godziny

    stawka = stawka_godzinowa or 0
    stawka_nadg = stawka_nadgodzinowa or 0
    norma = norma_godzinowa or 0
    dni = []
    pensja_laczna = 0.0

    wszystkie_dni = sorted(set(sesje_po_dniach.keys()), reverse=True)
    for dzien in wszystkie_dni:
        lacznie = round(godziny_po_dniach.get(dzien, 0), 2)
        if norma > 0 and lacznie > 0:
            normalne = min(lacznie, norma)
            nadgodziny = max(0.0, lacznie - norma)
        else:
            normalne = lacznie
            nadgodziny = 0.0
        zarobek_normalny = round(normalne * stawka, 2)
        zarobek_nadgodzin = round(nadgodziny * stawka_nadg, 2)
        zarobek = round(zarobek_normalny + zarobek_nadgodzin, 2)
        pensja_laczna += zarobek
        dni.append({
            "data": dzien,
            "sesje": sesje_po_dniach[dzien],
            "godziny_przepracowane": lacznie,
            "godziny_normalne": round(normalne, 2),
            "godziny_nadgodzin": round(nadgodziny, 2),
            "zarobek": zarobek,
            "zarobek_normalny": zarobek_normalny,
            "zarobek_nadgodzin": zarobek_nadgodzin,
        })

    return dni, round(pensja_laczna, 2)

def _oblicz_podsumowanie_miesiecy(dni: list) -> list:
    miesiace: dict[tuple[int, int], dict] = defaultdict(lambda: {
        "godziny_normalne": 0.0,
        "godziny_nadgodzin": 0.0,
        "zarobek_normalny": 0.0,
        "zarobek_nadgodzin": 0.0,
    })

    for dzien in dni:
        if dzien["godziny_przepracowane"] == 0:
            continue
        klucz = (dzien["data"].year, dzien["data"].month)
        miesiace[klucz]["godziny_normalne"] += dzien["godziny_normalne"]
        miesiace[klucz]["godziny_nadgodzin"] += dzien["godziny_nadgodzin"]
        miesiace[klucz]["zarobek_normalny"] += dzien["zarobek_normalny"]
        miesiace[klucz]["zarobek_nadgodzin"] += dzien["zarobek_nadgodzin"]

    wynik = []
    for (rok, miesiac), dane in sorted(miesiace.items(), reverse=True):
        wynik.append({
            "rok": rok,
            "miesiac": miesiac,
            "godziny_normalne": round(dane["godziny_normalne"], 2),
            "godziny_nadgodzin": round(dane["godziny_nadgodzin"], 2),
            "zarobek_normalny": round(dane["zarobek_normalny"], 2),
            "zarobek_nadgodzin": round(dane["zarobek_nadgodzin"], 2),
            "pensja_laczna": round(dane["zarobek_normalny"] + dane["zarobek_nadgodzin"], 2),
        })
    return wynik

def oblicz_szczegoly_pracownika(db: Session, uzytkownik: models.Uzytkownik):
    sesje = pobierz_sesje_uzytkownika(db, uzytkownik.id)
    dni, pensja = _oblicz_podsumowanie_dni(
        sesje,
        uzytkownik.norma_godzinowa,
        uzytkownik.stawka_godzinowa,
        uzytkownik.stawka_nadgodzinowa,
    )
    return dni, pensja

def oblicz_moje_podsumowanie(db: Session, uzytkownik: models.Uzytkownik):
    sesje = pobierz_sesje_uzytkownika(db, uzytkownik.id)
    aktywna = next((s for s in sesje if s.koniec_sesji is None), None)
    dni, _ = _oblicz_podsumowanie_dni(
        sesje,
        uzytkownik.norma_godzinowa,
        uzytkownik.stawka_godzinowa,
        uzytkownik.stawka_nadgodzinowa,
    )
    miesiace = _oblicz_podsumowanie_miesiecy(dni)
    return dni, miesiace, aktywna
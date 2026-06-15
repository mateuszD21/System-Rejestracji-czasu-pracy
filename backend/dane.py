"""
Skrypt seedujący bazę danych testowymi pracownikami i sesjami pracy.
Uruchom z katalogu głównego projektu:  python -m app.seed_data
(lub odpowiednio w zależności od struktury katalogów)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app import models
from app.crud import zahashuj_haslo
from datetime import datetime, timedelta

# Tworzenie tabel w bazie danych, jeśli nie istnieją
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

# ---------------------------------------------
# 1. UPEWNIAMY SIĘ, ŻE ADMIN ISTNIEJE
# ---------------------------------------------
admin_email = "admin@test.pl"
if not db.query(models.Uzytkownik).filter_by(email=admin_email).first():
    db.add(models.Uzytkownik(
        imie="Główny", nazwisko="Administrator",
        email=admin_email, haslo_hash=zahashuj_haslo("admin123"),
        rola=models.RolaUzytkownika.administrator,
    ))
    db.commit()
    print("[+] Admin dodany")
else:
    print("[*] Admin już istnieje")

# ---------------------------------------------
# 2. KIEROWNIK
# ---------------------------------------------
kierownik_email = "kierownik@test.pl"
if not db.query(models.Uzytkownik).filter_by(email=kierownik_email).first():
    db.add(models.Uzytkownik(
        imie="Marek", nazwisko="Kowalski",
        email=kierownik_email, haslo_hash=zahashuj_haslo("kierownik123"),
        rola=models.RolaUzytkownika.kierownik,
    ))
    db.commit()
    print("[+] Kierownik dodany")
else:
    print("[*] Kierownik już istnieje")

# ---------------------------------------------
# 3. PRACOWNICY
# ---------------------------------------------
pracownicy_dane = [
    {
        "imie": "Anna",
        "nazwisko": "Nowak",
        "email": "anna.nowak@test.pl",
        "haslo": "pracownik123",
        "stawka_godzinowa": 25.0,
        "stawka_nadgodzinowa": 37.5,
        "norma_godzinowa": 8,
    },
    {
        "imie": "Piotr",
        "nazwisko": "Zieliński",
        "email": "piotr.zielinski@test.pl",
        "haslo": "pracownik123",
        "stawka_godzinowa": 45.0,
        "stawka_nadgodzinowa": 60.0,
        "norma_godzinowa": 6,
    },
    {
        "imie": "Karolina",
        "nazwisko": "Wiśniewska",
        "email": "karolina.wisniewska@test.pl",
        "haslo": "pracownik123",
        "stawka_godzinowa": 18.0,
        "stawka_nadgodzinowa": 27.0,
        "norma_godzinowa": 4,
    },
]

created = {}
for p in pracownicy_dane:
    existing = db.query(models.Uzytkownik).filter_by(email=p["email"]).first()
    if existing:
        print(f"[*] Pracownik {p['imie']} {p['nazwisko']} już istnieje")
        created[p["email"]] = existing
        continue
        
    user = models.Uzytkownik(
        imie=p["imie"], nazwisko=p["nazwisko"], email=p["email"],
        haslo_hash=zahashuj_haslo(p["haslo"]),
        rola=models.RolaUzytkownika.pracownik,
        stawka_godzinowa=p["stawka_godzinowa"],
        stawka_nadgodzinowa=p["stawka_nadgodzinowa"],
        norma_godzinowa=p["norma_godzinowa"],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    created[p["email"]] = user
    print(f"[+] Dodano pracownika: {p['imie']} {p['nazwisko']}")

# ---------------------------------------------
# 4. FUNKCJA GENERUJĄCA ZAMKNIĘTE SESJE
# ---------------------------------------------

def dodaj_sesje(user, opis_sesji: list[dict]):
    """opis_sesji: lista {'delta_days': int, 'start_h': float, 'end_h': float}"""
    sesje_dodane = 0
    for s in opis_sesji:
        dzien = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        dzien -= timedelta(days=s["delta_days"])
        start = dzien + timedelta(hours=s["start_h"])
        end = dzien + timedelta(hours=s["end_h"])

        # Zapobiegamy dublowaniu identycznych logowań przy ponownym uruchomieniu seeda
        exists = db.query(models.SesjaPracy).filter_by(
            uzytkownik_id=user.id, start_sesji=start
        ).first()
        
        if not exists:
            db.add(models.SesjaPracy(
                uzytkownik_id=user.id,
                start_sesji=start,
                koniec_sesji=end,
            ))
            sesje_dodane += 1
            
    db.commit()
    return sesje_dodane

# -- Anna Nowak – pracuje regularnie, sporadycznie nadgodziny --
anna = created["anna.nowak@test.pl"]
anna_sesje = [
    {"delta_days": 28, "start_h": 8.0,  "end_h": 16.5},
    {"delta_days": 27, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 26, "start_h": 8.0,  "end_h": 18.0},
    {"delta_days": 25, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 24, "start_h": 8.0,  "end_h": 15.5},
    {"delta_days": 21, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 20, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 19, "start_h": 8.0,  "end_h": 17.5},
    {"delta_days": 18, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 17, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 14, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 13, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 12, "start_h": 8.0,  "end_h": 19.0},
    {"delta_days": 11, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 10, "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 7,  "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 6,  "start_h": 8.0,  "end_h": 17.0},
    {"delta_days": 5,  "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 4,  "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 3,  "start_h": 8.0,  "end_h": 16.0},
    {"delta_days": 2,  "start_h": 8.0,  "end_h": 12.0},
    {"delta_days": 2,  "start_h": 13.0, "end_h": 17.0},
    {"delta_days": 1,  "start_h": 8.0,  "end_h": 16.0},
]
dodane_anna = dodaj_sesje(anna, anna_sesje)
print(f"[+] Sesje Anny: w bazie danych znajduje się {len(anna_sesje)} wpisów (dodano teraz: {dodane_anna})")

# -- Piotr Zieliński – specjalista (norma 6h), wszystkie sesje są poprawnie zamknięte --
piotr = created["piotr.zielinski@test.pl"]
piotr_sesje = [
    {"delta_days": 28, "start_h": 9.0,  "end_h": 16.0},
    {"delta_days": 27, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 26, "start_h": 9.0,  "end_h": 17.0},
    {"delta_days": 25, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 21, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 20, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 19, "start_h": 9.0,  "end_h": 18.0},
    {"delta_days": 18, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 17, "start_h": 9.0,  "end_h": 16.5},
    {"delta_days": 14, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 13, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 12, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 11, "start_h": 9.0,  "end_h": 16.0},
    {"delta_days": 10, "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 7,  "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 6,  "start_h": 9.0,  "end_h": 19.0},
    {"delta_days": 5,  "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 4,  "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 3,  "start_h": 9.0,  "end_h": 15.0},
    {"delta_days": 1,  "start_h": 9.0,  "end_h": 16.0},
]
dodane_piotr = dodaj_sesje(piotr, piotr_sesje)
print(f"[+] Sesje Piotra: w bazie danych znajduje się {len(piotr_sesje)} wpisów (dodano teraz: {dodane_piotr})")

# -- Karolina Wiśniewska – pół etatu, norma 4h --
karolina = created["karolina.wisniewska@test.pl"]
karolina_sesje = [
    {"delta_days": 28, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 27, "start_h": 7.0,  "end_h": 12.0},
    {"delta_days": 26, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 25, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 24, "start_h": 7.0,  "end_h": 13.0},
    {"delta_days": 21, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 20, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 19, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 18, "start_h": 7.0,  "end_h": 11.5},
    {"delta_days": 17, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 14, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 13, "start_h": 7.0,  "end_h": 12.0},
    {"delta_days": 12, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 11, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 10, "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 7,  "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 6,  "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 5,  "start_h": 7.0,  "end_h": 14.0},
    {"delta_days": 4,  "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 3,  "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 2,  "start_h": 7.0,  "end_h": 11.0},
    {"delta_days": 1,  "start_h": 7.0,  "end_h": 11.0},
]
dodane_karolina = dodaj_sesje(karolina, karolina_sesje)
print(f"[+] Sesje Karoliny: w bazie danych znajduje się {len(karolina_sesje)} wpisów (dodano teraz: {dodane_karolina})")

db.close()

print()
print("=" * 55)
print("DANE TESTOWE GOTOWE – możesz się zalogować:")
print("=" * 55)
print()
print("  ADMIN")
print("    Email:  admin@test.pl")
print("    Hasło:  admin123")
print()
print("  KIEROWNIK")
print("    Email:  kierownik@test.pl")
print("    Hasło:  kierownik123")
print()
print("  PRACOWNIK 1 – Anna Nowak")
print("    Email:  anna.nowak@test.pl    (norma 8h, 25 zł/h, nadg 37,5 zł/h)")
print("    Hasło:  pracownik123")
print()
print("  PRACOWNIK 2 – Piotr Zieliński")
print("    Email:  piotr.zielinski@test.pl (norma 6h, 45 zł/h, nadg 60 zł/h)")
print("    Hasło:  pracownik123")
print()
print("  PRACOWNIK 3 – Karolina Wiśniewska")
print("    Email:  karolina.wisniewska@test.pl (norma 4h, 18 zł/h, nadg 27 zł/h)")
print("    Hasło:  pracownik123")
print()
print("Wszystkie wygenerowane sesje posiadają daty rozpoczęcia i zakończenia.")
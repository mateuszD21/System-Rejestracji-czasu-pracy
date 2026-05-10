from app.database import SessionLocal
from app.models import Uzytkownik
from app.crud import zahashuj_haslo

def stworz_pierwszego_admina():
    # Otwieramy połączenie z bazą
    db = SessionLocal()
    try:
        email_admina = "admin@test.pl"
        
        # Sprawdzamy, czy admin już przypadkiem nie istnieje
        istniejacy_admin = db.query(Uzytkownik).filter(Uzytkownik.email == email_admina).first()
        if istniejacy_admin:
            print(f"[*] Użytkownik {email_admina} już istnieje w bazie. Pomijam tworzenie.")
            return

        # Tworzymy obiekt administratora
        nowy_admin = Uzytkownik(
            imie="Główny",
            nazwisko="Administrator", 
            email=email_admina,
            haslo_hash=zahashuj_haslo("admin123"), # Bezpieczne szyfrowanie!
            rola="administrator"                           
        )

        # Zapisujemy w bazie
        db.add(nowy_admin)
        db.commit()
        print(f"[+] Sukces! Utworzono konto administratora.")
        print(f"    Login: {email_admina}")
        print(f"    Haslo: admin123")
        
    finally:
        # Zawsze zamykamy połączenie
        db.close()

if __name__ == "__main__":
    print("Uruchamianie skryptu inicjalizacyjnego...")
    stworz_pierwszego_admina()
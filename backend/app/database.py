from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Ścieżka do lokalnego pliku bazy SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./czas_pracy.db"

# Tworzenie silnika bazy danych
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Konfiguracja sesji
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Klasa bazowa, po której będą dziedziczyć modele tabel
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
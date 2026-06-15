import enum
from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from .database import Base

# klasa Enum z rolami
class RolaUzytkownika(str, enum.Enum):
    pracownik = "pracownik"
    kierownik = "kierownik"
    administrator = "administrator"
# klasa modelu użytkownika
class Uzytkownik(Base):
    __tablename__ = "uzytkownicy"
    # Kolumny uzytkownika
    id = Column(Integer, primary_key=True, index=True)
    imie = Column(String)
    nazwisko = Column(String)
    email = Column(String, unique=True, index=True)
    haslo_hash = Column(String)
    rola = Column(Enum(RolaUzytkownika))
    aktywny = Column(Boolean, default=True)
    
    # Pola finansowe i normy
    stawka_godzinowa = Column(Float)
    norma_godzinowa = Column(Integer)
    stawka_nadgodzinowa = Column(Float)

    sesje = relationship("SesjaPracy", back_populates="wlasciciel")

# klasa modelu zdarzenia czasowego
class SesjaPracy(Base):
    __tablename__ = "sesje_pracy"

    id = Column(Integer, primary_key=True, index=True)
    start_sesji = Column(DateTime)
    koniec_sesji = Column(DateTime, nullable=True)
    
    uzytkownik_id = Column(Integer, ForeignKey("uzytkownicy.id"))

    # Pamiętaj o zmianie back_populates w modelu Uzytkownik!
    wlasciciel = relationship("Uzytkownik", back_populates="sesje")
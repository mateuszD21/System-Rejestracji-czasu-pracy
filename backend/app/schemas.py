from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List

# Schemat danych potrzebnych do stworzenia konta
class SesjaPracyResponse(BaseModel):
    id: int
    uzytkownik_id: int
    start_sesji: datetime
    koniec_sesji: Optional[datetime] = None

    class Config:
        from_attributes = True
class UzytkownikCreate(BaseModel):
    imie: str
    nazwisko: str
    email: str
    haslo: str
    rola: str

# Schemat danych do  logowania
class UzytkownikLogin(BaseModel):
    email: str
    haslo: str

# Schemat, który backend wysyła z powrotem
class UzytkownikResponse(BaseModel):
    id: int
    imie: str
    nazwisko: str
    email: str
    rola: str
    aktywny: bool

    class Config:
        from_attributes = True

class UstawieniaPlacowUpdate(BaseModel):
    stawka_godzinowa: float
    stawka_nadgodzinowa: float
    norma_godzinowa: int

class PracownikKierownikaResponse(BaseModel):
    id: int
    imie: str
    nazwisko: str
    norma_godzinowa: Optional[int] = None
    stawka_godzinowa: Optional[float] = None
    pensja_do_wyplaty: float

class DzienPracyResponse(BaseModel):
    data: date
    godziny_przepracowane: float
    godziny_normalne: float
    godziny_nadgodzin: float
    zarobek: float
    zarobek_normalny: float
    zarobek_nadgodzin: float

class SesjaPracyInfo(BaseModel):
    id: int
    start_sesji: datetime
    koniec_sesji: Optional[datetime] = None
    godziny: Optional[float] = None

class DzienZSesjamiResponse(BaseModel):
    data: date
    sesje: List[SesjaPracyInfo]
    godziny_przepracowane: float
    godziny_normalne: float
    godziny_nadgodzin: float
    zarobek: float
    zarobek_normalny: float
    zarobek_nadgodzin: float

class MiesiacZarobkowResponse(BaseModel):
    rok: int
    miesiac: int
    godziny_normalne: float
    godziny_nadgodzin: float
    zarobek_normalny: float
    zarobek_nadgodzin: float
    pensja_laczna: float

class MojePodsumowanieResponse(BaseModel):
    norma_godzinowa: Optional[int] = None
    stawka_godzinowa: Optional[float] = None
    stawka_nadgodzinowa: Optional[float] = None
    aktywna_sesja: Optional[SesjaPracyResponse] = None
    miesiace: List[MiesiacZarobkowResponse]
    dni: List[DzienZSesjamiResponse]

class SzczegolyPracownikaResponse(BaseModel):
    id: int
    imie: str
    nazwisko: str
    norma_godzinowa: Optional[int] = None
    stawka_godzinowa: Optional[float] = None
    stawka_nadgodzinowa: Optional[float] = None
    pensja_do_wyplaty: float
    dni: List[DzienPracyResponse]
    
class StatusKontaUpdate(BaseModel):
    aktywny: bool

class SesjaPracyManual(BaseModel):
    start_sesji: datetime
    koniec_sesji: Optional[datetime] = None
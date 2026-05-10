from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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

    class Config:
        from_attributes = True
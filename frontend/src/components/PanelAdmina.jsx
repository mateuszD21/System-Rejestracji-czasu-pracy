import { useState, useEffect } from 'react';
import api from '../api';
import Header from './Header';

export default function PanelAdmina() {
    const [pracownicy, setPracownicy] = useState([]);
    
    // Zmienna, która mówi nam, czy formularz ma być widoczny
    const [pokazFormularz, setPokazFormularz] = useState(false);

    // Zmienne do trzymania wpisanych danych
    const [imie, setImie] = useState('');
    const [nazwisko, setNazwisko] = useState('');
    const [email, setEmail] = useState('');
    const [haslo, setHaslo] = useState('');
    const [rola, setRola] = useState('pracownik'); // Domyślnie nowa osoba to pracownik

    const pobierzPracownikow = async () => {
        try {
            const response = await api.get('/admin/uzytkownicy');
            setPracownicy(response.data);
        } catch (error) {
            console.error("Błąd pobierania pracowników", error);
        }
    };

    useEffect(() => {
        pobierzPracownikow();
    }, []);

    // Funkcja wywoływana po kliknięciu "Zapisz"
    const handleDodajPracownika = async (e) => {
        e.preventDefault(); // Powstrzymuje stronę przed przeładowaniem
        try {
            // Wysyłamy paczkę JSON do Pythona
            await api.post('/admin/dodaj-pracownika', {
                imie: imie,
                nazwisko: nazwisko,
                email: email,
                haslo: haslo,
                rola: rola
            });
            
            alert("Użytkownik dodany pomyślnie!");
            
            // Sprzątamy po sukcesie:
            setPokazFormularz(false); // Chowamy formularz
            pobierzPracownikow();     // Pobieramy nową listę do tabeli
            
            // Czyścimy pola tekstowe na przyszłość
            setImie(''); setNazwisko(''); setEmail(''); setHaslo(''); setRola('pracownik');
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd podczas dodawania!");
        }
    };

    return (
        <div>
            <Header />
            <div className="panel-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>Zarządzanie pracownikami</h2>
                    <button 
                        onClick={() => setPokazFormularz(!pokazFormularz)}
                        style={{ 
                            padding: '10px 20px', 
                            background: pokazFormularz ? '#64748b' : '#0284c7', // Zmienia kolor, gdy otwarty
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold' 
                        }}
                    >
                        {pokazFormularz ? "Anuluj dodawanie" : "+ Dodaj pracownika"}
                    </button>
                </div>

                {/* Ten blok wyrenderuje się TYLKO, gdy pokazFormularz jest true */}
                {pokazFormularz && (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginTop: 0 }}>Nowy użytkownik</h3>
                        <form onSubmit={handleDodajPracownika} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
                            <input type="text" placeholder="Imię" required value={imie} onChange={e => setImie(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            <input type="text" placeholder="Nazwisko" required value={nazwisko} onChange={e => setNazwisko(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            <input type="password" placeholder="Hasło" required value={haslo} onChange={e => setHaslo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            <select value={rola} onChange={e => setRola(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                <option value="pracownik">Pracownik</option>
                                <option value="kierownik">Kierownik</option>
                                <option value="administrator">Administrator</option>
                            </select>
                            <button type="submit" style={{ padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Zapisz do bazy
                            </button>
                        </form>
                    </div>
                )}

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Imię</th>
                            <th>Nazwisko</th>
                            <th>Email</th>
                            <th>Rola</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pracownicy.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{textAlign: 'center'}}>Brak pracowników w systemie</td>
                            </tr>
                        ) : (
                            pracownicy.map((pracownik) => (
                                <tr key={pracownik.id}>
                                    <td>{pracownik.id}</td>
                                    <td>{pracownik.imie}</td>
                                    <td>{pracownik.nazwisko}</td>
                                    <td>{pracownik.email}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{pracownik.rola}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
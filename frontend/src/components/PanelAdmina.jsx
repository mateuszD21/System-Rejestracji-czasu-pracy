import { useState, useEffect } from 'react';
import api from '../api';
import Header from './Header';

export default function PanelAdmina() {
    const [pracownicy, setPracownicy] = useState([]);
    
    const [pokazFormularz, setPokazFormularz] = useState(false);
    const [imie, setImie] = useState('');
    const [nazwisko, setNazwisko] = useState('');
    const [email, setEmail] = useState('');
    const [haslo, setHaslo] = useState('');
    const [rola, setRola] = useState('pracownik');

    const [wybranyPracownik, setWybranyPracownik] = useState(null);
    const [sesjePracownika, setSesjePracownika] = useState([]);
    
    const [trybFormularzaSesji, setTrybFormularzaSesji] = useState('dodaj'); 
    const [idSesjiDoEdycji, setIdSesjiDoEdycji] = useState('');
    const [startSesji, setStartSesji] = useState('');
    const [koniecSesji, setKoniecSesji] = useState('');

    // funkcja pobierająca listę wszystkich pracowników z API
    const pobierzPracownikow = async () => {
        try {
            const response = await api.get('/admin/uzytkownicy');
            setPracownicy(response.data);
        } catch (error) {
            console.error("Błąd pobierania pracowników", error);
        }
    };
    
    // hook wywołujący pobranie listy pracowników przy montowaniu komponentu
    useEffect(() => {
        pobierzPracownikow();
    }, []);
// funkcja przycinająca pełny format daty do formatu akceptowanego przez input datetime-local
    const formatToDatetimeLocal = (dateString) => {
        if (!dateString) return '';
        return dateString.slice(0, 16); 
    };

// funkcja formatująca datę i czas do czytelnej postaci tekstowej dla tabeli sesji
    const formatujDateWyswietlania = (dateString) => {
        if (!dateString) return 'Trwa (brak końca)';
        const [data, czas] = dateString.split('T');
        return `${data} ${czas.slice(0, 5)}`;
    };

// funkcja obsługująca wysyłanie formularza w celu utworzenia nowego konta pracownika
    const handleDodajPracownika = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/dodaj-pracownika', { imie, nazwisko, email, haslo, rola });
            alert("Użytkownik dodany pomyślnie!");
            setPokazFormularz(false);
            pobierzPracownikow();
            setImie(''); setNazwisko(''); setEmail(''); setHaslo(''); setRola('pracownik');
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd podczas dodawania!");
        }
    };

// funkcja zmieniająca status aktywności (blokowanie/odblokowanie) konta użytkownika
    const handleZmienStatus = async (id, obecnyStatus) => {
        try {
            await api.put(`/admin/uzytkownicy/${id}/status`, { aktywny: !obecnyStatus });
            pobierzPracownikow();
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd zmiany statusu!");
        }
    };

// funkcja otwierająca podpanel zarządzania sesjami czasu pracy dla wybranego pracownika
    const otworzZarzadzanieCzasem = async (pracownik) => {
        setWybranyPracownik(pracownik);
        setPokazFormularz(false); 
        pobierzSesjePracownika(pracownik.id);
        resetujFormularzSesji();
    };

// funkcja pobierająca z API pełną historię sesji pracy konkretnego użytkownika
    const pobierzSesjePracownika = async (pracownikId) => {
        try {
            const response = await api.get(`/admin/uzytkownicy/${pracownikId}/sesje`);
            setSesjePracownika(response.data);
        } catch (error) {
            alert("Błąd podczas pobierania historii sesji pracownika.");
        }
    };

// funkcja przywracająca formularz sesji do domyślnego trybu dodawania nowego wpisu
    const resetujFormularzSesji = () => {
        setTrybFormularzaSesji('dodaj');
        setIdSesjiDoEdycji('');
        setStartSesji('');
        setKoniecSesji('');
    };

// funkcja uzupełniająca formularz sesji danymi wybranego wpisu w celu jego modyfikacji
    const przygotujDoEdycji = (sesja) => {
        setTrybFormularzaSesji('edytuj');
        setIdSesjiDoEdycji(sesja.id);
        setStartSesji(formatToDatetimeLocal(sesja.start_sesji));
        setKoniecSesji(formatToDatetimeLocal(sesja.koniec_sesji));
    };
// funkcja obsługująca zapis nowej sesji lub aktualizację istniejącego wpisu w bazie danych
    const handleZapiszSesje = async (e) => {
        e.preventDefault();
        
        const payload = {
            start_sesji: startSesji + ":00",
            koniec_sesji: koniecSesji ? (koniecSesji + ":00") : null
        };

        try {
            if (trybFormularzaSesji === 'dodaj') {
                await api.post(`/admin/uzytkownicy/${wybranyPracownik.id}/sesje`, payload);
                alert("Nowy wpis został dodany!");
            } else {
                await api.put(`/admin/sesje/${idSesjiDoEdycji}`, payload);
                alert("Wpis zaktualizowany pomyślnie!");
            }
            pobierzSesjePracownika(wybranyPracownik.id);
            resetujFormularzSesji();
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd zapisu sesji!");
        }
    };

    return (
        <div>
            <Header />
            <div className="panel-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2>Zarządzanie systemem</h2>
                    <button 
                        onClick={() => { setPokazFormularz(!pokazFormularz); setWybranyPracownik(null); }}
                        style={{ padding: '10px 20px', background: pokazFormularz ? '#64748b' : '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {pokazFormularz ? "Anuluj dodawanie" : "+ Dodaj pracownika"}
                    </button>
                </div>

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

                {wybranyPracownik && (
                    <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ marginTop: 0, color: '#b45309' }}>
                                Sesje pracownika: {wybranyPracownik.imie} {wybranyPracownik.nazwisko}
                            </h3>
                            <button onClick={() => setWybranyPracownik(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>✖ Zamknij panel</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                            <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #fef3c7', maxHeight: '400px', overflowY: 'auto' }}>
                                <h4 style={{marginTop: 0}}>Ostatnie wpisy w bazie</h4>
                                {sesjePracownika.length === 0 ? (
                                    <p style={{fontSize: '14px', color: 'gray'}}>Pracownik nie posiada żadnych sesji.</p>
                                ) : (
                                    <table style={{ fontSize: '13px', width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Rozpoczęcie</th>
                                                <th>Zakończenie</th>
                                                <th>Akcja</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sesjePracownika.map(sesja => (
                                                <tr key={sesja.id} style={{ background: idSesjiDoEdycji === sesja.id ? '#fef08a' : 'transparent' }}>
                                                    <td>#{sesja.id}</td>
                                                    <td>{formatujDateWyswietlania(sesja.start_sesji)}</td>
                                                    <td>{formatujDateWyswietlania(sesja.koniec_sesji)}</td>
                                                    <td>
                                                        <button 
                                                            onClick={() => przygotujDoEdycji(sesja)}
                                                            style={{ background: '#0284c7', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                                        >
                                                            Edytuj
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <form onSubmit={handleZapiszSesje} style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #fef3c7', height: 'fit-content' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{marginTop: 0, color: trybFormularzaSesji === 'edytuj' ? '#0f766e' : '#d97706'}}>
                                        {trybFormularzaSesji === 'edytuj' ? `Edytujesz sesję #${idSesjiDoEdycji}` : 'Dodaj nowy wpis'}
                                    </h4>
                                    {trybFormularzaSesji === 'edytuj' && (
                                        <button type="button" onClick={resetujFormularzSesji} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>Anuluj</button>
                                    )}
                                </div>

                                <label style={{fontSize: '12px', color: 'gray'}}>Start pracy:</label>
                                <input type="datetime-local" required value={startSesji} onChange={e => setStartSesji(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} />
                                
                                <label style={{fontSize: '12px', color: 'gray'}}>Koniec pracy:</label>
                                <input type="datetime-local" value={koniecSesji} onChange={e => setKoniecSesji(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', boxSizing: 'border-box' }} />
                                
                                <button type="submit" style={{ width: '100%', padding: '10px', background: trybFormularzaSesji === 'edytuj' ? '#0f766e' : '#d97706', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {trybFormularzaSesji === 'edytuj' ? 'Zapisz zmiany' : '+ Dodaj sesję'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Imię i Nazwisko</th>
                            <th>Email</th>
                            <th>Rola</th>
                            <th>Status</th>
                            <th>Akcje Admina</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pracownicy.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{textAlign: 'center'}}>Brak pracowników w systemie</td>
                            </tr>
                        ) : (
                            pracownicy.map((pracownik) => (
                                <tr key={pracownik.id}>
                                    <td>{pracownik.id}</td>
                                    <td>{pracownik.imie} {pracownik.nazwisko}</td>
                                    <td>{pracownik.email}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{pracownik.rola}</td>
                                    <td style={{ color: pracownik.aktywny ? 'green' : 'red', fontWeight: 'bold' }}>
                                        {pracownik.aktywny ? 'Aktywny' : 'Zablokowany'}
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => handleZmienStatus(pracownik.id, pracownik.aktywny)}
                                            style={{ background: pracownik.aktywny ? '#ef4444' : '#22c55e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                                        >
                                            {pracownik.aktywny ? 'Blokuj' : 'Odblokuj'}
                                        </button>
                                        <button 
                                            onClick={() => otworzZarzadzanieCzasem(pracownik)}
                                            style={{ background: '#eab308', color: 'black', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Czas ⏱
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
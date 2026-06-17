import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import Header from './Header';

export default function SzczegolyPracownika() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dane, setDane] = useState(null);
    const [stawkaGodzinowa, setStawkaGodzinowa] = useState('');
    const [stawkaNadgodzinowa, setStawkaNadgodzinowa] = useState('');
    const [normaGodzinowa, setNormaGodzinowa] = useState('');
    const [zapisuje, setZapisuje] = useState(false);
// funkcja pobierająca szczegółowe statystyki oraz aktualne stawki płacowe wybranego pracownika
    const pobierzDane = async () => {
        try {
            const response = await api.get(`/kierownik/pracownicy/${id}`);
            setDane(response.data);
            setStawkaGodzinowa(response.data.stawka_godzinowa ?? '');
            setStawkaNadgodzinowa(response.data.stawka_nadgodzinowa ?? '');
            setNormaGodzinowa(response.data.norma_godzinowa ?? '');
        } catch (error) {
            alert(error.response?.data?.detail || "Nie udało się pobrać danych pracownika");
            navigate('/kierownik');
        }
    };
// hook wywołujący pobranie danych pracownika przy każdej zmianie identyfikatora ID w adresie URL
    useEffect(() => {
        pobierzDane();
    }, [id]);

// funkcja wysyłająca zaktualizowany formularz stawek i normy dobowej pracownika do API
    const handleZapiszUstawienia = async (e) => {
        e.preventDefault();
        setZapisuje(true);
        try {
            const response = await api.put(`/kierownik/pracownicy/${id}/ustawienia`, {
                stawka_godzinowa: parseFloat(stawkaGodzinowa),
                stawka_nadgodzinowa: parseFloat(stawkaNadgodzinowa),
                norma_godzinowa: parseInt(normaGodzinowa, 10),
            });
            setDane(response.data);
            alert("Ustawienia płacowe zapisane!");
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd podczas zapisywania!");
        } finally {
            setZapisuje(false);
        }
    };

// funkcja formatująca datę pobraną z bazy do pełnego opisu tekstowego w języku polskim
    const formatujDate = (dataString) => {
        return new Date(dataString).toLocaleDateString('pl-PL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };
// funkcja formatująca wartość liczbową do zapisu walutowego z dwoma miejscami po przecinku
    const formatujKwote = (kwota) => `${kwota.toFixed(2)} zł`;
// funkcja formatująca liczbę godzin do czytelnego formatu tekstowego
    const formatujGodziny = (godziny) => `${godziny.toFixed(2)} h`;

    if (!dane) {
        return (
            <div>
                <Header />
                <div className="panel-container">
                    <p>Ładowanie...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <div className="panel-container">
                <button
                    onClick={() => navigate('/kierownik')}
                    className="btn-back"
                >
                    ← Powrót do listy
                </button>

                <h2>{dane.imie} {dane.nazwisko}</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    Łączna pensja do wypłaty: <strong style={{ color: '#0284c7' }}>{formatujKwote(dane.pensja_do_wyplaty)}</strong>
                </p>

                <div className="settings-box">
                    <h3 style={{ marginTop: 0 }}>Ustawienia płacowe</h3>
                    <form onSubmit={handleZapiszUstawienia} className="settings-form">
                        <label>
                            Stawka godzinowa (zł/h)
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={stawkaGodzinowa}
                                onChange={e => setStawkaGodzinowa(e.target.value)}
                            />
                        </label>
                        <label>
                            Stawka nadgodzinowa (zł/h)
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                value={stawkaNadgodzinowa}
                                onChange={e => setStawkaNadgodzinowa(e.target.value)}
                            />
                        </label>
                        <label>
                            Norma godzinowa (h/dzień)
                            <input
                                type="number"
                                step="1"
                                min="1"
                                max="24"
                                required
                                value={normaGodzinowa}
                                onChange={e => setNormaGodzinowa(e.target.value)}
                            />
                        </label>
                        <button type="submit" disabled={zapisuje} className="btn-save">
                            {zapisuje ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                        </button>
                    </form>
                </div>

                <h3>Czas pracy wg dni</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Godziny przepracowane</th>
                            <th>Godziny normalne</th>
                            <th>Nadgodziny</th>
                            <th>Zarobek dnia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dane.dni.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center' }}>
                                    Brak zakończonych sesji pracy
                                </td>
                            </tr>
                        ) : (
                            dane.dni.map((dzien) => (
                                <tr key={dzien.data}>
                                    <td>{formatujDate(dzien.data)}</td>
                                    <td>{formatujGodziny(dzien.godziny_przepracowane)}</td>
                                    <td>{formatujGodziny(dzien.godziny_normalne)}</td>
                                    <td style={{ color: dzien.godziny_nadgodzin > 0 ? '#ea580c' : 'inherit' }}>
                                        {formatujGodziny(dzien.godziny_nadgodzin)}
                                    </td>
                                    <td style={{ fontWeight: 'bold' }}>{formatujKwote(dzien.zarobek)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

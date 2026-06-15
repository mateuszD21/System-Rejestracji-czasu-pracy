import { useState, useEffect } from 'react';
import api from '../api';
import Header from './Header';

const NAZWY_MIESIECY = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export default function PanelPracownika() {
    const [dane, setDane] = useState(null);
    const [aktywnaZakladka, setAktywnaZakladka] = useState('czas');
    const [wybranyMiesiac, setWybranyMiesiac] = useState(null);
    const [rozwinietyDzien, setRozwinietyDzien] = useState(null);

    const pobierzDane = async () => {
        try {
            const response = await api.get('/czas/moje-podsumowanie');
            setDane(response.data);
            if (response.data.miesiace.length > 0 && !wybranyMiesiac) {
                const pierwszy = response.data.miesiace[0];
                setWybranyMiesiac(`${pierwszy.rok}-${pierwszy.miesiac}`);
            }
        } catch (error) {
            console.error("Błąd pobierania danych", error);
        }
    };

    useEffect(() => {
        pobierzDane();
    }, []);

    const handleStart = async () => {
        try {
            await api.post('/czas/start');
            pobierzDane();
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd!");
        }
    };

    const handleStop = async () => {
        try {
            await api.post('/czas/stop');
            pobierzDane();
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd!");
        }
    };

    const formatujDate = (dataString) => {
        if (!dataString) return "Trwa...";
        return new Date(dataString).toLocaleString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatujDateDzien = (dataString) => {
        return new Date(dataString).toLocaleDateString('pl-PL', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    };

    const formatujKwote = (kwota) => {
        if (kwota == null) return '—';
        return `${kwota.toFixed(2)} zł`;
    };

    const formatujGodziny = (h) => `${h.toFixed(2)} h`;

    const nazwaMiesiaca = (rok, miesiac) => `${NAZWY_MIESIECY[miesiac - 1]} ${rok}`;

    const kluczMiesiaca = (rok, miesiac) => `${rok}-${miesiac}`;

    const parseData = (dataStr) => {
        const [rok, miesiac] = dataStr.split('T')[0].split('-').map(Number);
        return { rok, miesiac };
    };

    const dniWMiesiacu = dane?.dni.filter((dzien) => {
        if (!wybranyMiesiac) return true;
        const [rok, miesiac] = wybranyMiesiac.split('-').map(Number);
        const parsed = parseData(dzien.data);
        return parsed.rok === rok && parsed.miesiac === miesiac;
    }) ?? [];

    const wybranyMiesiacDane = dane?.miesiace.find((m) =>
        kluczMiesiaca(m.rok, m.miesiac) === wybranyMiesiac
    );

    if (!dane) {
        return (
            <div>
                <Header />
                <div className="panel-container"><p>Ładowanie...</p></div>
            </div>
        );
    }

    const trwaSesja = !!dane.aktywna_sesja;

    return (
        <div>
            <Header />
            <div className="panel-container panel-pracownika">
                <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Twój czas pracy</h2>

                {trwaSesja && (
                    <div className="status-aktywna">
                        Praca w toku od: {formatujDate(dane.aktywna_sesja.start_sesji)}
                    </div>
                )}

                <div className="actions">
                    <button className="btn-start" onClick={handleStart} disabled={trwaSesja}>
                        Rozpocznij pracę
                    </button>
                    <button className="btn-stop" onClick={handleStop} disabled={!trwaSesja}>
                        Zakończ pracę
                    </button>
                </div>

                <div className="tabs">
                    <button
                        className={`tab ${aktywnaZakladka === 'czas' ? 'tab-active' : ''}`}
                        onClick={() => setAktywnaZakladka('czas')}
                    >
                        Sesje pracy
                    </button>
                    <button
                        className={`tab ${aktywnaZakladka === 'wyplaty' ? 'tab-active' : ''}`}
                        onClick={() => setAktywnaZakladka('wyplaty')}
                    >
                        Moje wypłaty
                    </button>
                </div>

                {aktywnaZakladka === 'czas' && (
                    <div>
                        <div className="filtr-miesiaca">
                            <label>
                                Miesiąc:
                                <select
                                    value={wybranyMiesiac ?? ''}
                                    onChange={(e) => setWybranyMiesiac(e.target.value)}
                                >
                                    {dane.miesiace.length === 0 && (
                                        <option value="">Brak danych</option>
                                    )}
                                    {dane.miesiace.map((m) => (
                                        <option key={kluczMiesiaca(m.rok, m.miesiac)} value={kluczMiesiaca(m.rok, m.miesiac)}>
                                            {nazwaMiesiaca(m.rok, m.miesiac)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {dniWMiesiacu.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b' }}>
                                Brak sesji w wybranym miesiącu.
                            </p>
                        ) : (
                            <div className="dni-lista">
                                {dniWMiesiacu.map((dzien) => {
                                    const klucz = dzien.data;
                                    const rozwiniety = rozwinietyDzien === klucz;
                                    return (
                                        <div key={klucz} className="dzien-karta">
                                            <button
                                                className="dzien-naglowek"
                                                onClick={() => setRozwinietyDzien(rozwiniety ? null : klucz)}
                                            >
                                                <div className="dzien-info">
                                                    <strong>{formatujDateDzien(dzien.data)}</strong>
                                                    <span className="dzien-godziny">
                                                        {dzien.godziny_przepracowane > 0
                                                            ? `${formatujGodziny(dzien.godziny_przepracowane)} łącznie`
                                                            : 'Sesja w toku'}
                                                    </span>
                                                </div>
                                                {dzien.godziny_przepracowane > 0 && (
                                                    <span className="dzien-zarobek">{formatujKwote(dzien.zarobek)}</span>
                                                )}
                                                <span className="dzien-strzalka">{rozwiniety ? '▲' : '▼'}</span>
                                            </button>
                                            {rozwiniety && (
                                                <div className="dzien-sesje">
                                                    {dzien.godziny_przepracowane > 0 && (
                                                        <div className="dzien-podsumowanie">
                                                            <span>Normalne: {formatujGodziny(dzien.godziny_normalne)}</span>
                                                            <span>Nadgodziny: {formatujGodziny(dzien.godziny_nadgodzin)}</span>
                                                        </div>
                                                    )}
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th>Start</th>
                                                                <th>Koniec</th>
                                                                <th>Czas trwania</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dzien.sesje.map((sesja) => (
                                                                <tr key={sesja.id}>
                                                                    <td>{formatujDate(sesja.start_sesji)}</td>
                                                                    <td style={{
                                                                        fontWeight: !sesja.koniec_sesji ? 'bold' : 'normal',
                                                                        color: !sesja.koniec_sesji ? '#16a34a' : 'inherit',
                                                                    }}>
                                                                        {formatujDate(sesja.koniec_sesji)}
                                                                    </td>
                                                                    <td>
                                                                        {sesja.godziny != null
                                                                            ? formatujGodziny(sesja.godziny)
                                                                            : '—'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {aktywnaZakladka === 'wyplaty' && (
                    <div>
                        {(dane.stawka_godzinowa != null || dane.norma_godzinowa != null) && (
                            <div className="stawki-info">
                                {dane.stawka_godzinowa != null && (
                                    <span>Stawka godzinowa: <strong>{formatujKwote(dane.stawka_godzinowa)}/h</strong></span>
                                )}
                                {dane.stawka_nadgodzinowa != null && (
                                    <span>Stawka nadgodzinowa: <strong>{formatujKwote(dane.stawka_nadgodzinowa)}/h</strong></span>
                                )}
                                {dane.norma_godzinowa != null && (
                                    <span>Norma dzienna: <strong>{dane.norma_godzinowa} h</strong></span>
                                )}
                            </div>
                        )}

                        {dane.miesiace.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b' }}>
                                Brak zakończonych sesji — wypłata zostanie obliczona po zarejestrowaniu czasu pracy.
                            </p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Miesiąc</th>
                                        <th>Godziny normalne</th>
                                        <th>Godziny nadgodzin</th>
                                        <th>Zarobek (normalne)</th>
                                        <th>Zarobek (nadgodziny)</th>
                                        <th>Pensja łącznie</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dane.miesiace.map((m) => (
                                        <tr
                                            key={kluczMiesiaca(m.rok, m.miesiac)}
                                            className={`clickable-row ${kluczMiesiaca(m.rok, m.miesiac) === wybranyMiesiac ? 'wiersz-wybrany' : ''}`}
                                            onClick={() => setWybranyMiesiac(kluczMiesiaca(m.rok, m.miesiac))}
                                        >
                                            <td><strong>{nazwaMiesiaca(m.rok, m.miesiac)}</strong></td>
                                            <td>{formatujGodziny(m.godziny_normalne)}</td>
                                            <td style={{ color: m.godziny_nadgodzin > 0 ? '#ea580c' : 'inherit' }}>
                                                {formatujGodziny(m.godziny_nadgodzin)}
                                            </td>
                                            <td>{formatujKwote(m.zarobek_normalny)}</td>
                                            <td>{formatujKwote(m.zarobek_nadgodzin)}</td>
                                            <td style={{ fontWeight: 'bold', color: '#0284c7' }}>
                                                {formatujKwote(m.pensja_laczna)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {wybranyMiesiacDane && (
                            <div className="miesiac-podsumowanie">
                                <h3>Podsumowanie: {nazwaMiesiaca(wybranyMiesiacDane.rok, wybranyMiesiacDane.miesiac)}</h3>
                                <div className="podsumowanie-kafelki">
                                    <div className="kafelek">
                                        <span className="kafelek-label">Godziny normalne</span>
                                        <span className="kafelek-wartosc">{formatujGodziny(wybranyMiesiacDane.godziny_normalne)}</span>
                                    </div>
                                    <div className="kafelek">
                                        <span className="kafelek-label">Nadgodziny</span>
                                        <span className="kafelek-wartosc kafelek-nadgodziny">{formatujGodziny(wybranyMiesiacDane.godziny_nadgodzin)}</span>
                                    </div>
                                    <div className="kafelek">
                                        <span className="kafelek-label">Zarobek normalny</span>
                                        <span className="kafelek-wartosc">{formatujKwote(wybranyMiesiacDane.zarobek_normalny)}</span>
                                    </div>
                                    <div className="kafelek">
                                        <span className="kafelek-label">Zarobek z nadgodzin</span>
                                        <span className="kafelek-wartosc kafelek-nadgodziny">{formatujKwote(wybranyMiesiacDane.zarobek_nadgodzin)}</span>
                                    </div>
                                    <div className="kafelek kafelek-glowny">
                                        <span className="kafelek-label">Pensja do wypłaty</span>
                                        <span className="kafelek-wartosc">{formatujKwote(wybranyMiesiacDane.pensja_laczna)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

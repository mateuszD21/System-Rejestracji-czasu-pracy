import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Header from './Header';

export default function PanelKierownika() {
    const [pracownicy, setPracownicy] = useState([]);
    const navigate = useNavigate();

    const pobierzPracownikow = async () => {
        try {
            const response = await api.get('/kierownik/pracownicy');
            setPracownicy(response.data);
        } catch (error) {
            console.error("Błąd pobierania pracowników", error);
        }
    };

    useEffect(() => {
        pobierzPracownikow();
    }, []);

    const formatujKwote = (kwota) => {
        if (kwota == null) return '—';
        return `${kwota.toFixed(2)} zł`;
    };

    return (
        <div>
            <Header />
            <div className="panel-container">
                <h2>Panel kierownika — pracownicy</h2>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>
                    Kliknij w wiersz, aby zobaczyć szczegóły czasu pracy i ustawić płace.
                </p>

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Imię</th>
                            <th>Nazwisko</th>
                            <th>Norma godzinowa (h/dzień)</th>
                            <th>Stawka godzinowa</th>
                            <th>Pensja do wypłaty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pracownicy.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center' }}>Brak pracowników w systemie</td>
                            </tr>
                        ) : (
                            pracownicy.map((pracownik) => (
                                <tr
                                    key={pracownik.id}
                                    className="clickable-row"
                                    onClick={() => navigate(`/kierownik/pracownik/${pracownik.id}`)}
                                >
                                    <td>{pracownik.id}</td>
                                    <td>{pracownik.imie}</td>
                                    <td>{pracownik.nazwisko}</td>
                                    <td>{pracownik.norma_godzinowa ?? '—'}</td>
                                    <td>{formatujKwote(pracownik.stawka_godzinowa)}</td>
                                    <td style={{ fontWeight: 'bold', color: '#0284c7' }}>
                                        {formatujKwote(pracownik.pensja_do_wyplaty)}
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

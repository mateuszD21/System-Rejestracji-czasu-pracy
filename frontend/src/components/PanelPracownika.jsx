import { useState, useEffect } from 'react';
import api from '../api';
import Header from './Header';

export default function PanelPracownika() {
    const [sesje, setSesje] = useState([]);

    // Funkcja pobierająca dane z backendu
    const pobierzSesje = async () => {
        try {
            const response = await api.get('/czas/moje-sesje');
            setSesje(response.data);
        } catch (error) {
            console.error("Błąd pobierania sesji", error);
        }
    };

    // Uruchamia się raz, gdy wejdziesz na stronę
    useEffect(() => {
        pobierzSesje();
    }, []);

    const handleStart = async () => {
        try {
            await api.post('/czas/start');
            pobierzSesje(); // Odśwież tabelę po kliknięciu
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd!");
        }
    };

    const handleStop = async () => {
        try {
            await api.post('/czas/stop');
            pobierzSesje(); // Odśwież tabelę po kliknięciu
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd!");
        }
    };

    // Funkcja pomocnicza do ładnego wyświetlania daty
    const formatujDate = (dataString) => {
        if (!dataString) return "Trwa...";
        return new Date(dataString).toLocaleString('pl-PL');
    };

    return (
        <div>
            <Header />
            <div className="panel-container">
                <h2 style={{textAlign: 'center', marginBottom: '30px'}}>Twój czas pracy</h2>
                
                <div className="actions">
                    <button className="btn-start" onClick={handleStart}>Rozpocznij pracę</button>
                    <button className="btn-stop" onClick={handleStop}>Zakończ pracę</button>
                </div>

                <h3>Twoje sesje</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Data rozpoczęcia</th>
                            <th>Data zakończenia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sesje.length === 0 ? (
                            <tr>
                                <td colSpan="2" style={{textAlign: 'center'}}>Brak zarejestrowanych sesji. Kliknij START!</td>
                            </tr>
                        ) : (
                            sesje.map((sesja) => (
                                <tr key={sesja.id}>
                                    <td>{formatujDate(sesja.start_sesji)}</td>
                                    <td style={{ fontWeight: !sesja.koniec_sesji ? 'bold' : 'normal', color: !sesja.koniec_sesji ? '#16a34a' : 'inherit' }}>
                                        {formatujDate(sesja.koniec_sesji)}
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
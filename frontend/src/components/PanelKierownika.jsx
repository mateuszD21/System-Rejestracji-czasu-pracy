import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Header from './Header';

export default function PanelKierownika() {
    const [pracownicy, setPracownicy] = useState([]);
    const navigate = useNavigate();

    const [raportRok, setRaportRok] = useState(2026);
    const [raportMiesiac, setRaportMiesiac] = useState(new Date().getMonth() + 1);
// funkcja pobierająca listę podległych pracowników z podstawowymi danymi płacowymi
    const pobierzPracownikow = async () => {
        try {
            const response = await api.get('/kierownik/pracownicy');
            setPracownicy(response.data);
        } catch (error) {
            console.error("Błąd pobierania pracowników", error);
        }
    };
// hook wywołujący pobranie listy pracowników przy montowaniu komponentu kierownika
    useEffect(() => {
        pobierzPracownikow();
    }, []);
// funkcja pobierająca zbiorcze dane zespołu z API i generująca plik tekstowy CSV gotowy do pobrania
    const handlePobierzRaport = async () => {
        try {
            const response = await api.get(`/kierownik/raport-zbiorczy?rok=${raportRok}&miesiac=${raportMiesiac}`);
            const daneRaportu = response.data;

            if (daneRaportu.length === 0) {
                alert("Brak danych do wygenerowania raportu dla tego okresu.");
                return;
            }

            let csvContent = "\uFEFF";
            csvContent += "ID Pracownika;Imię;Nazwisko;Email;Suma Przepracowanych Godzin;Godziny Normalne;Nadgodziny;Suma Wynagrodzenia\n";

            daneRaportu.forEach(row => {
                csvContent += `${row.pracownik_id};${row.imie};${row.nazwisko};${row.email};${row.suma_godzin};${row.godziny_normalne};${row.godziny_nadgodzin};${row.pensja_do_wyplaty} zł\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Raport_Miesieczny_${raportRok}_${raportMiesiac.toString().padStart(2, '0')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Błąd pobierania raportu:", error);
            alert(error.response?.data?.detail || "Błąd podczas generowania raportu zbiorczego.");
        }
    };

    return (
        <div>
            <Header />
            <div className="panel-container">
                <h2>Panel Zarządzania Kierownika</h2>

                <div style={{ 
                    background: '#f8fafc', 
                    padding: '15px 20px', 
                    borderRadius: '8px', 
                    marginBottom: '25px', 
                    border: '1px solid #e2e8f0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px' 
                }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>Generuj miesięczny raport zespołu:</h3>
                    
                    <select 
                        value={raportMiesiac} 
                        onChange={e => setRaportMiesiac(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                    >
                        <option value={1}>Styczeń</option>
                        <option value={2}>Luty</option>
                        <option value={3}>Marzec</option>
                        <option value={4}>Kwiecień</option>
                        <option value={5}>Maj</option>
                        <option value={6}>Czerwiec</option>
                        <option value={7}>Lipiec</option>
                        <option value={8}>Sierpień</option>
                        <option value={9}>Wrzesień</option>
                        <option value={10}>Październik</option>
                        <option value={11}>Listopad</option>
                        <option value={12}>Grudzień</option>
                    </select>

                    <select 
                        value={raportRok} 
                        onChange={e => setRaportRok(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>

                    <button 
                        onClick={handlePobierzRaport}
                        style={{ 
                            padding: '9px 18px', 
                            background: '#16a34a', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    >
                        📊 Wygeneruj i pobierz raport (.CSV)
                    </button>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Pracownik</th>
                            <th>Norma Dzienna</th>
                            <th>Stawka Podstawowa</th>
                            <th>Do wypłaty (Łącznie)</th>
                            <th>Szczegóły</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pracownicy.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center' }}>Brak przypisanych pracowników</td>
                            </tr>
                        ) : (
                            pracownicy.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.id}</td>
                                    <td><strong>{p.imie} {p.nazwisko}</strong></td>
                                    <td>{p.norma_godzinowa ? `${p.norma_godzinowa} h` : '—'}</td>
                                    <td>{p.stawka_godzinowa ? `${p.stawka_godzinowa.toFixed(2)} zł/h` : '—'}</td>
                                    <td style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '15px' }}>
                                        {p.pensja_do_wyplaty.toFixed(2)} zł
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => navigate(`/kierownik/pracownik/${p.id}`)}
                                            style={{ background: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Zobacz / Edytuj ⚙
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
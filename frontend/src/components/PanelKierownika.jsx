import { useState, useEffect } from 'react';
import api from '../api';
import Header from './Header';

export default function PanelKierownika() {
    const [pracownicy, setPracownicy] = useState([]);
    const [wybranyPracownik, setWybranyPracownik] = useState(null);
    const [szczegolyDni, setSzczegolyDni] = useState([]);

    // --- STANY DLA EDYCJI STAWEK ---
    const [stawkaGodzinowa, setStawkaGodzinowa] = useState('');
    const [stawkaNadgodzinowa, setStawkaNadgodzinowa] = useState('');
    const [normaGodzinowa, setNormaGodzinowa] = useState('');

    // --- STANY DLA GENEROWANIA RAPORTU MIESIĘCZNEGO ---
    const [raportRok, setRaportRok] = useState(2026); // Rok ustawiony zgodnie z bieżącym
    const [raportMiesiac, setRaportMiesiac] = useState(new Date().getMonth() + 1);

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

    const handlePokazSzczegoly = async (pracownik) => {
        try {
            const response = await api.get(`/kierownik/pracownicy/${pracownik.id}`);
            setWybranyPracownik(pracownik);
            setSzczegolyDni(response.data.dni);
            
            setStawkaGodzinowa(response.data.stawka_godzinowa || '');
            setStawkaNadgodzinowa(response.data.stawka_nadgodzinowa || '');
            setNormaGodzinowa(response.data.norma_godzinowa || '');
        } catch (error) {
            alert("Błąd podczas pobierania szczegółów pracownika");
        }
    };

    const handleZapiszUstawieniaPlac = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/kierownik/pracownicy/${wybranyPracownik.id}/ustawienia`, {
                stawka_godzinowa: parseFloat(stawkaGodzinowa),
                stawka_nadgodzinowa: parseFloat(stawkaNadgodzinowa),
                norma_godzinowa: parseInt(normaGodzinowa)
            });
            alert("Ustawienia płacowe zostały zaktualizowane!");
            pobierzPracownikow();
            setWybranyPracownik(null);
        } catch (error) {
            alert(error.response?.data?.detail || "Błąd zapisu stawek");
        }
    };

    // --- FUNKCJA GENEROWANIA RAPORTU DO PLIKU CSV ---
    const handlePobierzRaport = async () => {
        try {
            const response = await api.get(`/kierownik/raport-zbiorczy?rok=${raportRok}&miesiac=${raportMiesiac}`);
            const daneRaportu = response.data;

            if (daneRaportu.length === 0) {
                alert("Brak danych do wygenerowania raportu dla tego okresu.");
                return;
            }

            let csvContent = "\uFEFF"; // Zabezpieczenie przed psuciem polskich znaków w Excelu
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

                {/* --- NOWA SEKCJA WIZUALNA: GENEROWANIE RAPORTU --- */}
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

                {/* MODUŁ SZCZEGÓŁÓW PRACWNIKA I MODYFIKACJI STAWEK */}
                {wybranyPracownik && (
                    <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', marginBottom: '25px', border: '1px solid #bae6fd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#0369a1' }}>
                                Szczegóły i stawki: {wybranyPracownik.imie} {wybranyPracownik.nazwisko}
                            </h3>
                            <button onClick={() => setWybranyPracownik(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>✖ Zamknij</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                            <form onSubmit={handleZapiszUstawieniaPlac} style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                                <h4 style={{ margin: '0 0 10px 0' }}>Ustawienia płac</h4>
                                
                                <label style={{ fontSize: '12px', color: 'gray' }}>Stawka godzinowa (zł/h):</label>
                                <input type="number" step="0.01" required value={stawkaGodzinowa} onChange={e => setStawkaGodzinowa(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} />
                                
                                <label style={{ fontSize: '12px', color: 'gray' }}>Stawka nadgodzinowa (zł/h):</label>
                                <input type="number" step="0.01" required value={stawkaNadgodzinowa} onChange={e => setStawkaNadgodzinowa(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} />
                                
                                <label style={{ fontSize: '12px', color: 'gray' }}>Norma dobowana (godziny):</label>
                                <input type="number" required value={normaGodzinowa} onChange={e => setNormaGodzinowa(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '15px', boxSizing: 'border-box' }} />
                                
                                <button type="submit" style={{ width: '100%', padding: '10px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Zapisz stawki</button>
                            </form>

                            <div style={{ background: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #93c5fd', maxHeight: '280px', overflowY: 'auto' }}>
                                <h4 style={{ margin: '0 0 10px 0' }}>Historia dni pracy</h4>
                                {szczegolyDni.length === 0 ? (
                                    <p style={{ color: 'gray', fontSize: '13px' }}>Brak zarejestrowanych dni pracy dla tego użytkownika.</p>
                                ) : (
                                    <table style={{ width: '100%', fontSize: '12px' }}>
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Przepracowane</th>
                                                <th>Normalne</th>
                                                <th>Nadgodziny</th>
                                                <th>Zarobek</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {szczegolyDni.map(d => (
                                                <tr key={d.data}>
                                                    <td>{d.data}</td>
                                                    <td>{d.godziny_przepracowane} h</td>
                                                    <td>{d.godziny_normalne} h</td>
                                                    <td style={{ color: d.godziny_nadgodzin > 0 ? 'red' : 'inherit' }}>{d.godziny_nadgodzin} h</td>
                                                    <td style={{ fontWeight: 'bold' }}>{d.zarobek.toFixed(2)} zł</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* GŁÓWNA TABELA Z PODSUMOWANIEM PRACOWNIKÓW */}
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
                                            onClick={() => handlePokazSzczegoly(p)}
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
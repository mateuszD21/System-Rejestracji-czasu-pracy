import { useNavigate } from 'react-router-dom';

export default function Header() {
    const navigate = useNavigate();
    
    // Proste odkodowanie tokena, żeby wyciągnąć email
    const token = localStorage.getItem('token');
    let userEmail = "Użytkownik";
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userEmail = payload.sub; // sub to nasz email z Pythona
        } catch (e) {}
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="header">
            <span>Zalogowany jako: <strong>{userEmail}</strong></span>
            <button onClick={handleLogout}>Wyloguj</button>
        </div>
    );
}
import { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await api.post('/token', formData);
            const token = response.data.access_token;
            localStorage.setItem('token', token);
            
            // Sprawdzamy rolę użytkownika z tokena i kierujemy do odpowiedniego panelu
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.rola === 'administrator') {
                navigate('/admin');
            } else if (payload.rola === 'kierownik') {
                navigate('/kierownik');
            } else {
                navigate('/pracownik');
            }
        } catch (error) {
            alert("Błędny email lub hasło!");
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2 style={{marginTop: 0, color: '#0284c7'}}>Witamy w pracy :)</h2>
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email" required onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Hasło" required onChange={e => setPassword(e.target.value)} />
                    <button type="submit">Zaloguj się</button>
                </form>
            </div>
        </div>
    );
}
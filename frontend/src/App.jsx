import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import PanelPracownika from './components/PanelPracownika';
import PanelAdmina from './components/PanelAdmina';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/pracownik" element={<PanelPracownika />} />
        <Route path="/admin" element={<PanelAdmina />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
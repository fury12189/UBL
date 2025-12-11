import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Admin from './pages/Admin';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ublDark text-gray-100 selection:bg-ublCyan selection:text-ublDark">
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
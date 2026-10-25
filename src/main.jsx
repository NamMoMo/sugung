import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminQueue from './AdminQueue.jsx';
import './exhibition.css';
import './arrival.css';
createRoot(document.getElementById('root')).render(window.location.pathname.replace(/\/+$/, '') === '/admin' ? <AdminQueue /> : <App />);

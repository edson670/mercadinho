import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { useThemeStore } from '@/stores/theme.store';
import './styles/globals.css';

// Aplica o tema persistido antes do primeiro render.
useThemeStore.getState().setTheme(useThemeStore.getState().theme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testSupabaseConnection } from './lib/supabaseTest';

testSupabaseConnection().then((connected) => {
  console.log(
    connected
      ? '✅ Supabase conectado correctamente'
      : '❌ Supabase no pudo conectarse',
  );
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

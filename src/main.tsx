import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts (SIL Open Font License; see licenses/).
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/jersey-15/latin-400.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

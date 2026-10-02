import '@picocss/pico/css/pico.min.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { content, locale } from './content/content';
import { restoreSession } from './session/session';

document.documentElement.lang = locale;
document.title = content.app.title;
void restoreSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

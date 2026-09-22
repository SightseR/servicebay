import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './app/store';
import { setSessionExpiredHandler } from './lib/apiClient';
import './lib/i18n'; // side-effect: initializes i18next before the app renders
import { sessionExpired } from './features/auth/authSlice';
import './index.css';

setSessionExpiredHandler(() => store.dispatch(sessionExpired()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './app/store';
import { setSessionExpiredHandler } from './lib/apiClient';
import { adoptTokensFromOpener, exposeTokensToOpenedTabs } from './lib/tokenStore';
import { sessionExpired } from './features/auth/authSlice';
import './index.css';

// Order matters: adopt this tab's tokens from its opener (if any) before exposing our
// own — a tab should never end up handing its own freshly-adopted copy back out.
adoptTokensFromOpener();
exposeTokensToOpenedTabs();

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

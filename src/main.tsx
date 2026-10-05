import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import {AuthProvider} from './context/AuthContext';
import {ActiveSessionProvider} from './context/ActiveSessionContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ActiveSessionProvider>
          <App />
        </ActiveSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

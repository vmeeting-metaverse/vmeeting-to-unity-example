import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import VmeetingProvider from './providers/Vmeeting';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <VmeetingProvider>
      <App />
    </VmeetingProvider>
  </React.StrictMode>,
);

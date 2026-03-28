import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';

console.log('CapitalFlow: Booting main.tsx...');
if (typeof window !== 'undefined') {
  (window as any).__BOOT_LOG = (msg: string) => console.log(`[BOOT_TRACE] ${msg}`);
  (window as any).__BOOT_LOG('Check 1: main.tsx loaded');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("CapitalFlow: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
console.log('CapitalFlow: Render initiated.');

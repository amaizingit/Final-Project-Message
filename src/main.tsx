import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure we are in a clean environment for window properties
(function() {
  if (typeof window !== 'undefined') {
    // If something in the environment is trying to polyfill fetch by assignment,
    // this check helps identify if it's already defined as a non-writable getter.
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, 'fetch');
      if (descriptor && !descriptor.writable && !descriptor.set) {
        console.log('OmniInbox: window.fetch is stable.');
      }
    } catch (e) {
      // Ignore errors in descriptor checks
    }
  }
})();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

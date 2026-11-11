/**
 * DEV-ONLY FIXTURE HARNESS ENTRY — never part of the production build.
 *
 * Loaded only by /fixtures.html through vite.fixtures.config.ts, which also
 * aliases `@clerk/clerk-react` to ./mockClerk. It renders the real <App />
 * route tree with fake auth and canned API responses so pages behind sign-in
 * can be looked at (and screenshotted) without Clerk, a backend, or an audit.
 *
 * What you see here is NOT evidence that the product works end to end.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

// Self-hosted copies of the fonts index.html pulls from Google Fonts, so the
// harness needs no external network and text metrics match production.
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/urbanist/400.css';
import '@fontsource/urbanist/500.css';
import '@fontsource/urbanist/600.css';
import '@fontsource/urbanist/700.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/instrument-serif/400-italic.css';

import '../index.css';
import App from '../App';
import { createQueryClient } from '../lib/queryClient';
import { installMockApi } from './mockApi';
import { scenario, authLoading } from './scenario';

if (!import.meta.env.DEV) {
  throw new Error('The fixture harness must never run in a production build.');
}

installMockApi();

const FixtureBadge = () => (
  <div
    data-fixture-badge
    className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] px-2.5 py-0.5 rounded-b-md text-[9px] font-mono font-bold uppercase tracking-widest pointer-events-none whitespace-nowrap"
    style={{ background: '#f59e0b', color: '#1a1205' }}
  >
    Fixture data · {scenario}{authLoading ? ' · auth loading' : ''} · not a live session
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <BrowserRouter>
        <App />
        <FixtureBadge />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

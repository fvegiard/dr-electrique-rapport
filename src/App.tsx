import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RapportPage } from './pages/RapportPage';

const LazyDashboard = React.lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard }))
);

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
    <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<RapportPage />} />
        <Route path="/dashboard" element={<LazyDashboard />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout'
import { Toaster } from './components/ui/sonner';

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const LineItems = lazy(() => import('./pages/LineItems'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const ChangeLogs = lazy(() => import('./pages/ChangeLogs'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-muted-foreground">Loading...</div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          } />
          <Route path='campaigns' element={
            <Suspense fallback={<PageLoader />}>
              <Campaigns />
            </Suspense>
          } />
          <Route path='campaigns/:id' element={
            <Suspense fallback={<PageLoader />}>
              <CampaignDetail />
            </Suspense>
          } />
          <Route path='line-items' element={
            <Suspense fallback={<PageLoader />}>
              <LineItems />
            </Suspense>
          } />
          <Route path='invoices' element={
            <Suspense fallback={<PageLoader />}>
              <Invoices />
            </Suspense>
          } />
          <Route path='invoices/:id' element={
            <Suspense fallback={<PageLoader />}>
              <InvoiceDetail />
            </Suspense>
          } />
          <Route path='change-logs' element={
            <Suspense fallback={<PageLoader />}>
              <ChangeLogs />
            </Suspense>
          } />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App

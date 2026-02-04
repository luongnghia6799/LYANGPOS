import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { LazyMotion, domMax, m, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import PageWrapper from './components/PageWrapper';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import FontLoader from './components/FontLoader';
import LoadingOverlay from './components/LoadingOverlay';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Purchase = lazy(() => import('./pages/Purchase'));
const History = lazy(() => import('./pages/History'));
const CashVoucher = lazy(() => import('./pages/CashVoucher'));
const ProductManager = lazy(() => import('./pages/ProductManager'));
const PartnerManager = lazy(() => import('./pages/PartnerManager'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const ReportsBoard = lazy(() => import('./pages/ReportsBoard'));
const Summary = lazy(() => import('./pages/Summary'));
const InvoiceDesigner = lazy(() => import('./pages/InvoiceDesigner'));
const BankManager = lazy(() => import('./pages/BankManager'));
const Welcome = lazy(() => import('./pages/Welcome'));
const MobilePOS = lazy(() => import('./pages/MobilePOS'));
const MobilePurchase = lazy(() => import('./pages/MobilePurchase'));
const MobileOrders = lazy(() => import('./pages/MobileOrders'));
const MobileSettings = lazy(() => import('./pages/MobileSettings'));

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
};

const AppLayout = () => {
  const location = useLocation();
  const isMobile = window.innerWidth <= 768;

  // Auto-redirect to mobile POS if on root index and mobile device
  useEffect(() => {
    if (isMobile && location.pathname === '/') {
      // Handled by Route below
    }
  }, [isMobile, location.pathname]);

  const isMobilePage = ['/mobile-pos', '/mobile-purchase', '/mobile-orders', '/mobile-settings'].includes(location.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <ProtectedRoute>
        {/* Conditional Layout: Don't show Main Layout sidebar for Mobile pages */}
        {isMobilePage ? (
          <PageWrapper>
            <Suspense fallback={<LoadingOverlay isVisible={true} />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/mobile-pos" element={<MobilePOS />} />
                <Route path="/mobile-purchase" element={<MobilePurchase />} />
                <Route path="/mobile-orders" element={<MobileOrders />} />
                <Route path="/mobile-settings" element={<MobileSettings />} />
              </Routes>
            </Suspense>
          </PageWrapper>
        ) : (
          <Layout>
            <Suspense fallback={<LoadingOverlay isVisible={true} message="Đang tải..." />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={isMobile ? <Navigate to="/mobile-pos" /> : <PageWrapper><Dashboard /></PageWrapper>} />
                  <Route path="/mobile-pos" element={<PageWrapper><MobilePOS /></PageWrapper>} />
                  <Route path="/mobile-purchase" element={<PageWrapper><MobilePurchase /></PageWrapper>} />
                  <Route path="/mobile-orders" element={<PageWrapper><MobileOrders /></PageWrapper>} />
                  <Route path="/mobile-settings" element={<PageWrapper><MobileSettings /></PageWrapper>} />
                  <Route path="/pos" element={<PageWrapper><POS /></PageWrapper>} />
                  <Route path="/purchase" element={<PageWrapper><Purchase /></PageWrapper>} />
                  <Route path="/history" element={<PageWrapper><History /></PageWrapper>} />
                  <Route path="/products" element={<PageWrapper><ProductManager /></PageWrapper>} />
                  <Route path="/partners" element={<PageWrapper><PartnerManager /></PageWrapper>} />
                  <Route path="/vouchers" element={<PageWrapper><CashVoucher /></PageWrapper>} />
                  <Route path="/analysis" element={<PageWrapper><ReportsBoard /></PageWrapper>} />
                  <Route path="/summary" element={<PageWrapper><Summary /></PageWrapper>} />
                  <Route path="/reports" element={<PageWrapper><Reports /></PageWrapper>} />
                  <Route path="/invoice-designer" element={<PageWrapper><InvoiceDesigner /></PageWrapper>} />
                  <Route path="/banking" element={<PageWrapper><BankManager /></PageWrapper>} />
                  <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </Layout>
        )}
      </ProtectedRoute>
    </QueryClientProvider>
  );
};

const Heartbeat = () => {
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => { });
    };
    const interval = setInterval(sendHeartbeat, 5000);
    sendHeartbeat();
    return () => clearInterval(interval);
  }, []);
  return null;
};

function App() {
  return (
    <LazyMotion features={domMax} strict>

      <Router>
        <Heartbeat />
        <FontLoader />

        <Suspense fallback={<LoadingOverlay isVisible={true} message="Khởi động..." />}>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </Suspense>
      </Router>
    </LazyMotion>
  );
}

export default App;

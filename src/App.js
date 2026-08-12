import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import config from './config/environment';
import Dashboard from './pages/dashboard';
import TickerAnalysis from './pages/TickerAnalysisNew'; // Simple Ticker Analysis Interface
import TradeList from './pages/trade/TradeList';
import TradeAdd from './pages/trade/TradeAdd'; // Import your new TradeAdd page
import TradeUpdate from './pages/trade/TradeUpdate'; // Import TradeUpdate page
import TradeEdit from './pages/trade/TradeEdit';
import TradeReview from './pages/trade/TradeReview'; // Import TradeReview page
import JournalList from './pages/analysis/JournalList';
import JournalLog from './pages/analysis/JournalLog';
import JournalLogUpdate from './pages/analysis/JournalLogUpdate';
import RiskManagement from './pages/RiskManagement';
import RecommendationList from './pages/recommendation/RecommendationList';
import RecommendationForm from './pages/recommendation/RecommendationForm';
import InvestmentList from './pages/investment/InvestmentList';
import InvestmentForm from './pages/investment/InvestmentForm';
import Header from './components/Header'; // Import the Header component
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './components/NotificationProvider';
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import UpdateInvestmentForm from './pages/investment/UpdateInvestmentForm'; // Import UpdateInvestmentForm
import Watchlist from './pages/Watchlist'; // Import Watchlist component
import StockScan from './pages/StockScan'; // Import StockScan component
import StockDetail from './pages/StockDetail'; // Import StockDetail component
import './styles/themes.css'; // Import global theme styles
import Chart from './pages/Chart'; // Import Chart component
import QuickReview from './pages/QuickReview'; // Import QuickReview component
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Profile from './pages/auth/Profile';
import UpdatePassword from './pages/auth/UpdatePassword';
import CapitalTransactions from './pages/capital/CapitalTransactions';

// Every page's own data-fetching effects fire as soon as it mounts — if any
// route rendered before the initial silent-refresh-on-load (AuthContext)
// resolved, its very first API call would race out with no access token yet
// attached, and the server would (correctly, per its own rules) treat that
// request as a guest. That's not a security hole — the server still enforces
// scoping — but it means a logged-in user's own reload could momentarily show
// them the guest sandbox instead of their private data. Gating all routes
// behind `initializing` closes that race at its source instead of chasing it
// page by page.
function AppRoutes() {
  const { initializing } = useAuth();

  if (initializing) {
    return null;
  }

  return (
    <>
      <Header />
      <Routes>
        {/* Unguarded — GUEST has legitimate access to all of these (sandbox) or they must work while logged out */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/trades" element={<TradeList />} />
        <Route path="/trades/new" element={<TradeAdd />} />
        <Route path="/trades/update/:id" element={<TradeUpdate />} />
        <Route path="/trades/edit/:id" element={<TradeEdit />} />
        <Route path="/trades/review/:id" element={<TradeReview />} />
        <Route path="/investments" element={<InvestmentList />} />
        <Route path="/investments/new" element={<InvestmentForm />} />
        <Route path="/investments/edit/:id" element={<InvestmentForm />} />
        <Route path="/investments/update/:id" element={<UpdateInvestmentForm />} />
        <Route path="/recommendations" element={<RecommendationList />} />
        <Route path="/recommendations/new" element={<RecommendationForm />} />
        <Route path="/recommendations/edit/:id" element={<RecommendationForm />} />
        <Route path="/journal" element={<JournalList />} />
        <Route path="/journal/new" element={<JournalLog />} />
        <Route path="/journal/edit/:id" element={<JournalLog />} />
        <Route path="/journal/update/:id" element={<JournalLogUpdate />} />
        <Route path="/chart" element={<Chart />} />
        <Route path="/chart/:symbol" element={<Chart />} />

        {/* Auth routes — must work while logged out */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Any logged-in user */}
        <Route path="/analysis" element={<ProtectedRoute><TickerAnalysis /></ProtectedRoute>} />
        <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
        <Route path="/scan" element={<ProtectedRoute><StockScan /></ProtectedRoute>} />
        <Route path="/stock-detail/:symbol" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
        <Route path="/risk-management" element={<ProtectedRoute><RiskManagement /></ProtectedRoute>} />
        <Route path="/capital" element={<ProtectedRoute><CapitalTransactions /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/password" element={<ProtectedRoute><UpdatePassword /></ProtectedRoute>} />

        {/* SUPERUSER only */}
        <Route path="/quick-review" element={<ProtectedRoute roles={['SUPERUSER']}><QuickReview /></ProtectedRoute>} />
        {/* Add more routes as needed */}
      </Routes>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

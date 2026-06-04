import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import config from './config/environment';
import Dashboard from './pages/dashboard';
import TickerAnalysis from './pages/TickerAnalysisNew'; // Simple Ticker Analysis Interface
import TradeList from './pages/trade/TradeList';
import TradeAdd from './pages/trade/TradeAdd'; // Import your new TradeAdd page
import TradeUpdate from './pages/trade/TradeUpdate'; // Import TradeUpdate page
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
import UpdateInvestmentForm from './pages/investment/UpdateInvestmentForm'; // Import UpdateInvestmentForm
import Watchlist from './pages/Watchlist'; // Import Watchlist component
import StockScan from './pages/StockScan'; // Import StockScan component
import StockDetail from './pages/StockDetail'; // Import StockDetail component
import './styles/themes.css'; // Import global theme styles
import Chart from './pages/Chart'; // Import Chart component

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Header />
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analysis" element={<TickerAnalysis />} />
            <Route path="/chart" element={<Chart />} />
            <Route path="/chart/:symbol" element={<Chart />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/scan" element={<StockScan />} />
            <Route path="/stock-detail/:symbol" element={<StockDetail />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/trades/new" element={<TradeAdd />} />
            <Route path="/trades/update/:id" element={<TradeUpdate />} />
            <Route path="/trades/review/:id" element={<TradeReview />} />
            <Route path="/journal" element={<JournalList />} />
            <Route path="/journal/new" element={<JournalLog />} />
            <Route path="/journal/edit/:id" element={<JournalLog />} />
            <Route path="/journal/update/:id" element={<JournalLogUpdate />} />
            <Route path="/risk-management" element={<RiskManagement />} />
            <Route path="/recommendations" element={<RecommendationList />} />
            <Route path="/recommendations/new" element={<RecommendationForm />} />
            <Route path="/recommendations/edit/:id" element={<RecommendationForm />} />
            <Route path="/investments" element={<InvestmentList />} />
            <Route path="/investments/new" element={<InvestmentForm />} />
            <Route path="/investments/edit/:id" element={<InvestmentForm />} />
            <Route path="/investments/update/:id" element={<UpdateInvestmentForm />} />
            {/* Add more routes as needed */}
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

export default App;

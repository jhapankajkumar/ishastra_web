import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import TradeList from './pages/TradeList';
import TradeAdd from './pages/TradeAdd'; // Import your new TradeAdd page
import TradeUpdate from './pages/TradeUpdate'; // Import TradeUpdate page
import TradeReview from './pages/TradeReview'; // Import TradeReview page
import JournalList from './pages/JournalList';
import JournalLog from './pages/JournalLog';
import JournalLogUpdate from './pages/JournalLogUpdate';
import RiskManagement from './pages/RiskManagement';
import RecommendationList from './pages/RecommendationList';
import RecommendationForm from './pages/RecommendationForm';
import InvestmentList from './pages/InvestmentList';
import InvestmentForm from './pages/InvestmentForm';
import Header from './components/Header'; // Import the Header component
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './components/NotificationProvider';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Dashboard />} />
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
            {/* Add more routes as needed */}
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;

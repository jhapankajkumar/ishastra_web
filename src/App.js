import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard';
import TradeList from './pages/TradeList';
import TradeLog from './pages/TradeLog'; // Import your new TradeLog page
import UpdateTrade from './pages/UpdateTrade'; // Import UpdateTrade page
import JournalList from './pages/JournalList';
import JournalLog from './pages/JournalLog';
import RiskManagement from './pages/RiskManagement';
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
            <Route path="/trades/new" element={<TradeLog />} />
            <Route path="/trades/update/:id" element={<UpdateTrade />} />
            <Route path="/journal" element={<JournalList />} />
            <Route path="/journal/new" element={<JournalLog />} />
            <Route path="/journal/edit/:id" element={<JournalLog />} />
            <Route path="/risk-management" element={<RiskManagement />} />
            {/* Add more routes as needed */}
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;

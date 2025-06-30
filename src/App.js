import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard'; // Updated import to match correct file name and casing
import TradeList from './pages/TradeList';
import TradeForm from './pages/TradeForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* <Route path="/trades" element={<TradeList />} />
        <Route path="/trades/new" element={<TradeForm />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

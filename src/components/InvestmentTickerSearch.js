import React, { useState } from 'react';
import axios from 'axios';

const InvestmentTickerSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);
    setResults([]);
    if (value.length < 1) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/ticker/search-ticker?q=${encodeURIComponent(value)}`);
      setResults(res.data.data || []);
    } catch (err) {
      setError('Error searching ticker');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search ticker (e.g. AAPL, MSFT)"
        autoComplete="off"
        style={{ width: '100%', padding: '8px' }}
      />
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {results.length > 0 && (
        <ul style={{
          position: 'absolute',
          zIndex: 10,
          background: '#fff',
          border: '1px solid #ccc',
          width: '100%',
          maxHeight: '200px',
          overflowY: 'auto',
          margin: 0,
          padding: 0,
          listStyle: 'none'
        }}>
          {results.map((item) => (
            <li
              key={item.symbol}
              style={{ padding: '8px', cursor: 'pointer' }}
              onClick={() => {
                setQuery(item.symbol);
                setResults([]);
                if (onSelect) onSelect(item);
              }}
            >
              <strong>{item.symbol}</strong> - {item.name} ({item.exchange})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InvestmentTickerSearch;

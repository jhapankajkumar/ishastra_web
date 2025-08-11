import React, { useState, useEffect, useRef } from 'react';
import { searchTickers } from '../api/tickerApi';
import styles from './TickerSearch.module.css';

const quoteTypeMap = {
  Stocks: 'EQUITY',
  ETF: 'ETF',
  Forex: 'CURRENCY',
  Indices: 'INDEX',
};

const TickerSearch = ({ value, onChange, onSelect, placeholder = "Search ticker...", instrumentType = "Stocks" }) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    let active = true;
    if (searchTerm.length >= 1) {
      searchTickers(searchTerm)
        .then(res => {
          if (!active) return;
          const data = res.data || res || [];
          let filtered = Array.isArray(data) ? data : [];
          if (instrumentType && quoteTypeMap[instrumentType]) {
            filtered = filtered.filter(
              t => (t.quoteType || '').toUpperCase() === quoteTypeMap[instrumentType]
            );
          }
          setSuggestions(filtered.slice(0, 10));
          setShowSuggestions(true);
          setActiveSuggestion(-1);
        })
        .catch(() => {
          if (!active) return;
          setSuggestions([]);
          setShowSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    return () => { active = false; };
  }, [searchTerm, instrumentType]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onChange(value);
  };

  const handleSuggestionClick = (ticker) => {
    setSearchTerm(ticker.symbol);
    setShowSuggestions(false);
    onChange(ticker.symbol);
    if (onSelect) {
      const companyName = ticker.name || ticker.shortname || ticker.longname || '';
      // Detect currency by exchDisp
      let currency = 'USD';
      if (ticker.exchDisp) {
        const exch = ticker.exchDisp.toLowerCase();
        if (exch.includes('nse') || exch.includes('bse') || exch.includes('bombay')) {
          currency = 'INR';
        }
      }
      onSelect({ symbol: ticker.symbol, name: companyName, currency, sector: ticker.sector.toUpperCase() || '' });
    }
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        inputRef.current?.blur();
        break;
      
      default:
        break;
    }
  };

  const handleInputBlur = (e) => {
    // Delay hiding suggestions to allow click events to fire
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }, 200);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 1 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={styles.tickerSearch}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        className={styles.input}
        autoComplete="off"
      />
      
      {showSuggestions && (
        <div ref={suggestionsRef} className={styles.suggestions}>
          {suggestions.length > 0 ? (
            suggestions.map((ticker, index) => (
              <div
                key={ticker.symbol}
                className={`${styles.suggestion} ${
                  index === activeSuggestion ? styles.active : ''
                }`}
                onClick={() => handleSuggestionClick(ticker)}
              >
                <div className={styles.symbol}>{ticker.symbol}</div>
                <div className={styles.name}>{ticker.name || ticker.shortname || ticker.longname || ''}</div>
                {ticker.exchDisp && (
                  <div className={styles.exchDisp}>
                    {ticker.exchDisp.toLowerCase().includes('bombay') ? 'BSE' : ticker.exchDisp}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.noResults}>
              No tickers found for "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TickerSearch;

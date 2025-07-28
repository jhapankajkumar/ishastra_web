import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createInvestment, updateInvestment, getInvestmentById } from '../api/investmentApi';
import { getAllRecommendations } from '../api/recommendationApi';
import { searchTickers, getCurrentPrice } from '../api/tickerApi';
import { useNotification } from '../components/NotificationProvider';
import styles from './InvestmentForm.module.css';

const InvestmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notification = useNotification();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [tickerSuggestions, setTickerSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    buy_price: '',
    invested_on: new Date().toISOString().split('T')[0],
    notes: '',
    recommendation_id: '',
    status: 'open'
  });

  const [errors, setErrors] = useState({});

  // Load investment data for editing
  useEffect(() => {
    if (isEditing) {
      loadInvestment();
    }
    loadRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch current price when ticker changes
  useEffect(() => {
    if (formData.ticker && formData.ticker.length >= 1) {
      fetchCurrentPrice(formData.ticker);
    }
  }, [formData.ticker]);

  const loadInvestment = async () => {
    try {
      setLoading(true);
      const investment = await getInvestmentById(id);
      setFormData({
        ticker: investment.ticker || '',
        quantity: investment.quantity?.toString() || '',
        buy_price: investment.buy_price?.toString() || '',
        invested_on: investment.invested_on ? investment.invested_on.split('T')[0] : '',
        notes: investment.notes || '',
        recommendation_id: investment.recommendation_id || '',
        status: investment.status || 'open'
      });
    } catch (error) {
      console.error('Error loading investment:', error);
      if (notification) {
        notification.error('Failed to load investment');
      } else {
        console.error('Failed to load investment');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await getAllRecommendations('active');
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  };

  const fetchCurrentPrice = async (ticker) => {
    if (!ticker) return;
    
    try {
      setPriceLoading(true);
      const response = await getCurrentPrice(ticker);
      if (response.data && response.data.price) {
        setCurrentPrice(response.data.price);
      } else {
        setCurrentPrice(null);
      }
    } catch (error) {
      console.error('Error fetching current price:', error);
      setCurrentPrice(null);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleTickerSearch = async (value) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (value.length < 1) {
      setTickerSuggestions([]);
      return;
    }

    // Set a new timeout for API call
    const timeoutId = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await searchTickers(value);
        
        if (response.data && Array.isArray(response.data)) {
          // Format the results for display
          const formatted = response.data
            .filter(item => item.symbol && item.typeDisp)
            .slice(0, 8)
            .map(item => ({
              symbol: item.symbol,
              name: item.shortname || item.longname || item.symbol,
              type: item.typeDisp,
              exchange: item.exchDisp || item.exchange
            }));
          
          setTickerSuggestions(formatted);
        }
      } catch (error) {
        console.error('Error searching tickers:', error);
        setTickerSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce

    setSearchTimeout(timeoutId);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.ticker.trim()) {
      newErrors.ticker = 'Ticker symbol is required';
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    if (!formData.buy_price || parseFloat(formData.buy_price) <= 0) {
      newErrors.buy_price = 'Valid buy price is required';
    }

    if (!formData.invested_on) {
      newErrors.invested_on = 'Investment date is required';
    }

    // Check if date is not in the future (allow today)
    const investmentDate = new Date(formData.invested_on);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    investmentDate.setHours(0, 0, 0, 0);
    if (investmentDate > today) {
      newErrors.invested_on = 'Investment date cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'ticker') {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, [name]: upperValue }));
      handleTickerSearch(upperValue);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTickerSelect = (tickerObj) => {
    const symbol = typeof tickerObj === 'string' ? tickerObj : tickerObj.symbol;
    setFormData(prev => ({ ...prev, ticker: symbol }));
    setTickerSuggestions([]);
    fetchCurrentPrice(symbol);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      if (notification) {
        notification.error('Please fix form errors');
      } else {
        console.error('Please fix form errors');
      }
      return;
    }

    try {
      setSaving(true);


      // Map frontend fields to backend expected fields
      const investmentData = {
        ticker: formData.ticker.toUpperCase(),
        qty: parseInt(formData.quantity),
        buy_average: parseFloat(formData.buy_price),
        investment_date: formData.invested_on,
        remark: formData.notes,
        status: formData.status,
        // Only include recommendation_id if not empty
        ...(formData.recommendation_id ? { recommendation_id: formData.recommendation_id } : {})
      };

      if (isEditing) {
        await updateInvestment(id, investmentData);
        if (notification) {
          notification.success('Investment updated successfully');
        } else {
          console.log('Investment updated successfully');
        }
      } else {
        await createInvestment(investmentData);
        if (notification) {
          notification.success('Investment created successfully');
        } else {
          console.log('Investment created successfully');
        }
      }

      navigate('/investments');
    } catch (error) {
      console.error('Error saving investment:', error);
      if (notification) {
        notification.error(
          error.response?.data?.message || 'Failed to save investment'
        );
      } else {
        console.error(error.response?.data?.message || 'Failed to save investment');
      }
    } finally {
      setSaving(false);
    }
  };

  const calculateInvestmentValue = () => {
    const quantity = parseInt(formData.quantity) || 0;
    const price = parseFloat(formData.buy_price) || 0;
    return quantity * price;
  };

  const calculateCurrentValue = () => {
    const quantity = parseInt(formData.quantity) || 0;
    if (currentPrice && quantity > 0) {
      return quantity * currentPrice;
    }
    return null;
  };

  const calculateUnrealizedPL = () => {
    const invested = calculateInvestmentValue();
    const current = calculateCurrentValue();
    if (current && invested > 0) {
      return current - invested;
    }
    return null;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading investment...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{isEditing ? 'Edit Investment' : 'Add New Investment'}</h1>
        <p>Track your long-term investment positions</p>
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Basic Information</h2>
            
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label htmlFor="ticker" className={styles.label}>Ticker Symbol *</label>
                <div className={styles.tickerInputWrapper}>
                  <input
                    type="text"
                    id="ticker"
                    name="ticker"
                    value={formData.ticker}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.ticker ? styles.inputError : ''}`}
                    placeholder="e.g., AAPL, MSFT"
                    disabled={saving}
                    autoComplete="off"
                  />
                  {tickerSuggestions.length > 0 && (
                    <div className={styles.suggestions}>
                      {searchLoading && (
                        <div className={styles.suggestionItem}>
                          <span className={styles.searchLoading}>Searching...</span>
                        </div>
                      )}
                      {!searchLoading && tickerSuggestions.map(ticker => (
                        <div
                          key={ticker.symbol}
                          className={styles.suggestionItem}
                          onClick={() => handleTickerSelect(ticker)}
                        >
                          <div className={styles.tickerInfo}>
                            <span className={styles.tickerSymbol}>{ticker.symbol}</span>
                            <span className={styles.tickerName}>{ticker.name}</span>
                          </div>
                          <div className={styles.tickerMeta}>
                            <span className={styles.tickerType}>{ticker.type}</span>
                            {ticker.exchange && (
                              <span className={styles.tickerExchange}>{ticker.exchange}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.ticker && <span className={styles.error}>{errors.ticker}</span>}
                
                {formData.ticker && (
                  <div className={styles.priceInfo}>
                    {priceLoading ? (
                      <span className={styles.priceLoading}>Fetching current price...</span>
                    ) : currentPrice ? (
                      <span className={styles.currentPrice}>
                        Current Price: ${currentPrice.toFixed(2)}
                      </span>
                    ) : (
                      <span className={styles.noPrice}>Price not available</span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="recommendation_id" className={styles.label}>Linked Recommendation</label>
                <select
                  id="recommendation_id"
                  name="recommendation_id"
                  value={formData.recommendation_id}
                  onChange={handleInputChange}
                  className={styles.select}
                  disabled={saving}
                >
                  <option value="">None (Direct Investment)</option>
                  {recommendations.map(rec => (
                    <option key={rec.id} value={rec.id}>
                      {rec.ticker} - {rec.type} (${rec.target_price})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label htmlFor="quantity" className={styles.label}>Quantity *</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.quantity ? styles.inputError : ''}`}
                  placeholder="Number of shares"
                  min="1"
                  disabled={saving}
                />
                {errors.quantity && <span className={styles.error}>{errors.quantity}</span>}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="buy_price" className={styles.label}>Buy Price ($) *</label>
                <div className={styles.priceInputWrapper}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="number"
                    id="buy_price"
                    name="buy_price"
                    value={formData.buy_price}
                    onChange={handleInputChange}
                    className={`${styles.input} ${styles.priceInput} ${errors.buy_price ? styles.inputError : ''}`}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    disabled={saving}
                  />
                </div>
                {errors.buy_price && <span className={styles.error}>{errors.buy_price}</span>}
              </div>
            </div>

            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label htmlFor="invested_on" className={styles.label}>Investment Date *</label>
                <input
                  type="date"
                  id="invested_on"
                  name="invested_on"
                  value={formData.invested_on}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.invested_on ? styles.inputError : ''}`}
                  disabled={saving}
                />
                {errors.invested_on && <span className={styles.error}>{errors.invested_on}</span>}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="status" className={styles.label}>Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={styles.select}
                  disabled={saving}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Investment Notes</h2>
            
            <div className={styles.fieldGroup}>
              <label htmlFor="notes" className={styles.label}>Notes & Analysis</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className={styles.textarea}
                placeholder="Investment thesis, reasons, or any other notes..."
                rows="4"
                disabled={saving}
              />
            </div>
          </div>

          <div className={styles.submitSection}>
            <button
              type="button"
              onClick={() => navigate('/investments')}
              className={styles.cancelButton}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditing ? 'Update Investment' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvestmentForm;

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRecommendation, updateRecommendation, getRecommendationById } from "../api/recommendationApi";
import PageHeader from "../components/PageHeader";
import ErrorPage from "../components/ErrorPage";
import { useNotification } from "../components/NotificationProvider";
import TickerSearch from "../components/TickerSearch";
import styles from "./RecommendationForm.module.css";
import {getCurrentPrice } from '../api/tickerApi';

export default function RecommendationForm() {   
  const [form, setForm] = useState({
    ticker: '',
    buyBelow: '',
    currentPrice: '',
    source: 'Finology',
    sector: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const notification = useNotification();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      loadRecommendation();
    }
  }, [id, isEdit]);

  const loadRecommendation = async () => {
    try {
      setInitialLoading(true);
      const response = await getRecommendationById(id);
      const rec = response.data;
      setForm({
        ticker: rec.ticker || '',
        buyBelow: rec.buy_below?.toString() || '',
        source: rec.source || '',
        sector: rec.sector.toUpperCase() || '',
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load recommendation:', err);
      setError(err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const handleTickerChange = (ticker) => { }
  const handleTickerSelect = (ticker) => {
    const symbol = typeof ticker === 'string' ? ticker : ticker.symbol;
    fetchCurrentPrice(symbol);
    console.log('Ticker selected:', ticker);
    console.log('Ticker symbol:', symbol);
    console.log('Ticker sector:', ticker.sector || '');

    setForm(prev => ({ ...prev, ticker: symbol, sector: ticker.sector || '' }));
  };

  const fetchCurrentPrice = async (ticker) => {
      if (!ticker) return;
      try {
        const response = await getCurrentPrice(ticker);
        if (response.data && response.data.price) {
          setForm(prev => ({ ...prev, currentPrice: response.data.price }));
        } else {
            setForm(prev => ({ ...prev, currentPrice: 0 }));
        }
      } catch (error) {
        console.error('Error fetching current price:', error);
        setForm(prev => ({ ...prev, currentPrice: 0 }));
      } finally {
      }
    };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.ticker || !form.buyBelow) {
      notification.error('Ticker and Buy Below price are required');
      return;
    }

    setLoading(true);
    
    try {
      const formData = {
        ...form,
        sector: form.sector.toUpperCase(),
        buyBelow: parseFloat(form.buyBelow)
      };

      if (isEdit) {
        await updateRecommendation(id, formData);
        notification.success('Recommendation updated successfully!');
      } else {
        await createRecommendation(formData);
        notification.success('Recommendation created successfully!');
      }
      
      navigate('/recommendations');
    } catch (err) {
      console.error('Failed to save recommendation:', err);
      notification.error(err.message || 'Failed to save recommendation');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (isEdit) {
      loadRecommendation();
    }
  };

  if (initialLoading) {
    return (
      <div className={styles.container}>
        <PageHeader 
          title={isEdit ? "Edit Recommendation" : "Add Recommendation"}
          subtitle="Loading..."
          showBackButton={true}
          onBackClick={() => navigate('/recommendations')}
        />
        <div className={styles.loading}>Loading recommendation data...</div>
      </div>
    );
  }

  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader 
        title={isEdit ? "Edit Recommendation" : "Add New Recommendation"}
        subtitle={isEdit ? "Update stock recommendation details" : "Add a new stock recommendation to track"}
        showBackButton={true}
        onBackClick={() => navigate('/recommendations')}
      />

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Basic Information</h3>
            
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Stock Ticker *</label>
                <TickerSearch 
                  value={form.ticker}
                  onChange={handleTickerChange}
                  onSelect={handleTickerSelect}
                  placeholder="e.g., TCS, RELIANCE"
                  apiSource="yahoo"
                  instrumentType={"Stocks"}  // Assuming Stocks as default, can be dynamic based on user selection
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Buy Below Price (₹) *</label>
                <input
                  type="number"
                  name="buyBelow"
                  value={form.buyBelow}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g., 3200"
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Source</label>
                <input
                  type="text"
                  name="source"
                  value={form.source}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g., Motilal Oswal, XYZ Newsletter"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Sector</label>
                <input
                  type="text"
                  name="sector"
                  value={form.sector}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g., IT, Banking, Pharma"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className={styles.submitSection}>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={() => navigate('/recommendations')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Recommendation' : 'Create Recommendation')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

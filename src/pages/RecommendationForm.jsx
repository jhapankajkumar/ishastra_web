import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRecommendation, updateRecommendation, getRecommendationById } from "../api/recommendationApi";
import PageHeader from "../components/PageHeader";
import ErrorPage from "../components/ErrorPage";
import { useNotification } from "../components/NotificationProvider";
import TickerSearch from "../components/TickerSearch";
import styles from "./RecommendationForm.module.css";

export default function RecommendationForm() {
  const [form, setForm] = useState({
    ticker: '',
    buy_below: '',
    notes: '',
    source: '',
    sector: '',
    reviewed_on: ''
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
        buy_below: rec.buy_below?.toString() || '',
        notes: rec.notes || '',
        source: rec.source || '',
        sector: rec.sector || '',
        reviewed_on: rec.reviewed_on || ''
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

  const handleTickerChange = (ticker) => {
    setForm(prev => ({ ...prev, ticker }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.ticker || !form.buy_below) {
      notification.error('Ticker and Buy Below price are required');
      return;
    }

    setLoading(true);
    
    try {
      const formData = {
        ...form,
        buy_below: parseFloat(form.buy_below)
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
                  placeholder="e.g., TCS, RELIANCE"
                  apiSource="yahoo"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Buy Below Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="buy_below"
                  value={form.buy_below}
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

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Reviewed On</label>
                <input
                  type="date"
                  name="reviewed_on"
                  value={form.reviewed_on}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Additional Notes</h3>
            
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Notes & Analysis</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                className={styles.textarea}
                rows="4"
                placeholder="Add any analysis, reasoning, or additional notes about this recommendation..."
              />
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

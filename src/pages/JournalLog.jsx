import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./JournalLog.module.css";
import PageHeader from "../components/PageHeader";
import TickerSearch from "../components/TickerSearch";
import { createJournal } from '../api/journalApi';
import { useNotification } from '../components/NotificationProvider';
import ErrorPage from '../components/ErrorPage';
import { getTickerBySymbol } from '../data/tickerData';

const initialState = {
  date: "",
  stock: "",
  companyName: "",
  trend: "",
  candle_type: "",
  near_support: false,
  near_resistance: false,
  support_level: "",
  resistance_level: "",
  ema_touch: false,
  volume_spike: false,
  rsi_value: "",
  entry_considered: false,
  action_plan: "",
  notes: "",
  screenshot: null,
};

export default function JournalLog({ onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get today's date in YYYY-MM-DD format for max date validation
  const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();
  const notification = useNotification();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleFileChange = (e) => {
    const { files } = e.target;
    setForm((prev) => ({ ...prev, screenshot: files[0] || null }));
  };

  // Handle ticker search change (when user types)
  const handleTickerChange = (value) => {
    setForm((prev) => ({ 
      ...prev, 
      stock: value,
      companyName: "" // Clear company name when ticker changes
    }));
  };

  // Handle ticker selection (when user selects from dropdown)
  const handleTickerSelect = (tickerData) => {
    setForm((prev) => ({ 
      ...prev, 
      stock: tickerData.symbol,
      companyName: tickerData.name // Auto-populate company name
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create form data without frontend-only fields
      const { companyName, ...formDataForBackend } = form;
      
      await createJournal(formDataForBackend);
      notification.success("Journal entry added successfully!");
      navigate("/journal", { replace: true });
      window.location.reload();
    } catch (err) {
      console.error('Operation failed:', err);
      let errorMessage = "Operation failed. Please try again.";
      
      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.type === 'SERVER_ERROR') {
        errorMessage = "Server error. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      notification.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    // Retry loading the initial data
    window.location.reload();
  };

  // Show error page if there's a network error during initial load
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
      {!onSubmit && (
        <PageHeader 
          title="Add Chart Reading"
          subtitle="Log your chart analysis and market observations"
        />
      )}

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.basicTitle}`}>
              Basic Information
            </h3>
            
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  max={today}
                  className={`${styles.input} ${styles.inputEnabled}`}
                  title="Select the date for this chart reading (today or earlier)"
                  placeholder="Select date..."
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Stock Symbol</label>
                <TickerSearch
                  value={form.stock}
                  onChange={handleTickerChange}
                  onSelect={handleTickerSelect}
                  placeholder="Search ticker (e.g. AAPL, RELIANCE)"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  className={`${styles.input} ${styles.inputDisabled}`}
                  placeholder="Auto-populated when ticker is selected"
                  disabled
                  readOnly
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Overall Trend</label>
                <select
                  name="trend"
                  value={form.trend}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputEnabled}`}
                  required
                >
                  <option value="">Select trend...</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Sideways">Sideways</option>
                  <option value="Uncertain">Uncertain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technical Analysis Section */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.technicalTitle}`}>
              Technical Analysis
            </h3>
            
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Candle Type</label>
                <select
                  name="candle_type"
                  value={form.candle_type}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputEnabled}`}
                >
                  <option value="">Select candle type...</option>
                  <option value="Doji">Doji</option>
                  <option value="Hammer">Hammer</option>
                  <option value="Shooting Star">Shooting Star</option>
                  <option value="Engulfing">Engulfing</option>
                  <option value="Spinning Top">Spinning Top</option>
                  <option value="Long Body">Long Body</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>RSI Value</label>
                <input
                  type="number"
                  name="rsi_value"
                  value={form.rsi_value}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputEnabled}`}
                  placeholder="0-100"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Support Level</label>
                <input
                  type="number"
                  name="support_level"
                  value={form.support_level}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputEnabled}`}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Resistance Level</label>
                <input
                  type="number"
                  name="resistance_level"
                  value={form.resistance_level}
                  onChange={handleChange}
                  className={`${styles.input} ${styles.inputEnabled}`}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            {/* Boolean Fields */}
            <div className={styles.checkboxGrid}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="near_support"
                  name="near_support"
                  checked={form.near_support}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <label htmlFor="near_support" className={styles.checkboxLabel}>
                  Near Support
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="near_resistance"
                  name="near_resistance"
                  checked={form.near_resistance}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <label htmlFor="near_resistance" className={styles.checkboxLabel}>
                  Near Resistance
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="ema_touch"
                  name="ema_touch"
                  checked={form.ema_touch}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <label htmlFor="ema_touch" className={styles.checkboxLabel}>
                  EMA Touch
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="volume_spike"
                  name="volume_spike"
                  checked={form.volume_spike}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <label htmlFor="volume_spike" className={styles.checkboxLabel}>
                  Volume Spike
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="entry_considered"
                  name="entry_considered"
                  checked={form.entry_considered}
                  onChange={handleChange}
                  className={styles.checkbox}
                />
                <label htmlFor="entry_considered" className={styles.checkboxLabel}>
                  Entry Considered
                </label>
              </div>
            </div>
          </div>

          {/* Analysis Section */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.analysisTitle}`}>
              Analysis & Notes
            </h3>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Action Plan</label>
              <textarea
                name="action_plan"
                value={form.action_plan}
                onChange={handleChange}
                rows={4}
                className={`${styles.textarea} ${styles.inputEnabled}`}
                placeholder="What's your plan based on this analysis?"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={6}
                className={`${styles.textarea} ${styles.inputEnabled}`}
                placeholder="Additional observations, insights, or thoughts..."
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Chart Screenshot</label>
              <input
                type="file"
                name="screenshot"
                accept="image/*"
                onChange={handleFileChange}
                className={`${styles.fileInput} ${styles.inputEnabled}`}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? "Processing..." : "Add Journal Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}

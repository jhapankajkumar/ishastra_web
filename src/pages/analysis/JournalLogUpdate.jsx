import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./JournalLog.module.css";
import PageHeader from "../../components/PageHeader";
import TickerSearch from "../../components/TickerSearch";
import { updateJournal, getJournalById } from '../../api/journalApi';
import { fetchSetups } from '../../api/firebaseMetaApi';
import { useNotification } from '../../components/NotificationProvider';
import ErrorPage from '../../components/ErrorPage';
import { getTickerBySymbol } from '../../data/tickerData';

const todayStr = new Date().toISOString().split('T')[0];

export default function JournalLogUpdate() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [setups, setSetups] = useState([]);
  const [setupsLoaded, setSetupsLoaded] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();
  const notification = useNotification();
  const { id } = useParams();

  useEffect(() => {
    setSetupsLoaded(false);
    fetchSetups().then((data) => {
      setSetups(data || []);
      setSetupsLoaded(true);
    }).catch(() => setSetupsLoaded(true));
  }, []);

  useEffect(() => {
    setInitialLoading(true);
    getJournalById(id)
      .then(res => {
        const journal = res.data;
        setForm({
          date: journal.date ? new Date(journal.date).toISOString().split('T')[0] : "",
          stock: journal.stock || "",
          companyName: getTickerBySymbol(journal.stock)?.name || "",
          trend: journal.trend || "",
          candle_type: journal.candle_type || "",
          near_support: journal.near_support || false,
          near_resistance: journal.near_resistance || false,
          support_level: journal.support_level?.toString() || "",
          resistance_level: journal.resistance_level?.toString() || "",
          ema_touch: journal.ema_touch || false,
          volume_spike: journal.volume_spike || false,
          rsi_value: journal.rsi_value?.toString() || "",
          entry_considered: journal.entry_considered || false,
          action_plan: journal.action_plan || "",
          notes: journal.notes || "",
          screenshot: null,
          reviewScreenshot: null,
        });
        setError(null);
      })
      .catch(err => {
        setError(err);
        notification.error('Failed to load journal for editing');
      })
      .finally(() => setInitialLoading(false));
  }, [id, notification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { files, name } = e.target;
    setForm((prev) => ({ ...prev, [name]: files[0] || null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { companyName, ...formDataForBackend } = form;
      await updateJournal(id, formDataForBackend);
      notification.success("Journal entry updated successfully!");
      navigate("/journal", { replace: true });
      window.location.reload();
    } catch (err) {
      let errorMessage = "Failed to update journal entry. Please try again.";
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
    window.location.reload();
  };

  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  if (initialLoading || !form) {
    return (
      <div className={styles.container}>
        <PageHeader 
          title="Update Chart Reading"
          subtitle="Loading journal data..."
        />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#9CA3AF' }}>
          Loading journal data for editing...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <PageHeader 
        title="Update Chart Reading"
        subtitle="Update your chart analysis and observations"
      />
      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          {/* Basic Info Section (read-only) */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.basicTitle}`}>Basic Information</h3>
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Date</label>
                <input type="date" name="date" value={form.date} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Stock Symbol</label>
                <TickerSearch value={form.stock} disabled apiSource="yahoo" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Company Name</label>
                <input type="text" name="companyName" value={form.companyName} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Overall Trend</label>
                <select name="trend" value={form.trend} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly>
                  <option value="">Select trend...</option>
                  <option value="Bullish">Bullish</option>
                  <option value="Bearish">Bearish</option>
                  <option value="Sideways">Sideways</option>
                  <option value="Uncertain">Uncertain</option>
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setup Type</label>
                <select name="setup_type" value={form.setup_type} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly>
                  <option value="">{setupsLoaded ? "Select setup..." : "Loading..."}</option>
                  {setups.map((setup) => (
                    <option key={setup.id} value={setup.id}>{setup.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Setup Confidence</label>
                <select name="setup_confidence" value={form.setup_confidence} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly>
                  <option value="">Select confidence...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technical Analysis Section (read-only) */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.technicalTitle}`}>Technical Analysis (Read-only)</h3>
            <div className={styles.gridTwoCol}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Candle Type</label>
                <select name="candle_type" value={form.candle_type} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly>
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
                <input type="number" name="rsi_value" value={form.rsi_value} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Support Level</label>
                <input type="number" name="support_level" value={form.support_level} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Resistance Level</label>
                <input type="number" name="resistance_level" value={form.resistance_level} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
              </div>
            </div>
            <div className={styles.checkboxGrid}>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="near_support" name="near_support" checked={form.near_support} className={styles.checkbox} disabled readOnly />
                <label htmlFor="near_support" className={styles.checkboxLabel}>Near Support</label>
              </div>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="near_resistance" name="near_resistance" checked={form.near_resistance} className={styles.checkbox} disabled readOnly />
                <label htmlFor="near_resistance" className={styles.checkboxLabel}>Near Resistance</label>
              </div>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="ema_touch" name="ema_touch" checked={form.ema_touch} className={styles.checkbox} disabled readOnly />
                <label htmlFor="ema_touch" className={styles.checkboxLabel}>EMA Touch</label>
              </div>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="volume_spike" name="volume_spike" checked={form.volume_spike} className={styles.checkbox} disabled readOnly />
                <label htmlFor="volume_spike" className={styles.checkboxLabel}>Volume Spike</label>
              </div>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="entry_considered" name="entry_considered" checked={form.entry_considered} className={styles.checkbox} disabled readOnly />
                <label htmlFor="entry_considered" className={styles.checkboxLabel}>Potential Trade</label>
              </div>
            </div>
          </div>

          {/* Review Section (editable) */}
          <div className={styles.card}>
            <h3 className={`${styles.cardTitle} ${styles.technicalTitle}`}>Review Analysis</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Updated Analysis & Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} className={`${styles.textarea} ${styles.inputEnabled}`} placeholder="Add your updated analysis, observations, and learnings..." rows="6" />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Review Chart Screenshot</label>
              <div className={styles.fileInputWrapper}>
                <input type="file" id="reviewScreenshot" name="reviewScreenshot" accept="image/*" onChange={handleFileChange} className={styles.customFileInput} />
                <label htmlFor="reviewScreenshot" className={`${styles.fileInputLabel} ${form.reviewScreenshot ? styles.hasFile : ''}`}>{form.reviewScreenshot ? form.reviewScreenshot.name : 'Choose review screenshot'}</label>
                {form.reviewScreenshot && (<div className={styles.fileName}>{form.reviewScreenshot.name}</div>)}
              </div>
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? "Processing..." : "Update Journal Entry"}
          </button>
        </form>
      </div>
    </div>
  );
}

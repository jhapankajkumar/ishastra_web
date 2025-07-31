
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./JournalLogUpdate.module.css";
import PageHeader from "../../components/PageHeader";
import { updateJournal, getJournalById } from '../../api/journalApi';
import { fetchSetups } from '../../api/firebaseMetaApi';
import { useNotification } from '../../components/NotificationProvider';
import ErrorPage from '../../components/ErrorPage';
import ImageGallery from '../../components/ImageGallery';
import CommonAddChart from "../../components/CommonAddChart";


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
        const journal = res.data.analysis;
        setForm({
          date: journal.entryDate ? new Date(journal.entryDate).toISOString().split('T')[0] : "",
          stock: journal.ticker || "",
          trend: journal.trend || "",
          candleType: journal.candleType || "",
          nearSupport: journal.nearSupport || false,
          nearResistance: journal.nearResistance || false,
          supportLevel: journal.supportLevel?.toString() || "",
          resistanceLevel: journal.resistanceLevel?.toString() || "",
          emaTouch: journal.emaTouch || false,
          volumeSpike: journal.volumeSpike || false,
          rsiValue: journal.rsiValue?.toString() || "",
          entryConsidered: journal.entryConsidered || false,
          actionPlan: journal.actionPlan || "",
          notes: journal.entryNotes || "",
          reviewNotes: journal.reviewNotes || "",
          reviewCharts: journal.reviewCharts || [],
        });
        setError(null);
      })
      .catch(err => {
        setError(err);
        console.error('Error fetching journal for update:', err);
        notification.error('Failed to load journal for editing');
      })
      .finally(() => setInitialLoading(false));
  }, [id, notification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { files } = e.target;
    setForm(prev => ({ ...prev, reviewCharts: Array.from(files) }));
  };

  const removeEntryChart = (index) => {
    setForm(prev => ({
      ...prev,
      reviewCharts: prev.reviewCharts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { companyName, ...formDataForBackend } = form;
      await updateJournal(id, formDataForBackend);
      notification.success("Journal entry updated successfully!");
      // navigate("/journal", { replace: true });
      // window.location.reload();
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

  // --- Helper for display ---
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = d.toLocaleString('en-US', { month: 'short' });
    const yyyy = d.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
  };

  const getTrendColor = (trend) => {
    switch (trend?.toLowerCase()) {
      case 'bullish': return '#10B981';
      case 'bearish': return '#EF4444';
      case 'sideways': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  // --- UI ---
  return (
    <div className={styles.container}>
      <PageHeader
        title="Update Chart Reading"
        subtitle="Update your chart analysis and observations"
      />
      <div className={styles.journalUpdateContainer}>
        {/* Header */}
        <div className={styles.journalHeader}>
          <div className={styles.journalHeaderRow}>
            <div className={styles.journalTrendDot} style={{ backgroundColor: getTrendColor(form.trend) }}></div>
            <h1 className={styles.journalTitle}>{form.stock}</h1>
          </div>
          <p className={styles.journalSubtitle}>Chart Reading Analysis - {formatDate(form.date)}</p>
          <p className={styles.journalTicker}>{form.stock}</p>
        </div>

        {/* Basic Info Section */}
        <div className={styles.journalCard}>
          <h3 className={styles.journalCardTitle}>Basic Information</h3>
          <div className={styles.journalGridInfo}>
            <div>
              <label className={styles.journalLabel}>Date</label>
              <span className={styles.journalValue}>{formatDate(form.date)}</span>
            </div>
            <div>
              <label className={styles.journalLabel}>Overall Trend</label>
              <span className={styles.journalTrendValue} style={{ color: getTrendColor(form.trend), backgroundColor: getTrendColor(form.trend) + '20' }}>{form.trend || "Not specified"}</span>
            </div>
            <div>
              <label className={styles.journalLabel}>Candle Type</label>
              <span className={styles.journalValue}>{form.candleType || "-"}</span>
            </div>
            <div>
              <label className={styles.journalLabel}>Entry Considered</label>
              <span className={form.entryConsidered ? styles.journalYes : styles.journalNo}>{form.entryConsidered ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>

        {/* Technical Analysis Section */}
        <div className={styles.journalCard}>
          <h3 className={styles.journalCardTitleTech}>Technical Analysis</h3>
          <div className={styles.journalGridInfo}>
            <div>
              <label className={styles.journalLabel}>Support Level</label>
              <span className={styles.journalValue}>{form.supportLevel ? `$${Number(form.supportLevel).toFixed(2)}` : "-"}</span>
            </div>
            <div>
              <label className={styles.journalLabel}>Resistance Level</label>
              <span className={styles.journalValue}>{form.resistanceLevel ? `$${Number(form.resistanceLevel).toFixed(2)}` : "-"}</span>
            </div>
            <div>
              <label className={styles.journalLabel}>RSI Value</label>
              <span className={styles.journalValue}>{form.rsiValue ? Number(form.rsiValue).toFixed(1) : "-"}</span>
            </div>
          </div>
          <div className={styles.journalIndicatorsGrid}>
            {[
              { key: 'nearSupport', label: 'Near Support' },
              { key: 'nearResistance', label: 'Near Resistance' },
              { key: 'emaTouch', label: 'EMA Touch' },
              { key: 'volumeSpike', label: 'Volume Spike' }
            ].map(indicator => (
              <div key={indicator.key} className={form[indicator.key] ? styles.journalIndicatorActive : styles.journalIndicatorInactive}>
                <div className={styles.journalIndicatorDot} style={{ backgroundColor: form[indicator.key] ? "#10B981" : "#6B7280" }}></div>
                <span className={form[indicator.key] ? styles.journalIndicatorLabelActive : styles.journalIndicatorLabelInactive}>{indicator.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Review Section (read-only + editable) */}
        <div className={styles.journalCard}>
          <h3 className={styles.journalCardTitleReview}>Review Analysis</h3>

          {/* Show actionPlan and notes in read-only mode */}
          {form.actionPlan && (
            <div className={styles.journalReadOnlyBlock}>
              <label className={styles.journalLabel}>Action Plan</label>
              <div className={styles.journalReadOnlyValue}>{form.actionPlan}</div>
            </div>
          )}
          {form.notes && (
            <div className={styles.journalReadOnlyBlock}>
              <label className={styles.journalLabel}>Original Notes</label>
              <div className={styles.journalReadOnlyValue}>{form.notes}</div>
            </div>
          )}

          {/* Editable review notes and chart upload */}
          <form onSubmit={handleSubmit}>
            <div className={styles.journalFormGroup}>
              <label className={styles.journalLabel}>Updated Analysis & Notes</label>
              <textarea name="reviewNotes" value={form.reviewNotes} onChange={handleChange} className={styles.journalTextarea} placeholder="Add your updated analysis, observations, and learnings..." rows="6" />
            </div>
            <CommonAddChart
              addChart={handleFileChange}
              removeChart={removeEntryChart}
              charts={form.reviewCharts}
              title="Review Charts"
            />
            <div style={{ marginTop: '20px' }}></div>
            <button type="submit" className={styles.journalSubmitButton} disabled={loading}>
              {loading ? "Processing..." : "Update Journal Entry"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

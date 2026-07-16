import React, { useRef, useState } from 'react';
import axios from 'axios';
import config from '../config/environment';
import TickerSearch from '../components/TickerSearch';
import styles from './QuickReview.module.css';

export default function QuickReview() {
  const [selectedTicker, setSelectedTicker] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [uploadedImage, setUploadedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportHtml, setReportHtml] = useState(null);
  const [reportFileName, setReportFileName] = useState(null);
  const fileInputRef = useRef();
  const reportPreviewRef = useRef();

  const handleTickerChange = (value) => {
    setSelectedTicker(value);
  };

  const handleTickerSelect = (tickerData) => {
    setSelectedTicker(tickerData.symbol);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
      setPreview(event.target.result);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setReportHtml(null);

    if (!selectedTicker) {
      setError('Please enter a stock symbol');
      return;
    }
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    if (!uploadedImage) {
      setError('Please upload a chart image');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('symbol', selectedTicker);
      formData.append('asOfDate', selectedDate);

      // Convert base64 to blob
      const response = await fetch(uploadedImage);
      const blob = await response.blob();
      formData.append('image', blob, 'chart.png');

      const result = await axios.post(`${config.API_BASE_URL}/api/ai/quick-review`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for analysis
      });

      setReportHtml(result.data.html);
      setReportFileName(`${selectedTicker}_quick_review_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);

      window.requestAnimationFrame(() => {
        reportPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setError(err?.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportHtml || !reportFileName) return;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(reportHtml));
    element.setAttribute('download', reportFileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.quickReviewContainer}>
      <div className={styles.header}>
        <h1>Quick Review</h1>
        <p>Upload a chart image for instant AI analysis</p>
      </div>

      <div className={styles.formSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Stock Symbol</label>
            <TickerSearch
              value={selectedTicker}
              onChange={handleTickerChange}
              onSelect={handleTickerSelect}
              placeholder="Search for stocks (e.g., AAPL, GOOGL)..."
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Chart Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className={styles.dateInput}
              max={new Date().toISOString().substring(0, 10)}
            />
            <p className={styles.helperText}>The date shown in your chart screenshot</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Chart Image</label>
            <div className={styles.imageUploadArea}>
              {!preview ? (
                <div
                  className={styles.uploadPlaceholder}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <div className={styles.uploadIcon}>📷</div>
                  <p className={styles.uploadText}>Click to upload or drag and drop</p>
                  <p className={styles.uploadSubtext}>PNG, JPG up to 10MB</p>
                </div>
              ) : (
                <div className={styles.imagePreviewContainer}>
                  <img src={preview} alt="Chart preview" className={styles.imagePreview} />
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={handleClearImage}
                  >
                    ✕ Change Image
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.hiddenInput}
              />
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !selectedTicker || !selectedDate || !uploadedImage}
          >
            {loading ? 'Analyzing...' : 'Analyze Chart'}
          </button>
        </form>
      </div>

      {reportHtml && (
        <section className={styles.reportPreview} ref={reportPreviewRef}>
          <div className={styles.reportHeader}>
            <div>
              <h2 className={styles.reportTitle}>Setup Analysis Report</h2>
              <p className={styles.reportMeta}>{reportFileName}</p>
            </div>
            <button
              type="button"
              className={styles.downloadButton}
              onClick={handleDownloadReport}
            >
              ⬇ Download HTML
            </button>
          </div>
          <iframe
            title={`${selectedTicker} quick review report`}
            className={styles.reportFrame}
            srcDoc={reportHtml}
          />
        </section>
      )}
    </div>
  );
}

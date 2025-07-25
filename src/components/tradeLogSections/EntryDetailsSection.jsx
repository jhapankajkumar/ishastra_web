import React from "react";
import TickerSearch from "../TickerSearch";

export default function EntryDetailsSection(props) {
  const { form, handleChange, handleTickerChange, handleTickerSelect, entryDisabled, styles } = props;
  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Entry & Technical Details 🧠</h2>
      <div className={styles.gridTwoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Ticker Symbol</label>
          {entryDisabled ? (
            <input type="text" value={form.ticker} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
          ) : (
            <TickerSearch value={form.ticker} onChange={handleTickerChange} onSelect={handleTickerSelect} placeholder="Search ticker (e.g. AAPL, RELIANCE)" />
          )}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Company Name</label>
          <input type="text" name="companyName" value={form.companyName} className={`${styles.input} ${styles.inputDisabled}`} placeholder="Auto-populated when ticker is selected" disabled readOnly />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Direction</label>
          <select name="direction" value={form.direction} onChange={handleChange} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} disabled={entryDisabled}>
            <option value="Long">Long (Buy)</option>
            <option value="Short">Short (Sell)</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Entry Chart(s)</label>
          <input type="file" name="entryCharts" accept="image/*" multiple onChange={handleChange} disabled={entryDisabled} className={`${styles.fileInput} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Timeframe(s) Used</label>
          <select name="timeframesUsed" value={form.timeframesUsed} onChange={e => handleChange({ target: { name: 'timeframesUsed', value: Array.from(e.target.selectedOptions, option => option.value) } })} multiple className={styles.select} disabled={entryDisabled}>
            <option value="Weekly">Weekly</option>
            <option value="Daily">Daily</option>
            <option value="Hourly">Hourly</option>
            <option value="15min">15min</option>
            <option value="5min">5min</option>
          </select>
        </div>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Reason for Entry</label>
        <textarea name="reasonForEntry" value={form.reasonForEntry} onChange={handleChange} rows={4} className={`${styles.textarea} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} placeholder="Describe your reason for entry..." disabled={entryDisabled} />
      </div>
    </div>
  );
}

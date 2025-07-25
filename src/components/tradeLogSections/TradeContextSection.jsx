import React from "react";

export default function TradeContextSection(props) {
  const { form, handleChange, isReview, isUpdate, setups, setupsLoaded, entryDisabled, styles } = props;
  const safeSetups = Array.isArray(setups) ? setups : [];
  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Trade Context & Setup 🔍</h2>
      <div className={styles.gridTwoCol}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Trade Status</label>
          <select name="tradeStatus" value={form.tradeStatus} onChange={handleChange} className={styles.select} disabled={isReview}>
            <option value="Planned">Planned</option>
            <option value="Executed">Executed</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Instrument Type</label>
          <select name="instrumentType" value={form.instrumentType} onChange={handleChange} className={styles.select} disabled={isReview}>
            <option value="Stocks">Stocks</option>
            <option value="Crypto">Crypto</option>
            <option value="Forex">Forex</option>
            <option value="Options">Options</option>
            <option value="Indices">Indices</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Market</label>
          <select name="market" value={form.market} onChange={handleChange} className={styles.select} disabled={isReview}>
            <option value="India">India</option>
            <option value="US">US</option>
            <option value="Japan">Japan</option>
            <option value="Germany">Germany</option>
            <option value="Canada">Canada</option>
            <option value="Singapore">Singapore</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Position Type</label>
          <select name="positionType" value={form.positionType} onChange={handleChange} className={styles.select} disabled={isReview}>
            <option value="Swing">Swing</option>
            <option value="Positional">Positional</option>
            <option value="Intraday">Intraday</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Setup Type</label>
          {entryDisabled ? (
            <div className={styles.readOnlyField}>
              {!setupsLoaded 
                ? "Loading..." 
                : (setups.find(s => String(s.trade_setup_id) === String(form.setupType))?.name || "N/A")
              }
            </div>
          ) : (
            <select name="setupType" value={form.setupType} onChange={handleChange} className={styles.select} disabled={entryDisabled}>
              <option value="">Select setup...</option>
          {safeSetups.map((setup) => (
            <option key={setup.trade_setup_id} value={setup.trade_setup_id}>{setup.name}</option>
          ))}
            </select>
          )}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Setup Confidence</label>
          <select name="setupConfidence" value={form.setupConfidence} onChange={handleChange} className={styles.select} disabled={entryDisabled}>
            <option value="">Select confidence...</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Tags (optional)</label>
          <input type="text" name="tags" className={styles.input} placeholder="Add tags..." disabled={entryDisabled} />
        </div>
      </div>
    </div>
  );
}

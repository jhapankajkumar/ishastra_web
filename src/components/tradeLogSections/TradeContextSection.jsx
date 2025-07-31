import React from "react";

export default function TradeContextSection(props) {
  const { form, handleChange, isReview, isUpdate, setups, setupsLoaded, entryDisabled, styles } = props;
  const safeSetups = Array.isArray(setups) ? setups : [];

  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Trade Context & Setup 🔍</h2>
      <div className={styles.gridTwoCol}>
        {/* Trade Status removed as per new workflow */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Instrument Type</label>
          <select name="instrumentType" value={form.instrumentType} onChange={handleChange} className={styles.select} disabled={isReview}>
            <option value="Stocks">Stocks</option>
            <option value="ETF">ETF</option>
            <option value="Forex">Forex</option>
            <option value="Indices">Indices</option>
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
                : (setups.find(s => String(s.tradeSetupId) === String(form.setupType))?.name || "N/A")
              }
            </div>
          ) : (
            <select
              name="setupType"
              value={form.setupType}
              onChange={(e) => {
                const value = e.target.value;
                const selectedSetup = safeSetups.find(s => String(s.trade_setup_id) === value);
                console.log('Selected Setup:', selectedSetup); // Debug log
                handleChange({
                  target: {
                    name: "setupType",
                    value,
                    setupName: selectedSetup?.trade_setup_id || 2003
                  }
                });
              }}
              className={styles.select}
              disabled={entryDisabled}
            >
              <option value="">Select setup...</option>
              {safeSetups.map((setup) => (
                <option key={setup.trade_setup_id} value={setup.trade_setup_id}>
                  {setup.name}
                </option>
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
        {/* Tags removed as per new workflow */}
      </div>
    </div>
  );
}

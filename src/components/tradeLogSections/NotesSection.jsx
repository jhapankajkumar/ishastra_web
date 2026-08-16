import React from "react";

export default function NotesSection(props) {
  const { form, handleChange, entryDisabled, styles } = props;
  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Notes & Entry Context</h2>
      
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Reason for Entry</label>
        <textarea name="reasonForEntry" value={form.reasonForEntry} onChange={handleChange} rows={4} className={`${styles.textarea} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} placeholder="Describe your reason for entry..." disabled={entryDisabled} />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Notes</label>
        <textarea
          name="notes"
          value={form.notes || ''}
          onChange={handleChange}
          rows={4}
          className={`${styles.textarea} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
          placeholder="Any additional notes..."
          disabled={entryDisabled}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Entry Chart(s)</label>
        <input type="file" name="entryCharts" accept="image/*,.pdf,application/pdf,.html,.htm,text/html" multiple onChange={handleChange} disabled={entryDisabled} className={`${styles.fileInput} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} />
      </div>
    </div>
  );
}

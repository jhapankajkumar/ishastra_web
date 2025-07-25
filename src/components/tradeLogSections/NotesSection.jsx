import React from "react";

export default function NotesSection(props) {
  const { form, handleChange, entryDisabled, styles } = props;
  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Notes</h2>
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
    </div>
  );
}

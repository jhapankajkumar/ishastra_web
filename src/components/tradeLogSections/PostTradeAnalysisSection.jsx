import React from "react";

export default function PostTradeAnalysisSection(props) {
  const { form, handleChange, postDisabled, styles } = props;
  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Post Trade Analysis</h2>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Analysis Notes</label>
        <textarea
          name="postTradeAnalysis"
          value={form.postTradeAnalysis}
          onChange={handleChange}
          rows={6}
          className={`${styles.textarea} ${postDisabled ? styles.inputDisabled : styles.inputEnabled}`}
          placeholder="Your notes or analysis..."
          disabled={postDisabled}
        />
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Post Trade Files</label>
        <input
          type="file"
          name="postTradeFiles"
          multiple
          onChange={handleChange}
          disabled={postDisabled}
          className={`${styles.fileInput} ${postDisabled ? styles.inputDisabled : styles.inputEnabled}`}
        />
      </div>
    </div>
  );
}

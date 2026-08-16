import React from "react";
import styles from './CommonAddChart.module.css';
export default function CommonAddChart({
    addChart,
    removeChart,
    charts,
    title
}) {

    console.log('CommonAddChart rendered with charts:', charts);

    return (
        <div className={styles.fieldGroup}>
            <label className={styles.label}>{title}</label>
            <input
                type="file"
                name="addChart"
                onChange={addChart}
                className={styles.fileInput}
                multiple
                accept="image/*,.pdf,application/pdf,.html,.htm,text/html"
            />
            {charts.length > 0 && (
                <div className={styles.fileList}>
                    {charts.map((file, index) => (
                        <div key={index} className={styles.fileItem}>
                            <span>{file.name}</span>
                            <button
                                type="button"
                                onClick={() => removeChart(index)}
                                className={styles.removeFileButton}
                            >
                                X
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

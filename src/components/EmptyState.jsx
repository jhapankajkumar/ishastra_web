// src/components/EmptyState.jsx
//
// Shared empty-state for list pages, replacing the bare "No X found" text
// each page previously hand-rolled independently. Icon + short message +
// an optional primary CTA gives a brand-new user (a friend/relative with
// zero context) something to actually do, instead of a blank table.
import React from 'react';
import styles from './EmptyState.module.css';

export default function EmptyState({ icon = '📭', title, message, actionLabel, onAction }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>{icon}</div>
      {title && <h3 className={styles.title}>{title}</h3>}
      {message && <p className={styles.message}>{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className={styles.actionBtn} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

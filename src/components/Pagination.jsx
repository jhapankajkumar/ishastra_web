// src/components/Pagination.jsx
//
// Minimal prev/next pagination, shared across list pages. Real usage
// already produces 60+ row flat tables (Trades, Recommendations) with no
// way to manage that today — this caps rendered rows per page.
import React from 'react';
import styles from './Pagination.module.css';

export default function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ‹ Prev
      </button>
      <span className={styles.info}>Page {page} of {totalPages}</span>
      <button
        type="button"
        className={styles.btn}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next ›
      </button>
    </div>
  );
}

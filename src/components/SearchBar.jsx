// src/components/SearchBar.jsx
//
// One reusable debounced text-search input, shared across list pages
// instead of each page hand-rolling (or, in three of the four pages,
// simply not having) its own search box.
import React, { useState, useEffect, useRef } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar({ value = '', onChange, placeholder = 'Search...', debounceMs = 250 }) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>🔍</span>
      <input
        type="text"
        className={styles.input}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}

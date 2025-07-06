import React, { useState, useEffect } from 'react';
import styles from './Notification.module.css';

const Notification = ({ type, message, duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`${styles.notification} ${styles[type]} ${!isVisible ? styles.fadeOut : ''}`}>
      <div className={styles.content}>
        <div className={styles.icon}>
          {type === 'success' && '✓'}
          {type === 'error' && '✗'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </div>
        <div className={styles.message}>{message}</div>
        <button className={styles.closeButton} onClick={handleClose}>
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;

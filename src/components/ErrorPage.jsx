import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ErrorPage.module.css';

const ErrorPage = ({ 
  title = "Something went wrong", 
  message = "We're having trouble connecting to our servers. Please check your internet connection and try again.", 
  showRetry = true,
  onRetry,
  showHome = true 
}) => {
  const navigate = useNavigate();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="#EF4444" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="#EF4444" strokeWidth="2"/>
          </svg>
        </div>
        
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        
        <div className={styles.actions}>
          {showRetry && (
            <button 
              className={`${styles.button} ${styles.primary}`}
              onClick={handleRetry}
            >
              Try Again
            </button>
          )}
          {showHome && (
            <button 
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleGoHome}
            >
              Go Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;

import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import { useNotification } from '../../components/NotificationProvider';
import styles from './AuthForm.module.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const notify = useNotification();

  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      notify.success('Password reset. Please log in again.');
      navigate('/login');
    } catch (err) {
      const message = err.response?.data?.error || 'This reset link is invalid or has expired.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>Choose a new password. You'll be logged out on all devices.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className={styles.hint}>At least 8 characters.</span>
          </div>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>Back to log in</Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import { useNotification } from '../../components/NotificationProvider';
import styles from './AuthForm.module.css';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const notify = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.updatePassword({ currentPassword, newPassword });
      notify.success('Password updated.');
      navigate('/profile');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update password. Check your current password.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Update password</h1>
        <p className={styles.subtitle}>You'll stay logged in on your other devices.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
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
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/profile" className={styles.link}>Back to profile</Link>
        </div>
      </div>
    </div>
  );
}

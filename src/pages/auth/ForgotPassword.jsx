import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import styles from './AuthForm.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
    } finally {
      // Always show the same success state, whether or not the email has
      // an account — never reveal which emails are registered.
      setSent(true);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot your password?</h1>
        <p className={styles.subtitle}>We'll email you a link to reset it.</p>

        {sent ? (
          <p className={styles.hint}>
            If that email has an account, a reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>Back to log in</Link>
        </div>
      </div>
    </div>
  );
}

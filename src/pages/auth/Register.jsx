import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import { useNotification } from '../../components/NotificationProvider';
import styles from './AuthForm.module.css';

export default function Register() {
  const navigate = useNavigate();
  const notify = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('USD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register({ email, password, preferredCurrency });
      notify.success('Account created. Check your email for a verification code.');
      // Deliberately no auto-login — the user must verify, then log in
      // separately, per the product decision behind this flow.
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Your data stays private and separate from the shared demo sandbox.</p>

        {error && <div className={styles.error}>{error}</div>}

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
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className={styles.hint}>At least 8 characters.</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="preferredCurrency">Trading currency</label>
            <select
              id="preferredCurrency"
              className={styles.select}
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="INR">INR — Indian Rupee</option>
            </select>
            <span className={styles.hint}>
              You'll only be able to deposit capital in this currency. This can't be changed later.
            </span>
          </div>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account? <Link to="/login" className={styles.link}>Log in</Link>
        </div>
      </div>
    </div>
  );
}

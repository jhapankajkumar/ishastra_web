import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import * as authApi from '../../api/authApi';
import { useNotification } from '../../components/NotificationProvider';
import styles from './AuthForm.module.css';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const notify = useNotification();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.verifyOtp({ email, otp });
      notify.success('Email verified. Please log in.');
      navigate('/login');
    } catch (err) {
      const message = err.response?.data?.error || 'Invalid or expired code. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setResending(true);
    setError(null);
    try {
      await authApi.resendOtp({ email });
      notify.info('If that email needs verification, a new code has been sent.');
    } catch (err) {
      notify.error('Could not resend code. Please try again shortly.');
    } finally {
      // Brief cooldown to avoid spamming resend requests / Mailgun.
      setTimeout(() => setResending(false), 15000);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify your email</h1>
        <p className={styles.subtitle}>Enter the 6-digit code we sent to your email address.</p>

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
            <label className={styles.label} htmlFor="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className={styles.input}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              autoComplete="one-time-code"
            />
          </div>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <div className={styles.footer}>
          Didn't get a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className={styles.link}
            style={{ background: 'none', border: 'none', cursor: resending ? 'not-allowed' : 'pointer', padding: 0 }}
          >
            {resending ? 'Resending…' : 'Resend code'}
          </button>
        </div>
        <div className={styles.footer}>
          <Link to="/login" className={styles.link}>Back to log in</Link>
        </div>
      </div>
    </div>
  );
}

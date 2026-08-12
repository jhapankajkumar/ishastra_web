import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';
import { getCapitalInfo, depositCapital, withdrawCapital, getCapitalTransactions } from '../../api/capitalApi';
import styles from './CapitalTransactions.module.css';

function DepositWithdrawModal({ mode, defaultCurrency, lockCurrency, onClose, onSubmit }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency || 'USD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(numericAmount, currency);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{mode === 'deposit' ? 'Deposit funds' : 'Withdraw funds'}</h2>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              className={styles.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="currency">Currency</label>
            <select
              id="currency"
              className={styles.select}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={lockCurrency}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
            {lockCurrency && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Locked to your registered trading currency.
              </span>
            )}
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.withdrawButton}`}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.actionButton} ${styles.depositButton}`}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CapitalTransactions() {
  const { user } = useAuth();
  const notify = useNotification();

  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // 'deposit' | 'withdraw' | null

  const lockCurrency = user?.role !== 'SUPERUSER';
  const defaultCurrency = user?.preferredCurrency || 'USD';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [capitalRes, txRes] = await Promise.all([getCapitalInfo(), getCapitalTransactions()]);
      setBalances(capitalRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      notify.error('Failed to load capital data.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeposit = async (amount, currency) => {
    try {
      await depositCapital(amount, currency);
      notify.success('Deposit successful.');
      setModalMode(null);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleWithdraw = async (amount, currency) => {
    try {
      await withdrawCapital(amount, currency);
      notify.success('Withdrawal successful.');
      setModalMode(null);
      loadData();
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Capital</h1>

      <div className={styles.balanceRow}>
        {balances.length === 0 && !loading && (
          <div className={styles.balanceCard}>
            <div className={styles.balanceCurrency}>No capital yet</div>
            <div className={styles.balanceAmount}>—</div>
          </div>
        )}
        {balances.map((b) => (
          <div className={styles.balanceCard} key={b.currency}>
            <div className={styles.balanceCurrency}>{b.currency} — Available</div>
            <div className={styles.balanceAmount}>{b.remaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={`${styles.actionButton} ${styles.depositButton}`} onClick={() => setModalMode('deposit')}>
          Deposit
        </button>
        <button className={`${styles.actionButton} ${styles.withdrawButton}`} onClick={() => setModalMode('withdraw')}>
          Withdraw
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : transactions.length === 0 ? (
        <div className={styles.empty}>No transactions yet.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Balance after</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td className={tx.type === 'DEPOSIT' ? styles.typeDeposit : styles.typeWithdraw}>{tx.type}</td>
                <td>{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>{tx.currency}</td>
                <td>{tx.balanceAfter.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalMode && (
        <DepositWithdrawModal
          mode={modalMode}
          defaultCurrency={defaultCurrency}
          lockCurrency={lockCurrency}
          onClose={() => setModalMode(null)}
          onSubmit={modalMode === 'deposit' ? handleDeposit : handleWithdraw}
        />
      )}
    </div>
  );
}

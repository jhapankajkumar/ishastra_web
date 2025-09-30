import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './BuyMorePopup.module.css';

const BuyMorePopup = ({
  open,
  onClose,
  onSubmit,
  initialQuantity,
  initialAvgPrice,
  riskPerShare,
  riskPercent,
  positionValue,
  capitalLeft,
  currency,
  symbol,
  mode // 'buyMore' or 'createTrade'
}) => {
  const [quantity, setQuantity] = useState(initialQuantity || 0);
  const [avgPrice, setAvgPrice] = useState(initialAvgPrice || 0);
  const [totalValue, setTotalValue] = useState(positionValue || 0);
  const [error, setError] = useState('');

  useEffect(() => {
    setTotalValue(quantity * avgPrice);
  }, [quantity, avgPrice]);

  useEffect(() => {
    setQuantity(initialQuantity || 0);
    setAvgPrice(initialAvgPrice || 0);
    setTotalValue((initialQuantity || 0) * (initialAvgPrice || 0));
  }, [open, initialQuantity, initialAvgPrice]);

  const handleQuantityChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setQuantity(Number.isNaN(val) ? 0 : val);
  };

  const handleAvgPriceChange = (e) => {
    const val = parseFloat(e.target.value);
    setAvgPrice(Number.isNaN(val) ? 0 : val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (quantity <= 0 || avgPrice <= 0) {
      setError('Quantity and price must be positive');
      return;
    }
    if (totalValue > capitalLeft) {
      setError('Not enough capital left');
      return;
    }
    setError('');
    onSubmit({ quantity, avgPrice });
  };

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <h2>{mode === 'buyMore' ? `Buy More - ${symbol}` : `Create Trade - ${symbol}`}</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label>Number of Shares</label>
            <input type="number" min="1" value={quantity} onChange={handleQuantityChange} />
          </div>
          <div className={styles.fieldGroup}>
            <label>Average Price</label>
            <input type="number" min="0" step="0.01" value={avgPrice} onChange={handleAvgPriceChange} />
          </div>
          <div className={styles.fieldGroup}>
            <label>Risk per Share</label>
            <input type="text" value={`${currency}${riskPerShare}`} disabled />
          </div>
          <div className={styles.fieldGroup}>
            <label>Risk %</label>
            <input type="text" value={`${riskPercent}%`} disabled />
          </div>
          <div className={styles.fieldGroup}>
            <label>Total Position Value</label>
            <input type="text" value={`${currency}${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} disabled />
          </div>
          <div className={styles.fieldGroup}>
            <label>Capital Left</label>
            <input type="text" value={`${currency}${capitalLeft.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} disabled />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.buyBtn}>{mode === 'buyMore' ? 'BUY' : 'Create Trade'}</button>
        </form>
      </div>
    </div>
  );
};

BuyMorePopup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialQuantity: PropTypes.number,
  initialAvgPrice: PropTypes.number,
  riskPerShare: PropTypes.number,
  riskPercent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  positionValue: PropTypes.number,
  capitalLeft: PropTypes.number,
  currency: PropTypes.string,
  symbol: PropTypes.string,
  mode: PropTypes.oneOf(['buyMore', 'createTrade'])
};

export default BuyMorePopup;

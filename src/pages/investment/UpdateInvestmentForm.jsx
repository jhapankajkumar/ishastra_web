import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { updateInvestment, getInvestmentById } from '../../api/investmentApi';
import { useNotification } from '../../components/NotificationProvider';
import { useTheme } from '../../contexts/ThemeContext';
import styles from './InvestmentForm.module.css';

const UpdateInvestmentForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const notification = useNotification();
    const { theme } = useTheme();
    const isEditing = true;

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [formData, setFormData] = useState({
        ticker: '',
        entryDate: new Date().toISOString().split('T')[0],
        currentPrice: '',
        quantity: '',
        avgBuyPrice: '',
        notes: 'Regular Investment',
        isRecommended: false,
        buyBelow: '',
        sector: '',
        marketCap: '',
        status: 'open',
        currency: 'INR',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (id) {
            loadInvestment();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadInvestment = async () => {
        try {
            setLoading(true);
            const investmentResponse = await getInvestmentById(id);
            const investment = investmentResponse.data;
            console.log('Loaded investment:', investment);
            setFormData({
                ticker: investment.ticker || '',
                quantity: investment.quantity?.toString() || '',
                avgBuyPrice: investment.avgBuyPrice?.toFixed(2).toString() || '',
                entryDate: investment.entryDate ? investment.entryDate.split('T')[0] : '',
                notes: investment.notes || '',
                status: investment.status || 'open',
                sector: investment.sector || '',
                marketCap: investment.marketCap || 'Large Cap',
                buyBelow: investment.buyBelow || '',
                isRecommended: false,
                currentPrice: investment.currentPrice || '',
                currency: investment.currency || 'INR',
            });
            setCurrentPrice(investment.currentPrice || null);
        } catch (error) {
            console.error('Error loading investment:', error);
            if (notification) {
                notification.error('Failed to load investment');
            } else {
                console.error('Failed to load investment');
            }
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.ticker.trim()) {
            newErrors.ticker = 'Ticker symbol is required';
        }
        if (!formData.quantity || parseInt(formData.quantity) <= 0) {
            newErrors.quantity = 'Valid quantity is required';
        }
        if (!formData.avgBuyPrice || parseFloat(formData.avgBuyPrice) <= 0) {
            newErrors.avgBuyPrice = 'Valid average buy price is required';
        }
        if (!formData.entryDate) {
            newErrors.entryDate = 'Investment date is required';
        }
        // Check if date is not in the future (allow today)
        const investmentDate = new Date(formData.entryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        investmentDate.setHours(0, 0, 0, 0);
        if (investmentDate > today) {
            newErrors.entryDate = 'Investment date cannot be in the future';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            if (notification) {
                notification.error('Please fix form errors');
            } else {
                console.error('Please fix form errors');
            }
            return;
        }
        try {
            setSaving(true);
            // Map frontend fields to backend expected fields
            const investmentData = {
                ticker: formData.ticker.toUpperCase(),
                quantity: parseInt(formData.quantity),
                avgBuyPrice: parseFloat(formData.avgBuyPrice),
                buyBelow: formData.buyBelow ? parseFloat(formData.buyBelow) : undefined,
                entryDate: formData.entryDate,
                notes: formData.notes,
                status: formData.status,
                sector: formData.sector,
                marketCap: formData.marketCap,
                currentPrice: formData.currentPrice,
                currency: formData.currency
            };
            await updateInvestment(id, investmentData);
            if (notification) {
                notification.success('Investment updated successfully');
            } else {
                console.log('Investment updated successfully');
            }
            navigate('/investments');
        } catch (error) {
            console.error('Error saving investment:', error);
            if (notification) {
                notification.error(
                    error.response?.data?.message || 'Failed to save investment'
                );
            } else {
                console.error(error.response?.data?.message || 'Failed to save investment');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={`${styles.container} ${theme}`}>
                <div className={styles.loading}>Loading investment...</div>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${theme}`}>
            <button
                type="button"
                onClick={() => navigate('/investments')}
                className={styles.cancelButton}
                disabled={saving}
            >
                Back
            </button>
            <div className={styles.formContainer}>
                <form onSubmit={handleSubmit}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Stock Information</h2>
                        <div className={styles.gridTwoCol}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Stock Ticker *</label>
                                <input
                                    type="text"
                                    id="ticker"
                                    name="ticker"
                                    value={formData.ticker}
                                    className={styles.input}
                                    disabled
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Current Price</label>
                                <input
                                    type="text"
                                    id="currentPrice"
                                    name="currentPrice"
                                    value={currentPrice !== null && currentPrice !== undefined ? `${formData.currency === 'INR' ? '₹' : '$'}${Number(currentPrice).toFixed(2)}` : ''}
                                    className={styles.input}
                                    placeholder="Auto-filled after ticker selection"
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>
                        <div className={styles.gridTwoCol}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Sector</label>
                                <input
                                    type="text"
                                    id="sector"
                                    name="sector"
                                    value={formData.sector}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="e.g., IT, Banking, Pharma"
                                    disabled={saving}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Market Cap *</label>
                                <select
                                    id="marketCap"
                                    name="marketCap"
                                    value={formData.marketCap}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    disabled={saving}
                                    required
                                >
                                    <option value="LARGE CAP">Large Cap</option>
                                    <option value="MID CAP">Mid Cap</option>
                                    <option value="SMALL CAP">Small Cap</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.gridTwoCol}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Currency *</label>
                                <select
                                    id="currency"
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    disabled={saving}
                                    required
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Investment Details</h2>
                        <div className={styles.gridTwoCol}>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="invested_on" className={styles.label}>Investment Date *</label>
                                <input
                                    type="date"
                                    id="entryDate"
                                    name="entryDate"
                                    value={formData.entryDate}
                                    onChange={handleInputChange}
                                    className={`${styles.input} ${errors.entryDate ? styles.inputError : ''}`}
                                    disabled={saving}
                                />
                                {errors.entryDate && <span className={styles.error}>{errors.entryDate}</span>}
                            </div>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="quantity" className={styles.label}>Quantity *</label>
                                <input
                                    type="number"
                                    id="quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    className={`${styles.input} ${errors.quantity ? styles.inputError : ''}`}
                                    placeholder="Number of shares"
                                    min="1"
                                    disabled={saving}
                                />
                                {errors.quantity && <span className={styles.error}>{errors.quantity}</span>}
                            </div>
                        </div>
                        <div className={styles.gridTwoCol}>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="avgBuyPrice" className={styles.label}>Buy Price ({formData.currency === 'INR' ? '₹' : '$'}) *</label>
                                <div className={styles.priceInputWrapper}>
                                    <span className={styles.currencySymbol}>{formData.currency === 'INR' ? '₹' : '$'}</span>
                                    <input
                                        type="number"
                                        id="avgBuyPrice"
                                        name="avgBuyPrice"
                                        value={formData.avgBuyPrice}
                                        onChange={handleInputChange}
                                        className={`${styles.input} ${styles.priceInput} ${errors.avgBuyPrice ? styles.inputError : ''}`}
                                        placeholder="0.00"
                                        disabled={saving}
                                    />
                                </div>
                                {errors.avgBuyPrice && <span className={styles.error}>{errors.avgBuyPrice}</span>}
                            </div>
                            <div className={styles.fieldGroup}>
                                <label htmlFor="buyBelow" className={styles.label}>Buy Below</label>
                                <input
                                    type="number"
                                    id="buyBelow"
                                    name="buyBelow"
                                    value={formData.buyBelow}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="Buy below price from recommendation"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Investment Notes</h2>
                        <div className={styles.fieldGroup}>
                            <label htmlFor="notes" className={styles.label}>Notes & Analysis</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                className={styles.textarea}
                                placeholder="Investment thesis, reasons, or any other notes..."
                                rows="4"
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <div className={styles.submitSection}>
                        <button
                            type="button"
                            onClick={() => navigate('/investments')}
                            className={styles.cancelButton}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Update Investment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UpdateInvestmentForm;

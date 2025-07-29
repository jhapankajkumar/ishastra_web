import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createInvestment, updateInvestment, getInvestmentById } from '../api/investmentApi';
import { getAllRecommendations } from '../api/recommendationApi';
import { searchTickers, getCurrentPrice } from '../api/tickerApi';
import { useNotification } from '../components/NotificationProvider';
import styles from './InvestmentForm.module.css';
import TickerSearch from "../components/TickerSearch";

const InvestmentForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const notification = useNotification();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [recommendations, setRecommendations] = useState([]);
    const [tickerSuggestions, setTickerSuggestions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);

    const [formData, setFormData] = useState({
        ticker: '',
        entryDate: new Date().toISOString().split('T')[0],
        currentPrice: '',
        quantity: '',
        avgBuyPrice: '',
        notes: '',
        isRecommended: false,
        buyBelow: '',
    });

    const [isRecommended, setIsRecommended] = useState(false);

    const [errors, setErrors] = useState({});

    // Load investment data for editing
    useEffect(() => {
        if (isEditing) {
            loadInvestment();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadInvestment = async () => {
        try {
            setLoading(true);
            const investment = await getInvestmentById(id);
            setFormData({
                ticker: investment.ticker || '',
                quantity: investment.quantity?.toString() || '',
                avgBuyPrice: investment.avgBuyPrice?.toString() || '',
                entryDate: investment.entryDate ? investment.entryDate.split('T')[0] : '',
                notes: investment.notes || '',
                status: investment.status || 'open'
            });
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

    const fetchCurrentPrice = async (ticker) => {
        if (!ticker) return;

        try {
            setPriceLoading(true);
            const response = await getCurrentPrice(ticker);
            if (response.data && response.data.price) {
                setCurrentPrice(response.data.price);
            } else {
                setCurrentPrice(null);
            }
        } catch (error) {
            console.error('Error fetching current price:', error);
            setCurrentPrice(null);
        } finally {
            setPriceLoading(false);
        }
    };

    const handleTickerSearch = async (value) => {
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (value.length < 1) {
            setTickerSuggestions([]);
            return;
        }

        // Set a new timeout for API call
        const timeoutId = setTimeout(async () => {
            try {
                setSearchLoading(true);
                const response = await searchTickers(value);

                if (response.data && Array.isArray(response.data)) {
                    // Format the results for display
                    const formatted = response.data
                        .filter(item => item.symbol && item.typeDisp)
                        .slice(0, 8)
                        .map(item => ({
                            symbol: item.symbol,
                            name: item.shortname || item.longname || item.symbol,
                            type: item.typeDisp,
                            exchange: item.exchDisp || item.exchange
                        }));
                    setTickerSuggestions(formatted);
                }
            } catch (error) {
                console.error('Error searching tickers:', error);
                setTickerSuggestions([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300); // 300ms debounce

        setSearchTimeout(timeoutId);
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

        if (name === 'ticker') {
            const upperValue = value.toUpperCase();
            setFormData(prev => ({ ...prev, [name]: upperValue }));
            handleTickerSearch(upperValue);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    const handleTickerChange = (ticker) => { }
    const handleTickerSelect = async (ticker) => {
        const symbol = typeof ticker === 'string' ? ticker : ticker.symbol;
        setFormData(prev => ({ ...prev, ticker: symbol }));
        setTickerSuggestions([]);
        fetchCurrentPrice(symbol);
        console.log('Selected ticker:', ticker);
        console.log('Selected Symbol:', symbol);
        // Call recommendation API and match ticker
        try {
            const recs = await getAllRecommendations();
            const match = (recs.data || []).find(r => r.ticker && r.ticker.toUpperCase() === symbol.toUpperCase());
            console.log('Recommendation match:', match);
            if (match) {
                setIsRecommended(true);
                setFormData(prev => ({ ...prev, isRecommended: true, buyBelow: match.buyBelow?.toString() || '' }));
            } else {
                setIsRecommended(false);
                setFormData(prev => ({ ...prev, isRecommended: false, buyBelow: '' }));
            }

        } catch (err) {
            setFormData(prev => ({ ...prev, isRecommended: false }));
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
                status: formData.status
            };

            if (isEditing) {
                await updateInvestment(id, investmentData);
                if (notification) {
                    notification.success('Investment updated successfully');
                } else {
                    console.log('Investment updated successfully');
                }
            } else {
                await createInvestment(investmentData);
                if (notification) {
                    notification.success('Investment created successfully');
                } else {
                    console.log('Investment created successfully');
                }
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
            <div className={styles.container}>
                <div className={styles.loading}>Loading investment...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{isEditing ? 'Edit Investment' : 'Add New Investment'}</h1>
                <p>Track your long-term investment positions</p>
            </div>

            <div className={styles.formContainer}>
                <form onSubmit={handleSubmit}>
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Basic Information</h2>

                        <div className={styles.gridTwoCol}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Stock Ticker *</label>
                                <TickerSearch
                                    value={formData.ticker}
                                    onChange={handleTickerChange}
                                    onSelect={handleTickerSelect}
                                    placeholder="e.g., TCS, RELIANCE"
                                    apiSource="yahoo"
                                    instrumentType={"Stocks"}  // Assuming Stocks as default, can be dynamic based on user selection
                                />
                            </div>
                            {errors.ticker && <span className={styles.error}>{errors.ticker}</span>}

                            {formData.ticker && (
                                <div className={styles.priceInfo}>
                                    {priceLoading ? (
                                        <span className={styles.priceLoading}>Fetching current price...</span>
                                    ) : currentPrice ? (
                                        <span className={styles.currentPrice}>
                                            Current Price: ${currentPrice.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className={styles.noPrice}>Price not available</span>
                                    )}
                                </div>
                            )}
                        </div>
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

                        <div className={styles.gridTwoCol}>
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

                            <div className={styles.fieldGroup}>
                                <label htmlFor="avgBuyPrice" className={styles.label}>Buy Price ($) *</label>
                                <div className={styles.priceInputWrapper}>
                                    <span className={styles.currencySymbol}>$</span>
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
                        </div>

                        <div className={styles.gridTwoCol}>

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
                                {isRecommended && (
                                    <span className={styles.info} style={{ color: '#4caf50' }}>Recommended</span>
                                )}
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
                            {saving ? 'Saving...' : isEditing ? 'Update Investment' : 'Add Investment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvestmentForm;

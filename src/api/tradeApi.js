import {API} from './baseApi';

export const getAllTrades = () => API.get('/trades');
export const fetchExitTactics = () => API.get('/exit-tactics');
export const getTradeById = (id) => API.get(`/trades/${id}`);
export const fetchSetups = () => API.get('/setups');

// Update trade (exit) - now supports partial exits
export async function updateTrade(id, form) {
  const formData = new FormData();
  formData.append('exitDate', form.exitDate);
  formData.append('exitOrderPrice', form.exitOrderPrice);
  formData.append('exitFilledPrice', form.exitFilledPrice);
  formData.append('exitSlippage', form.exitSlippage);
  formData.append('exitFilledShares', form.exitFilledShares);
  formData.append('exitTotalCost', form.exitTotalCost);
  formData.append('exitGrade', form.exitGrade);
  formData.append('reasonForExit', form.reasonForExit);
  formData.append('exitTactic', form.exitTactic);

  // Add exit quantity for partial exits
  if (form.exitQuantity) {
    formData.append('exitQuantity', form.exitQuantity);
  }

  // Set status as Closed or Partial Closed if provided
  if (form.tradeStatus === 'Closed' || form.tradeStatus === 'Partial Closed') {
    formData.append('tradeStatus', form.tradeStatus);
  }

  // Only append exitCharts - handle FileList or Array properly
  if (form.exitCharts) {
    const files = Array.from(form.exitCharts);
    files.forEach(file => formData.append('exitCharts', file));
  }

  return API.put(`/trades/${id}/exit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// New function for partial exits specifically
export async function partialExitTrade(id, form) {
  const formData = new FormData();
  formData.append('exitDate', form.exitDate);
  formData.append('exitOrderPrice', form.exitOrderPrice);
  formData.append('exitQuantity', form.exitQuantity);
  formData.append('reasonForExit', form.reasonForExit);
  formData.append('exitTactic', form.exitTactic);

  // Only append exitCharts - handle FileList or Array properly
  if (form.exitCharts) {
    const files = Array.from(form.exitCharts);
    files.forEach(file => formData.append('exitCharts', file));
  }

  return API.put(`/trades/${id}/partial-exit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// Get trade transactions
export const getTradeTransactions = (id) => API.get(`/trades/${id}/transactions`);

// Add post trade analysis
export async function addPostAnalysis(id, form) {
  const formData = new FormData();
  formData.append('postTradeAnalysis', form.postTradeAnalysis);

  // Handle postTradeFiles - handle FileList or Array properly
  if (form.postTradeFiles) {
    const files = Array.from(form.postTradeFiles);
    files.forEach(file => formData.append('postTradeFiles', file));
  }

  return API.put(`/trades/${id}/post-analysis`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// Create trade - only entry chart
export async function createTrade(form) {
  const formData = new FormData();

  // Helper defaults
  const defaultDropdown = (val, options) => (val && val !== 'undefined' ? val : (options && options.length ? options[0] : ''));
  const defaultNumber = (val) => (val !== undefined && val !== null && val !== '' && val !== 'undefined' ? Number(val) : 0);
  const defaultText = (val) => (val && val !== 'undefined' ? val : '');
  const defaultNull = (val) => (val !== undefined && val !== null && val !== 'undefined' && val !== '' ? val : null);

  // Dropdown options (customize as needed)
  const instrumentTypeOptions = ['Stocks', 'Futures', 'Options'];
  const marketOptions = ['India', 'US'];
  const positionTypeOptions = ['Swing', 'Intraday'];
  const directionOptions = ['Long', 'Short'];
  const stopLossMethodOptions = ['ATR', 'Fixed %', 'None'];

  // Required fields
  formData.append('ticker', defaultText(form.ticker));
  formData.append('companyName', defaultText(form.companyName));
  formData.append('instrumentType', defaultDropdown(form.instrumentType, instrumentTypeOptions));
  formData.append('market', defaultDropdown(form.market, marketOptions));
  formData.append('positionType', defaultDropdown(form.positionType, positionTypeOptions));
  formData.append('direction', defaultDropdown(form.direction, directionOptions));
  formData.append('reasonForEntry', defaultText(form.reasonForEntry));
  // Ensure entryDate is properly formatted (YYYY-MM-DD) or default to today
  let entryDate = form.entryDate;
  if (!entryDate || entryDate === 'undefined' || entryDate.trim() === '') {
    entryDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }
  formData.append('entryDate', entryDate);
  formData.append('entryOrderPrice', defaultNumber(form.entryOrderPrice));
  formData.append('entryFilledShares', defaultNumber(form.entryFilledShares));
  // Always send riskPerTrade and risk_per_trade as valid numbers (default 0 if invalid)
  let riskVal = form.riskPerTrade;
  if (riskVal === undefined || riskVal === null || riskVal === '' || riskVal === 'undefined' || isNaN(Number(riskVal))) {
    riskVal = 0;
  } else {
    riskVal = Number(riskVal);
  }
  formData.append('riskPerTrade', riskVal);
  formData.append('risk_per_trade', riskVal);
  formData.append('stopLossPrice', defaultNumber(form.stopLossPrice));
  formData.append('stopLossMethod', defaultDropdown(form.stopLossMethod, stopLossMethodOptions));
  formData.append('atrMultiplier', defaultNumber(form.atrMultiplier));
  // Always send targets as numbers (default 0)
  formData.append('target1', defaultNumber(form.target1));
  formData.append('target2', defaultNumber(form.target2));
  formData.append('target3', defaultNumber(form.target3));
  formData.append('atrValue', defaultNumber(form.atrValue));
  // Always send tradeSetup (setup) as null if not set
  formData.append('tradeSetup', defaultNull(form.setupType));
  // Timeframes used (array to comma-separated string, default to Daily)
  let timeframes = form.timeframesUsed && Array.isArray(form.timeframesUsed) && form.timeframesUsed.length > 0 ? form.timeframesUsed : ['Daily'];
  formData.append('timeframesUsed', timeframes.join(','));
  // Always set status as Executed for new trades (or use form value if present)
  formData.append('tradeStatus', form.tradeStatus || 'Executed');
  // Add entryCommission, notes, confidence if present
  formData.append('entryCommission', defaultNumber(form.entryCommission));
  formData.append('notes', defaultText(form.notes));
  // Send confidence as number if possible, else as string
  let confidenceVal = form.confidence;
  if (confidenceVal !== undefined && confidenceVal !== null && confidenceVal !== '' && confidenceVal !== 'undefined') {
    if (!isNaN(confidenceVal)) {
      formData.append('confidence', Number(confidenceVal));
    } else {
      formData.append('confidence', confidenceVal);
    }
  } else {
    formData.append('confidence', 0);
  }
  // Only append entryCharts - handle FileList or Array properly
  if (form.entryCharts) {
    const files = Array.from(form.entryCharts);
    files.forEach(file => formData.append('entryCharts', file));
  }
  return API.post('/trades', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// Delete trade
export const deleteTrade = (id) => API.delete(`/trades/${id}`);

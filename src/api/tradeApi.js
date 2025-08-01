import {API} from './baseApi';

export const getAllTrades = () => API.get('/trades');
export const getTradeById = (id) => API.get(`/trades/${id}`);

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
  formData.append('emotionalState', form.emotionalState);
  formData.append('lessonLearned', form.lessonLearned);

  // Handle reviewCharts - handle FileList or Array properly
  if (form.reviewCharts) {
    const files = Array.from(form.reviewCharts);
    files.forEach(file => formData.append('reviewCharts', file));
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
  const instrumentTypeOptions = ['Stocks', 'ETF', 'Forex', 'Indices'];
  const marketOptions = ['India', 'US'];
  const positionTypeOptions = ['Swing', 'Intraday'];
  const directionOptions = ['Long', 'Short'];
  const stopLossMethodOptions = ['ATR', 'Fixed %', 'None'];
  const timeframeOptions = ['Daily', 'Weekly', 'Hourly', 'Multiple'];
  const confidenceOptions = ['Low', 'Medium', 'High'];

  // Required fields
  formData.append('ticker', defaultText(form.ticker));
  formData.append('tickerName', defaultText(form.companyName));
  formData.append('instrumentType', defaultDropdown(form.instrumentType, instrumentTypeOptions));
  formData.append('market', defaultDropdown(form.market, marketOptions));
  formData.append('positionType', defaultDropdown(form.positionType, positionTypeOptions));
  formData.append('direction', defaultDropdown(form.direction, directionOptions));
  formData.append('reasonForEntry', defaultText(form.reasonForEntry));
  // Ensure entryDate is properly formatted (YYYY-MM-DD) or default to today
  let entryDate = form.entryDate;
  console.log('Entry Date:', entryDate); // Debug log
  if (!entryDate || entryDate === 'undefined' || entryDate.trim() === '') {
    entryDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }
  console.log('Formatted Entry Date:', entryDate); // Debug log
  formData.append('entryDate', entryDate);
  formData.append('entryOrderPrice', defaultNumber(form.entryOrderPrice));
  formData.append('entryFilledShares', defaultNumber(form.entryFilledShares));
  // Always send riskPerTrade and risk_per_trade as valid numbers (default 0 if invalid)
  let riskVal = form.riskPerTrade;
  console.log('Risk Per Trade:', riskVal); // Debug log
  formData.append('riskPerTrade', riskVal);
  formData.append('riskPerTradeValue', form.riskPerTradeValue || 0);
  formData.append('stopLossPrice', defaultNumber(form.stopLossPrice));
  formData.append('stopLossMethod', defaultDropdown(form.stopLossMethod, stopLossMethodOptions));
  formData.append('atrMultiplier', defaultNumber(form.atrMultiplier));
  formData.append('target1', defaultNumber(form.target1));
  formData.append('target2', defaultNumber(form.target2));
  formData.append('target3', defaultNumber(form.target3));
  formData.append('atrValue', defaultNumber(form.atrValue));
  // Always send tradeSetup (setup) as null if not set
  
  formData.append('tradeSetup', defaultNull(form.setupType));
  
  // Timeframes used (array to comma-separated string, default to Daily)
  console.log('Timeframes Used:', form.timeframesUsed); // Debug log
  formData.append('timeframesUsed', defaultDropdown(form.timeframesUsed, timeframeOptions));
  // Always set status as Executed for new trades (or use form value if present)
  formData.append('tradeStatus', form.tradeStatus || 'Executed');
  // Add entryCommission, notes, confidence if present
  formData.append('entryCommission', defaultNumber(form.entryCommission));
  formData.append('notes', defaultText(form.notes));
  
  let confidenceText = defaultDropdown(form.setupConfidence, confidenceOptions);
  console.log('Confidence Text:', confidenceText); // Debug log
  if (confidenceText && confidenceText === 'Low') {
    formData.append('confidence', 0);
  }
  else if (confidenceText && confidenceText === 'Medium') {
    formData.append('confidence', 1);
  } else if (confidenceText && confidenceText === 'High') {
    formData.append('confidence', 2);
  } else {
    formData.append('confidence', 0); // Default to Low
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

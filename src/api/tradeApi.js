import {API} from './baseApi';

// Get all trades (optionally filter by paper trade flag)
// Pass `isPaperTrade` as a query param: /trades?isPaperTrade=true|false
export const getAllTrades = (isPaperTrade) => {
  const params = {};
  // Only send the query param when a boolean value is provided
  if (typeof isPaperTrade === 'boolean') {
    params.isPaperTrade = isPaperTrade;
  }
  return API.get('/trades', { params });
};
export const getTradeById = (id) => API.get(`/trades/${id}`);

export async function editTrade(id, form) {
  const formData = new FormData();
  formData.append('entryDate', form.entryDate);
  formData.append('entryPrice', form.entryPrice);
  formData.append('stopLoss', form.stopLoss);
  formData.append('quantity', form.quantity);
  if (form.reasonForEntry !== undefined) {
    formData.append('reasonForEntry', form.reasonForEntry);
  }
  if (form.notes !== undefined) {
    formData.append('notes', form.notes);
  }
  return API.put(`/trades/${id}/edit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

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
  if (form.exitCommission !== undefined && form.exitCommission !== null) {
    formData.append('exitCommission', form.exitCommission);
  }

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
  if (form.exitCommission !== undefined && form.exitCommission !== null) {
    formData.append('exitCommission', form.exitCommission);
  }

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

// Create trade - supports both FormData (form) and direct object (watchlist)
export async function createTrade(formOrData, options = {}) {
  const { useDirectObject = false } = options;
  
  if (useDirectObject && typeof formOrData === 'object' && !(formOrData instanceof FormData)) {
    // Direct object input (from watchlist)
    const data = formOrData;
    const formData = new FormData();

    // Helper defaults (keep existing logic)
    const defaultDropdown = (val, options) => (val && val !== 'undefined' ? val : (options && options.length ? options[0] : ''));
    const defaultNumber = (val) => (val !== undefined && val !== null && val !== '' && val !== 'undefined' ? Number(val) : 0);
    const defaultText = (val) => (val && val !== 'undefined' ? val : '');

    // Required fields - map from direct object
    formData.append('ticker', defaultText(data.ticker));
    formData.append('tickerName', defaultText(data.tickerName));
    formData.append('direction', 'Long'); // Hardcoded
    formData.append('instrumentType', 'Stocks'); // Hardcoded
    formData.append('currency', data.currency || 'INR'); // Default to INR
    
    // Confidence mapping (keep existing logic)
    const confidence = data.confidence || 75;
    formData.append('confidence', confidence);
    formData.append('grade', data.grade || "A"); // Default to A

    // Entry Date
    let entryDate = data.entryDate;
    if (!entryDate || entryDate === 'undefined' || entryDate.trim() === '') {
      entryDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }
    formData.append('entryDate', entryDate);
    formData.append('entryPrice', defaultNumber(data.entryPrice));
    formData.append('quantity', defaultNumber(data.quantity));
    formData.append('stopLoss', defaultNumber(data.stopLoss));
    formData.append('target1', defaultNumber(data.target1));
    formData.append('target2', defaultNumber(data.target2));
    formData.append('target3', defaultNumber(data.target3));
    formData.append('tradeSetup', data.tradeSetup || 20001); // Default as per original
    formData.append('reasonForEntry', defaultText(data.reasonForEntry));
    
    // Add other fields
    formData.append('entryCommission', defaultNumber(data.entryCommission));
    formData.append('notes', defaultText(data.notes));
    // formData.append('isPaperTrade', false); // Hardcoded as per original
    
    // Special field: systemAnalysisResult
    if (data.systemAnalysisResult) {
      formData.append('systemAnalysisResult', data.systemAnalysisResult);
    }

    return API.post('/trades', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  } else {
    // Original FormData logic (existing form-based creation)
    const form = formOrData;
    const formData = new FormData();

    // Helper defaults (existing logic)
    const defaultDropdown = (val, options) => (val && val !== 'undefined' ? val : (options && options.length ? options[0] : ''));
    const defaultNumber = (val) => (val !== undefined && val !== null && val !== '' && val !== 'undefined' ? Number(val) : 0);
    const defaultText = (val) => (val && val !== 'undefined' ? val : '');
    const defaultNull = (val) => (val !== undefined && val !== null && val !== 'undefined' && val !== '' ? val : null);

    // Dropdown options (customize as needed)
    const confidenceOptions = ['Low', 'Medium', 'High'];

    // Required fields (existing logic)
    formData.append('ticker', defaultText(form.ticker));
    formData.append('tickerName', defaultText(form.companyName));
    formData.append('direction', 'Long');
    formData.append('instrumentType', 'Stocks');
    formData.append('currency', form.currency || 'INR');
    
    let confidenceText = defaultDropdown(form.setupConfidence, confidenceOptions);
    if (confidenceText && confidenceText === 'Low') {
      formData.append('confidence', 60);
    } else if (confidenceText && confidenceText === 'Medium') {
      formData.append('confidence', 70);
    } else if (confidenceText && confidenceText === 'High') {
      formData.append('confidence', 80);
    } else {
      formData.append('confidence', 0);
    }

    formData.append('grade', "A");

    // Entry Date (existing logic)
    let entryDate = form.entryDate;
    if (!entryDate || entryDate === 'undefined' || entryDate.trim() === '') {
      entryDate = new Date().toISOString().split('T')[0];
    }
    formData.append('entryDate', entryDate);
    formData.append('entryPrice', defaultNumber(form.entryOrderPrice));
    formData.append('quantity', defaultNumber(form.entryFilledShares));
    formData.append('stopLoss', defaultNumber(form.stopLossPrice));
    formData.append('target1', defaultNumber(form.target1));
    formData.append('target2', defaultNumber(form.target2));
    formData.append('target3', defaultNumber(form.target3));
    formData.append('tradeSetup', 20001);
    formData.append('reasonForEntry', defaultText(form.reasonForEntry));
    formData.append('entryCommission', defaultNumber(form.entryCommission));
    formData.append('notes', defaultText(form.notes));
    // formData.append('isPaperTrade', true);

    // Only append entryCharts - handle FileList or Array properly
    if (form.entryCharts) {
      const files = Array.from(form.entryCharts);
      files.forEach(file => formData.append('entryCharts', file));
    }

    return API.post('/trades', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

// Delete trade
export const deleteTrade = (id) => API.delete(`/trades/${id}`);

// Pyramid: add quantity to an existing open/partial trade — merges the new
// tranche into the same row (weighted-average entry price) rather than
// creating a second independent trade.
export const addQuantityToTrade = (id, { date, price, quantity, commission }) =>
  API.put(`/trades/${id}/add-quantity`, { date, price, quantity, commission });

// Update trailing stop only — never touches the original stopLoss.
export const updateTrailingStop = (id, trailingStopLoss) =>
  API.put(`/trades/${id}/trailing-stop`, { trailingStopLoss });

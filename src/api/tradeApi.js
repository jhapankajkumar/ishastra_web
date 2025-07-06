import {API} from './baseApi';

export const getAllTrades = () => API.get('/trades');
export const fetchExitTactics = () => API.get('/exit-tactics');
export const getTradeById = (id) => API.get(`/trades/${id}`);
export const fetchSetups = () => API.get('/setups');

// Update trade (exit) - only exit chart
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

  // Only append exitCharts
  (form.exitCharts || []).forEach(file => formData.append('exitCharts', file));

  return API.put(`/trades/${id}/exit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// Add post trade analysis
export async function addPostAnalysis(id, form) {
  const formData = new FormData();
  formData.append('postTradeAnalysis', form.postTradeAnalysis);

  (form.postTradeFiles || []).forEach(file => formData.append('postTradeFiles', file));

  return API.put(`/trades/${id}/post-analysis`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

// Create trade - only entry chart
export async function createTrade(form) {
  const formData = new FormData();
  formData.append('ticker', form.ticker);
  formData.append('reasonForEntry', form.reasonForEntry);
  formData.append('entryDate', form.entryDate);
  formData.append('entryOrderPrice', form.entryOrderPrice);
  formData.append('entryFilledPrice', form.entryFilledPrice);
  formData.append('entrySlippage', form.entrySlippage);
  formData.append('entryFilledShares', form.entryFilledShares);
  formData.append('entryTotalCost', form.entryTotalCost);
  formData.append('entryGrade', form.entryGrade);
  
  // Add setup type
  if (form.setupType) {
    formData.append('tradeSetup', form.setupType);
  }
  
  // Only append entryCharts
  (form.entryCharts || []).forEach(file => formData.append('entryCharts', file));

  return API.post('/trades', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

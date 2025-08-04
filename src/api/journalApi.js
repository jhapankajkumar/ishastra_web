import {API} from './baseApi';

export const getAllJournals = () => API.get('/journal');
export const getJournalById = (id) => API.get(`/journal/${id}`);
export const deleteJournal = (id) => API.delete(`/journal/${id}`);
export const updateJournal = (id, form) => {
  const formData = new FormData();
  formData.append('reviewNotes', form.reviewNotes);

  if (form.reviewCharts) {
    const files = Array.from(form.reviewCharts);
    files.forEach(file => formData.append('reviewCharts', file));
  }

  return API.put(`/journal/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Create journal entry
export async function createJournal(form) {
  const formData = new FormData();
  console.log('Form data being sent:', form);
  formData.append('entryDate', form.date);
  formData.append('ticker', form.stock);
  formData.append('tickerName', form.companyName);
  formData.append('trend', form.trend);
  formData.append('candleType', form.candleType);
  formData.append('nearSupport', form.nearSupport);
  formData.append('nearResistance', form.nearResistance);
  formData.append('supportLevel', form.supportLevel);
  formData.append('resistanceLevel', form.resistanceLevel);
  formData.append('emaTouch', form.emaTouch);
  formData.append('volumeSpike', form.volumeSpike);
  formData.append('rsiValue', form.rsiValue);
  formData.append('entryConsidered', form.entryConsidered);
  formData.append('actionPlan', form.actionPlan);
  formData.append('entryNotes', form.notes);
  formData.append('setupConfidence', form.setupConfidence);
  let setupType = Number(form.setupType)
  formData.append('setupType', setupType); 

  // Append screenshot if provided
  if (form.entryCharts) {
    const files = Array.from(form.entryCharts);
    files.forEach(file => formData.append('entryCharts', file));
  }

  return API.post('/journal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

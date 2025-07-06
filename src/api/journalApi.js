import {API} from './baseApi';

export const getAllJournals = () => API.get('/journal');
export const getJournalById = (id) => API.get(`/journal/${id}`);
export const deleteJournal = (id) => API.delete(`/journal/${id}`);
export const updateJournal = (id, form) => {
  const formData = new FormData();
  formData.append('notes', form.notes);

  // Append review screenshot if provided
  if (form.reviewScreenshot) {
    formData.append('reviewScreenshot', form.reviewScreenshot);
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
  formData.append('date', form.date);
  formData.append('stock', form.stock);
  formData.append('trend', form.trend);
  formData.append('candle_type', form.candle_type);
  formData.append('near_support', form.near_support);
  formData.append('near_resistance', form.near_resistance);
  formData.append('support_level', form.support_level);
  formData.append('resistance_level', form.resistance_level);
  formData.append('ema_touch', form.ema_touch);
  formData.append('volume_spike', form.volume_spike);
  formData.append('rsi_value', form.rsi_value);
  formData.append('entry_considered', form.entry_considered);
  formData.append('action_plan', form.action_plan);
  formData.append('notes', form.notes);

  // Append screenshot if provided
  if (form.screenshot) {
    formData.append('screenshot', form.screenshot);
  }

  return API.post('/journal', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

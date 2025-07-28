import axios from 'axios';

const FIREBASE_BASE = 'https://ishashtra-5c64f-default-rtdb.asia-southeast1.firebasedatabase.app/tradeMetadata';

export const fetchExitTactics = async () => {
  const res = await axios.get(`${FIREBASE_BASE}/exitTactics.json`);
  // Convert object to array with id
  if (res.data && typeof res.data === 'object') {
    return Object.values(res.data).map((item, idx) => ({
      ...item,
      id: item.tactic_id || item.id || idx
    }));
  }
  return [];
};

export const fetchSetups = async () => {
  const res = await axios.get(`${FIREBASE_BASE}/tradeSetups.json`);
  if (res.data && typeof res.data === 'object') {
    return Object.values(res.data).map((item, idx) => ({
      ...item,
      id: item.trade_setup_id || item.id || idx
    }));
  }
  return [];
};

export const fetchTags = async () => {
  const res = await axios.get(`${FIREBASE_BASE}/tags.json`);
  if (res.data && typeof res.data === 'object') {
    return Object.values(res.data).map((item, idx) => ({
      ...item,
      id: item.tag_id || item.id || idx
    }));
  }
  return [];
};

import {API} from './baseApi';
export const getDashboardSummary = () => API.get('/trades/dashboard/summary');
import axios from 'axios'

var API_GATEWAY = (() => {
    // NOTE: point to local backend
    return `http://localhost:8000`;
  })();

export const SendQueryAPI = async (query, session_id) => {
  const url = API_GATEWAY + '/ask';
  return axios.post(url, { question: query, session_id }, {
    withCredentials: true,
  });
};

export const SendAnomalyDetectionAPI = async (banner, window, overUnder, session_id) => {
  const url = API_GATEWAY + '/anomaly_detection';
  return axios.post(url, { banner: banner, numDays: window, over_under: overUnder, session_id }, {
    withCredentials: true,
  });
};

export const sendKBQueryAPI = async (query, access_token) => {
  const url = API_GATEWAY + '/kb_ask';
  return axios.post(url, { question: query, accessToken: access_token }, {
    withCredentials: true,
  });
};

export const uploadCSV = (formData) => {
  const url = API_GATEWAY + '/upload_csv'

  return axios.post(url, formData);
};
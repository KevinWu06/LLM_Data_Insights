import axios from 'axios'

var API_GATEWAY = (() => {
    // NOTE: point to local backend
    return `http://localhost:8000`;
  })();

export const SendQueryAPI = async (query, session_id) => {
  const url = API_GATEWAY + '/ask';

  return axios.post(url, { question: query , session_id: session_id}, {
    withCredentials: true,
  });
};

export const uploadCSV = (formData) => {
  const url = API_GATEWAY + '/upload_csv'

  return axios.post(url, formData);
};
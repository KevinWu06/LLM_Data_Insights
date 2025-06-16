import axios from 'axios'

var API_GATEWAY = (() => {
    // NOTE: point to local backend
    return `http://localhost:8000`;
  })();

  export const SendQueryAPI = async (query) => {
    const url = API_GATEWAY + '/ask';

    return axios.post(url, { question: query }, {
      withCredentials: true,
    });
  };
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://172.20.10.4:8080/api', // Corrected base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;

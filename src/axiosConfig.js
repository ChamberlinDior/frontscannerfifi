import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.71:8080/api', // Corrected base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;

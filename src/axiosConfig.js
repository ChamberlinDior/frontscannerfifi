import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.81:8080/api', // Assurez-vous que cette URL correspond à votre backend
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;

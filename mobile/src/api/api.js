import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace YOUR_IP_ADDRESS with your computer's local IP (e.g., 192.168.1.5)
const API_URL = 'https://e-com-mobile-app-production.up.railway.app/api/v1';
export const BASE_URL = 'https://e-com-mobile-app-production.up.railway.app';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
});

// Add a response interceptor for better error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('🛑 API Timeout:', error.config.url);
    } else if (!error.response) {
      console.error('🌐 Network Error - Is the server running at', API_URL, '?');
    }
    return Promise.reject(error);
  }
);

// Add a request interceptor to automatically add the token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

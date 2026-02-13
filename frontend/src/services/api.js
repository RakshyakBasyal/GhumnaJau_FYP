// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Add token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers['x-auth-token'] = token;
  }
  return req;
});

// NEW: Response interceptor for automatic logout on invalidated session
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response.data?.msg || '';

      // Check for our specific invalidation messages
      if (
        msg.includes('Session has been invalidated') ||
        msg.includes('Session invalidated') ||
        msg.includes('User no longer exists') ||
        msg.includes('User no longer exists. Please log in again.')
      ) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login?sessionExpired=true';
      }
    }

    // Let other errors propagate normally
    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);

// Destinations
export const getDestinations = () => API.get('/destinations');
export const getDestination = (id) => API.get(`/destinations/${id}`);

export const createDestination = (formData) => API.post('/destinations', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const updateDestination = (id, formData) => API.put(`/destinations/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const deleteDestination = (id) => {
  return API.delete(`/destinations/${id}`, {
    headers: {
      'x-auth-token': localStorage.getItem('token') // Force token
    }
  });
};

// Users
export const getUsers = () => API.get('/users');
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const getAdminStats = () => API.get("/admin/stats");

export const deleteMyAccount = () => API.delete("/users/me");
export const getMe = () => API.get("/users/me");
export const updateMe = (data) => API.put("/users/me", data);

// Hotels
export const getHotels = () => API.get('/hotels');
export const getHotel = (id) => API.get(`/hotels/${id}`);

export const createHotel = (formData) => API.post('/hotels', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateHotel = (id, formData) => API.put(`/hotels/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deleteHotel = (id) => API.delete(`/hotels/${id}`);

// Flights
export const getFlights = () => API.get('/flights/admin'); // or public if you prefer
export const createFlight = (data) => API.post('/flights', data);
export const updateFlight = (id, data) => API.patch(`/flights/${id}`, data);
export const deleteFlight = (id) => API.delete(`/flights/${id}`);
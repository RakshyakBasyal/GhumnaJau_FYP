// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor: add token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor: global 401 handling for session invalidation
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response.data?.msg || '';
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginRequest && (
        msg.includes('Session has been invalidated') ||
        msg.includes('Session invalidated') ||
        msg.includes('User no longer exists') ||
        msg.includes('Token is not valid') ||
        msg.includes('No token')
      )) {
        console.warn('401 detected - session invalidated, logging out');
        localStorage.removeItem('token');
        window.location.href = '/login?sessionExpired=true';
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);

// Destinations
export const getDestinations = () => API.get('/destinations');
export const getDestination = (id) => API.get(`/destinations/${id}`);
export const createDestination = (formData) => API.post('/destinations', formData);
export const updateDestination = (id, formData) => API.put(`/destinations/${id}`, formData);
export const deleteDestination = (id) => API.delete(`/destinations/${id}`);

// Users / Profile
export const getUsers = () => API.get('/users');
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const getAdminStats = () => API.get("/admin/stats");
export const deleteMyAccount = () => API.delete("/users/me");
export const getMe = () => API.get("/users/me");
export const updateMe = (formData) => API.patch("/users/profile", formData);
export const getUserProfileById = (id) => API.get(`/users/${id}`);
export const getDiscoverUsers = (params = {}) => API.get("/users/discover", { params });
export const sendBuddyRequest = (userId) => API.post("/buddies/requests", { userId });
export const getBuddyRequests = () => API.get("/buddies/requests");
export const respondBuddyRequest = (requestId, action) =>
  API.patch(`/buddies/requests/${requestId}`, { action });
export const getBuddyConnections = () => API.get("/buddies/connections");
export const getBuddyStatus = (userId) => API.get(`/buddies/status/${userId}`);
export const getBuddyMessages = (userId) => API.get(`/buddies/messages/${userId}`);
export const sendBuddyMessage = (userId, text) => API.post("/buddies/messages", { userId, text });

// Hotels
export const getHotels = () => API.get('/hotels');
export const getHotel = (id) => API.get(`/hotels/${id}`);
export const createHotel = (formData) => API.post('/hotels', formData);
export const updateHotel = (id, formData) => API.put(`/hotels/${id}`, formData);
export const deleteHotel = (id) => API.delete(`/hotels/${id}`);

// Flights
export const getFlights = () => API.get('/flights/admin');
export const createFlight = (data) => API.post('/flights', data);
export const updateFlight = (id, data) => API.patch(`/flights/${id}`, data);
export const deleteFlight = (id) => API.delete(`/flights/${id}`);

export default API;
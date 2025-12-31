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



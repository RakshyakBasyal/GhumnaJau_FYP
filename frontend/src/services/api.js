// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

const BASE_URL = 'http://localhost:5000';

export const getImageUrl = (path) => {
  if (!path) return '';
  const s = String(path);
  if (s.startsWith('http')) return s;
  return `${BASE_URL}${s}`;
};

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

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
        localStorage.clear();
        window.location.href = '/login?sessionExpired=true';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => API.post('/auth/register', data);
export const login    = (data) => API.post('/auth/login', data);

// ── Destinations ──────────────────────────────────────────────────────────────
export const getDestinations   = ()               => API.get('/destinations');
export const getDestination    = (id)             => API.get(`/destinations/${id}`);
export const createDestination = (formData)       => API.post('/destinations', formData);
export const updateDestination = (id, formData)   => API.put(`/destinations/${id}`, formData);
export const deleteDestination = (id)             => API.delete(`/destinations/${id}`);

// ── Users / Profile ───────────────────────────────────────────────────────────
export const getUsers           = ()              => API.get('/users');
export const deleteUser         = (id)            => API.delete(`/users/${id}`);
export const getAdminStats      = ()              => API.get('/admin/stats');
export const deleteMyAccount    = ()              => API.delete('/users/me');
export const getMe              = ()              => API.get('/users/me');
export const updateMe           = (formData)      => API.patch('/users/profile', formData);
export const getUserProfileById = (id)            => API.get(`/users/${id}`);
export const getDiscoverUsers   = (params = {})   => API.get('/users/discover', { params });

// ── Buddy / Messaging ─────────────────────────────────────────────────────────
// Connect instantly — seeds a conversation, no approval needed
export const connectUser      = (userId)       => API.post('/buddies/connect', { userId });
// All users I have a conversation with
export const getConnections   = ()             => API.get('/buddies/connections');
// Connection status: { status: 'connected' | 'none' }
export const getBuddyStatus   = (userId)       => API.get(`/buddies/status/${userId}`);
// Messages
export const getBuddyMessages = (userId)       => API.get(`/buddies/messages/${userId}`);
export const sendBuddyMessage = (userId, text) => API.post('/buddies/messages', { userId, text });

// ── Trips ─────────────────────────────────────────────────────────────────────
export const createTrip               = (data)       => API.post('/trips', data);
export const getTrips                 = ()            => API.get('/trips');
export const deleteTrip               = (id)          => API.delete(`/trips/${id}`);
export const getDiscoverTrips         = (params = {}) => API.get('/trips/discover', { params });
export const getGeneralDiscoveryTrips = (params = {}) => API.get('/trips/general-discovery', { params });
export const createTripFromChat       = (data)        => API.post('/trips/from-chat', data);

// ── Trip Rooms (Groups) ───────────────────────────────────────────────────────
export const getTripRooms         = (params = {}) => API.get('/trips/rooms', { params });
export const getMyTripRooms       = ()             => API.get('/trips/rooms/mine');
export const createTripRoom       = (data)         => API.post('/trips/rooms', data);
export const getTripRoomById      = (id)            => API.get(`/trips/rooms/${id}`);
export const joinTripRoom         = (id)            => API.post(`/trips/rooms/${id}/join`);
export const leaveTripRoom        = (id)            => API.post(`/trips/rooms/${id}/leave`);
export const sendRoomMessage      = (id, text)      => API.post(`/trips/rooms/${id}/messages`, { text });
export const updateRoomItinerary  = (id, itinerary) => API.patch(`/trips/rooms/${id}/itinerary`, { itinerary });
export const updateRoomNotes      = (id, notes)     => API.patch(`/trips/rooms/${id}/notes`, { notes });
export const addExpense           = (id, data)      => API.post(`/trips/rooms/${id}/expenses`, data);
export const deleteExpense        = (id, expId)     => API.delete(`/trips/rooms/${id}/expenses/${expId}`);
export const addSettlement        = (id, data)      => API.post(`/trips/rooms/${id}/settlements`, data);
export const deleteSettlement     = (id, setId)     => API.delete(`/trips/rooms/${id}/settlements/${setId}`);
export const respondToRoomRequest = (data)          => API.post('/trips/rooms/respond-request', data);
export const inviteBuddyToRoom    = (data)          => API.post('/trips/rooms/invite', data);
export const acceptRoomInvite     = (roomId)        => API.post(`/trips/rooms/${roomId}/accept-invite`);

// ── Hotels ────────────────────────────────────────────────────────────────────
export const getHotels    = ()               => API.get('/hotels');
export const getHotel     = (id)             => API.get(`/hotels/${id}`);
export const createHotel  = (formData)       => API.post('/hotels', formData);
export const updateHotel  = (id, formData)   => API.put(`/hotels/${id}`, formData);
export const deleteHotel  = (id)             => API.delete(`/hotels/${id}`);

// ── Flights ───────────────────────────────────────────────────────────────────
export const getFlights   = ()           => API.get('/flights/admin');
export const createFlight = (data)       => API.post('/flights', data);
export const updateFlight = (id, data)   => API.patch(`/flights/${id}`, data);
export const deleteFlight = (id)         => API.delete(`/flights/${id}`);

export default API;
// frontend/src/services/feedApi.js
import axios from 'axios';

const BASE = 'http://localhost:5000/api';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Feed ──────────────────────────────────────────────────────────────────────
export const getExploreFeed  = (params = {}) => axios.get(`${BASE}/posts/explore`,  { params, ...headers() });
export const getFollowingFeed = (params = {}) => axios.get(`${BASE}/posts/following`, { params, ...headers() });

// ── Posts ─────────────────────────────────────────────────────────────────────
export const createPost = (data) => {
  // data is FormData (handles images + fields)
  return axios.post(`${BASE}/posts`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      // Don't set Content-Type — axios sets multipart/form-data automatically for FormData
    },
  });
};

export const updatePost = (postId, data) =>
  axios.patch(`${BASE}/posts/${postId}`, data, headers());

export const deletePost = (postId) =>
  axios.delete(`${BASE}/posts/${postId}`, headers());

export const getPost = (postId) =>
  axios.get(`${BASE}/posts/${postId}`, headers());

// ── Interactions ──────────────────────────────────────────────────────────────
export const likePost   = (postId) => axios.post(`${BASE}/posts/${postId}/like`,   {}, headers());
export const unlikePost = (postId) => axios.post(`${BASE}/posts/${postId}/unlike`, {}, headers());

// Save / bookmark a post
export const savePost   = (postId) => axios.post(`${BASE}/posts/${postId}/save`,   {}, headers());
export const unsavePost = (postId) => axios.post(`${BASE}/posts/${postId}/unsave`, {}, headers());

// Get saved posts for current user
export const getSavedPosts = () => axios.get(`${BASE}/posts/saved`, headers());

// ── Comments ──────────────────────────────────────────────────────────────────
export const getComments   = (postId) => axios.get(`${BASE}/posts/${postId}/comments`, headers());
export const addComment    = (postId, text) => axios.post(`${BASE}/posts/${postId}/comments`, { text }, headers());
export const deleteComment = (postId, commentId) => axios.delete(`${BASE}/posts/${postId}/comments/${commentId}`, headers());

// ── Answers (for question posts) ──────────────────────────────────────────────
export const addAnswer    = (postId, text) => axios.post(`${BASE}/posts/${postId}/answers`, { text }, headers());
export const likeAnswer   = (postId, answerId) => axios.post(`${BASE}/posts/${postId}/answers/${answerId}/like`, {}, headers());
export const deleteAnswer = (postId, answerId) => axios.delete(`${BASE}/posts/${postId}/answers/${answerId}`, headers());

// ── Reviews ───────────────────────────────────────────────────────────────────
// Get reviews (post category='review') for a specific destination or hotel
export const getReviews = (type, refId) =>
  axios.get(`${BASE}/posts/reviews`, { params: { reviewType: type, reviewRefId: refId }, ...headers() });

// ── Destination posts ─────────────────────────────────────────────────────────
export const getDestinationPosts = (destinationId) =>
  axios.get(`${BASE}/posts/destination/${destinationId}`, headers());

// ── User posts (for profile page) ─────────────────────────────────────────────
export const getUserPosts = (userId, params = {}) =>
  axios.get(`${BASE}/posts/user/${userId}`, { params, ...headers() });

// ── Follow system ─────────────────────────────────────────────────────────────
export const followUser     = (userId) => axios.post(`${BASE}/follows/${userId}`,   {}, headers());
export const unfollowUser   = (userId) => axios.delete(`${BASE}/follows/${userId}`,    headers());
export const getFollowStats = (userId) => axios.get(`${BASE}/follows/${userId}/stats`, headers());
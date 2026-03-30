// frontend/src/services/feedApi.js
import axios from 'axios';

const BASE = 'http://localhost:5000/api';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Posts ─────────────────────────────────────────────────────────────────────
export const getExploreFeed   = (params = {}) =>
  axios.get(`${BASE}/posts/explore`,   { ...authHeaders(), params });

export const getFollowingFeed = (params = {}) =>
  axios.get(`${BASE}/posts/following`, { ...authHeaders(), params });

export const getUserPosts = (userId, params = {}) =>
  axios.get(`${BASE}/posts/user/${userId}`, { ...authHeaders(), params });

export const getPost = (id) =>
  axios.get(`${BASE}/posts/${id}`, authHeaders());

export const createPost = (formData) =>
  axios.post(`${BASE}/posts`, formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'multipart/form-data',
    },
  });

export const editPost = (id, formData) =>
  axios.put(`${BASE}/posts/${id}`, formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'multipart/form-data',
    },
  });

export const deletePost = (id) =>
  axios.delete(`${BASE}/posts/${id}`, authHeaders());

export const toggleLike = (id) =>
  axios.post(`${BASE}/posts/${id}/like`, {}, authHeaders());

// ── Comments ──────────────────────────────────────────────────────────────────
export const getComments  = (postId, params = {}) =>
  axios.get(`${BASE}/comments/${postId}`, { ...authHeaders(), params });

export const addComment = (postId, content) =>
  axios.post(`${BASE}/comments/${postId}`, { content }, authHeaders());

export const editComment = (commentId, content) =>
  axios.put(`${BASE}/comments/comment/${commentId}`, { content }, authHeaders());

export const deleteComment = (commentId) =>
  axios.delete(`${BASE}/comments/comment/${commentId}`, authHeaders());

// ── Follow ────────────────────────────────────────────────────────────────────
export const followUser     = (userId) =>
  axios.post(`${BASE}/follows/${userId}/follow`,   {}, authHeaders());

export const unfollowUser   = (userId) =>
  axios.delete(`${BASE}/follows/${userId}/follow`,     authHeaders());

export const getFollowStats = (userId) =>
  axios.get(`${BASE}/follows/${userId}/stats`, authHeaders());

export const getFollowers = (userId) =>
  axios.get(`${BASE}/follows/${userId}/followers`, authHeaders());

export const getFollowing = (userId) =>
  axios.get(`${BASE}/follows/${userId}/following`, authHeaders());
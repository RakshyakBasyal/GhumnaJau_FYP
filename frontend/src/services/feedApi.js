// frontend/src/services/feedApi.js
import axios from 'axios';

const BASE = 'http://localhost:5000/api';

const headers = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ── Feed ──────────────────────────────────────────────────────────────────────
export const getExploreFeed   = (params = {}) => axios.get(`${BASE}/posts/explore`,   { params, ...headers() });
export const getFollowingFeed = (params = {}) => axios.get(`${BASE}/posts/following`, { params, ...headers() });

// ── Posts ─────────────────────────────────────────────────────────────────────
export const createPost = (data) =>
  axios.post(`${BASE}/posts`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

// updatePost now accepts FormData (for image add/delete) OR plain object (text-only edit)
export const updatePost = (postId, data) => {
  const isFormData = data instanceof FormData;
  return axios.patch(`${BASE}/posts/${postId}`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
  });
};

export const deletePost = (postId) => axios.delete(`${BASE}/posts/${postId}`, headers());
export const getPost    = (postId) => axios.get(`${BASE}/posts/${postId}`, headers());

// ── Interactions ──────────────────────────────────────────────────────────────
export const likePost   = (postId) => axios.post(`${BASE}/posts/${postId}/like`,   {}, headers());
export const unlikePost = (postId) => axios.post(`${BASE}/posts/${postId}/unlike`, {}, headers());

// Save / bookmark
export const savePost      = (postId) => axios.post(`${BASE}/posts/${postId}/save`,   {}, headers());
export const unsavePost    = (postId) => axios.post(`${BASE}/posts/${postId}/unsave`, {}, headers());
export const getSavedPosts = (params = {}) => axios.get(`${BASE}/posts/saved`, { params, ...headers() });

// ── Comments ──────────────────────────────────────────────────────────────────
export const getComments   = (postId)            => axios.get(`${BASE}/posts/${postId}/comments`, headers());
// Send `content` field to match Comment model schema
export const addComment    = (postId, text)      => axios.post(`${BASE}/posts/${postId}/comments`, { content: text }, headers());
export const deleteComment = (postId, commentId) => axios.delete(`${BASE}/posts/${postId}/comments/${commentId}`, headers());

// ── Answers ───────────────────────────────────────────────────────────────────
export const addAnswer    = (postId, text)     => axios.post(`${BASE}/posts/${postId}/answers`, { text }, headers());
export const likeAnswer   = (postId, answerId) => axios.post(`${BASE}/posts/${postId}/answers/${answerId}/like`, {}, headers());
export const deleteAnswer = (postId, answerId) => axios.delete(`${BASE}/posts/${postId}/answers/${answerId}`, headers());

// ── Reviews ───────────────────────────────────────────────────────────────────
export const getReviews = (type, refId) =>
  axios.get(`${BASE}/posts/reviews`, { params: { reviewType: type, reviewRefId: refId }, ...headers() });

// ── Destination / user posts ──────────────────────────────────────────────────
export const getDestinationPosts = (destinationId) =>
  axios.get(`${BASE}/posts/destination/${destinationId}`, headers());

export const getUserPosts = (userId, params = {}) =>
  axios.get(`${BASE}/posts/user/${userId}`, { params, ...headers() });

// ── Follow system ─────────────────────────────────────────────────────────────
// followRoutes.js defines:
//   POST   /api/follows/:userId       → follow
//   DELETE /api/follows/:userId       → unfollow
//   GET    /api/follows/:userId/is-following
//   GET    /api/follows/:userId/followers
//   GET    /api/follows/:userId/following
//   GET    /api/follows/:userId/stats
export const followUser       = (userId) => axios.post(`${BASE}/follows/${userId}`,             {}, headers());
export const unfollowUser     = (userId) => axios.delete(`${BASE}/follows/${userId}`,               headers());
export const checkFollowing   = (userId) => axios.get(`${BASE}/follows/${userId}/is-following`,     headers());
export const getFollowStats   = (userId) => axios.get(`${BASE}/follows/${userId}/stats`,            headers());
export const getFollowers     = (userId) => axios.get(`${BASE}/follows/${userId}/followers`,        headers());
export const getFollowingList = (userId) => axios.get(`${BASE}/follows/${userId}/following`,        headers());
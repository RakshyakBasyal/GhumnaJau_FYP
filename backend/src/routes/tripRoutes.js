// backend/src/routes/tripRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  createTrip, getTrips, deleteTrip, getDiscoverTrips, getGeneralDiscovery,
  getTripRooms, getMyRooms, createTripRoom, getTripRoomById, joinTripRoom, leaveTripRoom,
  addRoomMessage, updateRoomItinerary, updateRoomNotes,
  respondToJoinRequest, inviteBuddyToRoom, acceptRoomInvite,
  planTripTogether, createTripFromChat,
  addExpense, deleteExpense, addSettlement, deleteSettlement
} = require('../controllers/tripController');

// ── Trip routes ────────────────────────────────────────────────────────────────
router.post('/',                   auth, createTrip);
router.get('/',                    auth, getTrips);
router.delete('/:id',              auth, deleteTrip);
router.get('/discover',            auth, getDiscoverTrips);
router.get('/general-discovery',   auth, getGeneralDiscovery);

// Plan a trip together from inside a 1-on-1 chat (both names work)
router.post('/plan-together',      auth, planTripTogether);
router.post('/from-chat',          auth, createTripFromChat);

// ── Trip room routes ─────────────────────────────────────────────────────────
// NOTE: specific routes MUST come before parameterized /:id routes
router.get('/rooms',               auth, getTripRooms);
router.get('/rooms/mine',          auth, getMyRooms);           // ← my groups only
router.post('/rooms',              auth, createTripRoom);
router.post('/rooms/respond-request', auth, respondToJoinRequest);  // before /:id
router.post('/rooms/invite',       auth, inviteBuddyToRoom);        // before /:id
router.get('/rooms/:id',           auth, getTripRoomById);
router.post('/rooms/:id/join',     auth, joinTripRoom);
router.post('/rooms/:id/leave',    auth, leaveTripRoom);
router.post('/rooms/:id/messages', auth, addRoomMessage);
router.patch('/rooms/:id/itinerary', auth, updateRoomItinerary);
router.patch('/rooms/:id/notes',   auth, updateRoomNotes);
router.post('/rooms/:roomId/accept-invite', auth, acceptRoomInvite);

// Expense routes
router.post('/rooms/:id/expenses', auth, addExpense);
router.delete('/rooms/:id/expenses/:expenseId', auth, deleteExpense);
router.post('/rooms/:id/settlements', auth, addSettlement);
router.delete('/rooms/:id/settlements/:settlementId', auth, deleteSettlement);

module.exports = router;
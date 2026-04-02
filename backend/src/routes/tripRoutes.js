const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createTrip,
  getTrips,
  deleteTrip,
  getDiscoverTrips,
  getGeneralDiscovery,
  getTripRooms,
  createTripRoom,
  getTripRoomById,
  joinTripRoom,
  leaveTripRoom,
  addRoomMessage,
  updateRoomItinerary,
  updateRoomNotes,
  respondToJoinRequest,
  inviteBuddyToRoom,
  acceptRoomInvite
} = require('../controllers/tripController');

// Trip Routes
router.post('/', auth, createTrip);
router.get('/', auth, getTrips);
router.delete('/:id', auth, deleteTrip);
router.get('/discover', auth, getDiscoverTrips);
router.get('/general-discovery', auth, getGeneralDiscovery);

// Trip Room Routes
router.get('/rooms', auth, getTripRooms);
router.post('/rooms', auth, createTripRoom);
router.get('/rooms/:id', auth, getTripRoomById);
router.post('/rooms/:id/join', auth, joinTripRoom);
router.post('/rooms/:id/leave', auth, leaveTripRoom);
router.post('/rooms/:id/messages', auth, addRoomMessage);
router.patch('/rooms/:id/itinerary', auth, updateRoomItinerary);
router.patch('/rooms/:id/notes', auth, updateRoomNotes);
router.post('/rooms/respond-request', auth, respondToJoinRequest);
router.post('/rooms/invite', auth, inviteBuddyToRoom);
router.post('/rooms/:roomId/accept-invite', auth, acceptRoomInvite);

module.exports = router;

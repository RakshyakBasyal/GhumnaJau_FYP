// const Trip = require('../models/Trip');
// const TripRoom = require('../models/TripRoom');
// const User = require('../models/User');

// // --- Trip Controllers ---

// exports.createTrip = async (req, res) => {
//   try {
//     const { destination, startDate, endDate, budget, travelStyle } = req.body;
//     const trip = new Trip({
//       user: req.user.id,
//       destination,
//       startDate,
//       endDate,
//       budget,
//       travelStyle
//     });
//     await trip.save();
//     res.status(201).json(trip);
//   } catch (err) {
//     console.error('Create trip error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.getTrips = async (req, res) => {
//   try {
//     const trips = await Trip.find({ user: req.user.id }).sort({ startDate: 1 });
//     res.json(trips);
//   } catch (err) {
//     console.error('Get trips error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.deleteTrip = async (req, res) => {
//   try {
//     const trip = await Trip.findById(req.params.id);
//     if (!trip) return res.status(404).json({ msg: 'Trip not found' });
//     if (trip.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    
//     await Trip.findByIdAndDelete(req.params.id);
//     res.json({ msg: 'Trip removed' });
//   } catch (err) {
//     console.error('Delete trip error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.getGeneralDiscovery = async (req, res) => {
//   try {
//     const me = await User.findById(req.user.id).select(
//       "travelStyle travelPace travelBudget travelInterests preferredDestinations languages"
//     );
//     if (!me) return res.status(404).json({ msg: "User not found" });

//     const { style, budget, language, limit = 20 } = req.query;

//     let query = {
//       _id: { $ne: req.user.id },
//       role: "USER",
//     };

//     if (style) query.travelStyle = style;
//     if (budget) query.travelBudget = budget;
//     if (language) query.languages = { $in: [new RegExp(language, 'i')] };

//     const users = await User.find(query)
//       .select("fullName avatar travelStyle travelBudget travelInterests preferredDestinations city languages bio travelStats gender age")
//       .limit(Number(limit));

//     // Basic similarity scoring
//     const scored = users.map(user => {
//       let score = 0;
      
//       if (user.travelStyle === me.travelStyle) score += 25;
//       if (user.travelBudget === me.travelBudget) score += 20;
//       if (user.travelPace === me.travelPace) score += 15;
      
//       const commonInterests = (user.travelInterests || []).filter(i => 
//         (me.travelInterests || []).includes(i)
//       );
//       score += commonInterests.length * 10;

//       const commonLanguages = (user.languages || []).filter(l => 
//         (me.languages || []).some(ml => ml.toLowerCase() === l.toLowerCase())
//       );
//       score += commonLanguages.length * 10;

//       return { ...user.toObject(), compatibilityScore: Math.min(score, 100) };
//     });

//     res.json(scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore));
//   } catch (err) {
//     console.error("General discovery error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// // --- Discovery & Matching ---

// exports.getDiscoverTrips = async (req, res) => {
//   try {
//     const { destination, startDate, endDate, budget, travelStyle } = req.query;
    
//     // 1. Find matching trips from other users
//     let query = {
//       user: { $ne: req.user.id },
//       status: 'active'
//     };

//     if (destination) {
//       query.destination = { $regex: destination, $options: 'i' };
//     }

//     const trips = await Trip.find(query)
//       .populate('user', 'fullName avatar travelStyle travelInterests gender age')
//       .sort({ startDate: 1 });

//     // Matching logic for trips
//     const scoredTrips = trips.map(trip => {
//       let score = 0;
//       const reasons = [];

//       if (startDate && endDate) {
//         const s1 = new Date(startDate);
//         const e1 = new Date(endDate);
//         const s2 = new Date(trip.startDate);
//         const e2 = new Date(trip.endDate);

//         if (s2 <= e1 && e2 >= s1) {
//           score += 50;
//           reasons.push('Overlapping dates');
//         }
//       }

//       if (destination && trip.destination.toLowerCase().includes(destination.toLowerCase())) {
//         score += 30;
//         reasons.push('Same destination');
//       }

//       if (budget && trip.budget === budget) {
//         score += 10;
//         reasons.push('Similar budget');
//       }

//       if (travelStyle && trip.travelStyle === travelStyle) {
//         score += 10;
//         reasons.push('Similar style');
//       }

//       return { ...trip.toObject(), matchScore: score, matchReasons: reasons };
//     });

//     res.json(scoredTrips.sort((a, b) => b.matchScore - a.matchScore));
//   } catch (err) {
//     console.error('Discover trips error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// // --- Trip Room Controllers ---

// exports.getTripRooms = async (req, res) => {
//   try {
//     const { destination, startDate, endDate } = req.query;
//     let query = {};
//     if (destination) query.destination = { $regex: destination, $options: 'i' };
    
//     if (startDate && endDate) {
//       const s = new Date(startDate);
//       const e = new Date(endDate);
//       query.startDate = { $lte: e };
//       query.endDate = { $gte: s };
//     }

//     const rooms = await TripRoom.find(query)
//       .populate('members', 'fullName avatar')
//       .populate('pendingRequests', 'fullName avatar travelStyle')
//       .populate('invitedBuddies', 'fullName avatar travelStyle')
//       .populate('createdBy', 'fullName avatar')
//       .sort({ createdAt: -1 });
//     res.json(rooms);
//   } catch (err) {
//     console.error('Get rooms error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.createTripRoom = async (req, res) => {
//   try {
//     const room = new TripRoom({
//       ...req.body,
//       createdBy: req.user.id,
//       members: [req.user.id]
//     });
//     await room.save();
//     res.status(201).json(room);
//   } catch (err) {
//     console.error('Create room error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.getTripRoomById = async (req, res) => {
//   try {
//     const room = await TripRoom.findById(req.params.id)
//       .populate('members', 'fullName avatar travelStyle')
//       .populate('messages.sender', 'fullName avatar');
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
//     res.json(room);
//   } catch (err) {
//     console.error('Get room by ID error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.joinTripRoom = async (req, res) => {
//   try {
//     const room = await TripRoom.findById(req.params.id);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
    
//     // If already member, return error
//     if (room.members.includes(req.user.id)) return res.status(400).json({ msg: 'Already a member' });
    
//     // Check if user has already requested
//     if (room.pendingRequests.includes(req.user.id)) {
//       return res.status(400).json({ msg: 'Join request already pending' });
//     }

//     if (room.members.length >= room.maxMembers) return res.status(400).json({ msg: 'Room is full' });

//     // Add to pending requests instead of direct join
//     room.pendingRequests.push(req.user.id);
//     await room.save();
    
//     // Emit notification to owner
//     const io = req.app.get("io");
//     if (io) {
//       io.to(`user:${String(room.createdBy)}`).emit("room:request:new", {
//         roomId: room._id,
//         userId: req.user.id
//       });
//     }

//     res.json({ msg: 'Join request sent to owner' });
//   } catch (err) {
//     console.error('Join room error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.respondToJoinRequest = async (req, res) => {
//   try {
//     const { roomId, userId, action } = req.body; // action: 'accept' | 'reject'
//     const room = await TripRoom.findById(roomId);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
    
//     if (room.createdBy.toString() !== req.user.id) {
//       return res.status(401).json({ msg: 'Not authorized' });
//     }

//     if (action === 'accept') {
//       if (room.members.length >= room.maxMembers) return res.status(400).json({ msg: 'Room is full' });
//       room.members.push(userId);
//     }
    
//     room.pendingRequests = room.pendingRequests.filter(id => id.toString() !== userId);
//     await room.save();

//     // Emit live update
//     const io = req.app.get("io");
//     if (io) {
//       io.to(`user:${userId}`).emit("room:request:updated", { roomId, status: action === 'accept' ? 'accepted' : 'rejected' });
//     }

//     res.json({ msg: `Request ${action}ed`, room });
//   } catch (err) {
//     console.error('Respond join request error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.inviteBuddyToRoom = async (req, res) => {
//   try {
//     const { roomId, buddyId } = req.body;
//     const room = await TripRoom.findById(roomId);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
    
//     if (room.createdBy.toString() !== req.user.id) {
//       return res.status(401).json({ msg: 'Not authorized' });
//     }

//     if (room.members.includes(buddyId)) return res.status(400).json({ msg: 'Buddy already in room' });
//     if (!room.invitedBuddies.includes(buddyId)) {
//       room.invitedBuddies.push(buddyId);
//       await room.save();
//     }

//     // Emit live update
//     const io = req.app.get("io");
//     if (io) {
//       io.to(`user:${buddyId}`).emit("room:invite:new", { roomId, roomName: room.destination });
//     }

//     res.json({ msg: 'Invitation sent' });
//   } catch (err) {
//     console.error('Invite buddy error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.acceptRoomInvite = async (req, res) => {
//   try {
//     const { roomId } = req.params;
//     const room = await TripRoom.findById(roomId);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });

//     if (!room.invitedBuddies.includes(req.user.id)) {
//       return res.status(400).json({ msg: 'No invitation found' });
//     }

//     if (room.members.length >= room.maxMembers) return res.status(400).json({ msg: 'Room is full' });

//     room.members.push(req.user.id);
//     room.invitedBuddies = room.invitedBuddies.filter(id => id.toString() !== req.user.id);
//     await room.save();

//     res.json({ msg: 'Joined room via invite', room });
//   } catch (err) {
//     console.error('Accept invite error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.leaveTripRoom = async (req, res) => {
//   try {
//     const room = await TripRoom.findById(req.params.id);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
//     room.members = room.members.filter(m => m.toString() !== req.user.id);
//     await room.save();
//     res.json({ msg: 'Left room' });
//   } catch (err) {
//     console.error('Leave room error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.addRoomMessage = async (req, res) => {
//   try {
//     const room = await TripRoom.findById(req.params.id);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
//     if (!room.members.map(m => m.toString()).includes(req.user.id)) return res.status(401).json({ msg: 'Not a member' });

//     const newMessage = {
//       sender: req.user.id,
//       text: req.body.text,
//       createdAt: new Date()
//     };
    
//     room.messages.push(newMessage);
//     await room.save();
    
//     const populated = await TripRoom.findById(req.params.id)
//       .select({ messages: { $slice: -1 } })
//       .populate('messages.sender', 'fullName avatar');
      
//     res.json(populated.messages[0]);
//   } catch (err) {
//     console.error('Add message error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.updateRoomItinerary = async (req, res) => {
//   try {
//     const room = await TripRoom.findById(req.params.id);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
//     room.itinerary = req.body.itinerary;
//     await room.save();
//     res.json(room.itinerary);
//   } catch (err) {
//     console.error('Update itinerary error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };

// exports.updateRoomNotes = async (req, res) => {
//   try {
//     const room = await TripRoom.findById(req.params.id);
//     if (!room) return res.status(404).json({ msg: 'Room not found' });
//     room.notes = req.body.notes;
//     await room.save();
//     res.json({ notes: room.notes });
//   } catch (err) {
//     console.error('Update notes error:', err);
//     res.status(500).json({ msg: 'Server error' });
//   }
// };


// backend/src/controllers/tripController.js
const Trip = require('../models/Trip');
const TripRoom = require('../models/TripRoom');
const User = require('../models/User');

// ── TRIP CRUD ─────────────────────────────────────────────────────────────────

exports.createTrip = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, travelStyle, description } = req.body;
    if (!destination) return res.status(400).json({ msg: 'Destination is required' });

    const trip = new Trip({
      user: req.user.id,
      destination,
      startDate,
      endDate,
      budget,
      travelStyle,
      description,
    });
    await trip.save();

    // Auto-create a trip room for this trip
    const room = new TripRoom({
      destination,
      startDate,
      endDate: endDate || startDate,
      budget: budget || '',
      description: description || '',
      maxMembers: 10,
      createdBy: req.user.id,
      members: [req.user.id],
      tripRef: trip._id,
    });
    await room.save();

    trip.roomId = room._id;
    await trip.save();

    const populated = await Trip.findById(trip._id).populate('user', 'fullName avatar');
    res.status(201).json({ trip: populated, room });
  } catch (err) {
    console.error('Create trip error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.user.id })
      .populate('user', 'fullName avatar')
      .sort({ startDate: 1 });
    res.json(trips);
  } catch (err) {
    console.error('Get trips error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ msg: 'Trip not found' });
    if (trip.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    // Delete associated trip room too
    if (trip.roomId) await TripRoom.findByIdAndDelete(trip.roomId);

    await Trip.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Trip removed' });
  } catch (err) {
    console.error('Delete trip error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── DISCOVER TRIPS (trip-based matching) ──────────────────────────────────────
// All fields optional — at least one should be provided for useful results
exports.getDiscoverTrips = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, travelStyle } = req.query;

    // Build a flexible query — no field is required
    let query = {
      user: { $ne: req.user.id },
      status: 'active',
    };

    if (destination && destination.trim()) {
      query.destination = { $regex: destination.trim(), $options: 'i' };
    }

    // Date overlap: only apply if at least one date is provided
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      query.startDate = { $lte: e };
      query.endDate   = { $gte: s };
    } else if (startDate) {
      query.endDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.startDate = { $lte: new Date(endDate) };
    }

    const trips = await Trip.find(query)
      .populate('user', 'fullName avatar travelStyle travelInterests gender age city bio')
      .sort({ startDate: 1 });

    const scoredTrips = trips.map((trip) => {
      let score = 0;
      const reasons = [];

      if (startDate || endDate) {
        const s1 = startDate ? new Date(startDate) : null;
        const e1 = endDate   ? new Date(endDate)   : null;
        const s2 = new Date(trip.startDate);
        const e2 = new Date(trip.endDate);

        const overlaps = (!s1 || s2 <= (e1 || s2)) && (!e1 || e2 >= (s1 || e2));
        if (overlaps) { score += 40; reasons.push('Overlapping dates'); }
      }

      if (destination && trip.destination.toLowerCase().includes(destination.toLowerCase())) {
        score += 35;
        reasons.push('Same destination');
      }

      if (budget && trip.budget === budget) { score += 15; reasons.push('Similar budget'); }
      if (travelStyle && trip.travelStyle === travelStyle) { score += 10; reasons.push('Similar style'); }

      return { ...trip.toObject(), matchScore: score, matchReasons: reasons };
    });

    res.json(scoredTrips.sort((a, b) => b.matchScore - a.matchScore));
  } catch (err) {
    console.error('Discover trips error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── GENERAL DISCOVERY (profile-based) ─────────────────────────────────────────
exports.getGeneralDiscovery = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select(
      'travelStyle travelPace travelBudget travelInterests preferredDestinations languages'
    );
    if (!me) return res.status(404).json({ msg: 'User not found' });

    const { style, budget, language, limit = 20 } = req.query;

    let query = { _id: { $ne: req.user.id }, role: 'USER' };
    if (style)    query.travelStyle  = style;
    if (budget)   query.travelBudget = budget;
    if (language) query.languages    = { $in: [new RegExp(language, 'i')] };

    const users = await User.find(query)
      .select(
        'fullName avatar travelStyle travelBudget travelInterests preferredDestinations ' +
        'city languages bio travelStats gender age intentStatus'
      )
      .limit(Number(limit));

    const myInterests = new Set((me.travelInterests || []).map(i => i.toLowerCase()));
    const myLanguages = new Set((me.languages       || []).map(l => l.toLowerCase()));

    const scored = users.map((user) => {
      let score = 0;
      const reasons = [];

      if (user.travelStyle === me.travelStyle && me.travelStyle) { score += 25; reasons.push('Same travel style'); }
      if (user.travelBudget === me.travelBudget && me.travelBudget) { score += 20; reasons.push('Similar budget'); }
      if (user.travelPace === me.travelPace && me.travelPace) { score += 15; reasons.push('Same travel pace'); }

      const commonInterests = (user.travelInterests || []).filter(i => myInterests.has(i.toLowerCase()));
      if (commonInterests.length > 0) {
        score += Math.min(commonInterests.length * 10, 30);
        reasons.push(`${commonInterests.length} shared interest${commonInterests.length > 1 ? 's' : ''}`);
      }

      const commonLanguages = (user.languages || []).filter(l => myLanguages.has(l.toLowerCase()));
      if (commonLanguages.length > 0) {
        score += Math.min(commonLanguages.length * 10, 20);
        reasons.push('Shared language');
      }

      return {
        ...user.toObject(),
        compatibilityScore: Math.min(score, 100),
        matchReasons: reasons,
      };
    });

    res.json(scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore));
  } catch (err) {
    console.error('General discovery error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── TRIP ROOMS ────────────────────────────────────────────────────────────────

exports.getTripRooms = async (req, res) => {
  try {
    const { destination, startDate, endDate } = req.query;
    let query = {};

    if (destination) query.destination = { $regex: destination, $options: 'i' };

    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      query.startDate = { $lte: e };
      query.endDate   = { $gte: s };
    } else if (startDate) {
      query.endDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.startDate = { $lte: new Date(endDate) };
    }

    const rooms = await TripRoom.find(query)
      .populate('members',         'fullName avatar travelStyle')
      .populate('pendingRequests', 'fullName avatar travelStyle')
      .populate('invitedBuddies',  'fullName avatar travelStyle')
      .populate('createdBy',       'fullName avatar')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.createTripRoom = async (req, res) => {
  try {
    if (!req.body.endDate) req.body.endDate = req.body.startDate;

    const room = new TripRoom({
      ...req.body,
      createdBy: req.user.id,
      members: [req.user.id],
    });
    await room.save();

    const populated = await TripRoom.findById(room._id)
      .populate('members',   'fullName avatar')
      .populate('createdBy', 'fullName avatar');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getTripRoomById = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id)
      .populate('members',          'fullName avatar travelStyle')
      .populate('createdBy',        'fullName avatar')
      .populate('messages.sender',  'fullName avatar');
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
    console.error('Get room by ID error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.joinTripRoom = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    if (room.members.map(m => m.toString()).includes(req.user.id))
      return res.status(400).json({ msg: 'Already a member' });

    if (room.pendingRequests.map(m => m.toString()).includes(req.user.id))
      return res.status(400).json({ msg: 'Join request already pending' });

    if (room.members.length >= room.maxMembers)
      return res.status(400).json({ msg: 'Room is full' });

    room.pendingRequests.push(req.user.id);
    await room.save();

    const requester = await User.findById(req.user.id).select('fullName avatar');

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(room.createdBy)}`).emit('room:request:new', {
        roomId: room._id,
        roomDestination: room.destination,
        userId: req.user.id,
        userName: requester?.fullName || 'Someone',
        userAvatar: requester?.avatar || '',
      });
    }

    res.json({ msg: 'Join request sent to group owner' });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.respondToJoinRequest = async (req, res) => {
  try {
    const { roomId, userId, action } = req.body;
    const room = await TripRoom.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    if (room.createdBy.toString() !== req.user.id)
      return res.status(401).json({ msg: 'Not authorized' });

    if (action === 'accept') {
      if (room.members.length >= room.maxMembers)
        return res.status(400).json({ msg: 'Room is full' });
      room.members.push(userId);
    }

    room.pendingRequests = room.pendingRequests.filter((id) => id.toString() !== userId);
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('room:request:updated', {
        roomId,
        roomDestination: room.destination,
        status: action === 'accept' ? 'accepted' : 'rejected',
      });
    }

    res.json({ msg: `Request ${action}ed`, room });
  } catch (err) {
    console.error('Respond join request error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.inviteBuddyToRoom = async (req, res) => {
  try {
    const { roomId, buddyId } = req.body;
    const room = await TripRoom.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    if (room.createdBy.toString() !== req.user.id)
      return res.status(401).json({ msg: 'Not authorized' });

    if (room.members.map(m => m.toString()).includes(buddyId))
      return res.status(400).json({ msg: 'Buddy already in room' });

    if (!room.invitedBuddies.map(m => m.toString()).includes(buddyId)) {
      room.invitedBuddies.push(buddyId);
      await room.save();
    }

    const inviter = await User.findById(req.user.id).select('fullName');

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${buddyId}`).emit('room:invite:new', {
        roomId,
        roomDestination: room.destination,
        inviterName: inviter?.fullName || 'Someone',
      });
    }

    res.json({ msg: 'Invitation sent' });
  } catch (err) {
    console.error('Invite buddy error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.acceptRoomInvite = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await TripRoom.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    if (!room.invitedBuddies.map(m => m.toString()).includes(req.user.id))
      return res.status(400).json({ msg: 'No invitation found' });

    if (room.members.length >= room.maxMembers)
      return res.status(400).json({ msg: 'Room is full' });

    room.members.push(req.user.id);
    room.invitedBuddies = room.invitedBuddies.filter((id) => id.toString() !== req.user.id);
    await room.save();

    const joiner = await User.findById(req.user.id).select('fullName avatar');

    // Notify room creator
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(room.createdBy)}`).emit('room:member:joined', {
        roomId,
        roomDestination: room.destination,
        userId: req.user.id,
        userName: joiner?.fullName || 'Someone',
        userAvatar: joiner?.avatar || '',
      });
    }

    res.json({ msg: 'Joined room via invite', room });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.leaveTripRoom = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    room.members = room.members.filter((m) => m.toString() !== req.user.id);
    await room.save();
    res.json({ msg: 'Left room' });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addRoomMessage = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    if (!room.members.map((m) => m.toString()).includes(req.user.id))
      return res.status(401).json({ msg: 'Not a member' });

    const newMessage = { sender: req.user.id, text: req.body.text, createdAt: new Date() };
    room.messages.push(newMessage);
    await room.save();

    const populated = await TripRoom.findById(req.params.id)
      .select({ messages: { $slice: -1 } })
      .populate('messages.sender', 'fullName avatar');

    const msg = populated.messages[0];

    // Broadcast to all room members
    const io = req.app.get('io');
    if (io) {
      io.emit('room:message:new', { roomId: req.params.id, message: msg });
    }

    res.json(msg);
  } catch (err) {
    console.error('Add message error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateRoomItinerary = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    room.itinerary = req.body.itinerary;
    await room.save();
    res.json(room.itinerary);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateRoomNotes = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    room.notes = req.body.notes;
    await room.save();
    res.json({ notes: room.notes });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── PLAN A TRIP TOGETHER (from chat) ──────────────────────────────────────────
// Creates a trip + room for two buddies who decide to plan together via chat
exports.planTripTogether = async (req, res) => {
  try {
    const { buddyId, destination, startDate, endDate, budget, description } = req.body;

    if (!buddyId || !destination) {
      return res.status(400).json({ msg: 'buddyId and destination are required' });
    }

    const trip = new Trip({
      user: req.user.id,
      destination,
      startDate,
      endDate: endDate || startDate,
      budget: budget || '',
      description: description || '',
      status: 'active',
    });
    await trip.save();

    const room = new TripRoom({
      destination,
      startDate,
      endDate: endDate || startDate,
      budget: budget || '',
      description: description || `Trip to ${destination} planned together`,
      maxMembers: 10,
      createdBy: req.user.id,
      members: [req.user.id, buddyId],
      tripRef: trip._id,
    });
    await room.save();

    trip.roomId = room._id;
    await trip.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${buddyId}`).emit('room:invite:accepted', {
        roomId: room._id,
        roomDestination: destination,
        message: 'You have been added to a new trip group!',
      });
    }

    const populated = await TripRoom.findById(room._id)
      .populate('members',   'fullName avatar')
      .populate('createdBy', 'fullName avatar');

    res.status(201).json({ trip, room: populated });
  } catch (err) {
    console.error('Plan trip together error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};
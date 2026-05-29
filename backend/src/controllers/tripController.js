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
      user: req.user.id, destination, startDate, endDate, budget, travelStyle, description,
    });
    await trip.save();

    const room = new TripRoom({
      destination, startDate,
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
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ msg: 'Trip not found' });
    if (trip.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

    if (trip.roomId) await TripRoom.findByIdAndDelete(trip.roomId);
    await Trip.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Trip removed' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// DISCOVER TRIPS (trip-based matching) 
exports.getDiscoverTrips = async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, travelStyle } = req.query;

    let query = { user: { $ne: req.user.id }, status: 'active' };

    if (destination && destination.trim()) {
      query.destination = { $regex: destination.trim(), $options: 'i' };
    }
    if (startDate && endDate) {
      query.startDate = { $lte: new Date(endDate) };
      query.endDate   = { $gte: new Date(startDate) };
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
        score += 35; reasons.push('Same destination');
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

// ── GENERAL DISCOVERY (profile-based user search) ─────────────────────────────
// FIX: destination param now actually filters preferredDestinations in DB query
// so searching "Pokhara" returns users who listed Pokhara as preferred destination.
// Users without ANY preferredDestinations are still included when no destination
// is specified (show everyone for general tab), but filtered out when destination
// is provided so results are relevant.
exports.getGeneralDiscovery = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select(
      'travelStyle travelPace travelBudget travelInterests preferredDestinations languages'
    );
    if (!me) return res.status(404).json({ msg: 'User not found' });

    const { destination, style, budget, language, limit = 100 } = req.query;

    // Build DB query
    let query = { _id: { $ne: req.user.id }, role: 'USER' };
    if (style)    query.travelStyle  = style;
    if (budget)   query.travelBudget = budget;
    if (language) query.languages    = { $in: [new RegExp(language, 'i')] };

    // KEY FIX: when a destination is provided, filter users whose preferredDestinations
    // contains that string (case-insensitive). This is the main bug that caused
    // solo travelers not appearing in destination searches.
    if (destination && destination.trim()) {
      query.preferredDestinations = {
        $elemMatch: { $regex: destination.trim(), $options: 'i' },
      };
    }

    const users = await User.find(query)
      .select(
        'fullName avatar travelStyle travelBudget travelInterests preferredDestinations ' +
        'city languages bio travelStats gender age intentStatus'
      )
      .limit(Math.min(Number(limit), 200));

    const myStyle        = String(me.travelStyle  || '').toLowerCase();
    const myBudget       = String(me.travelBudget || '').toLowerCase();
    const myPace         = String(me.travelPace   || '').toLowerCase();
    const myInterests    = new Set((me.travelInterests      || []).map(i => i.toLowerCase()));
    const myLanguages    = new Set((me.languages             || []).map(l => l.toLowerCase()));
    const myDestinations = new Set((me.preferredDestinations || []).map(d => d.toLowerCase()));

    const scored = users.map((user) => {
      let score = 0;
      const reasons = [];

      if (myStyle && String(user.travelStyle || '').toLowerCase() === myStyle) {
        score += 25; reasons.push('Same travel style');
      }
      if (myBudget && String(user.travelBudget || '').toLowerCase() === myBudget) {
        score += 20; reasons.push('Similar budget');
      }
      if (myPace && String(user.travelPace || '').toLowerCase() === myPace) {
        score += 10; reasons.push('Same travel pace');
      }

      const commonInterests = (user.travelInterests || []).filter(i => myInterests.has(i.toLowerCase()));
      if (commonInterests.length > 0) {
        score += Math.min(commonInterests.length * 8, 25);
        reasons.push(`${commonInterests.length} shared interest${commonInterests.length > 1 ? 's' : ''}`);
      }

      const commonLanguages = (user.languages || []).filter(l => myLanguages.has(l.toLowerCase()));
      if (commonLanguages.length > 0) {
        score += Math.min(commonLanguages.length * 5, 10);
        reasons.push('Shared language');
      }

      const commonDestinations = (user.preferredDestinations || []).filter(d => myDestinations.has(d.toLowerCase()));
      if (commonDestinations.length > 0) {
        score += Math.min(commonDestinations.length * 5, 10);
        reasons.push(`Going to ${commonDestinations[0]}`);
      }

      // Bonus: if destination search matches, push score up so they appear high
      if (destination && destination.trim()) {
        const destLower = destination.trim().toLowerCase();
        const inPrefs = (user.preferredDestinations || []).some(d => d.toLowerCase().includes(destLower));
        if (inPrefs) { score += 20; }
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
exports.getMyRooms = async (req, res) => {
  try {
    const me = req.user.id;
    const rooms = await TripRoom.find({
      $or: [{ members: me }, { createdBy: me }, { coOwners: me }],
    })
      .populate('members',         'fullName avatar travelStyle')
      .populate('pendingRequests', 'fullName avatar travelStyle')
      .populate('createdBy',       'fullName avatar')
      .populate('messages.sender', 'fullName avatar')
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    console.error('Get my rooms error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getTripRooms = async (req, res) => {
  try {
    const { destination, startDate, endDate } = req.query;
    let query = {};
    if (destination) query.destination = { $regex: destination, $options: 'i' };
    if (startDate && endDate) {
      query.startDate = { $lte: new Date(endDate) };
      query.endDate   = { $gte: new Date(startDate) };
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
    const room = new TripRoom({ ...req.body, createdBy: req.user.id, members: [req.user.id] });
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
      .populate('members',         'fullName avatar travelStyle')
      .populate('createdBy',       'fullName avatar')
      .populate('messages.sender', 'fullName avatar')
      .populate('expenses.paidBy', 'fullName avatar')
      .populate('expenses.splitWith.user', 'fullName avatar')
      .populate('settlements.from', 'fullName avatar')
      .populate('settlements.to', 'fullName avatar');
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
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
    if (room.members.map(m => m.toString()).includes(req.user.id)) {
      room.invitedBuddies = room.invitedBuddies.filter(id => id.toString() !== req.user.id);
      await room.save();
      return res.status(400).json({ msg: 'Already a member' });
    }
    if (room.members.length >= room.maxMembers)
      return res.status(400).json({ msg: 'Room is full' });

    room.pendingRequests.push(req.user.id);
    await room.save();

    const actor = await User.findById(req.user.id).select('fullName avatar');
    req.app.get('io')?.to(`user:${String(room.createdBy)}`).emit('room:request:new', {
      roomId: room._id, 
      roomDestination: room.destination,
      userId: req.user.id, 
      userName: actor?.fullName || 'Someone', 
      userAvatar: actor?.avatar || '',
    });
    res.json({ msg: 'Join request sent to group owner' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.respondToJoinRequest = async (req, res) => {
  try {
    const { roomId, userId, action } = req.body;
    const room = await TripRoom.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const isOwner = room.createdBy.toString() === req.user.id;
    const isCoOwner = (room.coOwners || []).map(id => id.toString()).includes(req.user.id);
    if (!isOwner && !isCoOwner) return res.status(401).json({ msg: 'Not authorized' });

    if (action === 'accept') {
      if (room.members.length >= room.maxMembers) return res.status(400).json({ msg: 'Room is full' });
      if (room.members.map(m => m.toString()).includes(userId)) {
        room.pendingRequests = room.pendingRequests.filter(id => id.toString() !== userId);
        await room.save();
        return res.status(400).json({ msg: 'User is already a member' });
      }
      room.members.push(userId);

      const user = await User.findById(userId).select('fullName avatar');
      const io = req.app.get('io');
      if (io && user) {
        // Notify the entire room channel
        io.to(`room_${roomId}`).emit('room:member:joined', { 
          roomId, 
          roomDestination: room.destination, 
          userName: user.fullName, 
          userId: user._id 
        });

        // Notify the joined user individually
        io.to(`user:${userId.toString()}`).emit('room:request:updated', { 
          roomId, 
          roomDestination: room.destination, 
          status: 'accepted' 
        });

        // Also notify the owner/co-owner who is likely waiting for the UI to update
        io.to(`user:${req.user.id}`).emit('room:member:joined', { 
          roomId, 
          roomDestination: room.destination, 
          userName: user.fullName, 
          userId: user._id 
        });
      }
    }
    room.pendingRequests = room.pendingRequests.filter(id => id.toString() !== userId);
    await room.save();

    req.app.get('io')?.to(`user:${userId}`).emit('room:request:updated', {
      roomId, roomDestination: room.destination, status: action === 'accept' ? 'accepted' : 'rejected',
    });
    res.json({ msg: `Request ${action}ed`, room });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.inviteBuddyToRoom = async (req, res) => {
  try {
    const { roomId, buddyId } = req.body;
    const room = await TripRoom.findById(roomId);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const isOwner = room.createdBy.toString() === req.user.id;
    const isCoOwner = (room.coOwners || []).map(id => id.toString()).includes(req.user.id);
    if (!isOwner && !isCoOwner) return res.status(401).json({ msg: 'Not authorized' });
    if (room.members.map(m => m.toString()).includes(buddyId))
      return res.status(400).json({ msg: 'Buddy already in room' });

    if (!room.invitedBuddies.map(m => m.toString()).includes(buddyId)) {
      room.invitedBuddies.push(buddyId);
      await room.save();
    }
    const inviter = await User.findById(req.user.id).select('fullName');
    req.app.get('io')?.to(`user:${buddyId}`).emit('room:invite:new', {
      roomId, roomDestination: room.destination, inviterName: inviter?.fullName || 'Someone',
    });
    res.json({ msg: 'Invitation sent' });
  } catch (err) {
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
    if (room.members.map(m => m.toString()).includes(req.user.id)) {
      room.invitedBuddies = room.invitedBuddies.filter(id => id.toString() !== req.user.id);
      await room.save();
      return res.status(400).json({ msg: 'Already a member' });
    }
    if (room.members.length >= room.maxMembers)
      return res.status(400).json({ msg: 'Room is full' });

    room.members.push(req.user.id);
    room.invitedBuddies = room.invitedBuddies.filter(id => id.toString() !== req.user.id);
    await room.save();

    const joiner = await User.findById(req.user.id).select('fullName avatar');
    req.app.get('io')?.to(`user:${String(room.createdBy)}`).emit('room:member:joined', {
      roomId, roomDestination: room.destination,
      userId: req.user.id, userName: joiner?.fullName || 'Someone', userAvatar: joiner?.avatar || '',
    });
    res.json({ msg: 'Joined room via invite', room });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.leaveTripRoom = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    room.members = room.members.filter(m => m.toString() !== req.user.id);
    await room.save();
    res.json({ msg: 'Left room' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addRoomMessage = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    if (!room.members.map(m => m.toString()).includes(req.user.id))
      return res.status(401).json({ msg: 'Not a member' });

    room.messages.push({ sender: req.user.id, text: req.body.text, createdAt: new Date() });
    await room.save();

    const populated = await TripRoom.findById(req.params.id)
      .select({ messages: { $slice: -1 } })
      .populate('messages.sender', 'fullName avatar');
    const msg = populated.messages[0];

    req.app.get('io')?.emit('room:message:new', { roomId: req.params.id, message: msg });
    res.json(msg);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteTripRoom = async (req, res) => {
  try {
    const room = await TripRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const isOwner = room.createdBy.toString() === req.user.id;
    if (!isOwner) return res.status(401).json({ msg: 'Not authorized' });

    await TripRoom.findByIdAndDelete(req.params.id);
    req.app.get('io')?.emit('trip:group:deleted', { roomId: req.params.id });
    res.json({ msg: 'Room deleted' });
  } catch (err) {
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

// ── EXPENSES ──────────────────────────────────────────────────────────────────
exports.addExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category, date, notes, splitWith } = req.body;
    const room = await TripRoom.findById(id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const expense = {
      description,
      amount,
      paidBy: req.user.id,
      category,
      date: date || new Date(),
      notes,
      splitWith
    };

    room.expenses.push(expense);
    const savedExpense = room.expenses[room.expenses.length - 1];

    // Add system message for expense
    room.messages.push({
      sender: req.user.id,
      text: `Added expense: ${description} (NPR ${amount})`,
      type: 'expense',
      expenseRef: savedExpense._id
    });

    await room.save();
    
    const updated = await TripRoom.findById(id)
      .populate('expenses.paidBy', 'fullName avatar')
      .populate('expenses.splitWith.user', 'fullName avatar')
      .populate('messages.sender', 'fullName avatar');

    // Emit socket event for the new message
    const lastMsg = updated.messages[updated.messages.length - 1];
    req.app.get('io')?.emit('room:message:new', { roomId: id, message: lastMsg });

    res.json(updated.expenses[updated.expenses.length - 1]);
  } catch (err) {
    console.error('Add expense error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id, expenseId } = req.params;
    const room = await TripRoom.findById(id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    room.expenses = room.expenses.filter(e => e._id.toString() !== expenseId);
    await room.save();
    res.json({ msg: 'Expense removed' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.addSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { to, amount, date } = req.body;
    const room = await TripRoom.findById(id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const settlement = {
      from: req.user.id,
      to,
      amount,
      date: date || new Date()
    };

    room.settlements.push(settlement);
    const savedSettlement = room.settlements[room.settlements.length - 1];

    // Add system message for settlement
    room.messages.push({
      sender: req.user.id,
      text: `Settled balance (NPR ${amount})`,
      type: 'settlement',
      settlementRef: savedSettlement._id
    });

    await room.save();

    const updated = await TripRoom.findById(id)
      .populate('settlements.from', 'fullName avatar')
      .populate('settlements.to', 'fullName avatar')
      .populate('messages.sender', 'fullName avatar');

    // Emit socket event for the new message
    const lastMsg = updated.messages[updated.messages.length - 1];
    req.app.get('io')?.emit('room:message:new', { roomId: id, message: lastMsg });

    res.json(updated.settlements[updated.settlements.length - 1]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteSettlement = async (req, res) => {
  try {
    const { id, settlementId } = req.params;
    const room = await TripRoom.findById(id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    room.settlements = room.settlements.filter(s => s._id.toString() !== settlementId);
    await room.save();
    res.json({ msg: 'Settlement removed' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── CREATE TRIP FROM CHAT ─────────────────────────────────────────────────────
const _createTripFromChat = async (req, res) => {
  try {
    const buddyId = req.body.buddyId || req.body.partnerId;
    const { destination, startDate, endDate, budget, description } = req.body;
    if (!buddyId || !destination || !startDate)
      return res.status(400).json({ msg: 'buddyId, destination, and startDate are required' });

    const buddy = await User.findById(buddyId).select('_id fullName');
    if (!buddy) return res.status(404).json({ msg: 'Buddy not found' });

    const trip = new Trip({
      user: req.user.id, destination,
      startDate, endDate: endDate || startDate,
      budget: budget || '', description: description || '', status: 'active',
    });
    await trip.save();

    const room = new TripRoom({
      destination, startDate, endDate: endDate || startDate,
      budget: budget || '',
      description: description || `Trip to ${destination} with ${buddy.fullName}`,
      maxMembers: 10, createdBy: req.user.id,
      members:  [req.user.id, buddyId],
      coOwners: [req.user.id, buddyId],
      tripRef:  trip._id,
    });
    await room.save();
    trip.roomId = room._id;
    await trip.save();

    req.app.get('io')?.to(`user:${String(buddyId)}`).emit('trip:group:created', {
      roomId: room._id.toString(), destination, createdBy: req.user.id,
      message: `You've been added to a trip group for ${destination}!`,
    });

    const populated = await TripRoom.findById(room._id)
      .populate('members',   'fullName avatar')
      .populate('createdBy', 'fullName avatar');
    res.status(201).json({ trip, room: populated });
  } catch (err) {
    console.error('Create trip from chat error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.planTripTogether  = _createTripFromChat;
exports.createTripFromChat = _createTripFromChat;
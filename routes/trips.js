import express from 'express';
import { db } from '../firebaseAdmin.js';
import verifyToken from '../middleware/verifyToken.js';

const tripsRouter = express.Router();

// Apply token verification middleware to all /trips routes
tripsRouter.use(verifyToken);

// Middleware to check Firebase connection
const checkDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(500).send({ message: 'Database connection not established' });
  }
  next();
};

tripsRouter.use(checkDbConnection);

tripsRouter.get('/search', async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = db.collection('trips');
    let trips = [];

    // Get all trips first
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    trips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter with partial matching
    if (start || end) {
      const normalizedStart = start ? start.trim().toLowerCase() : '';
      const normalizedEnd = end ? end.trim().toLowerCase() : '';

      trips = trips.filter(trip => {
        // Check if the search term appears anywhere in the location string
        const startMatch = !normalizedStart || 
          trip.start.toLowerCase().includes(normalizedStart) ||
          (trip.originalStart && trip.originalStart.toLowerCase().includes(normalizedStart));
        
        const endMatch = !normalizedEnd || 
          trip.end.toLowerCase().includes(normalizedEnd) ||
          (trip.originalEnd && trip.originalEnd.toLowerCase().includes(normalizedEnd));

        return startMatch && endMatch;
      });
    }

    res.json(trips);
  } catch (error) {
    console.error('Error searching trips:', error.message);
    res.status(500).send({ message: 'Error searching trips', error: error.message });
  }
});

// Add a new trip
tripsRouter.post('/', async (req, res) => {
  const tripData = req.body;

  // Validate trip data
  if (
    !tripData.title ||
    !tripData.start ||
    !tripData.end ||
    !tripData.days ||
    !tripData.nights ||
    !tripData.expense ||
    !tripData.description ||
    !tripData.bannerPhoto
  ) {
    return res.status(400).send({ message: 'Missing required trip fields' });
  }

  try {
    const tripsRef = db.collection('trips');
    // Store both lowercase and original versions of locations
    const processedTripData = {
      ...tripData,
      start: tripData.start.toLowerCase(),
      end: tripData.end.toLowerCase(),
      originalStart: tripData.start, // Keep original case for display
      originalEnd: tripData.end,     // Keep original case for display
      userId: req.user.uid,
    };

    const docRef = await tripsRef.add(processedTripData);

    res.status(201).send({
      id: docRef.id,
      message: 'Trip added successfully',
      data: tripData,
    });
  } catch (error) {
    console.error('Error adding trip:', error.message);
    res.status(500).send({ message: 'Error adding trip', error: error.message });
  }
});

// Get all trips
tripsRouter.get('/', async (req, res) => {
  try {
    const tripsRef = db.collection('trips');
    const snapshot = await tripsRef.get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const trips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error.message);
    res.status(500).send({ message: 'Error fetching trips', error: error.message });
  }
});

// Get trip details by ID
tripsRouter.get('/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    res.json({
      id: tripDoc.id,
      ...tripDoc.data(),
    });
  } catch (error) {
    console.error('Error fetching trip:', error.message);
    res.status(500).send({ message: 'Error fetching trip', error: error.message });
  }
});

// Delete a trip by ID
tripsRouter.delete('/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    const tripData = tripDoc.data();

    // Delete the trip from Firestore
    await tripRef.delete();

    res.status(200).send({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error.message);
    res.status(500).send({ message: 'Error deleting trip', error: error.message });
  }
});

// Update specific fields in a trip
tripsRouter.patch('/:id', async (req, res) => {
  const tripId = req.params.id;
  const updateData = req.body;

  try {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the trip document
    await tripRef.update(updateData);
    res.status(200).send({ message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Error updating trip:', error.message);
    res.status(500).send({ message: 'Error updating trip', error: error.message });
  }
});

tripsRouter.post('/:id/views', async (req, res) => {
    const tripId = req.params.id;
  
    try {
      const tripRef = db.collection('trips').doc(tripId);
      const tripDoc = await tripRef.get();
  
      if (!tripDoc.exists) {
        return res.status(404).send({ message: 'Trip not found' });
      }
  
      // Use a transaction to safely increment the view count
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(tripRef);
        const currentViews = doc.data().views || 0;
        transaction.update(tripRef, { views: currentViews + 1 });
      });
  
      // Get updated trip doc
      const updatedDoc = await tripRef.get();
      res.json({ views: updatedDoc.data().views || 0 });
    } catch (error) {
      console.error('Error updating views:', error);
      res.status(500).send({ message: 'Error updating views', error: error.message });
    }
  });
  
  // Get likes status for a trip
  tripsRouter.get('/:id/likes', async (req, res) => {
    const tripId = req.params.id;
    const userId = req.user.uid;
  
    try {
      const tripRef = db.collection('trips').doc(tripId);
      const likesRef = tripRef.collection('likes');
      
      const [tripDoc, userLikeDoc] = await Promise.all([
        tripRef.get(),
        likesRef.doc(userId).get()
      ]);
  
      if (!tripDoc.exists) {
        return res.status(404).send({ message: 'Trip not found' });
      }
  
      const likesSnapshot = await likesRef.get();
      
      res.json({
        totalLikes: likesSnapshot.size,
        isLikedByUser: userLikeDoc.exists
      });
    } catch (error) {
      console.error('Error fetching likes:', error);
      res.status(500).send({ message: 'Error fetching likes', error: error.message });
    }
  });
  
  // Add a like to a trip
  tripsRouter.post('/:id/likes', async (req, res) => {
    const tripId = req.params.id;
    const userId = req.user.uid;
  
    try {
      const tripRef = db.collection('trips').doc(tripId);
      const likesRef = tripRef.collection('likes');
      
      await likesRef.doc(userId).set({
        timestamp: new Date()
      });
  
      const likesSnapshot = await likesRef.get();
      
      res.json({
        totalLikes: likesSnapshot.size,
        isLikedByUser: true
      });
    } catch (error) {
      console.error('Error adding like:', error);
      res.status(500).send({ message: 'Error adding like', error: error.message });
    }
  });
  
  // Remove a like from a trip
  tripsRouter.delete('/:id/likes', async (req, res) => {
    const tripId = req.params.id;
    const userId = req.user.uid;
  
    try {
      const tripRef = db.collection('trips').doc(tripId);
      const likesRef = tripRef.collection('likes');
      
      await likesRef.doc(userId).delete();
  
      const likesSnapshot = await likesRef.get();
      
      res.json({
        totalLikes: likesSnapshot.size,
        isLikedByUser: false
      });
    } catch (error) {
      console.error('Error removing like:', error);
      res.status(500).send({ message: 'Error removing like', error: error.message });
    }
  });

// Add this to your trips.js router
tripsRouter.get('/popular-destinations', async (req, res) => {
  try {
    const tripsRef = db.collection('trips');
    const snapshot = await tripsRef.get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    // Group trips by destination and count
    const destinationMap = new Map();
    
    snapshot.docs.forEach((doc) => {
      const trip = doc.data();
      const start = trip.originalStart || trip.start;
      
      if (!destinationMap.has(start)) {
        destinationMap.set(start, {
          location: start,
          trip_count: 1,
          views: trip.views || 0,
          likes: trip.likes || 0,
          image_url: trip.bannerPhoto
        });
      } else {
        const existing = destinationMap.get(start);
        existing.trip_count += 1;
        existing.views += trip.views || 0;
        existing.likes += trip.likes || 0;
        // Keep the most recent banner photo
        if (trip.bannerPhoto) {
          existing.image_url = trip.bannerPhoto;
        }
      }
    });

    // Convert to array and sort by popularity (using a combination of trips, views, and likes)
    const popularDestinations = Array.from(destinationMap.values())
      .sort((a, b) => {
        const scoreA = (a.trip_count * 10) + (a.views * 0.5) + a.likes;
        const scoreB = (b.trip_count * 10) + (b.views * 0.5) + b.likes;
        return scoreB - scoreA;
      })
      .slice(0, 10); // Get top 10 destinations

    res.json(popularDestinations);
  } catch (error) {
    console.error('Error fetching popular destinations:', error);
    res.status(500).send({ message: 'Error fetching popular destinations', error: error.message });
  }
});

export default tripsRouter;
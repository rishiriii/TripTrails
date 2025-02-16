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
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    let trips = await Promise.all(snapshot.docs.map(async (doc) => {
      const tripData = doc.data();
      
      // Fetch user data for each trip
      const userProfilesRef = db.collection('userProfiles');
      const userQuery = userProfilesRef.where('uid', '==', tripData.userId);
      const userSnapshot = await userQuery.get();
      
      let userData = { displayName: 'Unknown user' };
      if (!userSnapshot.empty) {
        userData = userSnapshot.docs[0].data();
      }

      return {
        id: doc.id,
        ...tripData,
        DisplayName: userData.displayName
      };
    }));

    if (start || end) {
      const normalizedStart = start ? start.trim().toLowerCase() : '';
      const normalizedEnd = end ? end.trim().toLowerCase() : '';

      trips = trips.filter(trip => {
        const tripStart = (trip.start || '').toLowerCase();
        const tripEnd = (trip.end || '').toLowerCase();
        const originalStart = (trip.originalStart || '').toLowerCase();
        const originalEnd = (trip.originalEnd || '').toLowerCase();

        const startMatch = !normalizedStart || 
          tripStart.includes(normalizedStart) ||
          originalStart.includes(normalizedStart);
        
        const endMatch = !normalizedEnd || 
          tripEnd.includes(normalizedEnd) ||
          originalEnd.includes(normalizedEnd);

        return startMatch && endMatch;
      });
    }

    trips.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Error searching trips', error: error.message });
  }
});

// Add a new trip
tripsRouter.post('/', async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body) {
      return res.status(400).json({ 
        message: 'Missing request body' 
      });
    }

    const tripData = req.body;
    console.log('Received new trip data:', tripData);

    // Validate trip data - add numberOfPeople to required fields
    const requiredFields = [
      'title', 'start', 'end', 'days', 'nights', 
      'expense', 'description', 'bannerPhoto', 'numberOfPeople'
    ];
    const missingFields = requiredFields.filter(field => !tripData[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required trip fields', 
        missingFields 
      });
    }

    // Validate numberOfPeople and expense
    const numberOfPeople = parseInt(tripData.numberOfPeople);
    const totalExpense = parseFloat(tripData.expense);

    if (numberOfPeople < 1) {
      return res.status(400).json({
        message: 'Number of people must be at least 1'
      });
    }

    if (totalExpense < 0) {
      return res.status(400).json({
        message: 'Expense cannot be negative'
      });
    }

    // Get user profile data
    const userProfileRef = db.collection('userProfiles').doc(req.user.uid);
    const userProfileDoc = await userProfileRef.get();
    const userProfileData = userProfileDoc.data() || {};

    const tripsRef = db.collection('trips');
    
    const processedTripData = {
      ...tripData,
      start: tripData.start.toLowerCase(),
      end: tripData.end.toLowerCase(),
      originalStart: tripData.start, 
      originalEnd: tripData.end,
      numberOfPeople: numberOfPeople,
      expense: totalExpense,
      perPersonExpense: parseFloat((totalExpense / numberOfPeople).toFixed(2)),
      userId: req.user.uid,
      createdAt: Date.now(),
      views: 0,
      likes: 0,
      stops: tripData.stops || [],
      // Add user profile data
    
    };

    console.log('Saving trip with data:', processedTripData);
    const docRef = await tripsRef.add(processedTripData);
    console.log('Successfully saved trip with ID:', docRef.id);

    return res.status(201).json({
      id: docRef.id,
      message: 'Trip added successfully',
      data: processedTripData,
    });
  } catch (error) {
    console.error('Error adding trip:', error);
    return res.status(500).json({ 
      message: 'Error adding trip', 
      error: error.message 
    });
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
// Get trip details by ID
tripsRouter.get('/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    const tripData = tripDoc.data();
    
    // Process numeric fields
    const processedTripData = {
      ...tripData,
      numberOfPeople: parseInt(tripData.numberOfPeople) || 1,
      expense: parseFloat(tripData.expense) || 0,
      perPersonExpense: parseFloat((tripData.expense / (parseInt(tripData.numberOfPeople) || 1)).toFixed(2))
    };
    
    const userProfilesRef = db.collection('userProfiles');
    const userQuery = userProfilesRef.where('uid', '==', tripData.userId); 
    const userSnapshot = await userQuery.get();
    
    let userData = { displayname: 'Unknown user' };
    if (!userSnapshot.empty) {
      userData = userSnapshot.docs[0].data();
    }

    res.json({
      id: tripDoc.id,
      ...processedTripData,
      authorUid: userData.uid,
      authorDisplayName: userData.displayName,
      authorPhotoURL: userData.photoURL
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
    const destinationName = tripData.start; // Get the starting destination of the trip

    // Reference the destination in the "destinations" collection
    const formattedDestination = destinationName.charAt(0).toUpperCase() + destinationName.slice(1).toLowerCase();
    const destinationQuery = db.collection('destinations').where('name', '==', formattedDestination);
    const destinationSnapshot = await destinationQuery.get(); // Add this line to get the snapshot

    if (!destinationSnapshot.empty) {
      const destinationDoc = destinationSnapshot.docs[0];
      const destinationRef = destinationDoc.ref;
      
      // Decrease the trip count by 1, but prevent it from going below zero
      await destinationRef.update({
        tripCount: Math.max(0, (destinationDoc.data().tripCount || 0) - 1)
      });
    }

    // Delete the trip from Firestore
    await tripRef.delete();

    res.status(200).send({ message: 'Trip deleted successfully, trip count updated.' });
  } catch (error) {
    console.error('Error deleting trip:', error.message);
    res.status(500).send({ message: 'Error deleting trip', error: error.message });
  }
});


// Update fields in a trip
tripsRouter.patch('/:id', async (req, res) => {
  const tripId = req.params.id;
  const updateData = req.body;

  try {
    const tripRef = db.collection('trips').doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the trip 
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
  
      // increment the view count
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
      
      await db.runTransaction(async (transaction) => {
        const userLikeDoc = await transaction.get(likesRef.doc(userId));
        if (userLikeDoc.exists) {
          throw new Error('User already liked this trip');
        }
  
        transaction.set(likesRef.doc(userId), { timestamp: new Date() });
        transaction.update(tripRef, { 
          likes: admin.firestore.FieldValue.increment(1) 
        });
      });
  
      const updatedTripDoc = await tripRef.get();
      
      res.json({
        totalLikes: updatedTripDoc.data().likes,
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
      
      await db.runTransaction(async (transaction) => {
        const userLikeDoc = await transaction.get(likesRef.doc(userId));
        if (!userLikeDoc.exists) {
          throw new Error('User has not liked this trip');
        }
  
        transaction.delete(likesRef.doc(userId));
        transaction.update(tripRef, { 
          likes: admin.firestore.FieldValue.increment(-1) 
        });
      });
  
      const updatedTripDoc = await tripRef.get();
      
      res.json({
        totalLikes: updatedTripDoc.data().likes,
        isLikedByUser: false
      });
    } catch (error) {
      console.error('Error removing like:', error);
      res.status(500).send({ message: 'Error removing like', error: error.message });
    }
  });

  tripsRouter.post('/:id/report', async (req, res) => {
    const tripId = req.params.id;
    const reporterId = req.user.uid;
    
    try {
      // First get the trip details to verify it exists and get owner ID
      const tripRef = db.collection('trips').doc(tripId);
      const tripDoc = await tripRef.get();
  
      if (!tripDoc.exists) {
        return res.status(404).json({ 
          message: 'Trip not found' 
        });
      }
  
      const tripData = tripDoc.data();
      const tripOwnerId = tripData.userId;
  
      // Don't allow users to report their own trips
      if (tripOwnerId === reporterId) {
        return res.status(400).json({
          message: 'You cannot report your own trip'
        });
      }
  
      // Validate required fields
      const { reason, details } = req.body;
      if (!reason || !details) {
        return res.status(400).json({
          message: 'Missing required fields: reason and details are required'
        });
      }
  
      // Create the report document
      const reportData = {
        tripId,
        tripOwnerId,
        reporterId,
        reason,
        details,
        status: 'pending',
        reportedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewNotes: null,
        reportedTripData: {
          title: tripData.title,
          createdAt: tripData.createdAt,
          url: `${req.protocol}://${req.get('host')}/trips/${tripId}`
        }
      };
  
      // Check if this user has already reported this trip
      const existingReportQuery = await db.collection('tripReports')
        .where('tripId', '==', tripId)
        .where('reporterId', '==', reporterId)
        .get();
  
      if (!existingReportQuery.empty) {
        return res.status(400).json({
          message: 'You have already reported this trip'
        });
      }
  
      // Add the report to the tripReports collection
      const reportRef = await db.collection('tripReports').add(reportData);
  
      // Update the trip document with report reference
      await tripRef.update({
        reportCount: (tripData.reportCount || 0) + 1,
        lastReportedAt: reportData.reportedAt,
        reports: [...(tripData.reports || []), reportRef.id]
      });
  
      res.status(201).json({
        message: 'Report submitted successfully',
        reportId: reportRef.id
      });
  
    } catch (error) {
      console.error('Error handling trip report:', error);
      res.status(500).json({
        message: 'Error submitting report',
        error: error.message
      });
    }
  });

  tripsRouter.get('/user/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const tripsRef = db.collection('trips');
      const snapshot = await tripsRef.where('userId', '==', userId).get();
  
      const trips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      res.json(trips);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error fetching user trips', 
        error: error.message 
      });
    }
  });

export default tripsRouter;
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
    const docRef = await tripsRef.add({
      ...tripData,
      userId: req.user.uid,
    });

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

export default tripsRouter;
import express from 'express';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const tripsRouter = express.Router();

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
    !tripData.description
  ) {
    return res.status(400).send({ message: 'Missing required trip fields' });
  }

  try {
    const docRef = await addDoc(collection(db, 'trips'), tripData);
    res.status(201).send({ 
      id: docRef.id, 
      message: 'Trip added successfully',
      data: tripData 
    });
  } catch (error) {
    console.error('Error adding trip:', error);
    res.status(500).send({ 
      message: 'Error adding trip', 
      error: error.message 
    });
  }
});

// Get all trips
tripsRouter.get('/', async (req, res) => {
  try {
    const tripsCollection = collection(db, 'trips');
    const querySnapshot = await getDocs(tripsCollection);
    
    if (querySnapshot.empty) {
      return res.json([]);
    }

    const trips = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).send({ 
      message: 'Error fetching trips', 
      error: error.message 
    });
  }
});

// Get trip details by ID
tripsRouter.get('/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    const tripDoc = await getDoc(doc(db, 'trips', tripId));

    if (!tripDoc.exists()) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    res.json({
      id: tripDoc.id,
      ...tripDoc.data()
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).send({ 
      message: 'Error fetching trip', 
      error: error.message 
    });
  }
});

// Delete a trip by ID
tripsRouter.delete('/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    const tripDoc = await getDoc(doc(db, 'trips', tripId));
    
    if (!tripDoc.exists()) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    await deleteDoc(doc(db, 'trips', tripId));
    res.status(200).send({ 
      message: 'Trip deleted successfully',
      id: tripId
    });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).send({ 
      message: 'Error deleting trip', 
      error: error.message 
    });
  }
});

export default tripsRouter;
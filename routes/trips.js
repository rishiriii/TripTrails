import express from 'express';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase.js'; // Adjust the path as necessary

const tripsRouter = express.Router();

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
    // Add the trip to the Firestore collection
    const docRef = await addDoc(collection(db, 'trips'), tripData);
    res.status(201).send({ id: docRef.id, message: 'Trip added successfully' });
  } catch (error) {
    console.error('Error adding trip:', error);
    res.status(500).send({ message: 'Error adding trip', error });
  }
});

// Get all trips
tripsRouter.get('/', async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'trips'));
    const trips = [];
    querySnapshot.forEach((doc) => {
      trips.push({ id: doc.id, ...doc.data() });
    });
    res.json(trips); // Send all trips as JSON
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).send({ message: 'Error fetching trips', error });
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

    res.json({ id: tripId, ...tripDoc.data() }); // Send the trip details
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).send({ message: 'Error fetching trip', error });
  }
});

// Delete a trip by ID
tripsRouter.delete('/:id', async (req, res) => {
  const tripId = req.params.id;

  try {
    await deleteDoc(doc(db, 'trips', tripId));
    res.status(200).send({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).send({ message: 'Error deleting trip', error });
  }
});

export default tripsRouter; // Default export

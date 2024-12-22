import express from 'express';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
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
    !tripData.description ||
    !tripData.bannerPhoto // Ensure bannerPhoto is included
  ) {
    return res.status(400).send({ message: 'Missing required trip fields' });
  }

  try {
    const docRef = await addDoc(collection(db, 'trips'), tripData);
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
    const tripsCollection = collection(db, 'trips');
    const querySnapshot = await getDocs(tripsCollection);

    if (querySnapshot.empty) {
      return res.json([]);
    }

    const trips = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(), // Includes bannerPhoto and other fields
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
    const tripDoc = await getDoc(doc(db, 'trips', tripId));

    if (!tripDoc.exists()) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    res.json({
      id: tripDoc.id,
      ...tripDoc.data(), // Includes bannerPhoto and other fields
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
    const tripDocRef = doc(db, 'trips', tripId);
    const tripDoc = await getDoc(tripDocRef);

    if (!tripDoc.exists()) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    const tripData = tripDoc.data();

    // Delete the banner photo from Firebase Storage
    if (tripData.bannerPhoto) {
      const storage = getStorage();
      const photoRef = ref(storage, tripData.bannerPhoto); // Assume `bannerPhoto` contains the full path

      try {
        await deleteObject(photoRef);
        console.log(`Deleted banner photo: ${tripData.bannerPhoto}`);
      } catch (error) {
        console.error('Error deleting banner photo from storage:', error.message);
      }
    }

    // Delete the trip from Firestore
    await deleteDoc(tripDocRef);

    res.status(200).send({ message: 'Trip and associated banner photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error.message);
    res.status(500).send({ message: 'Error deleting trip', error: error.message });
  }
});

// Update specific fields in a trip
tripsRouter.patch('/:id', async (req, res) => {
  const tripId = req.params.id;
  const updateData = req.body; // Expecting { bannerPhoto: "url" }

  try {
    const tripDocRef = doc(db, 'trips', tripId);
    const tripDoc = await getDoc(tripDocRef);

    if (!tripDoc.exists()) {
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the trip document
    await updateDoc(tripDocRef, updateData);
    res.status(200).send({ message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Error updating trip:', error.message);
    res.status(500).send({ message: 'Error updating trip', error: error.message });
  }
});

export default tripsRouter;

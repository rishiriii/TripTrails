import express from 'express';
import { auth } from '../firebaseAdmin.js'; // Ensure this points to your Firebase Admin SDK setup

const router = express.Router();

// Middleware to verify Firebase token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken; // Attach decoded token to request for further use
    next();
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, email } = req.body;

    if (!displayName || !email) {
      return res.status(400).json({ message: 'Display name and email are required' });
    }

    console.log(`Updating profile for UID: ${req.user.uid}, Name: ${displayName}, Email: ${email}`);

    // Simulate database or further backend logic (e.g., updating Firestore)
    // Example:
    // await db.collection('users').doc(req.user.uid).set({ displayName, email }, { merge: true });

    res.json({
      message: 'Profile updated successfully',
      user: {
        displayName,
        email,
        uid: req.user.uid,
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;

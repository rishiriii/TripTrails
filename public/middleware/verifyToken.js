import admin from 'firebase-admin';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to the request
    next();
  } catch (error) {
    console.error('Error verifying token:', error.message);
    res.status(403).send({ message: 'Invalid or expired token' });
  }
};

export default verifyToken;

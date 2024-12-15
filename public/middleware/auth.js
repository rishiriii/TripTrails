import { getAuth } from "firebase-admin/auth";

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).send({ message: 'Unauthorized' });

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.userId = decodedToken.uid; // Add user ID to request
    next();
  } catch (error) {
    res.status(401).send({ message: 'Unauthorized', error });
  }
}

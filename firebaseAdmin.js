import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin if it hasn't been initialized yet
const apps = getApps();
if (!apps.length) {
  initializeApp({
    credential: cert(path.join(__dirname, './config/serviceaccountkey.json')),
  });
}

// Export the admin auth and firestore instances
export const auth = getAuth();
export const db = getFirestore();
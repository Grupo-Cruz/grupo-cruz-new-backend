import * as dotenv from 'dotenv';
import admin, { ServiceAccount, firestore, auth as Auth, storage } from 'firebase-admin';
import serviceAccount from '../../firebase-service-account.json';

dotenv.config();

const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const db = firestore(app);
const auth = Auth(app);
const bucket = storage(app).bucket();

export { db, auth, bucket };
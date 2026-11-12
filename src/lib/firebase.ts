import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Without Firebase keys the app runs in local mode (data in this browser only). */
export const firebaseConfigurato = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let appCheckAvviato = false;

export function firebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
    const chiave = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (chiave && typeof window !== "undefined" && !appCheckAvviato) {
      appCheckAvviato = true;
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(chiave), isTokenAutoRefreshEnabled: true });
    }
  }
  return app;
}

export function firestore(): Firestore {
  if (!db) {
    db = initializeFirestore(firebaseApp(), {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  return db;
}

export function firebaseAuth(): Auth {
  if (!auth) auth = getAuth(firebaseApp());
  return auth;
}

export function firebaseStorage(): FirebaseStorage {
  if (!storage) storage = getStorage(firebaseApp());
  return storage;
}

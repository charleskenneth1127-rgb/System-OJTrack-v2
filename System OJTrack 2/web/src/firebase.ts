import { deleteApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { collection, connectFirestoreEmulator, getDocs, getFirestore, query, where } from 'firebase/firestore'
import { connectStorageEmulator, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'

// "demo-ojtrack" matches .firebaserc and is intentional: the Firebase Emulator
// Suite treats any project ID prefixed "demo-" as offline/local-only — no real
// GCP project, billing, or `firebase login` required. Fine for capstone use;
// swap in real VITE_FIREBASE_* values (via .env) only for an eventual school
// turnover deployment.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-ojtrack.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-ojtrack',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-ojtrack.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:demo',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Capstone-only setup: point at the local Firebase Emulator Suite in dev
// instead of a real (billed) project. Run `firebase emulators:start` from
// the repo root, then `npm run dev` here — no Blaze plan needed.
// Set VITE_USE_FIREBASE_EMULATORS=false to opt out (e.g. once real project
// credentials are configured for an eventual school turnover).
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false'
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

// Domain used for the synthetic email behind every student account. Students
// never see this — they log in with their (school-issued) Student ID, which
// the client maps to `${studentId}@STUDENT_ACCOUNT_DOMAIN` before calling
// Firebase Auth.
export const STUDENT_ACCOUNT_DOMAIN = 'ojtrack.local'

export function studentIdToEmail(studentIdCode: string) {
  const sanitized = studentIdCode.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  return `${sanitized}@${STUDENT_ACCOUNT_DOMAIN}`
}

// Unambiguous alphabet for class join codes — no 0/O or 1/I, so a student
// reading a code off a whiteboard/printout can't misread it.
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateJoinCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)]
  }
  return code
}

/** Generates a class join code, retrying on the rare chance of a collision. */
export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode()
    const snap = await getDocs(query(collection(db, 'classes'), where('joinCode', '==', code)))
    if (snap.empty) return code
  }
  return generateJoinCode(8)
}

/**
 * Creates a Firebase Auth user without disturbing the current coordinator's
 * signed-in session. A throwaway secondary Firebase App is used to run the
 * signup, then torn down immediately — the primary `auth` instance (and the
 * caller's own session on it) is never touched. Used for coordinator-account
 * creation (real email); students self-register from the mobile app instead.
 */
async function createAuthAccountViaSecondaryApp(email: string, password: string) {
  const secondaryName = `secondary-${Date.now()}`
  const secondaryApp = initializeApp(firebaseConfig, secondaryName)
  const secondaryAuth = getAuth(secondaryApp)
  // This is a brand-new Auth instance — connecting the primary `auth` export
  // to the emulator earlier doesn't carry over to it, so without this it
  // silently tries to hit real Firebase servers with the fake demo API key.
  if (useEmulators) {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
  }
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    return credential.user.uid
  } finally {
    try {
      await signOut(secondaryAuth)
    } catch {
      // ignore — app is being deleted regardless
    }
    const existing = getApps().find((a) => a.name === secondaryName)
    if (existing) await deleteApp(existing)
  }
}

/** Creates a new coordinator's Firebase Auth account (real email, coordinator-chosen password). */
export async function createCoordinatorAccount(email: string, password: string) {
  return createAuthAccountViaSecondaryApp(email, password)
}

/**
 * Uploads a profile picture under avatars/{uid}/photo — a fixed filename so
 * re-uploading replaces the old photo instead of accumulating copies — and
 * returns its download URL. Matches storage.rules, which only lets a user
 * write under their own uid.
 */
export async function uploadAvatar(uid: string, file: Blob): Promise<string> {
  const avatarRef = ref(storage, `avatars/${uid}/photo`)
  await uploadBytes(avatarRef, file)
  return getDownloadURL(avatarRef)
}

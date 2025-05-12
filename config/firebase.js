import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail as sendResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAPw9V2lEzy9nBvie2PBgbYthWWa0d3k7Y",
  authDomain: "pixelhunt-7afa8.firebaseapp.com",
  databaseURL: "https://pixelhunt-7afa8-default-rtdb.firebaseio.com",
  projectId: "pixelhunt-7afa8",
  storageBucket: "pixelhunt-7afa8.firebasestorage.app",
  messagingSenderId: "595531085941",
  appId: "1:595531085941:android:48310a4460ade282d2a03c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signUpWithEmail = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    throw error;
  }
};

export const sendPasswordResetEmail = async (email) => {
  try {
    await sendResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

// Database operations
export const fetchTests = async (options = {}) => {
  try {
    let testsQuery = collection(db, 'tests');
    let queryConstraints = [];

    if (options.featured) {
      queryConstraints.push(where('featured', '==', true));
    }

    if (options.categoryId) {
      queryConstraints.push(where('category_id', '==', options.categoryId));
    }

    if (options.orderBy) {
      queryConstraints.push(orderBy(options.orderBy, options.ascending ? 'asc' : 'desc'));
    }

    if (options.limit) {
      queryConstraints.push(limit(options.limit));
    }

    const q = query(testsQuery, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching tests:', error);
    throw error;
  }
};

export const fetchCategories = async () => {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

export const fetchUserTests = async (userId) => {
  try {
    const testsRef = collection(db, 'tests');
    const q = query(
      testsRef,
      where('creator_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user tests:', error);
    throw error;
  }
};
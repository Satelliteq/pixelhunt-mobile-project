// config/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithCredential
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  documentId,
  startAfter,
  increment
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
// import * as WebBrowser from 'expo-web-browser'; // Google ile Expo Auth Session kullanılmıyorsa kaldırılabilir
// import * as Google from 'expo-auth-session/providers/google'; // Google ile Expo Auth Session kullanılmıyorsa kaldırılabilir

// WebBrowser.maybeCompleteAuthSession(); // Google ile Expo Auth Session kullanılmıyorsa kaldırılabilir

const firebaseConfig = {
  apiKey: "AIzaSyAPw9V2lEzy9nBvie2PBgbYthWWa0d3k7Y",
  authDomain: "pixelhunt-7afa8.firebaseapp.com",
  projectId: "pixelhunt-7afa8",
  storageBucket: "pixelhunt-7afa8.appspot.com",
  messagingSenderId: "595531085941",
  appId: "1:595531085941:android:48310a4460ade282d2a03c",
  databaseURL: "https://pixelhunt-7afa8-default-rtdb.firebaseio.com"
};

// Firebase App başlatma
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Firebase Auth başlatma
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error("Firebase auth başlatma hatası:", error);
    throw error;
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export const signInWithFirebaseUsingGoogleToken = async (idToken) => {
  if (!idToken) {
    console.error("signInWithFirebaseUsingGoogleToken: idToken is missing.");
    throw new Error("Google'dan ID token alınamadı.");
  }
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp()
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        roles: ['user'],
      });
    } else {
      await updateDoc(userRef, userData);
    }
    return user;
  } catch (error) {
    console.error("Firebase Google ile giriş hatası:", error.code, error.message);
    throw error;
  }
};

export const onAuthUserChanged = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', userCredential.user.uid);
    await updateDoc(userRef, { lastLogin: serverTimestamp() })
      .catch(err => console.warn("E-posta kullanıcısı için lastLogin güncellenemedi:", err));
    return userCredential.user;
  } catch (error) {
    console.error("E-posta ile giriş hatası:", error.code, error.message);
    throw error;
  }
};

export const signUpWithEmail = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    const userRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userRef, {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: name,
      photoURL: userCredential.user.photoURL,
      createdAt: serverTimestamp(),
      roles: ['user'],
      lastLogin: serverTimestamp(),
    });
    return userCredential.user;
  } catch (error) {
    console.error("E-posta ile kayıt hatası:", error.code, error.message);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Çıkış yapma hatası:", error.code, error.message);
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error.code, error.message);
    throw error;
  }
};

export const fetchTests = async ({ 
  featured = false, 
  isPublic = true, 
  approved = true,
  orderByField = 'createdAt', 
  orderDirection = 'desc',
  limit: testLimit = 10,
  startAfterDoc = null,
  categoryId = null,
  userId = null,
  searchQuery = null
}) => {
  try {
    let q = collection(db, 'tests');
    let constraints = [];

    if (featured) constraints.push(where('featured', '==', true));
    if (isPublic) constraints.push(where('isPublic', '==', true));
    if (approved) constraints.push(where('approved', '==', true));
    if (categoryId) constraints.push(where('categoryId', '==', categoryId));
    if (userId) constraints.push(where('userId', '==', userId));
    if (searchQuery) {
      constraints.push(where('title', '>=', searchQuery));
      constraints.push(where('title', '<=', searchQuery + '\uf8ff'));
    }

    constraints.push(orderBy(orderByField, orderDirection));
    constraints.push(limit(testLimit));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    q = query(q, ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const fetchCategories = async () => {
  try {
    const q = query(
      collection(db, 'categories'),
      where('active', '==', true),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      Alert.alert(
        'Kategori Yok',
        'Hiç kategori bulunamadı. Lütfen daha sonra tekrar deneyin.'
      );
      return [];
    }

    const categories = querySnapshot.docs.map(doc => {
      const data = doc.data();
      if (!data.name || typeof data.name !== 'string') {
        console.warn(`Kategori dokümanında isim eksik veya hatalı: ${doc.id}`);
      }
      if (typeof data.order !== 'number') {
        console.warn(`Kategori dokümanında order eksik veya hatalı: ${doc.id}`);
      }
      return {
        id: doc.id,
        name: data.name || 'İsimsiz Kategori',
        description: data.description || '',
        iconName: data.iconName || 'folder',
        color: data.color || '#6366F1',
        backgroundColor: data.backgroundColor || '#EEF2FF',
        active: data.active !== false,
        order: typeof data.order === 'number' ? data.order : 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      };
    });

    return categories.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Kategoriler çekilirken hata:', error);
    Alert.alert(
      'Hata',
      'Kategoriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'
    );
    return [];
  }
};

export const fetchTestById = async (testId) => {
  try {
    const testRef = doc(db, 'tests', testId);
    const testSnap = await getDoc(testRef);

    if (!testSnap.exists()) {
      throw new Error('Test bulunamadı');
    }

    const testData = { id: testSnap.id, ...testSnap.data() };
    const processedTest = await processTestData(testData);

    console.log(`Test başarıyla yüklendi (ID: ${testId})`);
    return processedTest;
  } catch (error) {
    console.error(`Test yüklenirken hata (ID: ${testId}):`, error);
    throw error;
  }
};

export const fetchUserDocument = async (userId) => {
  if (!userId) {
    console.warn("fetchUserDocument: userId tanımsız.");
    return null;
  }
  console.log(`fetchUserDocument çağrıldı: ${userId}`);
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      console.log(`Kullanıcı dokümanı bulundu: ${userId}`);
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.warn(`Kullanıcı ID'si ${userId} olan doküman bulunamadı.`);
      return null;
    }
  } catch (error) {
    console.error(`Kullanıcı (${userId}) dokümanını çekerken hata:`, error);
    throw error;
  }
};

export const fetchUserStats = async (userId) => {
  if (!userId) {
    console.warn("fetchUserStats: userId tanımsız.");
    return { total_tests_created: 0, total_score_achieved: 0, total_tests_played: 0, rank: 'N/A' };
  }
  console.log(`fetchUserStats çağrıldı: ${userId}`);
  try {
    const statsRef = doc(db, 'user_stats', userId);
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`Kullanıcı istatistikleri bulundu: ${userId}`);
      return {
        id: docSnap.id,
        total_tests_created: data.total_tests_created || 0,
        total_score_achieved: data.total_score_achieved || 0,
        total_tests_played: data.total_tests_played || 0,
        rank: data.rank || 'N/A',
      };
    } else {
      console.warn(`Kullanıcı ID'si ${userId} için istatistik dokümanı bulunamadı.`);
      return { total_tests_created: 0, total_score_achieved: 0, total_tests_played: 0, rank: 'N/A' };
    }
  } catch (error) {
    console.error(`Kullanıcı (${userId}) istatistiklerini çekerken hata:`, error);
    throw error;
  }
};

export const fetchPlayedTestIds = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.playedTests || [];
    }
    return [];
  } catch (error) {
    throw error;
  }
};

export const fetchLikedTestIds = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.likedTests || [];
    }
    return [];
  } catch (error) {
    throw error;
  }
};

export const fetchTestsByIds = async (testIds) => {
  try {
    const tests = [];
    for (const testId of testIds) {
      const testDoc = await getDoc(doc(db, 'tests', testId));
      if (testDoc.exists()) {
        tests.push({
          id: testDoc.id,
          ...testDoc.data()
        });
      }
    }
    return tests;
  } catch (error) {
    throw error;
  }
};

export const createTestInFirestore = async (testDataFromUI) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("createTestInFirestore: Kullanıcı giriş yapmamış.");
    throw new Error("Test oluşturmak için giriş yapmalısınız.");
  }
  console.log(`createTestInFirestore çağrıldı, kullanıcı: ${currentUser.uid}`);
  try {
    const testsCollectionRef = collection(db, 'tests');
    const newTestData = {
      title: testDataFromUI.title?.trim() || '',
      description: testDataFromUI.description?.trim() || '',
      category_id: testDataFromUI.category_id || null,
      image_urls: Array.isArray(testDataFromUI.image_urls) ? testDataFromUI.image_urls : [],
      difficulty: parseInt(testDataFromUI.difficulty, 10) || 2,
      // questions: testDataFromUI.questions || [], // Sorular UI'dan gelmeli ve doğrulanmalı

      creator_id: currentUser.uid,
      creator_name: currentUser.displayName || 'Bilinmeyen Kullanıcı',
      title_lowercase: testDataFromUI.title?.trim().toLowerCase() || '',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      approved: false,
      is_public: true,
      featured: false,
      play_count: 0,
      like_count: 0,
      comment_count: 0,
    };

    if (!newTestData.title || !newTestData.description || !newTestData.category_id || newTestData.image_urls.length === 0) {
        console.error("Test oluşturma hatası: Zorunlu alanlar eksik.", newTestData);
        throw new Error("Lütfen tüm zorunlu alanları (başlık, açıklama, kategori, en az bir görsel) doldurun.");
    }

    const docRef = await addDoc(testsCollectionRef, newTestData);
    console.log(`Yeni test Firestore'a eklendi, ID: ${docRef.id}`);
    return { id: docRef.id, ...newTestData, created_at: new Date() /* Geçici timestamp */ };
  } catch (error) {
    console.error('Testi Firestore\'da oluştururken hata:', error.message, error.stack);
    throw error;
  }
};

export const uploadImageAndGetURL = async (uri, path, onProgress) => {
  console.log(`uploadImageAndGetURL çağrıldı, path: ${path}`);
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: blob.type }); // contentType eklemek iyi bir pratiktir

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Yükleme ilerlemesi: ' + progress + '%');
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Storage yükleme hatası (uploadTask.on error):', error.code, error.message);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Dosya yüklendi, URL:', downloadURL);
            resolve(downloadURL);
          } catch (e) {
            console.error('Download URL alma hatası:', e.code, e.message);
            reject(e);
          }
        }
      );
    });
  } catch (error) {
    console.error('Görsel yükleme ön hazırlık hatası (fetch/blob):', error.message);
    throw error;
  }
};

// Test resmi URL'sini getir
export const getTestImageUrl = async (imagePath) => {
  try {
    if (!imagePath) return null;
    
    const imageRef = ref(storage, imagePath);
    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    console.error('Test resmi getirme hatası:', error);
    return null;
  }
};

// Test verilerini işle ve resim URL'lerini ekle
export const processTestData = async (test) => {
  try {
    // Test verilerini işle
    const processedTest = {
      id: test.id || test.uuid,
      uuid: test.uuid || test.id,
      title: test.title || 'İsimsiz Test',
      description: test.description || '',
      creatorId: test.creatorId || '',
      creatorName: test.creatorName || 'Anonim',
      categoryId: test.categoryId || '',
      categoryName: test.categoryName || 'Kategorisiz',
      questions: Array.isArray(test.questions) ? test.questions : [],
      playCount: test.playCount || test.play_count || 0,
      likeCount: test.likeCount || test.like_count || 0,
      commentCount: test.commentCount || test.comment_count || 0,
      featured: test.featured || false,
      difficulty: test.difficulty || 'normal',
      createdAt: test.createdAt || test.created_at || null,
      updatedAt: test.updatedAt || test.updated_at || null,
      thumbnailUrl: null
    };

    // Görsel URL'sini al
    if (test.thumbnail) {
      try {
        processedTest.thumbnailUrl = await getTestImageUrl(test.thumbnail);
      } catch (error) {
        console.warn('Test görseli yüklenemedi:', error);
        processedTest.thumbnailUrl = 'https://via.placeholder.com/400x300?text=Test+Görseli';
      }
    } else if (test.image_urls && test.image_urls.length > 0) {
      try {
        processedTest.thumbnailUrl = await getTestImageUrl(test.image_urls[0]);
      } catch (error) {
        console.warn('Test görseli yüklenemedi:', error);
        processedTest.thumbnailUrl = 'https://via.placeholder.com/400x300?text=Test+Görseli';
      }
    } else {
      processedTest.thumbnailUrl = 'https://via.placeholder.com/400x300?text=Test+Görseli';
    }

    return processedTest;
  } catch (error) {
    console.error('Test verisi işlenirken hata:', error);
    return null;
  }
};

export const incrementPlayCount = async (testId) => {
  try {
    const testRef = doc(db, 'tests', testId);
    await updateDoc(testRef, {
      playCount: increment(1)
    });
  } catch (error) {
    throw error;
  }
};

export { app, auth, db, storage };
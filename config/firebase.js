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
  apiKey: "AIzaSyBtHxrkA9kcUQZyJp9bA48Evyt5U-7AVoQ",
  authDomain: "pixelhunt-7afa8.firebaseapp.com",
  projectId: "pixelhunt-7afa8",
  storageBucket: "pixelhunt-7afa8.appspot.com",
  messagingSenderId: "595531085941",
  appId: "1:595531085941:android:48310a4460ade282d2a03c",
  databaseURL: "https://pixelhunt-7afa8-default-rtdb.firebaseio.com"
};

// Firebase App başlatma
let app;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  throw error;
}

// Firebase Auth başlatma (Expo Go ile uyumlu)
const auth = getAuth(app);

// Auth instance'ını dışa aktar
export { auth };

// Firestore başlatma ve ayarları
const db = getFirestore(app);
const storage = getStorage(app);

// Firestore ayarlarını güncelle
const firestoreSettings = {
  cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
  experimentalForceLongPolling: true, // Daha güvenilir bağlantı için
  merge: true,
  ignoreUndefinedProperties: true
};

// Bağlantı durumunu kontrol et
const checkConnection = async () => {
  try {
    const testQuery = query(collection(db, 'tests'), limit(1));
    await getDocs(testQuery);
    return true;
  } catch (error) {
    return false;
  }
};

export const signInWithFirebaseUsingGoogleToken = async (idToken) => {
  if (!idToken) {
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
    throw error;
  }
};

export const onAuthUserChanged = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const signInWithEmail = async (email, password) => {
  try {
    if (!auth) {
      throw new Error('Authentication servisi başlatılamadı');
    }
    
    if (!email || !password) {
      throw new Error('E-posta ve şifre gereklidir');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const userRef = doc(db, 'users', userCredential.user.uid);
    await updateDoc(userRef, { 
      lastLogin: serverTimestamp(),
      email: userCredential.user.email,
      displayName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Kullanıcı'
    }).catch(err => {
      console.warn("Kullanıcı bilgileri güncellenirken hata:", err);
    });
    
    return userCredential.user;
  } catch (error) {
    let errorMessage = 'Giriş yapılırken bir hata oluştu';
    switch (error.code) {
      case 'auth/invalid-credential':
        errorMessage = 'E-posta veya şifre hatalı';
        break;
      case 'auth/user-not-found':
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Hatalı şifre';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'İnternet bağlantınızı kontrol edin';
        break;
    }
    
    throw new Error(errorMessage);
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
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
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
    // Bağlantı kontrolü
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('İnternet bağlantısı yok veya Firestore\'a erişilemiyor');
    }
    
    let q = collection(db, 'tests');
    let constraints = [];

    // Temel filtreler
    if (isPublic) constraints.push(where('isPublic', '==', true));
    if (approved) constraints.push(where('approved', '==', true));
    
    // Özel filtreler
    if (featured) constraints.push(where('featured', '==', true));
    if (categoryId) constraints.push(where('categoryId', '==', categoryId));
    if (userId) constraints.push(where('creatorId', '==', userId));

    // Sıralama ve limit
    constraints.push(orderBy(orderByField, orderDirection));
    constraints.push(limit(testLimit));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    q = query(q, ...constraints);

    const querySnapshot = await getDocs(q);

    // Test verilerini işle ve görselleri yükle
    const processedTests = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const test = {
          id: doc.id,
          uuid: data.uuid || doc.id,
          title: data.title,
          description: data.description || '',
          creatorId: data.creatorId || '',
          creatorName: data.creatorName || '',
          categoryId: data.categoryId || '',
          categoryName: data.categoryName || '',
          questions: data.questions || [],
          playCount: data.playCount || 0,
          likeCount: data.likeCount || 0,
          commentCount: data.commentCount || 0,
          featured: data.featured || false,
          difficulty: data.difficulty || 'normal',
          isPublic: data.isPublic !== false,
          approved: data.approved === true,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          thumbnail: data.thumbnail,
          imageUrls: data.imageUrls || []
        };

        // Görsel URL'lerini al
        try {
          // Thumbnail URL'sini al
          if (data.thumbnailUrl) {
            test.thumbnailUrl = await getTestImageUrl(data.thumbnailUrl);
          } else if (data.thumbnail) {
            test.thumbnailUrl = await getTestImageUrl(data.thumbnail);
          } else if (data.image_urls && data.image_urls.length > 0) {
            test.thumbnailUrl = await getTestImageUrl(data.image_urls[0]);
          } else if (data.questions && data.questions.length > 0 && data.questions[0].imageUrl) {
            test.thumbnailUrl = await getTestImageUrl(data.questions[0].imageUrl);
          } else {
            test.thumbnailUrl = getDefaultThumbnail();
          }

          // Tüm görsel URL'lerini al
          const allImageUrls = new Set();

          // Test görsellerini ekle
          if (data.image_urls && Array.isArray(data.image_urls)) {
            data.image_urls.forEach(url => allImageUrls.add(url));
          }

          // Soru görsellerini ekle
          if (data.questions && Array.isArray(data.questions)) {
            data.questions.forEach(question => {
              if (question.imageUrl) {
                allImageUrls.add(question.imageUrl);
              }
            });
          }

          // Tüm görselleri işle
          const imagePromises = Array.from(allImageUrls).map(url => getTestImageUrl(url));
          test.imageUrls = await Promise.all(imagePromises);

        } catch (error) {
          test.thumbnailUrl = getDefaultThumbnail();
          test.imageUrls = [];
        }

        return test;
      })
    );

    // Arama varsa client-side filter
    if (searchQuery && searchQuery.trim() !== '') {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      return processedTests.filter(test =>
        test.title?.toLowerCase().includes(normalizedQuery) ||
        test.description?.toLowerCase().includes(normalizedQuery)
      );
    }

    return processedTests;
  } catch (error) {
    throw error;
  }
};

export const fetchCategories = async () => {
  try {
    const q = query(
      collection(db, 'categories'),
      where('active', '==', true),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);

    const categories = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        iconName: data.iconName,
        color: data.color,
        backgroundColor: data.backgroundColor,
        active: data.active !== false,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      };
    });

    return categories;
  } catch (error) {
    throw error;
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

    return processedTest;
  } catch (error) {
    throw error;
  }
};

export const fetchUserDocument = async (userId) => {
  if (!userId) {
    return null;
  }
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const fetchUserStats = async (userId) => {
  if (!userId) {
    return { total_tests_created: 0, total_score_achieved: 0, total_tests_played: 0, rank: 'N/A' };
  }
  try {
    const statsRef = doc(db, 'user_stats', userId);
    const docSnap = await getDoc(statsRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        total_tests_created: data.total_tests_created || 0,
        total_score_achieved: data.total_score_achieved || 0,
        total_tests_played: data.total_tests_played || 0,
        rank: data.rank || 'N/A',
      };
    } else {
      return { total_tests_created: 0, total_score_achieved: 0, total_tests_played: 0, rank: 'N/A' };
    }
  } catch (error) {
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
    throw new Error("Test oluşturmak için giriş yapmalısınız.");
  }
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
        throw new Error("Lütfen tüm zorunlu alanları (başlık, açıklama, kategori, en az bir görsel) doldurun.");
    }

    const docRef = await addDoc(testsCollectionRef, newTestData);
    return { id: docRef.id, ...newTestData, created_at: new Date() /* Geçici timestamp */ };
  } catch (error) {
    throw error;
  }
};

export const uploadImageAndGetURL = async (uri, path, onProgress) => {
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
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

// Test resmi URL'sini getir
export const getTestImageUrl = async (imagePath) => {
  try {
    if (!imagePath) {
      return getDefaultThumbnail();
    }

    // Eğer zaten bir URL ise direkt döndür
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Firebase Storage'dan görsel al
    const imageRef = ref(storage, imagePath);
    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    return getDefaultThumbnail();
  }
};

// Varsayılan görsel URL'lerini döndüren yardımcı fonksiyon
const getDefaultThumbnail = () => {
  const defaultThumbnails = [
    'https://firebasestorage.googleapis.com/v0/b/pixelhunt-7afa8.appspot.com/o/defaults%2Fdefault1.jpg?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/pixelhunt-7afa8.appspot.com/o/defaults%2Fdefault2.jpg?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/pixelhunt-7afa8.appspot.com/o/defaults%2Fdefault3.jpg?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/pixelhunt-7afa8.appspot.com/o/defaults%2Fdefault4.jpg?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/pixelhunt-7afa8.appspot.com/o/defaults%2Fdefault5.jpg?alt=media'
  ];
  return defaultThumbnails[Math.floor(Math.random() * defaultThumbnails.length)];
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
      thumbnailUrl: null,
      imageUrls: []
    };

    // Görsel URL'lerini al
    try {
      // Thumbnail URL'sini al
      if (test.thumbnailUrl) {
        processedTest.thumbnailUrl = await getTestImageUrl(test.thumbnailUrl);
      } else if (test.thumbnail) {
        processedTest.thumbnailUrl = await getTestImageUrl(test.thumbnail);
      } else if (test.image_urls && test.image_urls.length > 0) {
        processedTest.thumbnailUrl = await getTestImageUrl(test.image_urls[0]);
      } else if (test.questions && test.questions.length > 0 && test.questions[0].imageUrl) {
        processedTest.thumbnailUrl = await getTestImageUrl(test.questions[0].imageUrl);
      } else {
        processedTest.thumbnailUrl = getDefaultThumbnail();
      }

      // Tüm görsel URL'lerini al
      const allImageUrls = new Set();

      // Test görsellerini ekle
      if (test.image_urls && Array.isArray(test.image_urls)) {
        test.image_urls.forEach(url => allImageUrls.add(url));
      }

      // Soru görsellerini ekle
      if (test.questions && Array.isArray(test.questions)) {
        test.questions.forEach(question => {
          if (question.imageUrl) {
            allImageUrls.add(question.imageUrl);
          }
        });
      }

      // Tüm görselleri işle
      const imagePromises = Array.from(allImageUrls).map(url => getTestImageUrl(url));
      processedTest.imageUrls = await Promise.all(imagePromises);

    } catch (error) {
      processedTest.thumbnailUrl = getDefaultThumbnail();
      processedTest.imageUrls = [];
    }

    return processedTest;
  } catch (error) {
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

// Herkese açık testleri getir (kullanıcıya özel değil)
export const fetchAllTests = async () => {
  try {
    const q = query(
      collection(db, 'tests'),
      where('isPublic', '==', true),
      where('approved', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    return [];
  }
};

// Herkese açık kategorileri getir (kullanıcıya özel değil)
export const fetchAllCategories = async () => {
  try {
    const q = query(
      collection(db, 'categories'),
      where('active', '==', true),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    return [];
  }
};

export { app, db, storage };
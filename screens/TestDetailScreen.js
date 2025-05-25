// TestDetailScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  ImageBackground, // For cover image with overlay
  TextInput,
  FlatList,
  Share,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme'; // Assuming your theme is set up for dark mode
import { fetchUserDocument, fetchTestById, auth } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import TestCard from '../components/TestCard';

const { width } = Dimensions.get('window');
const testCardWidth = width * 0.40;

// Helper to format date, assuming createdAt is a Firestore Timestamp or parsable date string
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return '-';
  }
};

const ScreenHeader = ({ navigation, title }) => (
  <View style={styles.headerContainer}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
      <Feather name="arrow-left" size={24} color={theme.colors.text} />
    </TouchableOpacity>
    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
    <View style={styles.headerButton} />{/* Placeholder for right side balance */}
  </View>
);

const CommentItem = ({ comment }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (comment.userId) {
        try {
          const userDoc = await fetchUserDocument(comment.userId);
          setUserData(userDoc);
        } catch (error) {
          console.error('Kullanıcı bilgileri alınamadı:', error);
        }
      }
    };

    fetchUserData();
  }, [comment.userId]);

  return (
    <View style={styles.commentItem}>
      {userData?.photoURL ? (
        <Image 
          source={{ uri: userData.photoURL }} 
          style={styles.commentUserAvatar}
        />
      ) : (
        <View style={styles.commentUserAvatarPlaceholder}>
          <Feather name="user" size={20} color={theme.colors.textSecondary} />
        </View>
      )}
      <View style={styles.commentContent}>
        <Text style={styles.commentUser}>
          {userData?.displayName || comment.userName || 'Anonim Kullanıcı'}
        </Text>
        <Text style={styles.commentText}>{comment.comment}</Text>
        <Text style={styles.commentDate}>
          {formatDate(comment.createdAt)}
        </Text>
      </View>
    </View>
  );
};

// Benzer testleri getiren fonksiyon
const getSimilarTests = async (testId) => {
  try {
    // Önce mevcut testin bilgilerini al
    const testRef = doc(db, 'tests', testId);
    const testDoc = await getDoc(testRef);
    
    if (!testDoc.exists()) return [];
    
    const currentTest = testDoc.data();
    const categoryId = currentTest.categoryId || (currentTest.category && currentTest.category.id);
    
    if (!categoryId) return [];
    
    // Aynı kategorideki diğer testleri getir
    const testsRef = collection(db, 'tests');
    const q = query(
      testsRef,
      where('categoryId', '==', categoryId),
      orderBy('playCount', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    // Mevcut testi filtrele ve sonuçları döndür
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(test => test.id !== testId)
      .slice(0, 4);
  } catch (error) {
    console.error('Benzer testler alınırken hata:', error);
    return [];
  }
};

// Benzer test kartı bileşeni
const SimilarTestCard = ({ test, onPress }) => (
  <TouchableOpacity 
    style={styles.similarTestCard} 
    onPress={onPress}
  >
    <ImageBackground
      source={test.thumbnailUrl ? { uri: test.thumbnailUrl } : require('../assets/placeholder.png')}
      style={styles.similarTestImage}
      imageStyle={styles.similarTestImageStyle}
    >
      <View style={styles.similarTestOverlay} />
    </ImageBackground>
    <View style={styles.similarTestInfo}>
      <Text style={styles.similarTestTitle} numberOfLines={1}>
        {test.title}
      </Text>
      <View style={styles.similarTestStats}>
        <View style={styles.similarTestStat}>
          <Feather name="play" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.similarTestStatText}>{test.playCount || 0}</Text>
        </View>
        <View style={styles.similarTestStat}>
          <Feather name="heart" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.similarTestStatText}>{test.likeCount || 0}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const TestDetailScreen = ({ route, navigation }) => {
  const { test: initialTest, testId } = route.params || {};
  const [test, setTest] = useState(initialTest || null);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialTest?.likeCount || 0);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [similarTests, setSimilarTests] = useState([]);
  const [similarTestsLoading, setSimilarTestsLoading] = useState(true);
  const { user } = useAuth();

  const loadTestDetails = useCallback(async (id) => {
    setLoading(true);
    setFetchError(false);
    try {
      const testData = await fetchTestById(id);
      if (testData) {
        setTest(testData);
        if (testData.creatorId) {
          try {
            const userData = await fetchUserDocument(testData.creatorId);
            setCreator(userData);
          } catch (userError) {
            console.warn('Failed to fetch creator details:', userError);
            setCreator({ displayName: 'Anonim Kullanıcı', isAnonymous: true });
          }
        } else {
           setCreator({ displayName: 'Anonim Kullanıcı', isAnonymous: true });
        }
      } else {
        setFetchError(true);
        setTest(null);
      }
    } catch (error) {
      console.error('Failed to fetch test details:', error);
      setFetchError(true);
      setTest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (testId) { // Always prioritize fetching by ID if available
      loadTestDetails(testId);
    } else if (initialTest) { // Fallback to initialTest if no ID
      setTest(initialTest);
      if (initialTest.creatorId) {
        fetchUserDocument(initialTest.creatorId)
          .then(user => setCreator(user || { displayName: 'Anonim Kullanıcı', isAnonymous: true }))
          .catch(() => setCreator({ displayName: 'Anonim Kullanıcı', isAnonymous: true }));
      } else {
        setCreator({ displayName: 'Anonim Kullanıcı', isAnonymous: true });
      }
      setLoading(false);
    } else {
      // No testId and no initialTest
      setFetchError(true);
      setLoading(false);
    }
  }, [testId, initialTest, loadTestDetails]);

  useEffect(() => {
    if (test?.id) {
      fetchComments(test.id);
    }
    setLikeCount(test?.likeCount || 0);
  }, [test]);

  // Beğeni durumunu kontrol et
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user || !test?.id) return;
      
      try {
        const likeQuery = query(
          collection(db, 'testLikes'),
          where('testId', '==', test.id),
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(likeQuery);
        setLiked(!querySnapshot.empty);
      } catch (error) {
        console.error('Beğeni durumu kontrol edilirken hata:', error);
      }
    };

    checkLikeStatus();
  }, [user, test?.id]);

  // Yorumları Firestore'dan çek
  const fetchComments = async (testId) => {
    setCommentsLoading(true);
    try {
      const commentsRef = collection(db, 'testComments');
      const q = query(
        commentsRef,
        where('testId', '==', testId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const comments = [];
      
      for (const doc of querySnapshot.docs) {
        const commentData = doc.data();
        console.log('Yorum verisi:', commentData); // Debug log
        
        // Kullanıcı bilgilerini al
        const userDoc = await fetchUserDocument(commentData.userId);
        console.log('Yorum kullanıcı verisi:', userDoc); // Debug log
        
        comments.push({
          id: doc.id,
          ...commentData,
          createdAt: commentData.createdAt?.toDate(),
          user: userDoc ? {
            displayName: userDoc.displayName,
            avatarUrl: userDoc.avatarUrl || userDoc.photoURL,
            username: userDoc.username
          } : null
        });
      }
      
      setComments(comments);
    } catch (error) {
      console.error('Yorumlar alınamadı:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Yorum ekle
  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Giriş yapmalısınız', 'Yorum yapmak için giriş yapmalısınız.');
      return;
    }
    if (!commentInput.trim()) {
      Alert.alert('Yorum boş olamaz');
      return;
    }
    setCommentLoading(true);
    try {
      await addDoc(collection(db, 'testComments'), {
        testId: test.id,
        userId: user.uid,
        userName: user.displayName || user.email,
        comment: commentInput.trim(),
        createdAt: serverTimestamp()
      });
      setCommentInput('');
      fetchComments(test.id);
    } catch (e) {
      Alert.alert('Yorum eklenirken hata oluştu');
    }
    setCommentLoading(false);
  };

  // Beğenme işlemi
  const handleLike = async () => {
    if (!user) {
      Alert.alert(
        'Giriş Yapmalısınız',
        'Testi beğenmek için giriş yapmalısınız.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    try {
      const testRef = doc(db, 'tests', test.id);
      const likeRef = collection(db, 'testLikes');
      
      if (liked) {
        // Beğeniyi kaldır
        const likeQuery = query(
          likeRef,
          where('testId', '==', test.id),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(likeQuery);
        
        if (!querySnapshot.empty) {
          const likeDoc = querySnapshot.docs[0];
          await deleteDoc(doc(likeRef, likeDoc.id));
          await updateDoc(testRef, {
            likeCount: increment(-1)
          });
          setLiked(false);
          setLikeCount(prev => prev - 1);
        }
      } else {
        // Beğeni ekle
        await addDoc(likeRef, {
          testId: test.id,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        
        await updateDoc(testRef, {
          likeCount: increment(1)
        });

        // Kullanıcı aktivitesini kaydet
        await addDoc(collection(db, 'userActivities'), {
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0],
          activityType: 'like_test',
          details: `Teste beğeni verildi: ${test.title}`,
          entityId: test.id,
          entityType: 'test',
          createdAt: serverTimestamp()
        });

        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Beğeni işlemi sırasında hata:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  // Paylaş
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pixelhunt'ta bu testi çöz: ${test.title}`
      });
    } catch (e) {
      Alert.alert('Paylaşım başarısız');
    }
  };

  // Benzer testleri yükle
  const loadSimilarTests = useCallback(async (testId) => {
    if (!testId) return;
    
    setSimilarTestsLoading(true);
    try {
      const tests = await getSimilarTests(testId);
      setSimilarTests(tests);
    } catch (error) {
      console.error('Benzer testler yüklenirken hata:', error);
      setSimilarTests([]);
    } finally {
      setSimilarTestsLoading(false);
    }
  }, []);

  // Test değiştiğinde benzer testleri yükle
  useEffect(() => {
    if (test?.id) {
      loadSimilarTests(test.id);
    }
  }, [test?.id, loadSimilarTests]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredContainer]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Test Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (fetchError || !test) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredContainer]} edges={['top', 'bottom']}>
         <ScreenHeader navigation={navigation} title="Hata" />
        <Feather name="alert-triangle" size={48} color={theme.colors.error} style={{ marginBottom: 16 }}/>
        <Text style={styles.errorText}>
          Test yüklenirken bir sorun oluştu veya test bulunamadı.
        </Text>
        <TouchableOpacity onPress={() => testId ? loadTestDetails(testId) : navigation.goBack()} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{testId ? "Tekrar Dene" : "Geri Dön"}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const creatorName = creator?.displayName || test?.creatorName || 'Anonim Kullanıcı';
  const creatorPhoto = creator?.photoURL;
  const questionCount = test.questions?.length || 0;

  // Kapak görseli için güvenli kaynak
  const coverSource = test?.thumbnailUrl
    ? { uri: test.thumbnailUrl }
    : test?.imageUrl
    ? { uri: test.imageUrl }
    : require('../assets/placeholder.png');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader navigation={navigation} title={test.title} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainContentCard}>
          <ImageBackground
            source={coverSource}
            style={styles.coverImage}
            resizeMode="cover"
          >
            <View style={styles.questionCountBadge}>
              <Text style={styles.questionCountText}>{questionCount} Soru</Text>
            </View>
          </ImageBackground>

          <View style={styles.titleSection}>
            <Text style={styles.title}>{test.title}</Text>
            <View style={styles.metaRow}>
              <Feather name="calendar" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(test.createdAt)}</Text>
              <Text style={styles.metaSeparator}>•</Text>
              <Feather name="user" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.metaText}>{creatorName}</Text>
            </View>
          </View>
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[
                styles.iconButton, 
                liked && { backgroundColor: theme.colors.primary }
              ]} 
              onPress={handleLike}
            >
              <Feather 
                name="thumbs-up" 
                size={20} 
                color={liked ? theme.colors.primaryForeground : theme.colors.text} 
              />
              <Text style={[
                styles.iconButtonText,
                liked && { color: theme.colors.primaryForeground }
              ]}>
                {likeCount}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
              <Feather name="share-2" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {test.description && <Text style={styles.description}>{test.description}</Text>}

          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Feather name="play-circle" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>{(test.playCount || 0).toLocaleString()} Oynanma</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="thumbs-up" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>{(test.likeCount || 0).toLocaleString()} Beğeni</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="message-circle" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>{(test.commentCount || 0).toLocaleString()} Yorum</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('Game', { test: test })}
          >
            <Feather name="play" size={20} color={theme.colors.background} />
            <Text style={styles.startButtonText}>Testi Başlat</Text>
          </TouchableOpacity>
        </View>

        {/* Creator Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Feather name="user-check" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Oluşturan</Text>
          </View>
          <View style={styles.creatorInfo}>
            {creatorPhoto ? (
              <Image source={{ uri: creatorPhoto }} style={styles.creatorAvatar} />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <Feather name="user" size={24} color={theme.colors.textSecondary} />
              </View>
            )}
            <View>
              <Text style={styles.creatorName}>{creatorName}</Text>
              {creator?.isAnonymous && <Text style={styles.creatorSubtext}>Kullanıcı bilgileri gizlenmiş</Text>}
            </View>
          </View>
        </View>

        {/* Test Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Feather name="info" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Test Bilgileri</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kategori:</Text>
            <Text style={styles.detailValue}>{test.categoryName || 'Genel'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Soru Sayısı:</Text>
            <Text style={styles.detailValue}>{questionCount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Oluşturulma:</Text>
            <Text style={styles.detailValue}>{formatDate(test.createdAt)}</Text>
          </View>
           <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Oynanma Sayısı:</Text>
            <Text style={styles.detailValue}>{(test.playCount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Beğeni Sayısı:</Text>
            <Text style={styles.detailValue}>{(test.likeCount || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Yorumlar Bölümü */}
        <View style={styles.commentsBox}>
          <Text style={styles.commentsTitle}>Yorumlar</Text>
          {commentsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : comments.length === 0 ? (
            <Text style={styles.noComments}>Henüz yorum yapılmamış. İlk yorumu sen yap!</Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment, idx) => (
                <View
                  key={comment.id}
                  style={[
                    styles.commentContainer,
                    idx === comments.length - 1 && { borderBottomWidth: 0 } // Sonuncu yorumda çizgi olmasın
                  ]}
                >
                  <View style={styles.commentHeader}>
                    <View style={styles.commentUserInfo}>
                      {comment.user?.avatarUrl ? (
                        <Image
                          source={{ uri: comment.user.avatarUrl }}
                          style={styles.commentAvatar}
                          onError={(e) => {
                            console.log('Avatar yüklenemedi:', e.nativeEvent.error);
                            console.log('Avatar URL:', comment.user.avatarUrl);
                          }}
                        />
                      ) : (
                        <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
                          <Text style={styles.commentAvatarText}>
                            {(comment.user?.displayName || comment.user?.username || 'K')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.commentUsername}>
                          {comment.user?.displayName || comment.user?.username || 'Anonim Kullanıcı'}
                        </Text>
                        <Text style={styles.commentDate}>
                          {comment.createdAt ? formatDate(comment.createdAt) : 'Tarih yok'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{comment.comment}</Text>
                </View>
              ))}
            </View>
          )}
          {user && (
            <View style={styles.addCommentBox}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorumunuzu yazın..."
                placeholderTextColor={theme.colors.textSecondary}
                value={commentInput}
                onChangeText={setCommentInput}
                editable={!commentLoading}
                multiline
              />
              <TouchableOpacity 
                style={[
                  styles.addCommentButton,
                  commentLoading && styles.addCommentButtonDisabled
                ]} 
                onPress={handleAddComment} 
                disabled={commentLoading || !commentInput.trim()}
              >
                {commentLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={styles.addCommentButtonText}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Benzer Testler */}
        {similarTests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Benzer Testler</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarTestsContainer}
            >
              {similarTests.map((similarTest) => (
                <View key={similarTest.id} style={styles.similarTestCardWrapper}>
                  <TestCard
                    test={similarTest}
                    onPress={() => navigation.push('TestDetail', { testId: similarTest.id })}
                    style={[styles.similarTestCard, { width: testCardWidth }]}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// Define your theme colors for dark mode. Example:
// theme.colors.background = '#121212';
// theme.colors.card = '#1E1E1E'; // Slightly lighter than background
// theme.colors.text = '#E0E0E0';
// theme.colors.textSecondary = '#A0A0A0';
// theme.colors.primary = '#FFC107'; // Gold/Yellow from screenshot
// theme.colors.primaryForeground = '#121212'; // Text on primary button
// theme.colors.border = '#333333';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontSize: 16,
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    minWidth: 150,
    alignItems: 'center',
  },
  actionButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
    fontFamily: 'Outfit_400Regular',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
  mainContentCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  coverImage: {
    width: '100%',
    height: 220,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  questionCountBadge: {
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    margin: 12,
  },
  questionCountText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Outfit_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    color: '#71717A',
    fontSize: 13,
    marginLeft: 4,
    fontFamily: 'Outfit_400Regular',
  },
  metaSeparator: {
    color: '#71717A',
    marginHorizontal: 8,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  iconButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit_700Bold',
  },
  description: {
    fontSize: 16,
    color: '#71717A',
    marginBottom: 24,
    lineHeight: 24,
    paddingHorizontal: 16,
    fontFamily: 'Outfit_400Regular',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#27272A',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    marginHorizontal: 4,
  },
  statText: {
    marginLeft: 4,
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Outfit_400Regular',
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  startButtonText: {
    color: '#000',
    fontWeight: '400',
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    backgroundColor: '#000',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
    marginLeft: 8,
    fontFamily: 'Outfit_400Regular',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  creatorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  creatorSubtext: {
    color: '#71717A',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  detailLabel: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit_400Regular',
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  commentsBox: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 16,
    fontFamily: 'Outfit_400Regular',
  },
  commentsList: {
    marginBottom: 16,
  },
  commentContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentAvatarFallback: {
    backgroundColor: '#27272A',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Outfit_400Regular',
  },
  commentDate: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: 'Outfit_400Regular',
  },
  commentText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 20,
  },
  addCommentBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    marginRight: 8,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    minHeight: 40,
  },
  addCommentButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 8,
  },
  addCommentButtonDisabled: {
    opacity: 0.7,
  },
  addCommentButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Outfit_400Regular',
  },
  noComments: {
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
    fontFamily: 'Outfit_400Regular',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Outfit_400Regular',
  },
  similarTestsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  similarTestCardWrapper: {
    marginRight: 16,
  },
  similarTestCard: {
    width: '100%',
  },
  similarTestImage: {
    height: 160,
    width: '100%',
  },
  similarTestImageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  similarTestOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  similarTestInfo: {
    padding: 16,
  },
  similarTestTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Outfit_400Regular',
  },
  similarTestStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  similarTestStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  similarTestStatText: {
    fontSize: 13,
    color: '#71717A',
    fontFamily: 'Outfit_400Regular',
  },
});

export default TestDetailScreen;
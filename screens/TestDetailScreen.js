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
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme'; // Assuming your theme is set up for dark mode
import { fetchUserDocument, fetchTestById } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

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
  const user = getAuth().currentUser;

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

  // Yorumları Firestore'dan çek
  const fetchComments = async (testId) => {
    setCommentsLoading(true);
    try {
      const q = query(
        collection(db, 'testComments'),
        where('testId', '==', testId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setComments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setComments([]);
    }
    setCommentsLoading(false);
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

  // Beğenme (örnek, backend ile entegre edilmeli)
  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    // TODO: Firestore'da güncelleme yapılmalı
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
          
          {/* Like and Share buttons - visual placeholders */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.colors.primary }]} onPress={handleLike}>
              <Feather name={liked ? 'heart' : 'heart'} size={20} color={liked ? theme.colors.error : theme.colors.primaryForeground} />
              <Text style={styles.iconButtonText}>{likeCount}</Text>
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
              <Feather name="heart" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>{(test.likeCount || 0).toLocaleString()} Beğeni</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="message-circle" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.statText}>{(test.commentCount || 0).toLocaleString()} Yorum</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('Game', { testId: test.id, testTitle: test.title })} // Pass ID and title
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
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <MaterialCommunityIcons name="account-circle" size={28} color={theme.colors.textSecondary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.commentUser}>{item.userName || 'Kullanıcı'}</Text>
                    <Text style={styles.commentText}>{item.comment}</Text>
                  </View>
                </View>
              )}
            />
          )}
          {/* Yorum ekleme alanı */}
          {user && (
            <View style={styles.addCommentBox}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorumunuzu yazın..."
                placeholderTextColor={theme.colors.textSecondary}
                value={commentInput}
                onChangeText={setCommentInput}
                editable={!commentLoading}
              />
              <TouchableOpacity style={styles.addCommentButton} onPress={handleAddComment} disabled={commentLoading}>
                <Text style={styles.addCommentButtonText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
    backgroundColor: theme.colors.background, // Dark background
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
    paddingHorizontal: theme.spacing.sm, // Less horizontal padding for header buttons
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.card, // Or theme.colors.background
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerButton: {
    padding: theme.spacing.sm,
    minWidth: 40, // Ensure tappable area
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  scrollContent: {
    padding: theme.spacing.md, // Consistent padding for scrollable content
  },
  mainContentCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden', // Important for cover image border radius
    paddingBottom: theme.spacing.md, // Space for elements inside the card
  },
  coverImage: {
    width: '100%',
    height: 220, // Adjusted height
    justifyContent: 'flex-end', // For the badge
    alignItems: 'flex-start', // For the badge
  },
  questionCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    margin: theme.spacing.md,
  },
  questionCountText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  titleSection: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    // No padding bottom here, actionsRow or description will provide it
  },
  title: {
    color: theme.colors.text,
    fontSize: 24, // Larger title
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  metaText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginLeft: theme.spacing.xs,
  },
  metaSeparator: {
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.sm,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Align to left, like screenshot's like button
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background, // Or slightly different shade from card
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconButtonText: {
    color: theme.colors.primaryForeground, // Text for the primary like button
    marginLeft: theme.spacing.xs,
    fontSize: 14,
    fontWeight: 'bold',
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: theme.colors.primary, // Gold/Yellow
    borderRadius: theme.borderRadius.lg, // More rounded
    paddingVertical: theme.spacing.lg-2, // Slightly taller
    marginHorizontal: theme.spacing.md, // Margin for the button itself
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  startButtonText: {
    color: theme.colors.primaryForeground, // Dark text on light primary
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: theme.spacing.sm,
  },
  infoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.border,
  },
  creatorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.background, // Darker placeholder
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  creatorName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  creatorSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Placeholder for future tabs
  tabSectionPlaceholder: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  commentsBox: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  commentsTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
  },
  noComments: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  commentUser: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  addCommentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  commentInput: {
    flex: 1,
    padding: theme.spacing.md,
    color: theme.colors.text,
  },
  addCommentButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.md,
  },
  addCommentButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TestDetailScreen;
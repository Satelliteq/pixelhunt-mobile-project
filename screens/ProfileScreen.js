// ProfileScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  TextInput,
  Animated,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { onAuthUserChanged, signOut } from '../config/firebase';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import TestCard from '../components/TestCard';

const TABS = [
  { key: 'tests', label: 'Testlerim', icon: 'file-text' },
  { key: 'played', label: 'Oynadıklarım', icon: 'play' },
  { key: 'stats', label: 'İstatistikler', icon: 'bar-chart-2' },
  { key: 'badges', label: 'Rozetler', icon: 'award' },
  { key: 'account', label: 'Hesap', icon: 'user' },
];

const formatDate = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('tr-TR');
  } catch {
    return '';
  }
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('tests');
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (firebaseUser) => {
      try {
        setLoading(true);
        if (!firebaseUser) {
          setUser(null);
          setUserData(null);
          setUserStats(null);
          setDisplayName('');
          setUsername('');
          return;
        }

      setUser(firebaseUser);
          
          // Kullanıcı verilerini çek
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            console.error('Kullanıcı verileri bulunamadı');
            Alert.alert('Hata', 'Kullanıcı verileri yüklenemedi. Lütfen tekrar deneyin.');
            return;
          }
          
          const userData = userSnap.data();

        // Paralel olarak verileri çek
        const [gameScoresSnap, createdTestsSnap] = await Promise.all([
          // Son 15 oyun skoru
          getDocs(query(
            collection(db, 'gameScores'),
            where('userId', '==', firebaseUser.uid),
            orderBy('createdAt', 'desc'),
            limit(15)
          )),
          // Oluşturulan testler
          getDocs(query(
            collection(db, 'tests'),
            where('creatorId', '==', firebaseUser.uid)
          ))
        ]);

        // Oyun skorlarını işle
        const gameScores = gameScoresSnap.docs.map(doc => ({
            id: doc.id,
          ...doc.data()
        }));

        // Test detaylarını toplu olarak çek
        const testIds = [...new Set(gameScores.map(score => score.testId))];
        const testSnaps = await Promise.all(
          testIds.map(testId => getDoc(doc(db, 'tests', testId)))
        );

        // Test detaylarını bir map'e dönüştür
        const testDetailsMap = testSnaps.reduce((acc, snap) => {
          if (snap.exists()) {
            acc[snap.id] = snap.data();
          }
          return acc;
        }, {});

        // Oyun skorlarını test detaylarıyla birleştir
        const playedTests = gameScores.map(score => {
          const testData = testDetailsMap[score.testId] || {};
              return {
            id: score.id,
            testId: score.testId,
            score: score.score || 0,
            completionTime: score.completionTime || 0,
            attemptsCount: score.attemptsCount || 0,
            completed: score.completed || false,
            playedAt: score.createdAt?.toDate?.() || new Date(),
            title: testData.title || 'İsimsiz Test',
            description: testData.description || 'Açıklama bulunmuyor',
            thumbnailUrl: testData.thumbnailUrl || null,
            categoryId: testData.categoryId || null,
            creatorId: testData.creatorId || null
              };
        });

        // İstatistikleri hesapla
        const totalScore = gameScores.reduce((acc, score) => acc + (score.score || 0), 0);
        const totalTestsPlayed = gameScores.length;
        const totalTime = gameScores.reduce((acc, score) => acc + (score.completionTime || 0), 0);
        const averageTime = totalTestsPlayed > 0 ? Math.round(totalTime / totalTestsPlayed) : 0;
        const totalTestsCreated = createdTestsSnap.docs.length;
        const completedTests = gameScores.filter(score => score.completed).length;
        const successRate = totalTestsPlayed > 0 ? Math.round((completedTests / totalTestsPlayed) * 100) : 0;
          
        // Güncellenmiş istatistikleri oluştur
        const updatedStats = {
          total_tests_created: totalTestsCreated,
          total_score_achieved: totalScore,
          total_tests_played: totalTestsPlayed,
          average_time: averageTime > 0 ? `${Math.floor(averageTime / 60)}:${(averageTime % 60).toString().padStart(2, '0')}` : '0:00',
          success_rate: successRate,
          completed_tests: completedTests
        };
          
          // Verileri state'e kaydet
          setUserData({
            ...userData,
          createdTests: createdTestsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
          })),
          playedTests,
          badges: userData.badges || []
          });
        setUserStats(updatedStats);
          setDisplayName(userData.displayName || firebaseUser.displayName || '');
          setUsername(userData.username || firebaseUser.email?.split('@')[0] || '');
      } catch (error) {
        console.error('Veri çekme hatası:', error);
        Alert.alert('Hata', 'Kullanıcı verileri yüklenirken bir hata oluştu: ' + error.message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await signOut();
      setUser(null);
      setUserData(null);
      setUserStats(null);
      setDisplayName('');
      setUsername('');
      navigation.navigate('Auth');
    } catch (error) {
      console.error('Çıkış yapma hatası:', error);
      Alert.alert(
        'Çıkış Hatası',
        'Çıkış yapılırken bir sorun oluştu. Lütfen tekrar deneyin.',
        [
          { text: 'Tamam', style: 'cancel' }
        ]
      );
    }
  };

  const onRefresh = useCallback(async () => {
    try {
    setRefreshing(true);
      if (!user) return;
        
        // Kullanıcı verilerini çek
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          console.error('Kullanıcı verileri bulunamadı');
          Alert.alert('Hata', 'Kullanıcı verileri yüklenemedi. Lütfen tekrar deneyin.');
          return;
        }
        
        const userData = userSnap.data();

      // Paralel olarak verileri çek
      const [gameScoresSnap, createdTestsSnap] = await Promise.all([
        // Son 15 oyun skoru
        getDocs(query(
          collection(db, 'gameScores'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(15)
        )),
        // Oluşturulan testler
        getDocs(query(
          collection(db, 'tests'),
          where('creatorId', '==', user.uid)
        ))
      ]);

      // Oyun skorlarını işle
      const gameScores = gameScoresSnap.docs.map(doc => ({
          id: doc.id,
        ...doc.data()
      }));

      // Test detaylarını toplu olarak çek
      const testIds = [...new Set(gameScores.map(score => score.testId))];
      const testSnaps = await Promise.all(
        testIds.map(testId => getDoc(doc(db, 'tests', testId)))
      );

      // Test detaylarını bir map'e dönüştür
      const testDetailsMap = testSnaps.reduce((acc, snap) => {
        if (snap.exists()) {
          acc[snap.id] = snap.data();
        }
        return acc;
      }, {});

      // Oyun skorlarını test detaylarıyla birleştir
      const playedTests = gameScores.map(score => {
        const testData = testDetailsMap[score.testId] || {};
            return {
          id: score.id,
          testId: score.testId,
          score: score.score || 0,
          completionTime: score.completionTime || 0,
          attemptsCount: score.attemptsCount || 0,
          completed: score.completed || false,
          playedAt: score.createdAt?.toDate?.() || new Date(),
          title: testData.title || 'İsimsiz Test',
          description: testData.description || 'Açıklama bulunmuyor',
          thumbnailUrl: testData.thumbnailUrl || null,
          categoryId: testData.categoryId || null,
          creatorId: testData.creatorId || null
            };
      });

      // İstatistikleri hesapla
      const totalScore = gameScores.reduce((acc, score) => acc + (score.score || 0), 0);
      const totalTestsPlayed = gameScores.length;
      const totalTime = gameScores.reduce((acc, score) => acc + (score.completionTime || 0), 0);
      const averageTime = totalTestsPlayed > 0 ? Math.round(totalTime / totalTestsPlayed) : 0;
      const totalTestsCreated = createdTestsSnap.docs.length;
      const completedTests = gameScores.filter(score => score.completed).length;
      const successRate = totalTestsPlayed > 0 ? Math.round((completedTests / totalTestsPlayed) * 100) : 0;
        
      // Güncellenmiş istatistikleri oluştur
      const updatedStats = {
        total_tests_created: totalTestsCreated,
        total_score_achieved: totalScore,
        total_tests_played: totalTestsPlayed,
        average_time: averageTime > 0 ? `${Math.floor(averageTime / 60)}:${(averageTime % 60).toString().padStart(2, '0')}` : '0:00',
        success_rate: successRate,
        completed_tests: completedTests
      };
        
        // Verileri state'e kaydet
        setUserData({
          ...userData,
        createdTests: createdTestsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        })),
        playedTests,
        badges: userData.badges || []
        });
      setUserStats(updatedStats);
        setDisplayName(userData.displayName || user.displayName || '');
        setUsername(userData.username || user.email?.split('@')[0] || '');
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
      Alert.alert('Hata', 'Veriler yenilenirken bir hata oluştu: ' + error.message);
    } finally {
    setRefreshing(false);
    }
  }, [user]);
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Feather name="user-x" size={50} color={theme.colors.textSecondary} />
        <Text style={styles.loadingText}>Profil bilgilerini görüntülemek için giriş yapın.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Profil başlığı
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.avatarWrapper}>
        {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{(displayName || 'K')[0].toUpperCase()}</Text>
                  </View>
                )}
        {user.emailVerified && (
                  <View style={styles.verifiedBadge}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.headerInfo}>
        {isEditing ? (
          <>
            <TextInput
              style={styles.editInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Adınız"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TextInput
              style={styles.editInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Kullanıcı adı"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </>
        ) : (
          <>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.username}>@{username}</Text>
          </>
        )}
        <View style={styles.headerBadges}>
          <View style={styles.joinBadge}>
            <Feather name="calendar" size={14} color={theme.colors.primary} />
            <Text style={styles.joinBadgeText}>{formatDate(user.metadata?.creationTime)}</Text>
          </View>
          {user.emailVerified && (
            <View style={styles.verifiedTextBadge}>
              <Feather name="check" size={12} color={theme.colors.primary} />
              <Text style={styles.verifiedText}>Doğrulanmış</Text>
            </View>
          )}
          </View>
            </View>
      <TouchableOpacity 
        style={styles.editButton} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsEditing(!isEditing);
        }}
      >
        <Feather name={isEditing ? 'save' : 'edit-2'} size={20} color={theme.colors.primary} />
      </TouchableOpacity>
                </View>
  );

  // Sekme başlıkları
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
      >
      {TABS.map(tab => renderTabButton(tab))}
      </ScrollView>
            </View>
  );

  const renderTabButton = (tab) => {
    const isActive = activeTab === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tabButton,
          isActive && styles.activeTabButton
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveTab(tab.key);
        }}
      >
        <Feather 
          name={tab.icon} 
          size={18} 
          color={isActive ? '#000' : theme.colors.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          isActive && styles.activeTabText
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Sekme içerikleri
  const renderTabContent = () => {
    switch (activeTab) {
      case 'tests':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oluşturduğunuz Testler</Text>
            {userData?.createdTests?.length > 0 ? (
              <View style={styles.testListContainer}>
                <FlatList
                  data={userData.createdTests}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  renderItem={({ item }) => (
                    <TestCard
                      test={item}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('TestDetail', { testId: item.id });
                      }}
                      style={styles.testCard}
                    />
                  )}
                  contentContainerStyle={styles.testListContent}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="file-text" size={40} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>Henüz test oluşturmadınız.</Text>
              </View>
            )}
          </View>
        );

      case 'played':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Oynadıklarınız</Text>
            {userData?.playedTests?.length > 0 ? (
              <View style={styles.playedTestsList}>
                {userData.playedTests.map((test, index) => (
                  <TouchableOpacity
                    key={`${test.id}-${index}`}
                    style={styles.playedTestItem}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.navigate('TestDetail', { testId: test.testId });
                    }}
                  >
                    <View style={styles.playedTestInfo}>
                      <Text style={styles.playedTestTitle} numberOfLines={1}>
                        {test.title || 'İsimsiz Test'}
                      </Text>
                      <View style={styles.playedTestStats}>
                        <View style={styles.playedTestStat}>
                          <Feather name="award" size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.playedTestStatText}>
                            {test.score || 0} puan
                          </Text>
                        </View>
                        <View style={styles.playedTestStat}>
                          <Feather name="calendar" size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.playedTestStatText}>
                            {formatDate(test.playedAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Feather name="play" size={40} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>Henüz test oynamadınız.</Text>
              </View>
            )}
          </View>
        );

      case 'stats':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İstatistikler</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Feather name="award" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{userStats?.total_score_achieved || 0}</Text>
                    <Text style={styles.statLabel}>Toplam Puan</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Feather name="play" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{userStats?.total_tests_played || 0}</Text>
                    <Text style={styles.statLabel}>Oynanan Test</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Feather name="clock" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{userStats?.average_time || '0:00'}</Text>
                    <Text style={styles.statLabel}>Ortalama Süre</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Feather name="edit" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{userStats?.total_tests_created || 0}</Text>
                    <Text style={styles.statLabel}>Oluşturulan Test</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Feather name="check-circle" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>{userStats?.completed_tests || 0}</Text>
                    <Text style={styles.statLabel}>Tamamlanan Test</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Feather name="trending-up" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValue}>%{userStats?.success_rate || 0}</Text>
                    <Text style={styles.statLabel}>Başarı Oranı</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case 'badges':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rozetler</Text>
            <View style={styles.comingSoonContainer}>
              <Feather name="award" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.comingSoonTitle}>Yakında</Text>
              <Text style={styles.comingSoonDescription}>
                Rozet sistemi yakında aktif olacak. Başarılarınızı rozetlerle sergileyin!
              </Text>
            </View>
          </View>
        );

      case 'account':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hesap Ayarları</Text>
            <View style={styles.accountCard}>
              <View style={styles.accountItem}>
                <View style={styles.accountItemLeft}>
                  <Feather name="mail" size={20} color={theme.colors.primary} />
                  <View style={styles.accountItemContent}>
                    <Text style={styles.accountItemLabel}>E-posta</Text>
                    <Text style={styles.accountItemText}>{user.email}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.accountItem}>
                <View style={styles.accountItemLeft}>
                  <Feather name="shield" size={20} color={theme.colors.primary} />
                  <View style={styles.accountItemContent}>
                    <Text style={styles.accountItemLabel}>E-posta Doğrulama</Text>
                    <Text style={styles.accountItemText}>
                      {user.emailVerified ? 'Doğrulanmış' : 'Doğrulanmamış'}
                    </Text>
                  </View>
                </View>
                {!user.emailVerified && (
                  <TouchableOpacity 
                    style={styles.verifyButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // E-posta doğrulama işlemi
                    }}
                  >
                    <Text style={styles.verifyButtonText}>Doğrula</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={styles.signOutButton} 
                onPress={handleSignOut}
              >
                <Feather name="log-out" size={20} color="#F87171" />
                <Text style={styles.signOutText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.colors.primary]} 
            tintColor={theme.colors.primary} 
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: theme.colors.textSecondary,
    fontFamily: 'Outfit_400Regular',
  },
  loginButton: { 
    marginTop: 16, 
    backgroundColor: theme.colors.primary, 
    borderRadius: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  loginButtonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  headerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 16, 
    margin: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarWrapper: { 
    marginRight: 16, 
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatar: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    borderWidth: 3, 
    borderColor: theme.colors.primary,
  },
  avatarFallback: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary + '40',
  },
  avatarFallbackText: { 
    color: '#fff', 
    fontSize: 32, 
    fontWeight: 'bold',
    fontFamily: 'Outfit_700Bold',
  },
  verifiedBadge: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    borderRadius: 10, 
    width: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#fff',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerInfo: { 
    flex: 1,
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 4,
    fontFamily: 'Outfit_700Bold',
  },
  username: {
    fontSize: 16,
    color: '#71717A',
    marginBottom: 16,
    fontFamily: 'Outfit_400Regular',
  },
  headerBadges: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  joinBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderWidth: 1,
    borderColor: '#27272A',
  },
  joinBadgeText: { 
    color: theme.colors.textSecondary, 
    fontSize: 12, 
    marginLeft: 4,
    fontFamily: 'Outfit_400Regular',
  },
  verifiedTextBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  verifiedText: { 
    color: theme.colors.textSecondary, 
    fontSize: 12, 
    marginLeft: 4,
    fontFamily: 'Outfit_400Regular',
  },
  editButton: { 
    marginLeft: 8, 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  editInput: { 
    color: '#fff', 
    borderRadius: 8, 
    padding: 8, 
    marginBottom: 6, 
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  tabsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    fontFamily: 'Outfit_400Regular',
  },
  tabsScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#71717A',
    fontFamily: 'Outfit_400Regular',
  },
  activeTabText: {
    color: '#000',
    fontFamily: 'Outfit_400Regular',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  testCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
  },
  testListContent: {
    paddingBottom: 16,
  },
  section: { 
    marginTop: 24, 
    marginHorizontal: 16, 
    borderRadius: 12, 
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 16,
    fontFamily: 'Outfit_700Bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  emptyText: {
    fontSize: 16,
    color: '#71717A',
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 2,
    fontFamily: 'Outfit_700Bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: 'Outfit_400Regular',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginTop: 8,
  },
  badgeCard: {
    width: '50%',
    padding: 8,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  badgeTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Outfit_700Bold',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#71717A',
    fontFamily: 'Outfit_400Regular',
  },
  accountCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  accountItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  accountItemLabel: {
    fontSize: 14,
    color: '#71717A',
    marginBottom: 4,
    fontFamily: 'Outfit_400Regular',
  },
  accountItemText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Outfit_400Regular',
  },
  verifyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  verifyButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  signOutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 24,
    backgroundColor: '#FCA5A520',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 8,
  },
  signOutText: { 
    color: '#F87171', 
    fontSize: 16, 
    fontFamily: 'Outfit_700Bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
  },
  headerRight: {
    width: 40,
  },
  testListContainer: {
    flex: 1,
  },
  recentBadgesContainer: {
    marginBottom: 24,
  },
  recentBadgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    fontFamily: 'Outfit_600SemiBold',
  },
  recentBadgesList: {
    gap: 12,
  },
  recentBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  recentBadgeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  badgeDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontFamily: 'Outfit_400Regular',
  },
  badgeTitleLocked: {
    color: theme.colors.textSecondary,
  },
  badgeDescriptionLocked: {
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  comingSoonBadge: {
    backgroundColor: '#27272A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  comingSoonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
    backgroundColor: '#18181B',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Outfit_700Bold',
  },
  comingSoonDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    fontFamily: 'Outfit_400Regular',
  },
  playedTestsList: {
    marginTop: 8,
  },
  playedTestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#18181B',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  playedTestInfo: {
    flex: 1,
    marginRight: 12,
  },
  playedTestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    fontFamily: 'Outfit_600SemiBold',
  },
  playedTestStats: {
    flexDirection: 'row',
    gap: 12,
  },
  playedTestStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playedTestStatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'Outfit_400Regular',
  },
});
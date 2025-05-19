// ProfileScreen.js
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  SafeAreaView,
  Alert,
  ScrollView // For content within tabs if not using FlatList for everything
} from 'react-native';
import { theme } from '../theme'; // Ensure your theme is correctly set up for dark mode
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import TestCard from '../components/TestCard';
import {
  onAuthUserChanged,
  signOut as firebaseSignOut,
  fetchUserDocument,
  fetchUserStats, // Assuming this fetches more detailed stats now
  fetchTests,
  fetchPlayedTestIds,
  fetchLikedTestIds,
  fetchTestsByIds,
  // You might need new functions like:
  // fetchUserActivity(userId, limit) -> [{ type: 'played_test', testName: 'X', score: 100, date: '...'}, ...]
  // fetchUserAchievements(userId) -> [{ id: 'ach1', name: 'First Test Played', earned: true, icon: '...'}, ...]
} from '../config/firebase';

const NUM_COLUMNS_TESTS = 2; // For "My Tests" tab
const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = theme.spacing.md;
const CARD_SPACING_TESTS = theme.spacing.sm;

// --- Helper to format date ---
const formatDate = (timestamp, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
  if (!timestamp) return '-';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('tr-TR', options);
  } catch (e) {
    console.warn("Date formatting error:", e);
    return '-';
  }
};

// --- Screen Header Component ---
const ProfileScreenHeader = memo(({ navigation, user, userData, onEditProfile }) => {
  const displayName = userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
  const username = userData?.username || user?.email?.split('@')[0] || 'kullanici_adi';
  const photoURL = userData?.photoURL || user?.photoURL;
  const joinDate = user?.metadata?.creationTime;
  const isVerified = userData?.isVerified || user?.emailVerified || false; // Example verification status

  return (
    <View style={styles.profileHeaderCard}>
      <View style={styles.profileHeaderTopRow}>
        <View style={styles.profileHeaderAvatarContainer}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.profileHeaderAvatar} />
          ) : (
            <View style={styles.profileHeaderDefaultAvatar}>
              <Text style={styles.profileHeaderAvatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.profileHeaderTextContainer}>
          <View style={styles.profileHeaderNameRow}>
            <Text style={styles.profileHeaderDisplayName}>{displayName}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={12} color={theme.colors.background} />
                <Text style={styles.verifiedBadgeText}>Doğrulanmış</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileHeaderUsername}>@{username}</Text>
        </View>
      </View>

      <View style={styles.profileHeaderMetaRow}>
        <View style={styles.metaItem}>
          <Feather name="mail" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>{user?.email || 'E-posta gizli'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.metaText}>{formatDate(joinDate)} tarihinde katıldı</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.editProfileButton} onPress={onEditProfile}>
        <Feather name="edit-2" size={16} color={theme.colors.primaryForeground} />
        <Text style={styles.editProfileButtonText}>Profili Düzenle</Text>
      </TouchableOpacity>
    </View>
  );
});


// --- Segmented Control / Icon Tabs ---
const ProfileTabs = memo(({ activeTab, onTabChange }) => {
  const TABS_CONFIG = [
    // Icons based on the reference image's tab bar
    { key: 'myTests', icon: 'book-open', label: 'Testlerim' }, // Or 'edit-3'
    { key: 'activity', icon: 'activity', label: 'Aktiviteler' }, // Or 'clock'
    { key: 'stats', icon: 'bar-chart-2', label: 'İstatistikler' }, // Or 'award' for "Skor İstatistikleri"
    { key: 'achievements', icon: 'award', label: 'Başarılar' }, // Or 'shield'
    { key: 'settings', icon: 'settings', label: 'Ayarlar' }, // Or 'user' for a more generic profile section
  ];

  return (
    <View style={styles.iconTabsContainer}>
      {TABS_CONFIG.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.iconTab, activeTab === tab.key && styles.activeIconTab]}
          onPress={() => onTabChange(tab.key)}
          accessibilityRole="tab"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: activeTab === tab.key }}
        >
          <Feather 
            name={tab.icon} 
            size={24} 
            color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
});

// --- Content Components for Tabs ---

const MyTestsTab = memo(({ tests, navigation, isLoading }) => {
  const renderTestItem = useCallback(({ item, index }) => {
    const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_SPACING_TESTS * (NUM_COLUMNS_TESTS - 1)) / NUM_COLUMNS_TESTS;
    return (
      <TestCard
        test={item}
        style={[
          styles.gridTestCard,
          { width: cardWidth },
          (index % NUM_COLUMNS_TESTS !== NUM_COLUMNS_TESTS - 1) && { marginRight: CARD_SPACING_TESTS }
        ]}
        onPress={() => navigation.navigate('TestDetail', { testId: item.id })}
      />
    );
  }, [navigation]);

  if (isLoading) {
    return <ActivityIndicator style={styles.tabContentLoadingIndicator} size="large" color={theme.colors.primary} />;
  }

  if (tests.length === 0) {
    return <Text style={styles.emptyTabText}>Henüz oluşturulmuş test bulunmuyor.</Text>;
  }

  return (
    <FlatList
      data={tests}
      renderItem={renderTestItem}
      keyExtractor={(item) => item.id.toString()}
      numColumns={NUM_COLUMNS_TESTS}
      style={styles.testsGrid}
      // contentContainerStyle={{ paddingBottom: theme.spacing.md }}
      scrollEnabled={false} // If this tab is part of a larger ScrollView/FlatList
    />
  );
});

const StatsTab = memo(({ userStats, isLoading }) => { // userStats should be the detailed stats object
  if (isLoading) {
    return <ActivityIndicator style={styles.tabContentLoadingIndicator} size="large" color={theme.colors.primary} />;
  }
  if (!userStats) {
    return <Text style={styles.emptyTabText}>İstatistikler yüklenemedi.</Text>;
  }

  const gameModes = userStats.gameModes || [
    { name: 'Klasik Mod', gamesPlayed: 0 },
    { name: 'Hızlı Mod', gamesPlayed: 0 },
    { name: 'Zamanlı Mod', gamesPlayed: 0 },
    { name: 'Test Modu', gamesPlayed: 0 },
  ];


  return (
    <View style={styles.contentCard}>
        <View style={styles.contentCardHeader}>
            <Feather name="bar-chart-2" size={20} color={theme.colors.primary} />
            <Text style={styles.contentCardTitle}>Skor İstatistikleri</Text>
        </View>
        <Text style={styles.contentCardSubtitle}>Tüm oyunlardaki performansınız</Text>

        <View style={styles.statsHighlightRow}>
            <View style={styles.statsHighlightItem}>
                <Text style={styles.statsHighlightLabel}>Toplam Puan</Text>
                <Text style={styles.statsHighlightValue}>{(userStats.totalScore || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statsHighlightItem}>
                <Text style={styles.statsHighlightLabel}>Oyun Sayısı</Text>
                <Text style={styles.statsHighlightValue}>{(userStats.totalPlays || 0).toLocaleString()}</Text>
            </View>
        </View>
        
        <Text style={styles.subSectionTitle}>Oyun Modlarına Göre</Text>
        {gameModes.map(mode => (
            <View key={mode.name} style={styles.gameModeStatRow}>
                <Text style={styles.gameModeName}>{mode.name}</Text>
                <Text style={styles.gameModeCount}>{mode.gamesPlayed} oyun</Text>
            </View>
        ))}
    </View>
  );
});

const ActivityTab = memo(({ userActivity, isLoading }) => { // userActivity: array of activity items
    if (isLoading) {
        return <ActivityIndicator style={styles.tabContentLoadingIndicator} size="large" color={theme.colors.primary} />;
    }
    if (!userActivity || userActivity.length === 0) {
        return <Text style={styles.emptyTabText}>Henüz bir aktivite bulunmuyor.</Text>;
    }

    return (
        <View style={styles.contentCard}>
            <View style={styles.contentCardHeader}>
                <Feather name="activity" size={20} color={theme.colors.primary} />
                <Text style={styles.contentCardTitle}>Son Aktiviteler</Text>
            </View>
            {userActivity.map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                    <Text style={styles.activityText}>
                        {activity.type === 'played_test' ? `Test oynandı: ${activity.testName}, Skor: ${activity.score}` : activity.description}
                    </Text>
                    <Text style={styles.activityDate}>{formatDate(activity.date, { day:'numeric', month:'short', year:'numeric' })}</Text>
                </View>
            ))}
        </View>
    );
});

const AchievementsTab = memo(({ userAchievements, isLoading }) => { // userAchievements: array of achievement items
    if (isLoading) {
        return <ActivityIndicator style={styles.tabContentLoadingIndicator} size="large" color={theme.colors.primary} />;
    }
    if (!userAchievements || userAchievements.length === 0) {
        return <Text style={styles.emptyTabText}>Henüz kazanılmış başarı bulunmuyor.</Text>;
    }
    
    // Calculate total score from achievements if applicable, or use overall total score
    const totalScoreFromAchievements = userAchievements.reduce((sum, ach) => sum + (ach.points || 0), 0);
    const displayTotalScore = totalScoreFromAchievements > 0 ? totalScoreFromAchievements : (/* a general total score from stats if needed */ 0);


    return (
        <View style={styles.contentCard}>
            <View style={styles.contentCardHeader}>
                <Feather name="award" size={20} color={theme.colors.primary} />
                <Text style={styles.contentCardTitle}>Başarılar</Text>
            </View>
            <Text style={styles.contentCardSubtitle}>Oyun içi başarılarınız</Text>

            {/* Example structure for achievements */}
            {userAchievements.map((ach, index) => (
                <View key={ach.id || index} style={styles.achievementItem}>
                    <MaterialCommunityIcons name={ach.icon || "star-circle-outline"} size={30} color={ach.earned ? theme.colors.primary : theme.colors.textDisabled} />
                    <View style={styles.achievementTextContainer}>
                        <Text style={[styles.achievementName, !ach.earned && styles.achievementNotEarned]}>{ach.name}</Text>
                        {ach.description && <Text style={styles.achievementDescription}>{ach.description}</Text>}
                    </View>
                    {ach.points && <Text style={styles.achievementPoints}>{ach.points} Puan</Text>}
                </View>
            ))}

            {displayTotalScore > 0 && (
                 <View style={styles.totalScoreBadge}>
                    <Feather name="award" size={24} color={theme.colors.background} />
                    <Text style={styles.totalScoreBadgeLabel}>Toplam Puan</Text>
                    <Text style={styles.totalScoreBadgeValue}>{displayTotalScore.toLocaleString()}</Text>
                </View>
            )}
        </View>
    );
});


// --- Main Profile Screen Component ---
export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userStats, setUserStats] = useState(null); // More detailed stats from fetchUserStats
  const [myTests, setMyTests] = useState([]);
  const [userActivity, setUserActivity] = useState([]); // Placeholder for activity feed
  const [userAchievements, setUserAchievements] = useState([]); // Placeholder for achievements

  const [loading, setLoading] = useState(true);
  const [tabContentLoading, setTabContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('stats'); // Default to 'stats' as per image

  // Fetches data for a specific tab
  const loadTabContent = useCallback(async (tabKey, userId) => {
    if (!userId) return;
    setTabContentLoading(true);
    setError(null);

    try {
      switch (tabKey) {
        case 'myTests':
          const tests = await fetchTests({ creatorId: userId, limit: 10, orderByField: 'createdAt', orderDirection: 'desc', isPublic: true, approved: true });
          setMyTests(Array.isArray(tests) ? tests : []);
          break;
        case 'stats':
          const statsData = await fetchUserStats(userId); // This should fetch detailed stats
          setUserStats(statsData);
          break;
        case 'activity':
          // const activityData = await fetchUserActivity(userId, 10); // Implement this
          setUserActivity([ // Placeholder data
            { type: 'played_test', testName: 'Ünlü Şehirler', score: 600, date: new Date('2025-05-16T10:00:00Z') },
            { type: 'played_test', testName: 'Ünlü Şehirler', score: 800, date: new Date('2025-05-16T09:00:00Z') },
            { type: 'created_test', description: 'Yeni bir test oluşturdu: Tarihi Yapılar', date: new Date('2025-05-15T14:30:00Z') },
          ]);
          break;
        case 'achievements':
          // const achievementsData = await fetchUserAchievements(userId); // Implement this
          setUserAchievements([ // Placeholder data
            { id: 'ach1', name: 'İlk 10 Testi Tamamla', earned: true, icon: 'medal-outline', points: 100, description: '10 farklı testi başarıyla tamamladın.' },
            { id: 'ach2', name: 'Skor Ustası', earned: true, icon: 'trophy-award', points: 500, description: 'Bir testte 5000+ puan kazandın.' },
            { id: 'ach3', name: 'Test Oluşturucu', earned: false, icon: 'pencil-box-outline', points: 200, description: 'İlk testini oluştur.' },
          ]);
          break;
        case 'settings':
          // No data to load, navigation handled by onTabChange or a direct button
          break;
        default:
          console.warn(`Content loader for tab "${tabKey}" not implemented.`);
      }
    } catch (e) {
      console.error(`Error loading content for tab "${tabKey}":`, e);
      setError(`"${getTabName(tabKey)}" içeriği yüklenirken bir sorun oluştu.`);
    } finally {
      setTabContentLoading(false);
    }
  }, []);

  // Fetches initial user document, and then loads content for the active tab
  const loadInitialScreenData = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const fetchedUserDoc = await fetchUserDocument(userId);
      if (fetchedUserDoc) setUserData(fetchedUserDoc);
      // Load content for the default/active tab
      await loadTabContent(activeTab, userId);
    } catch (e) {
      console.error('Initial screen data fetch error:', e);
      setError('Profil bilgileri yüklenirken bir sorun oluştu.');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, loadTabContent]);

  // Handles tab changes
  const handleTabChange = useCallback((newTabKey) => {
    if (!user) return;
    if (newTabKey === 'settings') {
        navigation.navigate('Settings'); // Or your specific settings screen name
        return;
    }
    if (newTabKey === activeTab && (newTabKey === 'myTests' ? myTests.length > 0 : newTabKey === 'stats' ? userStats : true)) {
        // Avoid reloading if tab is same and content already loaded, unless it's an empty state you want to refresh
        return;
    }
    setActiveTab(newTabKey);
    loadTabContent(newTabKey, user.uid);
  }, [user, activeTab, loadTabContent, navigation, myTests, userStats]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (!user) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    setError(null); 
    try {
      await loadInitialScreenData(user.uid); // Reloads user doc and current active tab's content
    } catch (err) {
      console.error("Refresh operation error:", err);
      setError("Yenileme sırasında bir hata oluştu.");
    } finally {
      setRefreshing(false);
    }
  }, [user, loadInitialScreenData]);

  // Sign out handler
  const handleSignOut = useCallback(async () => {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [{ text: "İptal", style: "cancel" },
       { text: "Çıkış Yap", style: "destructive", onPress: async () => {
          try { await firebaseSignOut(); } catch (e) { console.error('Sign out error:', e); Alert.alert('Çıkış Hatası', 'Çıkış yapılırken bir sorun oluştu.'); }
      }}]);
  }, []);
  
  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const isNewUserLogin = !user || user.uid !== firebaseUser.uid;
        setUser(firebaseUser);
        if (isNewUserLogin) { 
          await loadInitialScreenData(firebaseUser.uid);
        }
      } else {
        setUser(null); setUserData(null); setMyTests([]); setUserStats(null); setUserActivity([]); setUserAchievements([]);
        setError(null); setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user, loadInitialScreenData]);

  // --- Render Logic ---
  const renderActiveTabContent = () => {
    if (tabContentLoading && activeTab !== 'settings') {
      return <ActivityIndicator style={styles.tabContentLoadingIndicator} size="large" color={theme.colors.primary} />;
    }
    if (error && activeTab !== 'settings') {
      return (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={30} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadTabContent(activeTab, user.uid)} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }
    switch (activeTab) {
      case 'myTests':
        return <MyTestsTab tests={myTests} navigation={navigation} isLoading={tabContentLoading} />;
      case 'stats':
        return <StatsTab userStats={userStats} isLoading={tabContentLoading} />;
      case 'activity':
        return <ActivityTab userActivity={userActivity} isLoading={tabContentLoading} />;
      case 'achievements':
        return <AchievementsTab userAchievements={userAchievements} isLoading={tabContentLoading} />;
      default:
        return <Text style={styles.emptyTabText}>Bu sekme için içerik bulunamadı.</Text>;
    }
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredMessageContainer]} edges={['top','bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centeredMessageContainer]} edges={['top','bottom']}>
        <Feather name="user-x" size={60} color={theme.colors.textSecondary} />
        <Text style={styles.messageText}>Profil bilgilerini görmek için giriş yapın.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Main screen content: Tüm ekranı FlatList ile yönetiyoruz
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={[{ id: 'tab_content_wrapper' }]}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            <ProfileScreenHeader 
              navigation={navigation} 
              user={user} 
              userData={userData} 
              onEditProfile={() => navigation.navigate('EditProfile')}
            />
            <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </>
        }
        renderItem={renderActiveTabContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListFooterComponent={
          !loading && !refreshing && !tabContentLoading && (
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Feather name="log-out" size={18} color={theme.colors.error} />
              <Text style={styles.signOutButtonText}>Çıkış Yap</Text>
            </TouchableOpacity>
          )
        }
      />
    </SafeAreaView>
  );
}

// --- Styles --- (Assuming a dark theme from Pixelhunt reference)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDark || '#121212', // Darker background
  },
  mainScrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.backgroundDark || '#121212',
  },
  messageText: {
    marginTop: theme.spacing.lg,
    fontSize: 17,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    textAlign: 'center',
  },
  loginButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
  },
  loginButtonText: {
    color: theme.colors.primaryForegroundOnDark || theme.colors.backgroundDark, // Dark text on primary
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Profile Header Card
  profileHeaderCard: {
    backgroundColor: theme.colors.cardDark || '#1E1E1E', // Dark card
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  profileHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  profileHeaderAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary, // Yellow background for avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  profileHeaderAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  profileHeaderDefaultAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  profileHeaderAvatarLetter: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primaryForegroundOnDark || theme.colors.backgroundDark,
  },
  profileHeaderTextContainer: {
    flex: 1,
  },
  profileHeaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  profileHeaderDisplayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.textOnDark || '#E0E0E0',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success || '#4CAF50', // Green badge
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.sm,
  },
  verifiedBadgeText: {
    color: theme.colors.background, // White text on green badge
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs / 2,
  },
  profileHeaderUsername: {
    fontSize: 15,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
  },
  profileHeaderMetaRow: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaText: {
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    fontSize: 13,
    marginLeft: theme.spacing.sm,
  },
  editProfileButton: {
    backgroundColor: theme.colors.cardSlightlyLighterDark || '#2A2A2A', // Darker button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderDark || '#333333',
  },
  editProfileButtonText: {
    color: theme.colors.primaryForeground || theme.colors.textOnDark, // Text color for this button
    fontSize: 14,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  // Icon Tabs
  iconTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.cardDark || '#1E1E1E',
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  iconTab: {
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md, // Rounded background for active tab
  },
  activeIconTab: {
    backgroundColor: theme.colors.backgroundDark || '#121212', // Active tab background
  },
  // Tab Content Generic Styles
  tabContentLoadingIndicator: {
    marginVertical: theme.spacing.xl,
  },
  emptyTabText: {
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    textAlign: 'center',
    padding: theme.spacing.lg,
    fontSize: 15,
  },
  contentCard: {
    backgroundColor: theme.colors.cardDark || '#1E1E1E',
    marginHorizontal: HORIZONTAL_PADDING,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  contentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  contentCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textOnDark || '#E0E0E0',
    marginLeft: theme.spacing.sm,
  },
  contentCardSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    marginBottom: theme.spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
      color: theme.colors.error,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
      fontSize: 15,
  },
  retryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
      color: theme.colors.primaryForegroundOnDark || theme.colors.backgroundDark,
      fontWeight: 'bold',
  },
  // MyTestsTab Styles
  testsGrid: {
    // No specific style needed if FlatList handles padding via contentContainerStyle
    // marginHorizontal: -CARD_SPACING_TESTS / 2, // If using padding on parent
  },
  gridTestCard: {
    marginBottom: CARD_SPACING_TESTS,
  },
  // StatsTab Styles
  statsHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.lg,
  },
  statsHighlightItem: {
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundDark || '#121212',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  statsHighlightLabel: {
    fontSize: 13,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    marginBottom: theme.spacing.xs,
  },
  statsHighlightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textOnDark || '#E0E0E0',
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textOnDark || '#E0E0E0',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  gameModeStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDark || '#333333',
  },
  gameModeName: {
    fontSize: 14,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
  },
  gameModeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textOnDark || '#E0E0E0',
  },
  // ActivityTab Styles
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDark || '#333333',
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    marginRight: theme.spacing.sm,
    lineHeight: 20,
  },
  activityDate: {
    fontSize: 12,
    color: theme.colors.textDisabledOnDark || '#757575',
  },
   // AchievementsTab Styles
   achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDark || '#333333',
  },
  achievementTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  achievementName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textOnDark || '#E0E0E0',
  },
  achievementNotEarned: {
    color: theme.colors.textDisabledOnDark || '#757575',
  },
  achievementDescription: {
    fontSize: 12,
    color: theme.colors.textSecondaryOnDark || '#A0A0A0',
    marginTop: theme.spacing.xs / 2,
  },
  achievementPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  totalScoreBadge: {
    backgroundColor: theme.colors.primary, // Yellow badge
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  totalScoreBadgeLabel: {
    fontSize: 14,
    color: theme.colors.primaryForegroundOnDark || theme.colors.backgroundDark,
    marginBottom: theme.spacing.xs,
  },
  totalScoreBadgeValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: theme.colors.primaryForegroundOnDark || theme.colors.backgroundDark,
  },
  // Sign Out Button
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: HORIZONTAL_PADDING,
    marginVertical: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.cardDark || '#1E1E1E',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.errorMutedOnDark || theme.colors.error,
  },
  signOutButtonText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
});
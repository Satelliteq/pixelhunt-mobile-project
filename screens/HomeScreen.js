// HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import TestCard from '../components/TestCard';
import CategoryCard from '../components/CategoryCard';
import {
  onAuthUserChanged,
  fetchTests,
  fetchCategories as fetchCategoriesFromFirebase,
  fetchUserDocument,
  fetchLikedTestIds,
  fetchPlayedTestIds,
  fetchTestsByIds
} from '../config/firebase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const testCardWidth = width * 0.65;
const categoryCardWidth = width * 0.4;
const DEFAULT_TEST_LIMIT = 6;

const TAB_OPTIONS = [
  {
    name: 'Öne Çıkanlar',
    icon: 'trending-up',
    options: { 
      featured: true, 
      isPublic: true,
      approved: true,
      orderByField: 'createdAt', 
      orderDirection: 'desc',
      limit: DEFAULT_TEST_LIMIT
    }
  },
  {
    name: 'Popüler',
    icon: 'star',
    options: { 
      isPublic: true,
      approved: true,
      orderByField: 'playCount', 
      orderDirection: 'desc',
      limit: DEFAULT_TEST_LIMIT
    }
  },
  {
    name: 'Yeni Eklenenler',
    icon: 'clock',
    options: { 
      isPublic: true,
      approved: true,
      orderByField: 'createdAt', 
      orderDirection: 'desc',
      limit: DEFAULT_TEST_LIMIT
    }
  },
];

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testsByTab, setTestsByTab] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState({ 0: true, 1: false, 2: false });
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await fetchUserDocument(firebaseUser.uid);
          if (userDoc && userDoc.displayName) {
            setUserName(userDoc.displayName);
          } else {
            setUserName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı');
          }
        } catch (error) {
          setUserName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı');
        }
      } else {
        setUser(null);
        setUserName('');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const categoriesData = await fetchCategoriesFromFirebase();
      
      if (!categoriesData || !Array.isArray(categoriesData)) {
        setCategories([]);
        return;
      }

      const processedCategories = categoriesData
        .filter(category => category && category.id) // Geçersiz kategorileri filtrele
        .map(category => ({
          id: category.id,
          name: category.name || 'İsimsiz Kategori',
          description: category.description || '',
          iconName: category.iconName || 'folder',
          color: category.color || theme.colors.primary,
          backgroundColor: category.backgroundColor || theme.colors.background,
          active: category.active !== false,
          order: category.order || 0
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0)); // Kategorileri sırala

      setCategories(processedCategories);
    } catch (error) {
      setCategories([]); // Hata durumunda boş array
      Alert.alert(
        'Hata',
        'Kategoriler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [
          {
            text: 'Tekrar Dene',
            onPress: () => fetchCategories()
          },
          {
            text: 'Tamam',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchTestsForTab = useCallback(async (tab) => {
    if (testsByTab[tab]?.length > 0 && !refreshing) return;

    try {
      setLoading(true);
      let tests = [];

      switch (tab) {
        case 'featured':
          tests = await fetchTests({ featured: true, limit: 10 });
          break;
        case 'popular':
          tests = await fetchTests({ orderBy: 'playCount', limit: 10 });
          break;
        case 'recent':
          tests = await fetchTests({ orderBy: 'createdAt', limit: 10 });
          break;
        case 'liked':
          if (user) {
            const likedTestIds = await fetchLikedTestIds(user.uid);
            if (likedTestIds.length > 0) {
              tests = await fetchTestsByIds(likedTestIds);
            }
          }
          break;
        case 'played':
          if (user) {
            const playedTestIds = await fetchPlayedTestIds(user.uid);
            if (playedTestIds.length > 0) {
              tests = await fetchTestsByIds(playedTestIds);
            }
          }
          break;
        default:
          tests = await fetchTests({ limit: 10 });
      }

      setTestsByTab(prev => ({ ...prev, [tab]: tests }));
      setError(null);
    } catch (error) {
      setError('Testler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [testsByTab, user, refreshing]);

  const fetchInitialData = useCallback(async () => {
    if (!isInitialLoad) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Kategorileri ve testleri paralel olarak yükle
      await Promise.all([
        fetchCategories(),
        fetchTestsForTab(0)
      ]);
      
      setIsInitialLoad(false);
    } catch (error) {
      setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      Alert.alert(
        'Hata',
        'Veriler yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [
          {
            text: 'Tekrar Dene',
            onPress: () => fetchInitialData()
          },
          {
            text: 'Tamam',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCategories, fetchTestsForTab, isInitialLoad]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleTabChange = useCallback((index) => {
    setActiveTab(index);
    if (!testsByTab[index] || testsByTab[index].length === 0) {
      fetchTestsForTab(index);
    }
  }, [testsByTab, fetchTestsForTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchTestsForTab(activeTab, true)
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Veriler yenilenirken bir sorun oluştu.');
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, fetchCategories, fetchTestsForTab]);

  const renderTabContent = () => {
    const currentTests = testsByTab[activeTab] || [];
    const isLoading = loadingTabs[activeTab];

    if (isLoading && currentTests.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (!isLoading && currentTests.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Feather name="inbox" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>Bu sekmede henüz test bulunmuyor.</Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {currentTests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            style={{ width: testCardWidth, marginRight: 15 }}
            onPress={() => navigation.navigate('TestDetail', { testId: test.id })}
          />
        ))}
        {/* Yükleniyor ve içerik varsa, sonda küçük bir indicator gösterilebilir */}
        {isLoading && currentTests.length > 0 && (
            <View style={{justifyContent: 'center', alignItems: 'center', width: 50}}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        )}
      </ScrollView>
    );
  };

  const renderCategories = () => {
    if (loadingCategories && categories.length === 0) {
      return (
        <View style={styles.loadingContainerSmall}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }

    if (categories.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Feather name="folder" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>Henüz kategori bulunmuyor.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchCategories}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {categories.slice(0, 5).map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            style={{ width: categoryCardWidth, marginRight: 10 }}
            onPress={() => navigation.navigate('Explore', { 
              categoryId: category.id, 
              categoryName: category.name 
            })}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.logoContainer} onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}
        >
          {user ? (
            <View style={styles.profileCircle}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileInitial}>
                  {userName?.[0]?.toUpperCase() || 'K'}
                </Text>
              )}
            </View>
          ) : (
            <Feather name="log-in" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]} // Android için
            tintColor={theme.colors.primary} // iOS için
          />
        }
      >
        {/* Hero Section */}
        <TouchableOpacity
          style={styles.heroSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Explore')}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Bilginizi Test Edin,</Text>
            <Text style={styles.heroSubtitle}>Yeni Testler Keşfedin!</Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Hemen Başla</Text>
              <Feather name="arrow-right-circle" size={18} color={theme.colors.primary} style={{marginLeft: 8}} />
            </View>
          </View>
          <Image
            source={require('../assets/man-wearing-headphones.png')} // Bu asset'in projenizde olduğundan emin olun
            style={styles.heroImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Testler Bölümü */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderTitleContainer}>
              <Feather name="grid" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Popüler Testler</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Explore', { filter: 'all' })}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBarContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
              {TAB_OPTIONS.map((tab, index) => {
                const isActive = activeTab === index;
                return (
                  <TouchableOpacity
                    key={tab.name}
                    style={[
                      styles.tabBarButton,
                      isActive && styles.tabBarButtonActive,
                    ]}
                    onPress={() => handleTabChange(index)}
                    disabled={loadingTabs[index] && (testsByTab[index]?.length === 0 || !testsByTab[index])} // Yüklenirken tekrar tıklamayı engelle (opsiyonel)
                  >
                    <Feather
                      name={tab.icon}
                      size={16}
                      color={isActive ? theme.colors.primaryForeground : theme.colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[
                      styles.tabBarButtonText,
                      isActive ? styles.tabBarButtonTextActive : styles.tabBarButtonTextInactive,
                    ]}>
                      {tab.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          {renderTabContent()}
        </View>

        {/* Kategoriler Bölümü */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderTitleContainer}>
              <Feather name="layers" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Kategoriler</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Explore', { screenFocus: 'categories' })}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          {renderCategories()}
        </View>

        {/* Bilgi Kutusu / CTA */}
        <TouchableOpacity
            style={styles.infoBox}
            activeOpacity={0.8}
            onPress={() => {
              if (user) {
                navigation.navigate('CreateTest');
              } else {
                Alert.alert("Giriş Gerekli", "Test oluşturmak için lütfen giriş yapın.", [
                  { text: "İptal", style: "cancel" },
                  { text: "Giriş Yap", onPress: () => navigation.navigate('Login') }
                ]);
              }
            }}
        >
           <Image
                source={require('../assets/man-thinking-with-his-index-finger-to-his-face.png')} // Bu asset'in projenizde olduğundan emin olun
                style={styles.infoImage}
                resizeMode="contain"
            />
          <View style={styles.infoContent}>
             <Text style={styles.infoTitle}>Kendi Testini Oluştur!</Text>
             <Text style={styles.infoText}>Bilgini paylaş, topluluğa katkıda bulun.</Text>
          </View>
          <Feather name="edit-3" size={28} color={theme.colors.background} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// Stiller (Sizin sağladığınızla aynı, tema.js'nize göre ayarlanmış olmalı)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logoContainer: {
    padding: theme.spacing.xs,
  },
  logo: {
    width: 150,
    height: 35,
  },
  profileButton: {
    padding: theme.spacing.xs,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primaryForeground, // temanızda tanımlı olmalı
  },
  heroSection: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  heroContent: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  heroTitle: {
    ...(theme.typography?.h2 || { fontSize: 22, fontWeight: 'bold' }), // temanızda tanımlı olmalı
    color: theme.colors.primaryForeground,
  },
  heroSubtitle: {
    ...(theme.typography?.h3 || { fontSize: 18, fontWeight: '600' }), // temanızda tanımlı olmalı
    color: theme.colors.primaryForeground,
    marginBottom: theme.spacing.md,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: theme.colors.black || '#000', // temanızda tanımlı olmalı
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroButtonText: {
    ...(theme.typography?.button || { fontSize: 14, fontWeight: 'bold' }), // temanızda tanımlı olmalı
    color: theme.colors.primary,
  },
  heroImage: {
    width: 100,
    height: 100,
  },
  section: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...(theme.typography?.h3 || { fontSize: 18, fontWeight: 'bold' }),
    color: theme.colors.text,
  },
  seeAllText: {
    ...(theme.typography?.button || { fontSize: 14, fontWeight: '600' }),
    color: theme.colors.primary,
  },
  tabBarContainer: {
    marginBottom: theme.spacing.md,
  },
  tabBarScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  tabBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full, // temanızda tanımlı olmalı
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBarButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabBarButtonText: {
    ...(theme.typography?.button || { fontSize: 14, fontWeight: '600' }),
  },
  tabBarButtonTextActive: {
    color: theme.colors.primaryForeground,
  },
  tabBarButtonTextInactive: {
    color: theme.colors.textSecondary,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainerSmall: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  emptyStateText: {
    ...(theme.typography?.body || { fontSize: 15 }),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  horizontalScrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  retryButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.primaryForeground,
    ...theme.typography.button,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  infoImage: {
    width: 80,
    height: 80,
    marginRight: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...(theme.typography?.h3 || { fontSize: 18, fontWeight: 'bold' }),
    color: theme.colors.secondaryForeground, // temanızda tanımlı olmalı
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    ...(theme.typography?.body || { fontSize: 14 }),
    color: theme.colors.secondaryForeground,
  },
});

export default HomeScreen;
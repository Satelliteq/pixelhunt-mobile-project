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
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import TestCard from '../components/TestCard';
import CategoryCard from '../components/CategoryCard';
import CategoryChip from '../components/CategoryChip';
import {
  onAuthUserChanged,
  fetchTests,
  fetchCategories as fetchCategoriesFromFirebase,
  fetchUserDocument,
} from '../config/firebase';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const testCardWidth = width * 0.40;
const categoryCardWidth = width * 0.3;

const DEFAULT_TEST_LIMIT = 6;

const TAB_OPTIONS = [
  {
    name: 'Öne Çıkanlar',
    icon: 'trending-up',
    options: { 
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
  const [testsBySection, setTestsBySection] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingSections, setLoadingSections] = useState(
    Object.fromEntries(TAB_OPTIONS.map((_, index) => [index, false]))
  );
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

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
          console.error("Error fetching user document:", error);
          setUserName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı');
        }
      } else {
        setUser(null);
        setUserName('');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchCategoriesData = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const categoriesData = await fetchCategoriesFromFirebase();
      if (!categoriesData || !Array.isArray(categoriesData)) {
        setCategories([]);
        return;
      }
      const processedCategories = categoriesData
        .filter(category => category && category.id)
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
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(processedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
      Alert.alert('Hata','Kategoriler yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingCategories(false);
    }
  }, []);
  
  const fetchTestsForSection = useCallback(async (sectionIndex, isRefresh = false) => {
    if (!isRefresh && testsBySection[sectionIndex]?.length > 0) return;
    setLoadingSections(prev => ({ ...prev, [sectionIndex]: true }));
    const sectionConfig = TAB_OPTIONS[sectionIndex];
    if (!sectionConfig || !sectionConfig.options) {
      setTestsBySection(prev => ({ ...prev, [sectionIndex]: [] }));
      setLoadingSections(prev => ({ ...prev, [sectionIndex]: false }));
      return;
    }
    try {
      const tests = await fetchTests(sectionConfig.options);
      setTestsBySection(prev => ({ ...prev, [sectionIndex]: tests || [] }));
    } catch (err) {
      console.error(`Error fetching tests for section ${sectionConfig.name}:`, err);
      setTestsBySection(prev => ({ ...prev, [sectionIndex]: [] }));
    } finally {
      setLoadingSections(prev => ({ ...prev, [sectionIndex]: false }));
    }
  }, [testsBySection, user]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!initialLoading) return;
      setError(null);
      try {
        await Promise.all([
          fetchCategoriesData(),
          ...TAB_OPTIONS.map((_, index) => fetchTestsForSection(index, false))
        ]);
      } catch (err) {
        setError('Veriler yüklenirken bir hata oluştu.');
        Alert.alert('Hata','Veriler yüklenirken bir sorun oluştu.');
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, [initialLoading, fetchCategoriesData, fetchTestsForSection]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        fetchCategoriesData(),
        ...TAB_OPTIONS.map((_, index) => fetchTestsForSection(index, true))
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Veriler yenilenirken bir sorun oluştu.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchCategoriesData, fetchTestsForSection]);

  const renderTestList = (sectionIndex) => {
    const currentTests = testsBySection[sectionIndex] || [];
    const isLoading = loadingSections[sectionIndex];
    const sectionConfig = TAB_OPTIONS[sectionIndex];
    if (isLoading && currentTests.length === 0) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    if (!isLoading && currentTests.length === 0) return <View style={styles.emptyStateContainer}><Feather name={sectionConfig.icon || "inbox"} size={48} color={theme.colors.textSecondary} /><Text style={styles.emptyStateText}>Bu bölümde henüz test bulunmuyor.</Text></View>;
    return (
      <FlatList
        horizontal
        data={currentTests}
        renderItem={({ item }) => (
          <TestCard 
            key={item.id} 
            test={item} 
            style={{ width: testCardWidth, marginRight: 15 }} 
            onPress={() => navigation.navigate('TestDetail', { testId: item.id })}
          />
        )}
        keyExtractor={item => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContent}
        ListFooterComponent={
          isLoading && currentTests.length > 0 ? (
            <View style={{justifyContent: 'center', alignItems: 'center', width: 50, height: 150}}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />
    );
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(selectedCategory?.id === category.id ? null : category);
  };

  const renderCategoriesList = () => {
    if (loadingCategories) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (!categories || categories.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Feather name="folder" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateText}>Henüz kategori bulunmuyor.</Text>
        </View>
      );
    }

    return (
      <FlatList
        horizontal
        data={categories}
        renderItem={({ item }) => (
          <CategoryChip
            key={item.id}
            category={item}
            selected={selectedCategory?.id === item.id}
            onPress={() => handleCategoryPress(item)}
          />
        )}
        keyExtractor={item => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      />
    );
  };

  if (initialLoading && !refreshing) return <SafeAreaView style={[styles.container, styles.centeredFullScreen]} edges={['top']}><ActivityIndicator size="large" color={theme.colors.primary} /><Text style={{color: theme.colors.text, marginTop: theme.spacing.md}}>Yükleniyor...</Text></SafeAreaView>;
  if (error && categories.length === 0 && Object.keys(testsBySection).every(key => !testsBySection[key] || testsBySection[key].length === 0)) return <SafeAreaView style={[styles.container, styles.centeredFullScreen]} edges={['top']}><Feather name="alert-triangle" size={48} color={theme.colors.error} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => setInitialLoading(true)}><Text style={styles.retryButtonText}>Tekrar Dene</Text></TouchableOpacity></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.logoContainer} onPress={() => navigation.navigate('Home')}>
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.topBarActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => { Alert.alert("Bildirimler", "Bu özellik yakında!"); }}>
                <Feather name="bell" size={24} color={theme.colors.text} /> 
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButtonWrapper} onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}>
            {user ? (
                <View style={styles.profileCircle}>
                {user.photoURL ? (<Image source={{ uri: user.photoURL }} style={styles.profileImage} />) : (<Text style={styles.profileInitial}>{userName?.[0]?.toUpperCase() || 'K'}</Text>)}
                </View>
            ) : (
                <View style={styles.profileCircle}><Feather name="user" size={18} color={theme.colors.profileInitialColor || theme.colors.background} /></View>
            )}
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary}/>}>
        
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderTitleContainer}><Feather name="layers" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} /><Text style={styles.sectionTitle}>Kategoriler</Text></View>
            <TouchableOpacity onPress={() => navigation.navigate('Explore', { screenFocus: 'categories' })}><Text style={styles.seeAllText}>Tümünü gör →</Text></TouchableOpacity>
          </View>
          {renderCategoriesList()}
        </View>

        <TouchableOpacity style={styles.heroSection} activeOpacity={0.8} onPress={() => navigation.navigate('Explore')}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitleMajor}>Bilginizi Test Edin,</Text>
            <Text style={styles.heroTitleMinor}>Yeni Testler Keşfedin</Text>
          </View>
          <Image source={require('../assets/man-wearing-headphones.png')} style={styles.heroImage} resizeMode="contain"/>
        </TouchableOpacity>

        {TAB_OPTIONS.map((section, index) => (
          <View key={section.name} style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionHeaderTitleContainer}><Feather name={section.icon} size={20} color={theme.colors.primary} style={{ marginRight: 8 }} /><Text style={styles.sectionTitle}>{section.name}</Text></View>
              <TouchableOpacity onPress={() => navigation.navigate('Explore', { filter: section.name.toLowerCase().replace(/\s+/g, '_'), title: section.name })}><Text style={styles.seeAllText}>Tümünü gör →</Text></TouchableOpacity>
            </View>
            {renderTestList(index)}
          </View>
        ))}
        
        <TouchableOpacity style={styles.infoBox} activeOpacity={0.8} onPress={() => {
          if (user) {
            navigation.navigate('CreateTest');
          } else {
            Alert.alert("Giriş Gerekli", "Test oluşturmak için lütfen giriş yapın.", [
              { text: "İptal", style: "cancel" },
              { text: "Giriş Yap", onPress: () => navigation.navigate('Login') }
            ]);
          }
        }}>
          <Image source={require('../assets/man-thinking-with-his-index-finger-to-his-face.png')} style={styles.infoImage} resizeMode="contain"/>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitleMajor}>Görsellerle Düşün,</Text>
            <Text style={styles.infoTitleMinor}>Gördükçe Hafızanı{"\n"}Güçlendir.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centeredFullScreen: { justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontFamily: 'Outfit_500Medium', color: theme.colors.error, textAlign: 'center', marginVertical: theme.spacing.md },
  scrollContainer: { paddingBottom: theme.spacing.xxl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: '#000' },
  logoContainer: {},
  logo: { width: 150, height: 30 },
  topBarActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: theme.spacing.sm, marginRight: theme.spacing.xs },
  profileButtonWrapper: { padding: theme.spacing.xs },
  profileCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profileInitial: { fontSize: 16, fontFamily: 'Outfit_700Bold', color: theme.colors.profileInitialColor || theme.colors.background },
  
  heroSection: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 140,
  },
  heroContent: {
    flex: 1,
    paddingRight: 16,
    justifyContent: 'center',
  },
  heroTitleMajor: {
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    color: '#F9C406',
    marginBottom: 0,
    lineHeight: 30,
  },
  heroTitleMinor: {
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 30,
  },
  heroImage: {
    width: 160,
    height: 160,
    marginLeft: 8,
    alignSelf: 'center',
  },
  
  section: { marginTop: theme.spacing.lg },
  sectionHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm },
  sectionHeaderTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontFamily: 'Outfit_700Bold', color: '#fff' },
  seeAllText: { fontSize: 14, fontFamily: 'Outfit_500Medium', color: '#F9C406', fontWeight: 'bold' },
  
  horizontalScrollContent: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.sm },
  loadingContainer: { height: 180, justifyContent: 'center', alignItems: 'center', width: width - (theme.spacing.md * 2) },
  loadingContainerSmall: { height: 100, justifyContent: 'center', alignItems: 'center' },
  emptyStateContainer: { minHeight: 150, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md },
  emptyStateText: { fontSize: 15, fontFamily: 'Outfit_400Regular', color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.sm },
  retryButton: { marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md },
  retryButtonText: { color: theme.colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 15 },
  
  infoBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 32,
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  infoImage: {
    width: 150,
    height: 150,
    marginRight: 20,
    alignSelf: 'center',
  },
  infoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  infoTitleMajor: {
    fontSize: 26, 
    fontFamily: 'Outfit_700Bold',
    color: '#F9C406',
    marginBottom: 0,
    lineHeight: 28,
  },
  infoTitleMinor: {
    fontSize: 26,
    fontFamily: 'Outfit_700Bold',
    color: '#fff',
    lineHeight: 28,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoriesSection: {
    marginBottom: 20,
  },
});

export default HomeScreen;
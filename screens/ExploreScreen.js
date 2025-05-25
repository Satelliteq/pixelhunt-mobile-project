// ExploreScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Keyboard,
  Platform,
  Image, // Image'i import etmeyi unutmuşuz CustomHeader için
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme'; // Tema dosyanız
import TestCard from '../components/TestCard';
import CategoryCard from '../components/CategoryCard'; // CategoryChip yerine CategoryCard'ı import ediyoruz
import { fetchTests, fetchCategories, onAuthUserChanged, fetchUserDocument } from '../config/firebase'; // Firebase fonksiyonları
import { useNavigation, useRoute } from '@react-navigation/native';

const NUM_COLUMNS = 2;
const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const ITEM_SPACING = 12;

const ExploreScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');

  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await fetchUserDocument(firebaseUser.uid);
          if (userDoc && userDoc.displayName) {
            setUserName(userDoc.displayName);
          } else {
            setUserName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'K'); // Varsayılan olarak 'K'
          }
        } catch (error) {
          setUserName(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'K');
        }
      } else {
        setUser(null);
        setUserName('');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchScreenData = useCallback(async (isRefreshing = false, params = {}) => {
    if (!isRefreshing && !loadingMore && tests.length === 0) setLoading(true);
    setError(null);

    try {
      const fetchPromises = [];
      if (isRefreshing || categories.length === 0) {
        fetchPromises.push(fetchCategories());
      } else {
        fetchPromises.push(Promise.resolve(categories));
      }

      let testFetchOptions = {
        limit: 10,
        isPublic: true,
        approved: true,
        orderByField: 'createdAt',
        orderDirection: 'desc',
        ...params,
      };
      
      if (params.searchQuery !== undefined) {
        testFetchOptions.searchQuery = params.searchQuery;
        if(params.categoryId === undefined) testFetchOptions.categoryId = null;
      } else if (params.categoryId !== undefined) {
         testFetchOptions.categoryId = params.categoryId;
         if(params.searchQuery === undefined) testFetchOptions.searchQuery = null;
      } else if (submittedSearchQuery) {
        testFetchOptions.searchQuery = submittedSearchQuery;
        testFetchOptions.categoryId = null;
      } else if (selectedCategory) {
        testFetchOptions.categoryId = selectedCategory.id;
        testFetchOptions.searchQuery = null;
      }

      fetchPromises.push(fetchTests(testFetchOptions));
      
      const [fetchedCategories, fetchedTestsResult] = await Promise.all(fetchPromises);

      if (fetchedCategories && Array.isArray(fetchedCategories)) {
        setCategories(
          fetchedCategories.sort((a, b) => (a.order || 0) - (b.order || 0))
        );
      }
      if (fetchedTestsResult) {
        setTests(fetchedTestsResult);
      }
      
      if (!isRefreshing && route.params?.categoryId && fetchedCategories) {
        const categoryFromRoute = fetchedCategories.find(cat => cat.id === route.params.categoryId);
        if (categoryFromRoute && (!selectedCategory || selectedCategory.id !== categoryFromRoute.id)) {
          setSearchQuery('');
          setSubmittedSearchQuery('');
          setSelectedCategory(categoryFromRoute); 
        }
        navigation.setParams({ categoryId: null, categoryName: null });
      }
    } catch (err) {
      setError('İçerik yüklenirken bir sorun oluştu: ' + (err.message || 'Bilinmeyen hata'));
      setTests([]);
    } finally {
      if (!isRefreshing && !loadingMore) setLoading(false);
      setRefreshing(false);
    }
  }, [categories.length, selectedCategory, submittedSearchQuery, route.params?.categoryId, navigation, loadingMore, tests.length]);

  useEffect(() => {
    fetchScreenData(false);
  }, []); 

  useEffect(() => {
    if(!loading && (selectedCategory || submittedSearchQuery || (!selectedCategory && !submittedSearchQuery && tests.length > 0 && searchQuery === ''))){
        fetchScreenData(false, { 
            categoryId: selectedCategory?.id, 
            searchQuery: submittedSearchQuery 
        });
    } else if (!loading && !selectedCategory && !submittedSearchQuery && tests.length === 0 && searchQuery === '') {
      // Hiçbir filtre yok ve test yoksa, başlangıç verilerini tekrar çek
      fetchScreenData(false);
    }
  }, [selectedCategory, submittedSearchQuery, searchQuery]);


  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery === submittedSearchQuery && (selectedCategory === null || trimmedQuery !== '')) return; 
    
    setSubmittedSearchQuery(trimmedQuery);
    if (trimmedQuery) setSelectedCategory(null); 
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSubmittedSearchQuery('');
  };

  const handleCategorySelect = (category) => {
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
      setSearchQuery(''); 
      setSubmittedSearchQuery(''); 
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScreenData(true);
  };

  const handleSearchPress = () => {
    navigation.navigate('Search', {
      initialQuery: searchQuery,
      onSearch: (query) => {
        setSearchQuery(query);
        setSubmittedSearchQuery(query);
      }
    });
  };

  const renderTestItem = ({ item, index }) => {
    const cardWidth = (width - HORIZONTAL_PADDING * 2 - ITEM_SPACING ) / NUM_COLUMNS;
    return (
      <TestCard
        test={item}
        onPress={() => navigation.navigate('TestDetail', { testId: item.id })}
        style={[
          styles.testCard,
          { width: cardWidth },
          (index % NUM_COLUMNS !== NUM_COLUMNS - 1) && { marginRight: ITEM_SPACING }
        ]}
        // isCompact // TestCard'ınız bu prop'u destekliyorsa
      />
    );
  };
  
  const CustomHeader = () => (
    <View style={styles.customHeaderContainer}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Feather name="arrow-left" size={28} color="#fff" />
      </TouchableOpacity>
      <View style={{flex:1}} />
      <View style={styles.topBarActions}>
      <TouchableOpacity
          style={styles.profileButtonWrapper}
        onPress={() => navigation.navigate(user ? 'Profile' : 'Login')}
      >
        {user && user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
        ) : (
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitial}>{userName?.[0]?.toUpperCase() || 'K'}</Text>
          </View>
        )}
      </TouchableOpacity>
      </View>
    </View>
  );

  const ListHeaderContent = (
    <>
      <Text style={styles.screenTitle}>Keşfet</Text>
      <View style={styles.searchSection}>
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <Feather name="search" size={20} color="#b3b3b3" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Ara...</Text>
            </TouchableOpacity>
      </View>
      {categories.length > 0 && (
        <>
          <View style={styles.sectionTitleRow}>
            <Feather name="layers" size={20} color={theme.colors.primary} /* Sarı ikon */ style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitle}>Kategorilere Göre Keşfet</Text>
          </View>
          <View style={styles.categoriesWrapContainer}>
            {categories.map((item) => (
              <View key={item.id} style={styles.categoryItemWrapper}>
                <CategoryCard
                  category={item}
                  onPress={() => handleCategorySelect(item)}
                  isSelected={selectedCategory?.id === item.id}
                />
              </View>
            ))}
          </View>
        </>
      )}
      <View style={[styles.sectionTitleRow, { marginTop: categories.length > 0 ? theme.spacing.lg : theme.spacing.sm }]}>
        <Feather name="package" size={20} color={theme.colors.primary} /* Sarı ikon */ style={styles.sectionTitleIcon} />
        <Text style={styles.sectionTitle}>Tüm Testler</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomHeader />
      <FlatList
        ListHeaderComponent={ListHeaderContent}
        data={tests}
        renderItem={renderTestItem}
        keyExtractor={item => item.id.toString()}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading && !refreshing ? (
            <View style={styles.emptyContainer}>
              <Feather name={error ? "alert-circle" : "search"} size={50} color={error ? theme.colors.error : theme.colors.textDisabled} />
              <Text style={styles.emptyText}>
                {error ? "Bir Hata Oluştu" : "Sonuç Bulunamadı"}
              </Text>
              <Text style={styles.emptySubText}>
                {error ? error : 
                  selectedCategory 
                  ? `"${selectedCategory.name}" kategorisinde test bulunamadı.`
                  : submittedSearchQuery 
                  ? `"${submittedSearchQuery}" için sonuç bulunamadı.`
                  : "Henüz hiç test yok."}
              </Text>
              {error && (
                 <TouchableOpacity style={styles.retryButton} onPress={() => fetchScreenData(false)}>
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
              )}
            </View>
          ) :  <View style={styles.fullScreenCentered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  customHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? theme.spacing.sm : theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    backgroundColor: '#000',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButtonWrapper: {
    padding: theme.spacing.xs,
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileInitial: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: theme.colors.background,
  },
  screenTitle: {
    fontSize: 30,
    fontFamily: 'Outfit_700Bold',
    color: '#fff',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  searchSection: {
    marginBottom: theme.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101010',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#b3b3b3',
    fontFamily: 'Outfit_400Regular',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleIcon: {
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18, // Biraz daha küçük olabilir
    fontFamily: 'Outfit_700Bold',
    color: '#fff', // Beyaz
  },
  categoriesWrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.sm,
    marginHorizontal: -4,
  },
  categoryItemWrapper: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  listContentContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  testCard: {
    // marginBottom: ITEM_SPACING, // FlatList'in columnWrapperStyle ile daha iyi yönetilebilir
  },
  fullScreenCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    minHeight: Dimensions.get('window').height * 0.4, // Yüksekliği biraz azaltıldı
  },
  emptyText: {
    marginTop: theme.spacing.lg,
    fontSize: 18, // Biraz daha küçük
    fontFamily: 'Outfit_600SemiBold', // SemiBold
    color: '#fff',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: theme.spacing.sm,
    fontSize: 14, // Biraz daha küçük
    color: '#b3b3b3',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Outfit_400Regular',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.background,
    fontSize: 15, // Biraz daha küçük
    fontFamily: 'Outfit_600SemiBold',
  },
});

export default ExploreScreen;
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import TestCard from '../components/TestCard'; // Assuming this can handle grid styling
import CategoryChip from '../components/CategoryChip'; // Assuming this is styled appropriately
import { fetchTests, fetchCategories } from '../config/firebase';
import { useNavigation, useRoute } from '@react-navigation/native';

const NUM_COLUMNS = 2;
const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = theme.spacing.md;
const ITEM_SPACING = theme.spacing.sm;

const ExploreScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState(''); // To track submitted search
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // For pagination if implemented
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // const [lastVisibleTest, setLastVisibleTest] = useState(null); // For pagination

  const navigation = useNavigation();
  const route = useRoute();

  const fetchScreenData = useCallback(async (isRefreshing = false, params = {}) => {
    if (!isRefreshing) setLoading(true);
    setError(null);

    try {
      const fetchPromises = [];
      // Fetch categories only if they haven't been fetched or on full refresh
      if (isRefreshing || categories.length === 0) {
        fetchPromises.push(fetchCategories());
      } else {
        fetchPromises.push(Promise.resolve(categories)); // Use existing categories
      }

      // Determine test fetch options
      let testFetchOptions = {
        limit: 10, // Initial load limit
        isPublic: true, // Example: only public tests
        approved: true, // Example: only approved tests
        orderByField: 'createdAt',
        orderDirection: 'desc',
        ...params, // Params from search or category
      };
      
      if (selectedCategory && !params.searchQuery) { // If category selected and not overridden by a new search
        testFetchOptions.categoryId = selectedCategory.id;
      } else if (submittedSearchQuery && !params.categoryId) { // If search submitted and not overridden by new category
        testFetchOptions.searchQuery = submittedSearchQuery;
      }


      fetchPromises.push(fetchTests(testFetchOptions));

      const [fetchedCategories, fetchedTests] = await Promise.all(fetchPromises);

      if (fetchedCategories) setCategories(fetchedCategories);
      if (fetchedTests) {
        setTests(fetchedTests);
        // if (fetchedTests.length > 0) {
        //   setLastVisibleTest(fetchedTests[fetchedTests.length - 1]); // For pagination
        // } else {
        //   setLastVisibleTest(null);
        // }
      }
      
      // Handle category deep link from route params
      if (!isRefreshing && route.params?.categoryId && fetchedCategories) {
        const categoryFromRoute = fetchedCategories.find(cat => cat.id === route.params.categoryId);
        if (categoryFromRoute && (!selectedCategory || selectedCategory.id !== categoryFromRoute.id)) {
          // Avoid infinite loop by checking if it's already selected
          // Clear search query if navigating via category link
          setSearchQuery('');
          setSubmittedSearchQuery('');
          setSelectedCategory(categoryFromRoute);
          // Trigger a re-fetch for this category specifically (handled by useEffect on selectedCategory)
        }
         // Clear route params after processing to prevent re-triggering
        navigation.setParams({ categoryId: null });
      }

    } catch (err) {
      console.error('ExploreScreen: Veri yüklenirken hata:', err);
      setError('İçerik yüklenirken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin.');
      setTests([]); // Clear tests on error
    } finally {
      if (!isRefreshing) setLoading(false);
      setRefreshing(false);
    }
  }, [categories, selectedCategory, submittedSearchQuery, route.params?.categoryId, navigation]);


  useEffect(() => {
    fetchScreenData(false); // Initial fetch
  }, []); // Empty dependency array for initial load

 useEffect(() => {
    // Refetch tests when selectedCategory or submittedSearchQuery changes,
    // but not on initial mount (that's handled by the first useEffect)
    if (selectedCategory || submittedSearchQuery) {
        // Don't refetch if loading is already true from initial load or another action
        if (!loading) {
             fetchScreenData(false, { 
                categoryId: selectedCategory?.id, 
                searchQuery: submittedSearchQuery 
            });
        }
    } else if (!loading && !selectedCategory && !submittedSearchQuery && tests.length === 0) {
        // If everything is cleared and no tests, fetch initial data again
        fetchScreenData(false);
    }
}, [selectedCategory, submittedSearchQuery]);


  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    if (searchQuery.trim() === submittedSearchQuery) return; // No change
    
    setSubmittedSearchQuery(searchQuery.trim());
    setSelectedCategory(null); // Clear category when searching
    // Data fetching will be triggered by useEffect watching submittedSearchQuery
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSubmittedSearchQuery('');
    // Fetch initial data or data for selectedCategory if any
    // fetchScreenData(false, { categoryId: selectedCategory?.id }); // useEffect will handle this
  };

  const handleCategorySelect = (category) => {
    if (selectedCategory?.id === category.id) { // Deselect if same category is tapped
      setSelectedCategory(null);
      // fetchScreenData(false, { searchQuery: submittedSearchQuery }); // Fetch based on search or initial
    } else {
      setSelectedCategory(category);
      setSearchQuery(''); // Clear search text field
      setSubmittedSearchQuery(''); // Clear submitted search
    }
    // Data fetching will be triggered by useEffect watching selectedCategory
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScreenData(true, { // Pass current filters for refresh
        categoryId: selectedCategory?.id,
        searchQuery: submittedSearchQuery
    });
  };

  // const loadMoreTests = async () => {
  //   if (loadingMore || !lastVisibleTest) return;
  //   setLoadingMore(true);
  //   try {
  //     let fetchOptions = { limit: 10, startAfter: lastVisibleTest, isPublic: true, approved: true };
  //     if (selectedCategory) fetchOptions.categoryId = selectedCategory.id;
  //     if (submittedSearchQuery) fetchOptions.searchQuery = submittedSearchQuery;
      
  //     const newTests = await fetchTests(fetchOptions);
  //     if (newTests.length > 0) {
  //       setTests(prevTests => [...prevTests, ...newTests]);
  //       setLastVisibleTest(newTests[newTests.length - 1]);
  //     } else {
  //       setLastVisibleTest(null); // No more tests to load
  //     }
  //   } catch (err) {
  //     console.error('ExploreScreen: Daha fazla test yüklenirken hata:', err);
  //     // Optionally set an error for "load more"
  //   } finally {
  //     setLoadingMore(false);
  //   }
  // };

  const renderTestItem = ({ item, index }) => {
    const cardWidth = (width - HORIZONTAL_PADDING * 2 - ITEM_SPACING * (NUM_COLUMNS -1)) / NUM_COLUMNS;
    return (
      <TestCard
        test={item}
        onPress={() => navigation.navigate('TestDetail', { testId: item.id })}
        style={[
          styles.testCard,
          { width: cardWidth },
          (index % NUM_COLUMNS !== NUM_COLUMNS - 1) && { marginRight: ITEM_SPACING }
        ]}
      />
    );
  };

  const ListHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Keşfet</Text>
        {/* Optional: Add filter or sort icon here */}
      </View>
      
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={22} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Testlerde veya kategorilerde ara..."
            placeholderTextColor={theme.colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
              <Feather name="x-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      {categories.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Kategoriler</Text>
          <FlatList
            horizontal
            data={categories}
            renderItem={({ item }) => (
              <CategoryChip
                key={item.id}
                category={item}
                selected={selectedCategory?.id === item.id}
                onPress={() => handleCategorySelect(item)}
                style={styles.categoryChip}
              />
            )}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesListContainer}
          />
        </View>
      )}
       <Text style={styles.sectionTitle}>
        {selectedCategory ? `${selectedCategory.name} Testleri` : submittedSearchQuery ? `"${submittedSearchQuery}" için Sonuçlar` : "Popüler Testler"}
      </Text>
    </>
  );

  if (loading && tests.length === 0 && !refreshing) { // Show full screen loader only on initial hard load
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {ListHeader} {/* Show header even when loading */}
        <View style={styles.fullScreenCentered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>İçerik Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        ListHeaderComponent={ListHeader}
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
          !loading && !refreshing ? ( // Don't show empty if it's currently loading
            <View style={styles.emptyContainer}>
              <Feather name={error ? "alert-triangle" : "search"} size={50} color={error ? theme.colors.error : theme.colors.textDisabled} />
              <Text style={styles.emptyText}>
                {error ? "Bir Hata Oluştu" : "Sonuç Bulunamadı"}
              </Text>
              <Text style={styles.emptySubText}>
                {error ? error : 
                  selectedCategory 
                  ? `"${selectedCategory.name}" kategorisinde henüz test bulunmuyor.`
                  : submittedSearchQuery 
                  ? `"${submittedSearchQuery}" için arama sonucu bulunamadı.`
                  : "Görünüşe göre burada henüz hiç test yok."}
              </Text>
              {error && (
                 <TouchableOpacity style={styles.retryButton} onPress={() => fetchScreenData(false)}>
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        // onEndReached={loadMoreTests} // Uncomment for pagination
        // onEndReachedThreshold={0.5}   // Uncomment for pagination
        // ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={theme.colors.primary} /> : null} // Uncomment for pagination
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  fullScreenCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.md, // SafeAreaView handles top edge
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  searchSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg, // More rounded
    paddingHorizontal: theme.spacing.md,
    height: 50, // Fixed height for search bar
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    height: '100%',
  },
  clearSearchButton: {
    padding: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  categoriesListContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: theme.spacing.sm, // Space after categories before next section title
  },
  categoryChip: {
    marginRight: theme.spacing.sm, // Spacing between chips
  },
  listContentContainer: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: theme.spacing.xxl,
  },
  testCard: {
    marginBottom: ITEM_SPACING, // Vertical spacing between rows
    // width is calculated dynamically
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    minHeight: Dimensions.get('window').height / 2, // Ensure it takes up some space
  },
  emptyText: {
    marginTop: theme.spacing.lg,
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.primaryForeground,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ExploreScreen;
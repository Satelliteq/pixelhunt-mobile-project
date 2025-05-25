import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import TestCard from '../components/TestCard';
import { fetchTests } from '../config/firebase';

const SearchScreen = ({ route, navigation }) => {
  const [searchQuery, setSearchQuery] = useState(route.params?.initialQuery || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await fetchTests({
        searchQuery: query,
        limit: 20,
        isPublic: true,
        approved: true,
      });
      setResults(searchResults);
    } catch (err) {
      setError('Arama yapılırken bir hata oluştu');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  }, [searchQuery]);

  const handleSubmit = () => {
    Keyboard.dismiss();
    if (route.params?.onSearch) {
      route.params.onSearch(searchQuery);
    }
    navigation.goBack();
  };

  const renderTestItem = ({ item }) => (
    <TestCard
      test={item}
      onPress={() => navigation.navigate('TestDetail', { testId: item.id })}
      style={styles.testCard}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#b3b3b3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara..."
            placeholderTextColor="#b3b3b3"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Feather name="x" size={18} color="#b3b3b3" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={results}
        renderItem={renderTestItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Feather 
                name={error ? "alert-circle" : "search"} 
                size={50} 
                color={error ? theme.colors.error : theme.colors.textDisabled} 
              />
              <Text style={styles.emptyText}>
                {error ? "Bir Hata Oluştu" : "Sonuç Bulunamadı"}
              </Text>
              <Text style={styles.emptySubText}>
                {error ? error : `"${searchQuery}" için sonuç bulunamadı.`}
              </Text>
            </View>
          ) : null
        }
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backButton: {
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Outfit_400Regular',
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  listContent: {
    padding: 16,
  },
  testCard: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    minHeight: 300,
  },
  emptyText: {
    marginTop: theme.spacing.lg,
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: '#b3b3b3',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Outfit_400Regular',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

export default SearchScreen; 
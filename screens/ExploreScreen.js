import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { supabase } from '../config/supabase';
import TestCard from '../components/TestCard';
import CategoryCard from '../components/CategoryCard';
import ProfileAvatar from '../components/ProfileAvatar';

const ExploreScreen = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(route.params?.category);
  const [activeFilter, setActiveFilter] = useState('popular'); // popular, new, trending
  const [user, setUser] = useState(null);

  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    fetchUser();
    fetchData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
  };

  const fetchData = async () => {
    try {
      // Kategorileri getir
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Testleri getir
      let query = supabase
        .from('tests')
        .select('*')
        .eq('published', true);

      if (selectedCategory) {
        const category = categoriesData.find(cat => cat.name === selectedCategory);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      switch (activeFilter) {
        case 'popular':
          query = query.order('play_count', { ascending: false });
          break;
        case 'new':
          query = query.order('created_at', { ascending: false });
          break;
        case 'trending':
          query = query.order('like_count', { ascending: false });
          break;
      }

      const { data: testsData, error: testsError } = await query.limit(20);

      if (testsError) throw testsError;
      setTests(testsData);

    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const { data, error } = await supabase
          .from('tests')
          .select('*')
          .ilike('title', `%${query}%`)
          .limit(10);

        if (error) throw error;
        setTests(data);
      } catch (error) {
        console.error('Arama hatası:', error);
      }
    } else {
      fetchData();
    }
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    fetchData();
  };

  // Testleri grid olarak 2 sütunlu göstermek için yardımcı fonksiyon
  const getGridData = (data, columns = 2) => {
    const grid = [];
    for (let i = 0; i < data.length; i += columns) {
      grid.push(data.slice(i, i + columns));
    }
    return grid;
  };

  // Testleri kategorilere göre ayır (örnek: editör, popüler, yeni)
  const editorTests = tests.slice(0, 4);
  const popularTests = tests.slice(4, 8);
  const newTests = tests.slice(8, 12);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Feather name="loader" size={32} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={26} color={'#fff'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kesfet</Text>
        <ProfileAvatar user={user} size={36} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={'#888'} style={{ marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={'#888'}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Feather name="filter" size={22} color={'#F9C406'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}><Feather name="layers" size={18} color="#F9C406" />  Kategoriler</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.name}
              count={category.count}
              onPress={() => navigation.navigate('Explore', { category: category.name })}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Editörün Seçimi</Text>
        <View style={styles.testGrid}>
          {getGridData(editorTests).map((row, rowIdx) => (
            <View style={styles.testGridRow} key={rowIdx}>
              {row.map((test, i) => (
                <TestCard
                  key={test.id}
                  id={test.id}
                  title={test.title}
                  category={test.category_id}
                  plays={test.play_count}
                  comments={test.comment_count}
                  likes={test.like_count}
                  description={test.description}
                  imageUri={test.thumbnail}
                  onPress={() => navigation.navigate('Game', { testId: test.id })}
                  style={[styles.testCard, i === 1 && { marginRight: 0 }]}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Popüler</Text>
        <View style={styles.testGrid}>
          {getGridData(popularTests).map((row, rowIdx) => (
            <View style={styles.testGridRow} key={rowIdx}>
              {row.map((test, i) => (
                <TestCard
                  key={test.id}
                  id={test.id}
                  title={test.title}
                  category={test.category_id}
                  plays={test.play_count}
                  comments={test.comment_count}
                  likes={test.like_count}
                  description={test.description}
                  imageUri={test.thumbnail}
                  onPress={() => navigation.navigate('Game', { testId: test.id })}
                  style={[styles.testCard, i === 1 && { marginRight: 0 }]}
                />
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Yeni Eklenenler</Text>
        <View style={styles.testGrid}>
          {getGridData(newTests).map((row, rowIdx) => (
            <View style={styles.testGridRow} key={rowIdx}>
              {row.map((test, i) => (
                <TestCard
                  key={test.id}
                  id={test.id}
                  title={test.title}
                  category={test.category_id}
                  plays={test.play_count}
                  comments={test.comment_count}
                  likes={test.like_count}
                  description={test.description}
                  imageUri={test.thumbnail}
                  onPress={() => navigation.navigate('Game', { testId: test.id })}
                  style={[styles.testCard, i === 1 && { marginRight: 0 }]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginLeft: -36,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 44,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  filterBtn: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F9C406',
  },
  content: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryScroll: {
    paddingLeft: 16,
    marginBottom: 12,
  },
  testGrid: {
    paddingHorizontal: 8,
    marginTop: 0,
  },
  testGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  testCard: {
    flex: 1,
    marginRight: 8,
    minWidth: 150,
    maxWidth: '48%',
  },
});

export default ExploreScreen; 
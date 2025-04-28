import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { theme } from '../theme';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { signOut } from '../config/supabase';
import TestCard from '../components/TestCard';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [userTests, setUserTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created'); // created, played, liked

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Kullanıcı bilgilerini getir
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setUser(currentUser);

      // Kullanıcının oluşturduğu testleri getir
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .eq('creator_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;
      setUserTests(testsData);

    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    try {
      let query = supabase.from('tests');
      
      switch (tab) {
        case 'created':
          query = query.select('*').eq('creator_id', user.id);
          break;
        case 'played':
          // Oynanan testleri getir
          const { data: playedTests } = await supabase
            .from('game_scores')
            .select('test_id')
            .eq('user_id', user.id);
          
          const testIds = playedTests.map(score => score.test_id);
          query = query.select('*').in('id', testIds);
          break;
        case 'liked':
          // Beğenilen testleri getir
          const { data: likedTests } = await supabase
            .from('test_likes')
            .select('test_id')
            .eq('user_id', user.id);
          
          const likedTestIds = likedTests.map(like => like.test_id);
          query = query.select('*').in('id', likedTestIds);
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setUserTests(data);

    } catch (error) {
      console.error('Test verileri çekilirken hata:', error);
    }
  };

  // Testleri grid olarak 2 sütunlu göstermek için yardımcı fonksiyon
  const getGridData = (data, columns = 2) => {
    const grid = [];
    for (let i = 0; i < data.length; i += columns) {
      grid.push(data.slice(i, i + columns));
    }
    return grid;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Feather name="loader" size={32} color={theme.colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={'#fff'} />
        </TouchableOpacity>
        <Text style={styles.title}>Profil</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Feather name="settings" size={24} color={'#FFD600'} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <Feather name="user" size={80} color={'#FFD600'} />
          )}
        </View>
        <Text style={styles.name}>{user?.user_metadata?.full_name || 'Kullanıcı'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userTests.length}</Text>
            <Text style={styles.statLabel}>Test</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Sıralama</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'created' && styles.activeTab]}
          onPress={() => handleTabChange('created')}
        >
          <Feather name="edit" size={20} color={activeTab === 'created' ? '#FFD600' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'played' && styles.activeTab]}
          onPress={() => handleTabChange('played')}
        >
          <Feather name="play" size={20} color={activeTab === 'played' ? '#FFD600' : '#fff'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
          onPress={() => handleTabChange('liked')}
        >
          <Feather name="heart" size={20} color={activeTab === 'liked' ? '#FFD600' : '#fff'} />
        </TouchableOpacity>
      </View>

      <View style={styles.testGrid}>
        {getGridData(userTests).map((row, rowIdx) => (
          <View style={styles.testGridRow} key={rowIdx}>
            {row.map((test) => (
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
                style={styles.testCard}
              />
            ))}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Feather name="log-out" size={20} color={'#FFD600'} />
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#FFD600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    color: '#FFD600',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFD600',
  },
  testGrid: {
    paddingHorizontal: 16,
    marginTop: 16,
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 24,
    padding: 12,
    backgroundColor: '#181818',
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    color: '#FFD600',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
}); 
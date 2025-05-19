// PlayScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons'; // Feather da eklendi
import { theme } from '../theme';
import TestCardHorizontal from '../components/TestCardHorizontal'; // Yeni bir bileşen önerisi
import {
  onAuthUserChanged,
  fetchTests,
  // fetchUserProgress (kullanıcının ilerlemesini tutan bir fonksiyon, firebase.js'e eklenebilir)
  // fetchRecommendedTests (öneri algoritması gerektirir, şimdilik genel testler)
} from '../config/firebase';

const PlayScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [recentTests, setRecentTests] = useState([]); // Kullanıcının son oynadığı veya devam ettiği testler
  const [recommendedTests, setRecommendedTests] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthUserChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        loadData(firebaseUser.uid);
      } else {
        // Kullanıcı yoksa verileri temizle
        setRecentTests([]);
        setRecommendedTests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async (userId, isRefresh = false) => {
    if (!isRefresh) {
        setLoadingRecent(true);
        setLoadingRecommended(true);
    }

    try {
      // Devam Eden Testler (Örnek: Kullanıcının son oynadığı ve %100 bitmemiş testler)
      // Bu kısım için Firestore'da 'user_test_progress' gibi bir koleksiyon ve
      // 'fetchUserProgress' fonksiyonu gerekecektir. Şimdilik rastgele "yeni" testler çekiyoruz.
      const recentOptions = { orderByField: 'last_played_at', orderDirection: 'desc', limit: 3 /*, userId: userId, completed: false */ };
      // const fetchedRecent = await fetchUserProgress(recentOptions); // İdeal fonksiyon
      const fetchedRecentFallback = await fetchTests({ orderByField: 'created_at', orderDirection: 'desc', limit: 3 });
      setRecentTests(fetchedRecentFallback); // Veya fetchedRecent

      // Önerilen Testler (Örnek: Popüler testler)
      const recommendedOptions = { orderByField: 'play_count', orderDirection: 'desc', limit: 5 };
      const fetchedRecommended = await fetchTests(recommendedOptions);
      setRecommendedTests(fetchedRecommended);

    } catch (error) {
      console.error("PlayScreen veri yükleme hatası:", error);
    } finally {
      if (!isRefresh) {
        setLoadingRecent(false);
        setLoadingRecommended(false);
      }
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (user) {
        loadData(user.uid, true);
    } else {
        setRefreshing(false); // Kullanıcı yoksa yenileme yapma
    }
  }, [user]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length > 0) {
      navigation.navigate('Explore', { searchQuery: searchQuery.trim() });
    }
  };

  // Rastgele bir test bulup oyuna başlatma (Bu fonksiyon firebase.js'e eklenebilir)
  const handleQuickStart = async () => {
    try {
        // Basit bir yöntem: Onaylanmış ve public olan testlerden rastgele bir tane seç
        // Daha gelişmişi: Firestore'da rastgele doküman çekme yöntemleri (count + offset veya özel alan)
        const testsSnapshot = await fetchTests({ limit: 50 }); // Son 50 testi al
        if (testsSnapshot.length > 0) {
            const randomIndex = Math.floor(Math.random() * testsSnapshot.length);
            const randomTest = testsSnapshot[randomIndex];
            navigation.navigate('Game', { testId: randomTest.id });
        } else {
            alert("Oynanacak rastgele test bulunamadı.");
        }
    } catch (error) {
        console.error("Hızlı başla hatası:", error);
        alert("Rastgele test başlatılırken bir sorun oluştu.");
    }
  };


  const renderTestList = (tests, isLoading, title, type = "recommended") => {
    if (isLoading) {
      return (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    if (!tests || tests.length === 0) {
      return <Text style={styles.noTestsText}>{title} bulunmuyor.</Text>;
    }
    return tests.map((test) => (
      <TestCardHorizontal // Yatay kart bileşeni
        key={test.id}
        test={test}
        onPress={() => navigation.navigate('Game', { testId: test.id })}
        // progress={type === "recent" ? test.progress : undefined} // Eğer progress bilgisi varsa
      />
    ));
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Keşfet & Oyna</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateTest')} hitSlop={{top:10, bottom:10, left:10, right:10}}>
          <Feather name="plus-square" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
            />
        }
      >
        {/* Arama Çubuğu */}
        <View style={styles.searchOuterContainer}>
            <View style={styles.searchContainer}>
                <Feather name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                style={styles.searchInput}
                placeholder="Hangi testi arıyorsun?"
                placeholderTextColor={theme.colors.textPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                />
            </View>
        </View>


        {/* Hızlı Başla ve Diğer Eylemler */}
        <View style={styles.actionsContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.quickStartButton]}
                onPress={handleQuickStart}
            >
                <Ionicons name="flash-outline" size={24} color={theme.colors.background} />
                <Text style={styles.actionButtonText}>Rastgele Oyna</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, styles.exploreButton]}
                onPress={() => navigation.navigate('Explore')}
            >
                <Feather name="compass" size={22} color={theme.colors.primary} />
                <Text style={[styles.actionButtonText, {color: theme.colors.primary}]}>Tüm Testler</Text>
            </TouchableOpacity>
        </View>


        {/* Devam Eden Testler (Kullanıcı giriş yapmışsa) */}
        {user && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Kaldığın Yerden Devam Et</Text>
                {/* <TouchableOpacity><Text style={styles.seeAllLink}>Tümünü Gör</Text></TouchableOpacity> */}
            </View>
            {renderTestList(recentTests, loadingRecent, "Devam eden test", "recent")}
          </View>
        )}

        {/* Önerilen Testler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sana Özel Öneriler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explore', { initialFilter: 'popular' })}>
                <Text style={styles.seeAllLink}>Daha Fazla</Text>
            </TouchableOpacity>
          </View>
          {renderTestList(recommendedTests, loadingRecommended, "Önerilen test")}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text, // Primary yerine genel text rengi
  },
  searchOuterContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground || theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 45,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.inputText || theme.colors.text,
  },
  content: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  quickStartButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  exploreButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.background, // quickStart için
    marginLeft: theme.spacing.sm,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  seeAllLink: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
  },
  loadingSection: {
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
  },
  noTestsText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  // TestCardHorizontal için stiller (TestCardHorizontal.js içinde olmalı)
  // testCard: { ... },
  // testImage: { ... },
  // testInfo: { ... },
});

export default PlayScreen;
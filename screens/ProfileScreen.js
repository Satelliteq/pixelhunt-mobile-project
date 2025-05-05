import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { theme } from '../theme';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { signOut } from '../config/supabase'; // signOut fonksiyonunun doğru yerden import edildiğinden emin olun
import TestCard from '../components/TestCard';

export default function ProfileScreen({ navigation }) {
  const [session, setSession] = useState(null); // Oturumu takip etmek için state
  const [user, setUser] = useState(null);
  const [userTests, setUserTests] = useState([]);
  const [loading, setLoading] = useState(true); // Başlangıçta yükleniyor
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('created');
  const [stats, setStats] = useState({
    totalTests: 0,
    totalScore: 0,
    totalPlays: 0,
    rank: 0
  });

  useEffect(() => {
    // Oturum durumunu dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session); // Oturum state'ini güncelle
      if (session) {
        setUser(session.user); // Kullanıcı state'ini ayarla
        fetchUserData(session.user); // Oturum varsa kullanıcı verilerini çek
      } else {
        // Oturum yoksa veya sonlandıysa, state'leri temizle ve yüklemeyi bitir
        setUser(null);
        setUserTests([]);
        setStats({ totalTests: 0, totalScore: 0, totalPlays: 0, rank: 0 });
        setError(null); // Hata mesajını temizle
        setLoading(false);
        // Kullanıcı giriş yapmamışsa veya çıkış yaptıysa Login ekranına yönlendirilebilir
        // navigation.replace('Login'); // Eğer oturum yoksa direkt Login'e atmasını isterseniz
      }
    });

    // Component unmount olduğunda listener'ı kaldır
    return () => subscription.unsubscribe();
  }, []); // Sadece component mount olduğunda çalıştır

  // Fetch user data when the active tab changes *if* a user exists
  useEffect(() => {
    if (user && session) { // Sadece kullanıcı ve oturum varsa tab değişikliğinde veri çek
        handleTabChange(activeTab, user.id);
    }
  }, [activeTab, user, session]); // activeTab, user veya session değiştiğinde tetikle

  const fetchUserData = async (currentUser) => {
    if (!currentUser) {
      setError("Kullanıcı bilgisi alınamadı.");
      setLoading(false);
      return;
    }

    // fetchUserData çağrıldığında yüklemeyi başlat (tab değişikliği için de geçerli)
    setLoading(true);
    setError(null);

    try {
      // Kullanıcı istatistiklerini getir (Zaten currentUser var, getUser'a gerek yok)
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      // StatsError'u kontrol et, ancak 'single()' null döndüğünde hata vermez, bu yüzden statsData'yı da kontrol et
      if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = single row not found, bu bir hata değil
          throw statsError;
      }
      if (statsData) {
        setStats({
          totalTests: statsData.total_tests || 0,
          totalScore: statsData.total_score || 0,
          totalPlays: statsData.total_plays || 0,
          rank: statsData.rank || 0
        });
      } else {
         // Eğer kullanıcı için henüz stats yoksa sıfırla
         setStats({ totalTests: 0, totalScore: 0, totalPlays: 0, rank: 0 });
      }

      // Seçili sekmeye göre testleri getir (handleTabChange halledecek)
      // Bu fonksiyon sadece stats çekmek için kalabilir veya kaldırılabilir
      // await handleTabChange(activeTab, currentUser.id); // İlk yüklemede de tab verisi çekilsin

    } catch (error) {
      console.error('Kullanıcı verisi çekme hatası:', error);
      setError('Profil verileri yüklenirken bir hata oluştu.');
    } finally {
      // handleTabChange kendi loading'ini yönettiği için burada false yapmayalım
      // setLoading(false); // Eğer handleTabChange çağrılmıyorsa burada false yapılmalı
    }
  };

  const handleTabChange = async (tab, userId) => {
    // Eğer kullanıcı ID yoksa (örneğin çıkış yapıldıysa) işlemi durdur
    if (!userId) {
        console.log("handleTabChange çağrıldı ancak userId yok.");
        setUserTests([]); // Test listesini temizle
        setLoading(false); // Yüklemeyi durdur
        return;
    }

    setActiveTab(tab); // Aktif tab'ı state'e işle

    // Veri çekmeye başlamadan önce yükleniyor durumunu ayarla
    setLoading(true);
    setError(null); // Önceki hataları temizle
    setUserTests([]); // Yeni veri gelene kadar eski listeyi temizle

    try {
      let query = supabase.from('tests');
      let finalData = [];

      switch (tab) {
        case 'created':
          const { data: createdData, error: createdError } = await query
            .select('*')
            .eq('creator_id', userId)
            .order('created_at', { ascending: false });
          if (createdError) throw createdError;
          finalData = createdData || [];
          break;
        case 'played':
          // Önce oynanan testlerin ID'lerini al
          const { data: playedScores, error: playedError } = await supabase
            .from('game_scores')
            .select('test_id')
            .eq('user_id', userId);
          if (playedError) throw playedError;

          if (playedScores && playedScores.length > 0) {
            const testIds = [...new Set(playedScores.map(score => score.test_id))]; // Tekrarları kaldır
            // Sonra bu ID'lere sahip testleri çek
            const { data: playedTestsData, error: testsError } = await query
              .select('*')
              .in('id', testIds)
              .order('created_at', { ascending: false });
            if (testsError) throw testsError;
            finalData = playedTestsData || [];
          } else {
            finalData = []; // Oynanan test yoksa boş dizi
          }
          break;
        case 'liked':
           // Önce beğenilen testlerin ID'lerini al
          const { data: likedLikes, error: likedError } = await supabase
            .from('test_likes')
            .select('test_id')
            .eq('user_id', userId);
           if (likedError) throw likedError;

          if (likedLikes && likedLikes.length > 0) {
             const likedTestIds = [...new Set(likedLikes.map(like => like.test_id))]; // Tekrarları kaldır
             // Sonra bu ID'lere sahip testleri çek
            const { data: likedTestsData, error: testsError } = await query
              .select('*')
              .in('id', likedTestIds)
              .order('created_at', { ascending: false });
            if (testsError) throw testsError;
            finalData = likedTestsData || [];
          } else {
            finalData = []; // Beğenilen test yoksa boş dizi
          }
          break;
      }
      setUserTests(finalData);

    } catch (error) {
      console.error(`${tab} sekmesi verileri çekilirken hata:`, error);
      setError(`${getTabName(tab)} testleri yüklenirken bir hata oluştu.`);
      setUserTests([]); // Hata durumunda listeyi boşalt
    } finally {
      setLoading(false); // Veri çekme işlemi bittiğinde veya hata olduğunda yüklemeyi bitir
    }
  };

  // Helper function for error messages
  const getTabName = (tabKey) => {
      switch (tabKey) {
          case 'created': return 'Oluşturulan';
          case 'played': return 'Oynanan';
          case 'liked': return 'Beğenilen';
          default: return '';
      }
  }


  const handleSignOut = async () => {
    setLoading(true); // Çıkış işlemi sırasında yükleniyor göster
    setError(null);
    try {
      const { error } = await signOut(); // signOut fonksiyonunu çağır
      if (error) throw error;
      // onAuthStateChange zaten state'leri temizleyip Login'e yönlendirecektir (eğer öyle ayarlandıysa)
      // Veya burada manuel olarak yönlendirme yapabilirsiniz:
      // navigation.replace('Login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
      setError('Çıkış yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false); // Hata durumunda yüklemeyi bitir
    }
    // Başarılı çıkışta onAuthStateChange tetikleneceği için loading'i orada false yapacak
  };

  // --- Render Logic ---

  // Henüz oturum bilgisi gelmediyse veya çıkış yapıldıysa farklı bir şey gösterilebilir
  if (!session && !loading && !error) {
    return (
      <View style={styles.container}>
         <View style={styles.errorContainer}>
             <Feather name="user-x" size={48} color={theme.colors.primary} />
             <Text style={styles.errorText}>Profil bilgilerini görmek için giriş yapmalısınız.</Text>
             <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.retryButtonText}>Giriş Yap</Text>
             </TouchableOpacity>
         </View>
      </View>
    );
  }

  // Yükleniyor durumu (hem ilk yükleme hem de tab değişimi için)
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Hata durumu
  if (error && !loading) { // Sadece yükleme bitmişse hatayı göster
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
              if (user) {
                  // Eğer kullanıcı varsa, mevcut tab için veriyi tekrar çekmeyi dene
                  handleTabChange(activeTab, user.id);
              } else if (session?.user) {
                  // Eğer session var ama user state güncel değilse (bu pek olası değil ama garanti olsun)
                  setUser(session.user);
                  fetchUserData(session.user); // Ana verileri tekrar çek
              } else {
                  // Hiçbir bilgi yoksa, baştan başla (onAuthStateChange tekrar tetiklenmeli)
                  // Veya Login'e gönder
                  navigation.replace('Login');
              }
          }}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
           {/* Çıkış yapma seçeneği hata durumunda da kalsın */}
           <TouchableOpacity style={[styles.signOutButton, {marginTop: 20}]} onPress={handleSignOut}>
                <Feather name="log-out" size={20} color={'#FFD600'} />
                <Text style={styles.signOutText}>Çıkış Yap</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Kullanıcı verileri başarıyla yüklendiyse
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

      {user && ( // Kullanıcı bilgisi varsa profil bölümünü göster
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.user_metadata?.avatar_url ? (
              <Image
                source={{ uri: user.user_metadata.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.defaultAvatar}>
                 <Feather name="user" size={60} color={'#FFD600'} />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalTests}</Text>
              <Text style={styles.statLabel}>Test</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalScore}</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
             <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalPlays}</Text>
                <Text style={styles.statLabel}>Oynama</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rank || 'N/A'}</Text> {/* Sıralama yoksa N/A göster */}
              <Text style={styles.statLabel}>Sıralama</Text>
            </View>
          </View>
        </View>
      )}

      {user && ( // Kullanıcı varsa tabları göster
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                style={[styles.tab, activeTab === 'created' && styles.activeTab]}
                onPress={() => handleTabChange('created', user.id)} // userId'yi explicit olarak gönder
                disabled={loading} // Yüklenirken tab değiştirmeyi engelle
                >
                <Feather name="edit" size={20} color={activeTab === 'created' ? '#000' : '#fff'} />
                 <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>Oluşturulan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                style={[styles.tab, activeTab === 'played' && styles.activeTab]}
                onPress={() => handleTabChange('played', user.id)}
                disabled={loading}
                >
                <Feather name="play" size={20} color={activeTab === 'played' ? '#000' : '#fff'} />
                <Text style={[styles.tabText, activeTab === 'played' && styles.activeTabText]}>Oynanan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                style={[styles.tab, activeTab === 'liked' && styles.activeTab]}
                onPress={() => handleTabChange('liked', user.id)}
                disabled={loading}
                >
                <Feather name="heart" size={20} color={activeTab === 'liked' ? '#000' : '#fff'} />
                 <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>Beğenilen</Text>
                </TouchableOpacity>
            </View>
      )}

      {/* Test Listesi veya Boş Durum */}
      {/* Yükleme bittikten sonra ve hata yoksa testleri veya boş mesajı göster */}
      {!loading && !error && user && (
          userTests.length > 0 ? (
            <View style={styles.testGrid}>
              {userTests.map((test) => (
                <TestCard
                  key={test.id}
                  id={test.id}
                  title={test.title}
                  // category={test.category_id} // Kategori ID yerine isim göstermek daha iyi olabilir (ilişkisel sorgu gerekir)
                  plays={test.play_count || 0} // Null ise 0 göster
                  // comments={test.comment_count || 0} // Yorum sayısı varsa
                  likes={test.like_count || 0} // Null ise 0 göster
                  description={test.description}
                  imageUri={test.thumbnail}
                  onPress={() => navigation.navigate('Game', { testId: test.id })} // Veya TestDetay ekranı
                  style={styles.testCard} // Stil props olarak geçmek yerine TestCard içinde tanımlanabilir
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyText}>Bu sekmede henüz test bulunmuyor</Text>
            </View>
          )
      )}

      {/* Çıkış Butonu (Kullanıcı varsa göster) */}
      {user && (
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
          <Feather name="log-out" size={20} color={'#FFD600'} />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// Stilleri güncelleyelim
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Arka planı belirgin yap
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
     backgroundColor: '#000', // Arka planı belirgin yap
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#eee', // Beyaza yakın bir renk
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary, // Ana renk
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000', // Buton metni siyah
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    // flex: 1, // ScrollView içinde flex: 1 sorun yaratabilir
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64, // Daha fazla dikey boşluk
    paddingHorizontal: 32,
    marginTop: 20, // Tablardan sonra biraz boşluk
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#aaa', // Daha soluk bir renk
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15, // Biraz daha dikey padding
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#000', // Header arka planı
    // safeAreaView kullanılıyorsa paddingTop eklenebilir
  },
  title: {
    fontSize: 20, // Biraz küçültebiliriz
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24, // Eşit padding
    paddingHorizontal: 16, // Yatay padding
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatarContainer: {
    marginBottom: 12,
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222', // Placeholder arkaplanı
    overflow: 'hidden', // Resmin taşmasını engelle
  },
   defaultAvatar: { // Added style for default icon background
      width: '100%',
      height: '100%',
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#333', // Darker background for the icon
   },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 20, // Daha belirgin isim
    fontWeight: '600', // Biraz daha kalın
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: '#FFD600', // Vurgu rengi
    marginBottom: 16, // İstatistiklerden önce boşluk
     textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Daha dengeli dağılım
    alignItems: 'flex-start', // Öğeleri yukarı hizala
    width: '100%',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1, // Eşit genişlik kaplamalarını sağla
    paddingHorizontal: 5, // Öğeler arasına hafif boşluk
  },
  statValue: {
    fontSize: 18, // Biraz daha büyük değer
    color: '#FFD600',
    fontWeight: 'bold',
    marginBottom: 2, // Değer ile etiket arası boşluk
  },
  statLabel: {
    fontSize: 12, // Daha küçük etiket
    color: '#aaa', // Soluk renk
    textAlign: 'center', // Ortala
  },
  tabsContainer: {
    flexDirection: 'row',
    // justifyContent: 'space-around', // Zaten flex: 1 ile sağlanıyor
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#111', // Tab bar arka planı
  },
  tab: {
    flex: 1, // Eşit yer kapla
    alignItems: 'center',
    justifyContent: 'center', // İçeriği ortala
    paddingVertical: 12, // Dikey padding
    borderBottomWidth: 3, // Aktiflik çizgisi için yer
    borderBottomColor: 'transparent', // Başlangıçta şeffaf
    flexDirection: 'row', // İkon ve metin yan yana
    gap: 6, // İkon ve metin arası boşluk
  },
  activeTab: {
    borderBottomColor: '#FFD600', // Aktif tabın altını çiz
  },
  tabText: {
      fontSize: 14,
      color: '#fff',
  },
  activeTabText: {
      color: '#FFD600', // Aktif tab metin rengi
      fontWeight: 'bold',
  },
  testGrid: {
    paddingHorizontal: 8, // Kartlar arası boşluk için grid padding'i
    paddingTop: 16,
    paddingBottom: 16, // Altta boşluk
    flexDirection: 'row', // Yan yana dizilim
    flexWrap: 'wrap', // Sığmazsa alta geç
    justifyContent: 'space-between', // Aralara boşluk bırak (eğer 2'li sıra ise)
    // alignItems: 'flex-start', // Kartları yukarı hizala
  },
  testCard: {
    // TestCard'ın kendi iç stili olmalı, ancak griddeki yerleşimi için:
    width: '48%', // Ekran genişliğinin yaklaşık yarısı (aradaki boşluk için pay)
    marginBottom: 16, // Alt alta gelen kartlar arası boşluk
    // marginRight ve minWidth kaldırıldı, width: '48%' ve justify ile yönetiliyor
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24, // Yanlardan boşluk
    marginVertical: 32, // Üstten ve alttan boşluk
    paddingVertical: 14, 
    backgroundColor: '#1C1C1E', 
    borderRadius: 12,
    gap: 10, 
  },
  signOutText: {
    color: '#FFD600',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
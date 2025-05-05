import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
// import { theme } from '../theme'; // Using specific colors below instead
import TestCard from '../components/TestCard'; // Assuming this component exists and renders like the design
import CategoryCard from '../components/CategoryCard'; // Assuming this component exists and renders like the design
import { supabase, fetchTests, fetchCategories } from '../config/supabase';
// import ProfileAvatar from '../components/ProfileAvatar'; // Replaced with simple View+Text

// Define colors based on the design
const colors = {
  background: '#000000', // Black background
  text: '#FFFFFF',       // White text
  primary: '#FFC107',    // Yellow accent
  card: '#212121',        // Dark grey for cards/tabs background
  cardText: '#A0A0A0',   // Light grey for inactive text/icons
  blackText: '#000000',   // Black text (for active tab)
  white: '#FFFFFF',
};

const { width } = Dimensions.get('window');
const testCardWidth = width * 0.6; // Adjust as needed
const categoryCardWidth = width * 0.3; // Adjust as needed

const HomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [featuredTests, setFeaturedTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const tabNames = ['Öne Çıkanlar', 'Popüler', 'Yeni Eklenenler'];
  const tabIcons = ['trending-up', 'star', 'clock'];

  useEffect(() => {
    fetchUser();
    fetchData(); // Initial fetch for 'Öne Çıkanlar'
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchData = async (tabIndex = 0) => {
    try {
      setLoading(true);

      let fetchOptions = {
        limit: 6,
        orderBy: 'created_at',
        ascending: false,
        featured: tabIndex === 0 ? true : undefined // Only set featured for the first tab initially
      };

      // Override options based on tab if not initial load
      if (tabIndex !== 0) {
         switch (tabIndex) {
            case 0: // Öne Çıkanlar (already default)
              fetchOptions.orderBy = 'created_at';
              fetchOptions.ascending = false;
              fetchOptions.featured = true; // Explicitly set featured true
              break;
            case 1: // Popüler
              fetchOptions.orderBy = 'play_count';
              fetchOptions.ascending = false;
               fetchOptions.featured = undefined;
              break;
            case 2: // Yeni Eklenenler
              fetchOptions.orderBy = 'created_at';
              fetchOptions.ascending = false;
               fetchOptions.featured = undefined;
              break;
          }
      }


      const testsData = await fetchTests(fetchOptions);
      setFeaturedTests(testsData);

      // Fetch categories only once
      if (categories.length === 0) {
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
      }

    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (index) => {
    setActiveTab(index);
    fetchData(index); // Fetch data for the selected tab
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    // *** Placeholder for TestCard rendering ***
    // Replace this with your actual TestCard mapping when available
    // This structure mimics the design's appearance
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {featuredTests.map((test) => (
          // Assuming TestCard takes test data and onPress handler
           <TestCard
             key={test.id}
             test={test}
             style={{ width: testCardWidth, marginRight: 15 }} // Apply width and margin here
             onPress={() => navigation.navigate('TestDetail', { testId: test.id })}
           />
         ))}
         {/* Add more placeholder cards if needed for visual testing */}
         {/* <View style={[styles.testCardPlaceholder, { width: testCardWidth }]}>
              <Image source={require('../assets/rdr2_placeholder.png')} style={styles.testCardImagePlaceholder} />
              <Text style={styles.testCardTitlePlaceholder}>Oyunu görsellerinden tanıyabilir misin?</Text>
              <View style={styles.testCardStatsPlaceholder}>
                  <Feather name="users" size={12} color={colors.cardText} />
                  <Text style={styles.testCardStatTextPlaceholder}>24k</Text>
                  <Feather name="thumbs-up" size={12} color={colors.cardText} style={{ marginLeft: 10 }}/>
                  <Text style={styles.testCardStatTextPlaceholder}>10k</Text>
              </View>
          </View> */}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Üst Bar: Logo ve Profil */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          {/* Use your actual logo asset */}
          <Image source={require('../assets/logo.png')} style={styles.logo} />
        </View>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>{user?.user_metadata?.name?.[0]?.toUpperCase() || 'K'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Hero Section 1 */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Bilginizi Test Edin, Yeni Testler Keşfedin</Text>
          </View>
          <Image
            source={require('../assets/man-wearing-headphones.png')} // Make sure this path is correct
            style={styles.heroImage1}
            resizeMode="contain"
          />
        </View>

        {/* Testler Başlık ve Tab Bar */}
        <View style={styles.sectionHeaderContainer}>
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <Feather name="filter" size={18} color={colors.primary} style={{ marginRight: 8 }} />
             <Text style={styles.sectionTitle}>Tüm Testler</Text>
           </View>
        </View>
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            {tabNames.map((name, index) => {
              const isActive = activeTab === index;
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.tabBarButton,
                    isActive && styles.tabBarButtonActive
                  ]}
                  onPress={() => handleTabChange(index)}
                >
                  <Feather
                      name={tabIcons[index]}
                      size={16}
                      color={isActive ? colors.primary : colors.cardText} // Icon yellow when active
                      style={{ marginRight: 6 }}
                  />
                  <Text style={[
                    styles.tabBarButtonText,
                    isActive ? styles.tabBarButtonTextActive : styles.tabBarButtonTextInactive
                  ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Testler İçerik */}
        <View style={styles.testsSection}>
          {renderTabContent()}
        </View>

        {/* Kategoriler */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeaderContainer}>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Feather name="layers" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                 <Text style={styles.sectionTitle}>Kategoriler</Text>
             </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {categories.map((category) => (
               // Assuming CategoryCard takes category data and onPress handler
              <CategoryCard
                key={category.id}
                category={category}
                style={{ width: categoryCardWidth, marginRight: 10 }} // Apply width and margin
                onPress={() => navigation.navigate('Category', { categoryId: category.id })}
              />
            ))}
            {/* Add more placeholder cards if needed */}
            {/* <View style={[styles.categoryCardPlaceholder, {width: categoryCardWidth}]}>
                <Feather name="book-open" size={24} color={colors.cardText} />
                <Text style={styles.categoryCardTextPlaceholder}>Edebiyat</Text>
            </View> */}
          </ScrollView>
        </View>

        {/* Alt Bilgi Kutusu / Hero Section 2 */}
        <View style={styles.infoBox}>
           <Image
                source={require('../assets/man-thinking-with-his-index-finger-to-his-face.png')} // Make sure this path is correct
                style={styles.infoImage}
                resizeMode="contain"
            />
          <View style={styles.infoContent}>
             <Text style={styles.infoText}>Görsellerle Düşün, Gördükçe Hafızanı Güçlendir.</Text>
          </View>
        </View>

      </ScrollView>

       {/* --- Bottom Navigation Placeholder --- */}
      {/* IMPORTANT: This is just a visual placeholder. */}
      {/* Real bottom navigation should be implemented using a navigation library */}
      {/* (like React Navigation) outside this screen component. */}
      
       {/* --- End Bottom Navigation Placeholder --- */}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingBottom: 60, // Add padding to avoid overlap with placeholder nav
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background, // Ensure top bar blends
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 170, // Adjusted size
    height: 30, // Adjusted size
    marginLeft: 10,
  },
  logoText: {
    fontSize: 20, // Adjusted size
    fontWeight: 'bold',
    color: colors.text,
  },
  profileButton: {
    // Removed padding, circle handles size
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary, // Yellow circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white, // White initial
  },
  heroSection: {
    flexDirection: 'row',
    backgroundColor: colors.primary, // Yellow background
    borderRadius: 15,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroContent: {
    flex: 1, // Takes available space
    paddingRight: 10, // Space between text and image
  },
  heroTitle: {
    fontSize: 20, // Adjusted size
    fontWeight: 'bold',
    color: colors.white, // White text
    // Removed marginBottom, let flexbox handle spacing
  },
  heroImage1: {
    width: 100, // Adjusted size
    height: 100, // Adjusted size
  },
  sectionHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10, // Space before content/tabs
      // justifyContent: 'space-between', // If needed for more items
  },
   sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 10, // Space before test cards
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card, // Dark grey background for the tab bar itself
    borderRadius: 10,
    padding: 4, // Inner padding for the container
    justifyContent: 'space-between', // Distribute tabs evenly
  },
  tabBarButton: {
    flex: 1, // Make buttons share space
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, // Increased padding
    paddingHorizontal: 5,
    borderRadius: 8, // Rounded corners for buttons
    marginHorizontal: 2, // Small gap between buttons
  },
  tabBarButtonActive: {
    backgroundColor: colors.primary, // Yellow background for active tab
  },
  tabBarButtonText: {
    fontSize: 13, // Slightly smaller font
    fontWeight: '600', // Semi-bold
    textAlign: 'center',
  },
   tabBarButtonTextActive: {
    color: colors.blackText, // Black text for active tab
  },
  tabBarButtonTextInactive: {
      color: colors.cardText, // Light grey text for inactive
  },
  testsSection: {
    // Removed paddingHorizontal, handled by horizontalScrollContent
     marginBottom: 20,
  },
  categoriesSection: {
     // Removed paddingHorizontal
     marginBottom: 20,
  },
   horizontalScrollContent: {
    paddingHorizontal: 16, // Add padding here for the scrolling content
    paddingVertical: 10, // Add some vertical padding if needed
  },
  loadingContainer: {
    height: 150, // Give loading indicator some space
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row', // Image left, text right
    backgroundColor: colors.primary, // Yellow background
    borderRadius: 15,
    marginHorizontal: 16,
    marginTop: 10, // Space from categories
    marginBottom: 20, // Space before bottom nav placeholder
    padding: 20,
    alignItems: 'center',
  },
  infoImage: {
    width: 80, // Adjusted size
    height: 80, // Adjusted size
    marginRight: 20, // Space between image and text
  },
  infoContent: {
      flex: 1, // Allow text content to take remaining space
  },
  infoText: {
    fontSize: 16, // Adjusted size
    fontWeight: 'bold',
    color: colors.white, // White text
    // Removed textAlign: 'center'
  },
  // --- Placeholder Styles --- (Remove if using actual components)
  testCardPlaceholder: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      marginRight: 15,
      alignItems: 'flex-start', // Align content to start
  },
  testCardImagePlaceholder: {
      width: '100%',
      height: 100, // Example height
      borderRadius: 8,
      backgroundColor: '#555', // Placeholder color
      marginBottom: 8,
  },
  testCardTitlePlaceholder: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 5,
  },
  testCardStatsPlaceholder: {
      flexDirection: 'row',
      alignItems: 'center',
  },
   testCardStatTextPlaceholder: {
      color: colors.cardText,
      fontSize: 12,
      marginLeft: 4,
  },
  categoryCardPlaceholder: {
      backgroundColor: colors.card, // Dark grey
      borderRadius: 10,
      padding: 15,
      marginRight: 10,
      alignItems: 'center', // Center icon and text
      justifyContent: 'center',
      height: 100, // Example height
  },
  categoryCardTextPlaceholder: {
      color: colors.cardText, // Light grey text
      fontSize: 13,
      marginTop: 8,
  },
  // --- Bottom Nav Placeholder Style ---
   bottomNavPlaceholder: {
        position: 'absolute', // Position it at the bottom
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 60, // Standard height for bottom nav
        backgroundColor: colors.background, // Black background
        borderTopWidth: 1, // Optional: slight separator line
        borderTopColor: '#222', // Dark grey line
        paddingBottom: 5, // Padding for safe area nuances if needed
        paddingHorizontal: 10,
   },
});

export default HomeScreen;
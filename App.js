import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { Feather } from '@expo/vector-icons'; // Feather is used within TabBar, not directly here
// import { Animated } from 'react-native'; // Removed Animated import
// import { theme } from './theme'; // Removed theme import
import TabBar from './components/TabBar'; // Import the custom TabBar
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
// import PlayScreen from './screens/PlayScreen'; // Ensure this is the correct screen for the '+' tab
// import CreateTestScreen from './screens/CreateTestScreen'; // Test oluşturma ekranı tamamen kaldırıldı
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ProfileScreen from './screens/ProfileScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import TestDetailScreen from './screens/TestDetailScreen';
import GameScreen from './screens/GameScreen';
import SearchScreen from './screens/SearchScreen';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { onAuthUserChanged, auth } from './config/firebase';
import { useFonts, Outfit_400Regular, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { AuthProvider } from './contexts/AuthContext';

// ----- Placeholder Screen -----
// Replace this with your actual screen component for the 'layers' tab
const PlaceholderLayersScreen = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Layers Screen (Placeholder)</Text>
  </View>
);
const styles = StyleSheet.create({
    placeholderContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'},
    placeholderText:{color:'#fff', fontSize: 18, fontFamily: 'Outfit_700Bold'},
    loaderContainer: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000'},
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        textAlign: 'center',
        margin: 20,
        fontFamily: 'Outfit_400Regular'
    }
});
// ----- End Placeholder Screen -----

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Removed the Animated TabBarIcon component

// Bottom Tab Navigator containing the main app screens
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Layers" component={PlaceholderLayersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
  });

  useEffect(() => {
    let unsubscribe;
    
    const initializeAuth = async () => {
      try {
        if (!auth) {
          throw new Error('Firebase Auth instance bulunamadı');
        }
        
        unsubscribe = onAuthUserChanged((firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        }, (error) => {
          setError(error);
          setLoading(false);
        });
      } catch (error) {
        setError(error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (error) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>Bir hata oluştu: {error.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Authentication Screens */}
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="TestDetail" component={TestDetailScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="Search" component={SearchScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            </>
          )}

          {/* Main App Screens (grouped under MainTabs) */}
          {/* Example: <Stack.Screen name="TestDetail" component={TestDetailScreen} /> */}
          {/* Example: <Stack.Screen name="Settings" component={SettingsScreen} /> */}

        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
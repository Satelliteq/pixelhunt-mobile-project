import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { onAuthUserChanged } from './config/firebase';

// ----- Placeholder Screen -----
// Replace this with your actual screen component for the 'layers' tab
const PlaceholderLayersScreen = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Layers Screen (Placeholder)</Text>
  </View>
);
const styles = StyleSheet.create({
    placeholderContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'},
    placeholderText:{color:'#fff', fontSize: 18},
    loaderContainer: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000'},
});
// ----- End Placeholder Screen -----

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

  useEffect(() => {
    const unsubscribe = onAuthUserChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false, // Globally hide headers for the stack navigator
        }}
      >
        {/* Authentication Screens */}
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="TestDetail" component={TestDetailScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
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
  );
}
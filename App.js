import React from 'react'; // Removed useEffect, useRef
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
// import { Feather } from '@expo/vector-icons'; // Feather is used within TabBar, not directly here
// import { Animated } from 'react-native'; // Removed Animated import
// import { theme } from './theme'; // Removed theme import
import TabBar from './components/TabBar'; // Import the custom TabBar

// Screens
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
// import PlayScreen from './screens/PlayScreen'; // Ensure this is the correct screen for the '+' tab
import CreateTestScreen from './screens/CreateTestScreen'; // Screen for the '+' tab
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ProfileScreen from './screens/ProfileScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';

// ----- Placeholder Screen -----
// Replace this with your actual screen component for the 'layers' tab
import { View, Text, StyleSheet } from 'react-native';
const PlaceholderLayersScreen = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Layers Screen (Placeholder)</Text>
  </View>
);
const styles = StyleSheet.create({
    placeholderContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'},
    placeholderText:{color:'#fff', fontSize: 18}
});
// ----- End Placeholder Screen -----


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Removed the Animated TabBarIcon component

// Bottom Tab Navigator containing the main app screens
const MainTabs = () => {
  return (
    <Tab.Navigator
      // Use the custom TabBar component
      tabBar={props => <TabBar {...props} />}
      // Remove screenOptions that set icons/colors, as TabBar handles it
      screenOptions={{
        headerShown: false, // Keep headers hidden if desired
      }}
    >
      {/* Order should match the icons in TabBar.js: home, compass, plus-circle, layers, user */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        // options={{ title: 'Ana Sayfa' }} // Title is not shown with custom TabBar, can be kept for accessibility
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        // options={{ title: 'Keşfet' }}
      />
      <Tab.Screen
        name="Create" // Corresponds to 'plus-circle' icon
        component={CreateTestScreen} // Use CreateTestScreen or PlayScreen based on your need for the '+' tab
        // options={{ title: 'Oluştur' }}
      />
       <Tab.Screen
        name="Layers" // Added screen for the 'layers' icon
        component={PlaceholderLayersScreen} // *** Replace with your actual component ***
        // options={{ title: 'Katmanlar' }} // Example title
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        // options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

// Main App Navigator (Stack)
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login" // Start with Login screen
        screenOptions={{
          headerShown: false, // Globally hide headers for the stack navigator
        }}
      >
        {/* Authentication Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />

        {/* Main App Screens (grouped under MainTabs) */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Removed redundant Profile screen here, it's inside MainTabs */}
        {/* <Stack.Screen name="Profile" component={ProfileScreen} /> */}

        {/* Add other Stack screens accessible from within MainTabs if needed */}
        {/* Example: <Stack.Screen name="TestDetail" component={TestDetailScreen} /> */}
        {/* Example: <Stack.Screen name="Settings" component={SettingsScreen} /> */}

      </Stack.Navigator>
    </NavigationContainer>
  );
}
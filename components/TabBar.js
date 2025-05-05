import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
// import { theme } from '../theme'; // Using specific colors below for clarity

// Define consistent colors matching the design
const colors = {
  background: '#000000', // Black background
  primary: '#FFC107',    // Yellow accent for active icon
  text: '#FFFFFF',       // White text/icons for inactive state
  // card: '#212121',     // Not needed directly here
  // cardText: '#A0A0A0', // Not needed directly here
};

// Corrected icon names based on the visual design
const tabIcons = [
  'home',
  'compass',
  'plus-circle', // Changed from 'plus'
  'layers',     // Changed from 'book'
  'user',
];

const TabBar = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, idx) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === idx;
        let iconName = tabIcons[idx]; // Get the correct icon name

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            // Navigate to the pressed tab screen
            navigation.navigate(route.name, route.params); // Pass params if any
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Render a standard touchable opacity for every tab
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
            activeOpacity={0.7} // Standard opacity feedback
          >
            <Feather
              name={iconName}
              size={26} // Consistent icon size
              color={isFocused ? colors.primary : colors.text} // Yellow if focused, White if not
            />
            {/* Optional: Add labels if needed, uncomment and style below */}
            {/* <Text style={{ color: isFocused ? colors.primary : colors.text, fontSize: 10 }}>
              {label}
            </Text> */}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background, // Black background
    // borderTopWidth: 1, // Removed border based on design
    // borderTopColor: theme.colors.border, // Removed border based on design
    height: Platform.OS === 'ios' ? 80 : 60, // Standard height, adjust padding for iOS notch area
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Padding for safe area on iOS
    alignItems: 'center', // Vertically center icons
    justifyContent: 'space-around', // Evenly distribute tabs
    paddingHorizontal: 8,
    // Position, Left, Right, Bottom, zIndex are usually handled by React Navigation
    // when passed via the tabBar prop, so removed them.
  },
  tab: {
    flex: 1, // Each tab takes equal space
    alignItems: 'center',
    justifyContent: 'center', // Center icon vertically and horizontally
  },
  // Removed centerTab, plusButton, plusButtonActive styles as they are no longer needed
});

export default TabBar;
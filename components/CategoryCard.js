import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const CategoryCard = ({ category, onPress, style }) => {
  const { name, description, iconName = 'folder', color = theme.colors.primary, backgroundColor = theme.colors.background } = category;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Feather name={iconName} size={24} color={color} />
      </View>
      <Text style={[styles.name, { color }]} numberOfLines={1}>
        {name}
      </Text>
      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.l,
    ...theme.shadows.medium,
    width: '100%',
    minHeight: 120,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  name: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.xs,
  },
  description: {
    ...theme.typography.body2,
    color: theme.colors.textSecondary,
  },
});

export default CategoryCard; 
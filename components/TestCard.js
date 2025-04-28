import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const TestCard = ({ test, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={{ uri: test.thumbnail }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {test.title}
        </Text>
        <View style={styles.categoryContainer}>
          <Feather name="tag" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.categoryText}>
            {test.category?.name || 'Kategori Yok'}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Feather name="play" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.play_count || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="heart" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.like_count || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="message-circle" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.comment_count || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
});

export default TestCard;

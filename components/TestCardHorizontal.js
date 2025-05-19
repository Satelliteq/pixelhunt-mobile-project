import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const TestCardHorizontal = ({ test, onPress, style }) => {
  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: test.thumbnailUrl }} 
          style={styles.image}
          defaultSource={require('../assets/placeholder.png')}
          onError={(e) => {
            console.log('Resim yükleme hatası:', e.nativeEvent.error);
          }}
        />
        {test.featured && (
          <View style={styles.featuredBadge}>
            <Feather name="star" size={12} color="#fff" />
            <Text style={styles.featuredText}>Öne Çıkan</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {test.title || 'İsimsiz Test'}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {test.description || 'Açıklama bulunmuyor'}
        </Text>
        <View style={styles.categoryContainer}>
          <Feather name="tag" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.categoryText}>
            {test.categoryName || 'Kategorisiz'}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Feather name="play" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.playCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="heart" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.likeCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="message-circle" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.commentCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="help-circle" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{test.questions?.length || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
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

export default TestCardHorizontal; 
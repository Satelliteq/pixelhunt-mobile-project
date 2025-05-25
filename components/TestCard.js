// TestCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';

const TestCard = ({ test, onPress, style }) => {
  const title = test.title || 'İsimsiz Test';
  const thumbnailUrl = test.thumbnailUrl || null;
  const playCount = test.playCount || 0;
  const likeCount = test.likeCount || 0;

  return (
    <TouchableOpacity 
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={thumbnailUrl ? { uri: thumbnailUrl } : require('../assets/placeholder.png')} 
          style={styles.image}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Feather name="play" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{playCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Feather name="thumbs-up" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.statText}>{likeCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
    marginBottom: 8,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3, // Daha kareye yakın, daha kompakt
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 8,

  },
  content: {
    padding: 8,
  },
  title: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statText: {
    fontSize: 10,
    color: '#9E9E9E',
    fontFamily: 'Outfit_400Regular',
    marginLeft: 3,
  },
});

export default TestCard;
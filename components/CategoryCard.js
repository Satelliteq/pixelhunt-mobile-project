import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from 'react-native-feather';

const categoryIcons = {
  'Film': 'film',
  'Dizi': 'tv',
  'Oyun': 'cpu',
  'Müzik': 'music',
  'Spor': 'activity',
  'Sanat': 'image',
  'Edebiyat': 'book',
  'Coğrafya': 'globe',
  'Tarih': 'clock',
  'Genel': 'grid',
};

const CategoryCard = ({ name, count, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconWrap}>
        <Feather name={categoryIcons[name] || 'grid'} size={28} color={'#FFD600'} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {count !== undefined && <Text style={styles.count}>{count} test</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    minWidth: 90,
    minHeight: 90,
    backgroundColor: '#181818',
    elevation: 2,
  },
  iconWrap: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
    marginBottom: 2,
  },
  count: {
    fontSize: 12,
    color: '#FFD600',
    marginTop: 0,
  },
});

export default CategoryCard; 
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const PlayScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const recentTests = [
    { id: 1, title: 'Film Testi 1', category: 'Film', image: 'https://via.placeholder.com/200', progress: 80 },
    { id: 2, title: 'Dizi Testi 1', category: 'Dizi', image: 'https://via.placeholder.com/200', progress: 60 },
  ];

  const recommendedTests = [
    { id: 3, title: 'Oyun Testi 1', category: 'Oyun', image: 'https://via.placeholder.com/200', difficulty: 'Kolay' },
    { id: 4, title: 'Müzik Testi 1', category: 'Müzik', image: 'https://via.placeholder.com/200', difficulty: 'Orta' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Oyna</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateTest')}>
          <Ionicons name="add-circle-outline" size={30} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Test ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        {/* Devam Eden Testler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devam Eden Testler</Text>
          {recentTests.map((test) => (
            <TouchableOpacity
              key={test.id}
              style={styles.testCard}
              onPress={() => navigation.navigate('Game', { testId: test.id })}
            >
              <Image source={{ uri: test.image }} style={styles.testImage} />
              <View style={styles.testInfo}>
                <Text style={styles.testTitle}>{test.title}</Text>
                <Text style={styles.testCategory}>{test.category}</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { width: `${test.progress}%` }]} />
                  <Text style={styles.progressText}>{test.progress}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Önerilen Testler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Önerilen Testler</Text>
          {recommendedTests.map((test) => (
            <TouchableOpacity
              key={test.id}
              style={styles.testCard}
              onPress={() => navigation.navigate('Game', { testId: test.id })}
            >
              <Image source={{ uri: test.image }} style={styles.testImage} />
              <View style={styles.testInfo}>
                <Text style={styles.testTitle}>{test.title}</Text>
                <Text style={styles.testCategory}>{test.category}</Text>
                <View style={styles.difficultyContainer}>
                  <Ionicons 
                    name="speedometer-outline" 
                    size={16} 
                    color={theme.colors.gray} 
                  />
                  <Text style={styles.difficultyText}>{test.difficulty}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hızlı Başla */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Başla</Text>
          <TouchableOpacity
            style={styles.quickStartCard}
            onPress={() => navigation.navigate('Game', { quickStart: true })}
          >
            <Ionicons name="flash" size={24} color={theme.colors.primary} />
            <Text style={styles.quickStartText}>Rastgele Test</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
  },
  testCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  testImage: {
    width: 100,
    height: 100,
  },
  testInfo: {
    flex: 1,
    padding: 12,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  testCategory: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 8,
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 4,
    textAlign: 'right',
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  difficultyText: {
    fontSize: 14,
    color: theme.colors.gray,
    marginLeft: 4,
  },
  quickStartCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: 8,
  },
});

export default PlayScreen; 
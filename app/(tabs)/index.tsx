
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ana Sayfa</Text>
        <Text style={styles.subtitle}>Hoş geldiniz!</Text>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureCard}>
          <Ionicons name="star" size={32} color="#4285F4" />
          <Text style={styles.featureTitle}>Özellik 1</Text>
          <Text style={styles.featureText}>Lorem ipsum dolor sit amet</Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="heart" size={32} color="#34A853" />
          <Text style={styles.featureTitle}>Özellik 2</Text>
          <Text style={styles.featureText}>Consectetur adipiscing elit</Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="trophy" size={32} color="#FBBC05" />
          <Text style={styles.featureTitle}>Özellik 3</Text>
          <Text style={styles.featureText}>Sed do eiusmod tempor</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  featuresContainer: {
    padding: 20,
  },
  featureCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

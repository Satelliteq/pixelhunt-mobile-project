import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  resultTitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
  },
  resultMessage: {
    fontSize: 16,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Outfit_400Regular',
  },
  statsContainer: {
    width: '100%',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  statRowLast: {
    borderBottomWidth: 0,
  },
  statLabel: {
    fontSize: 16,
    color: '#71717A',
    fontFamily: 'Outfit_400Regular',
  },
  statValue: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Outfit_700Bold',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  secondaryButton: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  shareButton: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
});

const GameOverScreen = ({ isSuccess, score, completionTime, attemptsCount, handlePlayAgain, handleGoToHome, handleShare }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Oyun Bitti</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.resultContainer}>
          <View style={styles.resultIcon}>
            <Feather 
              name={isSuccess ? "check-circle" : "x-circle"} 
              size={40} 
              color={theme.colors.primary} 
            />
          </View>
          <Text style={styles.resultTitle}>
            {isSuccess ? "Tebrikler!" : "Tekrar Dene"}
          </Text>
          <Text style={styles.resultMessage}>
            {isSuccess 
              ? "Testi başarıyla tamamladınız!"
              : "Testi tamamlayamadınız. Tekrar denemek ister misiniz?"}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Toplam Puan</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Süre</Text>
            <Text style={styles.statValue}>{formatTime(completionTime)}</Text>
          </View>
          <View style={[styles.statRow, styles.statRowLast]}>
            <Text style={styles.statLabel}>Deneme Sayısı</Text>
            <Text style={styles.statValue}>{attemptsCount}</Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handlePlayAgain}
          >
            <Feather name="refresh-cw" size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Tekrar Oyna</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleGoToHome}
          >
            <Feather name="home" size={20} color="#fff" />
            <Text style={styles.secondaryButtonText}>Ana Sayfa</Text>
          </TouchableOpacity>

          {isSuccess && (
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Feather name="share-2" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Sonucu Paylaş</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GameOverScreen; 
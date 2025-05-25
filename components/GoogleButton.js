import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '../theme';
import { Feather } from '@expo/vector-icons';

export default function GoogleButton({ onPress, disabled, loading, text = "Google ile Giriş Yap", textStyle }) {
  return (
    <TouchableOpacity
      style={[
        styles.googleButton,
        disabled && styles.googleButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      <View style={styles.innerRow}>
        <FontAwesome name="google" size={24} color="#000" style={styles.googleIcon} />
        {loading ? (
          <ActivityIndicator size="small" color="#000" style={{ marginLeft: 8 }} />
        ) : (
          <Text style={[styles.googleButtonText, textStyle]}>{text}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 16,
    width: '100%',
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
}); 
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '../theme';

export default function GoogleButton({ onPress, disabled, loading, text = "Google ile Giriş Yap" }) {
  return (
    <TouchableOpacity
      style={[
        styles.googleButton,
        disabled && styles.googleButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.innerRow}>
        <FontAwesome name="google" size={24} color={theme.colors.text} style={styles.googleIcon} />
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.text} style={{ marginLeft: 8 }} />
        ) : (
          <Text style={styles.googleButtonText}>{text}</Text>
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
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
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
    marginRight: theme.spacing.md,
  },
  googleButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
}); 
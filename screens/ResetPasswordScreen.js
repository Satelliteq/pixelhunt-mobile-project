import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { theme } from '../theme';
import { sendPasswordResetEmail } from '../config/supabase';

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async () => {
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(email);
      Alert.alert('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Hata', 'Şifre sıfırlama işlemi sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifre Sıfırlama</Text>
      <Text style={styles.subtitle}>E-posta adresinizi girin, size bir şifre sıfırlama bağlantısı gönderelim.</Text>
      <TextInput
        style={styles.input}
        placeholder="E-posta adresi"
        placeholderTextColor={theme.colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Gönderiliyor...' : 'Bağlantı Gönder'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Geri Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  input: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.input,
    color: theme.colors.inputText,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginBottom: theme.spacing.lg,
    fontSize: 15,
  },
  button: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonText: {
    color: theme.colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  backText: {
    color: theme.colors.primary,
    marginTop: theme.spacing.md,
    fontWeight: 'bold',
  },
}); 
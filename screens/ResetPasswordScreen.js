// ResetPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; // İkonlar için
import { theme } from '../theme';
import { resetPassword } from '../config/firebase'; // Firebase fonksiyonu

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (text) => {
    // Basit e-posta format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailError('E-posta adresi boş bırakılamaz.');
      return false;
    }
    if (!emailRegex.test(text)) {
      setEmailError('Lütfen geçerli bir e-posta adresi girin.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleReset = async () => {
    if (!validateEmail(email)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Başarılı',
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
      setEmail(''); // Formu temizle
    } catch (error) {
      console.error("Password Reset Error:", error);
      let errorMessage = 'Şifre sıfırlama işlemi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi formatı.';
      }
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color={theme.colors.text} />
            </TouchableOpacity>
        </View>
        <View style={styles.content}>
            <Feather name="key" size={48} color={theme.colors.primary} style={styles.iconHeader} />
            <Text style={styles.title}>Şifreni mi Unuttun?</Text>
            <Text style={styles.subtitle}>
                Endişelenme! Kayıtlı e-posta adresini gir, sana şifreni sıfırlaman için bir bağlantı gönderelim.
            </Text>

            <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color={emailError ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, emailError && styles.inputErrorBorder]}
                    placeholder="E-posta Adresiniz"
                    placeholderTextColor={theme.colors.textPlaceholder || '#888'}
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) validateEmail(text); // Hata varsa anlık validasyon
                    }}
                    onBlur={() => validateEmail(email)} // Odaktan çıkınca validasyon
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isSubmitting}
                />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleReset}
                disabled={isSubmitting}
            >
            {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.background} />
            ) : (
                <Text style={styles.submitButtonText}>Sıfırlama Bağlantısı Gönder</Text>
            )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLinkButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLinkText}>Giriş Ekranına Dön</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center', // Dikeyde ortala
  },
  header: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? (theme.spacing.lg + 20) : theme.spacing.md, // SafeArea düşünülerek
      left: theme.spacing.md,
      zIndex: 1,
  },
  backButton: {
      padding: theme.spacing.sm, // Tıklama alanını artır
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl, // Butonların altına boşluk
    alignItems: 'center', // İçeriği yatayda ortala
  },
  iconHeader: {
      marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl, // Input öncesi boşluk
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground || theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 50,
    width: '100%', // Tam genişlik
    marginBottom: theme.spacing.xs, // Hata mesajı için boşluk
  },
  inputErrorBorder: {
    borderColor: theme.colors.error,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.inputText || theme.colors.text,
    fontSize: 15,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    alignSelf: 'flex-start', // Sola yasla
    marginBottom: theme.spacing.md, // Butondan önce boşluk
    paddingLeft: theme.spacing.xs,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginBottom: theme.spacing.lg, // Alt linkten önce boşluk
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.disabled || '#A0A0A0',
  },
  submitButtonText: {
    color: theme.colors.primaryForeground || theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLinkButton: {
      padding: theme.spacing.sm,
  },
  loginLinkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
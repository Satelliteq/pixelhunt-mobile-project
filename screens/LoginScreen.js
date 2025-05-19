// LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator, // Yükleme göstergesi için
  ScrollView, // İçerik taşarsa scroll için
  Dimensions,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { theme } from '../theme'; // Tema dosyanız
import { loginSchema } from '../utils/validation'; // Validasyon şemanız
import {
  signInWithEmail,
  signInWithFirebaseUsingGoogleToken,
} from '../config/firebase'; // Firebase fonksiyonları
import { Feather } from '@expo/vector-icons';
import GoogleButton from '../components/GoogleButton';
import { useNavigation } from '@react-navigation/native';
import { Button } from 'react-native-paper';
import * as Google from 'expo-auth-session/providers/google';

export default function LoginScreen() {
  const { width } = Dimensions.get('window');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const navigation = useNavigation();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset, // Formu temizlemek için
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { // Başlangıç değerleri
        email: '',
        password: '',
    }
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    androidClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    iosClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    webClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleSubmitting(true);
      const { id_token } = response.params;
      signInWithFirebaseUsingGoogleToken(id_token)
        .catch((error) => {
          let errorMessage = 'Google ile giriş yapılırken bir hata oluştu.';
          if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'Bu e-posta adresi başka bir giriş yöntemiyle zaten kayıtlı.';
          }
          Alert.alert('Google Giriş Hatası', errorMessage);
          console.error('Google Sign-In error:', error);
        })
        .finally(() => setGoogleSubmitting(false));
    }
  }, [response]);

  const onLogin = async (data) => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(data.email, data.password);
      reset(); // Formu temizle
    } catch (error) {
      let errorMessage = 'Giriş yapılırken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Yanlış şifre. Lütfen tekrar deneyin.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi formatı.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla hatalı giriş denemesi. Lütfen daha sonra tekrar deneyin.';
      }
      Alert.alert('Giriş Başarısız', errorMessage);
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleSubmitting(true);
      await promptAsync();
    } catch (error) {
      console.error('Google giriş hatası:', error);
      Alert.alert('Google Giriş Hatası', 'Google ile giriş yapılırken bir hata oluştu.');
    } finally {
      setGoogleSubmitting(false);
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
        <View style={styles.content}>
          <Image
            source={require('../assets/logo.png')} // Logonuzun yolu
            style={[styles.logo, { width: width * 0.5 }]}
            resizeMode="contain"
          />

          <Text style={styles.title}>Tekrar Hoş Geldin!</Text>
          <Text style={styles.subtitle}>
            Maceraya kaldığın yerden devam et.
          </Text>

          <GoogleButton
            onPress={handleGoogleLogin}
            disabled={!request || isSubmitting || googleSubmitting}
            loading={googleSubmitting}
            text="Google ile Giriş Yap"
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputOuterContainer}>
                  <View style={[styles.inputContainer, errors.email && styles.inputErrorBorder]}>
                    <Feather name="mail" size={20} color={errors.email ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="E-posta Adresiniz"
                      placeholderTextColor={theme.colors.textPlaceholder || '#888'}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!isSubmitting && !googleSubmitting}
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputOuterContainer}>
                  <View style={[styles.inputContainer, errors.password && styles.inputErrorBorder]}>
                    <Feather name="lock" size={20} color={errors.password ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Şifreniz"
                      placeholderTextColor={theme.colors.textPlaceholder || '#888'}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      editable={!isSubmitting && !googleSubmitting}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ResetPassword')}
              disabled={isSubmitting || googleSubmitting}
            >
              <Text style={styles.forgotPasswordText}>Şifreni mi unuttun?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, (isSubmitting || googleSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit(onLogin)}
              disabled={isSubmitting || googleSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Hesabın yok mu? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={isSubmitting || googleSubmitting}>
              <Text style={styles.footerLink}>Hemen Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center', // İçeriği dikeyde ortala
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl, // Üst ve altta daha fazla boşluk
    alignItems: 'center',
  },
  logo: {
    height: 80,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg, // Sosyal buton öncesi boşluk
    paddingHorizontal: theme.spacing.md, // Uzunsa taşmasın
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg, // Daha yuvarlak
    width: '100%',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: theme.colors.white, // Google için beyaz arkaplan
    borderColor: theme.colors.border, // Hafif bir sınır
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: theme.spacing.md,
  },
  googleButtonText: {
    color: theme.colors.black, // Google için siyah metin
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%', // Biraz daha dar
    marginVertical: theme.spacing.lg, // "VEYA" için daha fazla boşluk
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    fontSize: 12,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
  },
  inputOuterContainer: {
    marginBottom: theme.spacing.xs, // Hata mesajı için altta az boşluk
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground || theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border, // Varsayılan border
    height: 50, // Sabit yükseklik
    marginBottom: theme.spacing.sm, // Inputlar arası boşluk
  },
  inputErrorBorder: {
    borderColor: theme.colors.error, // Hata durumunda border rengi
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.inputText || theme.colors.text,
    fontSize: 15,
  },
  passwordToggle: {
    padding: theme.spacing.sm, // Tıklama alanını artır
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    paddingLeft: theme.spacing.xs, // Hafif içe al
    marginBottom: theme.spacing.sm, // Altındaki elemandan önce boşluk
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end', // Sağa yasla
    paddingVertical: theme.spacing.sm, // Tıklama alanı
    marginBottom: theme.spacing.md,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg, // Daha yuvarlak
    paddingVertical: 15, // Yüksekliği artır
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // ActivityIndicator için
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.disabled || '#A0A0A0',
  },
  submitButtonText: {
    color: theme.colors.primaryForeground || theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl, // Formdan sonra daha fazla boşluk
    paddingBottom: theme.spacing.md, // Ekranın altına çok yapışmasın
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
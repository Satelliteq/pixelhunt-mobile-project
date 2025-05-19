// SignupScreen.js
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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { theme } from '../theme';
import { signupSchema } from '../utils/validation'; // Validasyon şemanız
import {
  signUpWithEmail,
  signInWithFirebaseUsingGoogleToken,
} from '../config/firebase'; // Firebase fonksiyonları
import { Feather } from '@expo/vector-icons';
import GoogleButton from '../components/GoogleButton';
import * as Google from 'expo-auth-session/providers/google';

export default function SignupScreen({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    androidClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    iosClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    webClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
  });
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(signupSchema),
    defaultValues: {
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    }
  });

  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleSubmitting(true);
      const { id_token } = response.params;
      signInWithFirebaseUsingGoogleToken(id_token)
        .catch((error) => {
          let errorMessage = 'Google ile kayıt/giriş yapılırken bir hata oluştu.';
          if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'Bu e-posta adresi başka bir giriş yöntemiyle zaten kayıtlı.';
          }
          Alert.alert('Google Giriş Hatası', errorMessage);
          console.error('Google Sign-In error (Signup):', error);
        })
        .finally(() => setGoogleSubmitting(false));
    }
  }, [response]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await signUpWithEmail(data.email, data.password, data.name);
      // Başarılı kayıt sonrası onAuthStateChanged yönlendirmeyi halletmeli
      reset();
    } catch (error) {
      let errorMessage = 'Kayıt olurken bir hata oluştu. Lütfen bilgilerinizi kontrol edin.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda. Lütfen farklı bir e-posta deneyin veya giriş yapın.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf. Lütfen en az 6 karakterli daha güçlü bir şifre seçin.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi formatı.';
      }
      Alert.alert('Kayıt Başarısız', errorMessage);
      console.error("Signup error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleSubmitting(true);
      await promptAsync();
    } catch (error) {
      console.error('Google kayıt/giriş hatası:', error);
      Alert.alert('Google Giriş Hatası', 'Google ile kayıt/giriş yapılırken bir hata oluştu.');
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
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Aramıza Katıl!</Text>
          <Text style={styles.subtitle}>
            Hemen ücretsiz bir hesap oluştur ve eğlenceye başla.
          </Text>

          <GoogleButton
            onPress={handleGoogleSignup}
            disabled={!request || isSubmitting || googleSubmitting}
            loading={googleSubmitting}
            text="Google ile Devam Et"
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>VEYA</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputOuterContainer}>
                  <View style={[styles.inputContainer, errors.name && styles.inputErrorBorder]}>
                    <Feather name="user" size={20} color={errors.name ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Adınız Soyadınız"
                      placeholderTextColor={theme.colors.textPlaceholder || '#888'}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="words"
                      editable={!isSubmitting && !googleSubmitting}
                    />
                  </View>
                  {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
                </View>
              )}
            />

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
                      placeholder="Şifre (en az 6 karakter)"
                      placeholderTextColor={theme.colors.textPlaceholder || '#888'}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showPassword}
                      editable={!isSubmitting && !googleSubmitting}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                      <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputOuterContainer}>
                  <View style={[styles.inputContainer, errors.confirmPassword && styles.inputErrorBorder]}>
                    <Feather name="check-circle" size={20} color={errors.confirmPassword ? theme.colors.error : theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Şifreyi Tekrar Girin"
                      placeholderTextColor={theme.colors.textPlaceholder || '#888'}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={!showConfirmPassword}
                      editable={!isSubmitting && !googleSubmitting}
                    />
                     <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.passwordToggle} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                      <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.submitButton, (isSubmitting || googleSubmitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || googleSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>Hesap Oluştur</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Zaten bir hesabın var mı? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isSubmitting || googleSubmitting}>
              <Text style={styles.footerLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// LoginScreen'deki stillerle çok benzer, küçük farklar olabilir.
// Ortak bir AuthFormStyles.js dosyası oluşturulabilir.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: Platform.OS === 'web' ? 200 : 180,
    height: Platform.OS === 'web' ? 70 : 60,
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: theme.spacing.md,
  },
  googleButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: theme.spacing.lg,
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
    marginBottom: theme.spacing.xs,
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
    marginBottom: theme.spacing.sm,
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
  passwordToggle: {
    padding: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    paddingLeft: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: theme.spacing.sm, // Inputlardan sonra biraz boşluk
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
    marginTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
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
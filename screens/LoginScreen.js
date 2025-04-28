import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { theme } from '../theme';
import { loginSchema, registerSchema, signupSchema } from '../utils/validation';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // Buraya kendi client id'ni ekle

export default function LoginScreen({ navigation }) {
  const [tab, setTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form
  const {
    control: loginControl,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({ resolver: yupResolver(loginSchema) });

  // Signup form
  const {
    control: signupControl,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
  } = useForm({ resolver: yupResolver(signupSchema) });

  // Login işlemi
  const onLogin = async (data) => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(data.email, data.password);
      navigation.navigate('Main', { screen: 'Home' });
    } catch (error) {
      Alert.alert('Hata', 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Signup işlemi
  const onSignup = async (data) => {
    setIsSubmitting(true);
    try {
      await signUpWithEmail(data.email, data.password, data.name);
      Alert.alert('Başarılı', 'Kayıt başarılı. Lütfen e-posta adresinizi kontrol edin.');
      setTab('login');
    } catch (error) {
      Alert.alert('Hata', 'Kayıt olurken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google ile giriş
  const handleGoogleSignIn = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const result = await AuthSession.startAsync({
        authUrl:
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `&client_id=${GOOGLE_CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&response_type=token` +
          `&scope=profile%20email`,
      });
      if (result.type === 'success') {
        // Burada token ile supabase veya backend'e login işlemi yapılabilir
        navigation.navigate('Main', { screen: 'Home' });
      }
    } catch (error) {
      Alert.alert('Hata', 'Google ile giriş yapılırken bir hata oluştu.');
    }
  };

  // Şifremi unuttum
  const handleForgotPassword = () => {
    Alert.alert('Bilgi', 'Şifre sıfırlama için e-posta adresinizi girin.');
    // Buraya şifre sıfırlama işlemi eklenebilir
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.bg}
    >
      <View style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.logo}>Pixelhunt</Text>
          <Text style={styles.title}>{tab === 'login' ? 'Hesabınıza giriş yapın' : 'Yeni hesap oluşturun'}</Text>
          <Text style={styles.subtitle}>
            {tab === 'login'
              ? 'Test çözmeye devam etmek veya yeni testler oluşturmak için giriş yapın'
              : 'Ücretsiz hesap oluşturarak test çözün ve kendi testlerinizi oluşturun'}
          </Text>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Ionicons name="logo-google" size={24} color="#F9C406" style={{ marginRight: 8 }} />
            <Text style={styles.googleButtonText}>
              Google ile {tab === 'login' ? 'giriş yap' : 'kayıt ol'}
            </Text>
          </TouchableOpacity>

          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>veya e-posta ile</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Sekmeli butonlar */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}
              onPress={() => setTab('login')}
            >
              <Text style={[styles.tabButtonText, tab === 'login' && styles.tabButtonTextActive]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tab === 'signup' && styles.tabButtonActive]}
              onPress={() => setTab('signup')}
            >
              <Text style={[styles.tabButtonText, tab === 'signup' && styles.tabButtonTextActive]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          {tab === 'login' && (
            <>
              <Controller
                control={loginControl}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, loginErrors.email && styles.inputError]}
                      placeholder="E-posta adresi"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                )}
              />
              {loginErrors.email && <Text style={styles.errorText}>{loginErrors.email.message}</Text>}

              <Controller
                control={loginControl}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, loginErrors.password && styles.inputError]}
                      placeholder="Şifre"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {loginErrors.password && <Text style={styles.errorText}>{loginErrors.password.message}</Text>}

              <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Şifrenizi mi unuttunuz?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLoginSubmit(onLogin)}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>{isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}</Text>
              </TouchableOpacity>

              <Text style={styles.bottomText}>
                Hesabınız yok mu?{' '}
                <Text style={styles.bottomLink} onPress={() => setTab('signup')}>Kaydolun</Text>
              </Text>
            </>
          )}

          {/* Signup Form */}
          {tab === 'signup' && (
            <>
              <Controller
                control={signupControl}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, signupErrors.name && styles.inputError]}
                      placeholder="Kullanıcı adı"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="words"
                    />
                  </View>
                )}
              />
              {signupErrors.name && <Text style={styles.errorText}>{signupErrors.name.message}</Text>}

              <Controller
                control={signupControl}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, signupErrors.email && styles.inputError]}
                      placeholder="E-posta adresi"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                )}
              />
              {signupErrors.email && <Text style={styles.errorText}>{signupErrors.email.message}</Text>}

              <Controller
                control={signupControl}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, signupErrors.password && styles.inputError]}
                      placeholder="Şifre"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={theme.colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {signupErrors.password && <Text style={styles.errorText}>{signupErrors.password.message}</Text>}

              <Controller
                control={signupControl}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, signupErrors.confirmPassword && styles.inputError]}
                      placeholder="Şifreyi onaylayın"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                    />
                  </View>
                )}
              />
              {signupErrors.confirmPassword && <Text style={styles.errorText}>{signupErrors.confirmPassword.message}</Text>}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSignupSubmit(onSignup)}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>{isSubmitting ? 'Kayıt yapılıyor...' : 'Hesap Oluştur'}</Text>
              </TouchableOpacity>

              <Text style={styles.bottomText}>
                Zaten hesabınız var mı?{' '}
                <Text style={styles.bottomLink} onPress={() => setTab('login')}>Giriş yapın</Text>
              </Text>
            </>
          )}

          <Text style={styles.termsText}>
            Devam ederek <Text style={styles.termsLink}>Kullanım Şartlarını</Text> ve <Text style={styles.termsLink}>Gizlilik Politikasını</Text> kabul etmiş olursunuz
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '92%',
    maxWidth: 400,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'stretch',
  },
  logo: {
    ...theme.typography.h1,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F9C406',
  },
  googleButtonText: {
    color: '#F9C406',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  separatorText: {
    marginHorizontal: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.background,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  tabButtonTextActive: {
    color: theme.colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.input,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.inputText,
    fontSize: 15,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  passwordToggle: {
    marginLeft: theme.spacing.sm,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.md,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  submitButtonText: {
    color: theme.colors.primaryForeground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  bottomText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontSize: 13,
  },
  bottomLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  termsText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    marginTop: theme.spacing.lg,
  },
  termsLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
}); 
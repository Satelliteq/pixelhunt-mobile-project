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
    androidClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    iosClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    expoClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com'
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
        })
        .finally(() => setGoogleSubmitting(false));
    }
  }, [response]);

  const onLogin = async (data) => {
    setIsSubmitting(true);
    try {
      const user = await signInWithEmail(data.email, data.password);
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
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Giriş Başarısız', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleSubmitting(true);
      await promptAsync();
    } catch (error) {
      Alert.alert('Google Giriş Hatası', 'Google ile giriş yapılırken bir hata oluştu.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
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
            textStyle={styles.googleButtonText}
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
                      placeholderTextColor="#71717A"
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
                      placeholderTextColor="#71717A"
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
    backgroundColor: '#000',
  },
  scrollContentContainer: {
    flexGrow: 1,
    backgroundColor: '#000',
    minHeight: '100%',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#000',
    minHeight: '100%',
  },
  logo: {
    height: 80,
    marginBottom: 24,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Outfit_700Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Outfit_400Regular',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272A',
  },
  dividerText: {
    color: '#71717A',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  formContainer: {
    width: '100%',
  },
  inputOuterContainer: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    height: 50,
  },
  inputErrorBorder: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    height: '100%',
    paddingVertical: 0,
    paddingRight: 40,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Outfit_400Regular',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#71717A',
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    marginLeft: 4,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
});
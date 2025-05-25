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
  Dimensions,
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
  const { width } = Dimensions.get('window');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    iosClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com',
    expoClientId: '595531085941-48310a4460ade282d2a03c.apps.googleusercontent.com'
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
            source={require('../assets/logo.png')}
            style={[styles.logo, { width: width * 0.5 }]}
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
    height: 60,
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
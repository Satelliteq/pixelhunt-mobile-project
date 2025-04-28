import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme';
import { supabase } from '../config/supabase';
import ProfileAvatar from '../components/ProfileAvatar';
import * as ImagePicker from 'expo-image-picker';

const CreateTestScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchCategories();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('test-images')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('test-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCreateTest = async () => {
    if (!title || !category || !description || images.length === 0) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun ve en az bir görsel ekleyin.');
      return;
    }

    try {
      setLoading(true);

      // Görselleri yükle
      const uploadedImages = await Promise.all(images.map(uploadImage));

      // Testi oluştur
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title,
          description,
          category_id: category,
          creator_id: user.id,
          image_urls: uploadedImages,
          is_public: true,
          approved: false,
          featured: false,
          difficulty: 2,
          play_count: 0,
          like_count: 0
        })
        .select()
        .single();

      if (testError) throw testError;

      Alert.alert('Başarılı', 'Test başarıyla oluşturuldu!');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error creating test:', error);
      Alert.alert('Hata', 'Test oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Oluştur</Text>
        <ProfileAvatar user={user} size={36} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Test Başlığı</Text>
        <TextInput
          style={styles.input}
          placeholder="Test başlığını girin"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                category === cat.id && styles.selectedCategory
              ]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[
                styles.categoryText,
                category === cat.id && styles.selectedCategoryText
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Açıklama</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Test açıklamasını girin"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Görseller</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setImages(images.filter((_, i) => i !== index))}
              >
                <Feather name="x" size={20} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Feather name="plus" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreateTest}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Oluşturuluyor...' : 'Testi Oluştur'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: theme.colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    backgroundColor: theme.colors.primary,
  },
  categoryText: {
    color: theme.colors.text,
  },
  selectedCategoryText: {
    color: theme.colors.white,
  },
  imageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateTestScreen; 
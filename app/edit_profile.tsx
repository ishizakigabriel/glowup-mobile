import { useState, useEffect } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';

// Helper para escurecer cores
const darkenColor = (hex: string, factor: number = 0.2) => {
  if (!hex) return '#242426';
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  const r = Math.floor(((num >> 16) & 0xF8) * factor);
  const g = Math.floor(((num >> 8) & 0xF9) * factor);
  const b = Math.floor((num & 0xFA) * factor);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Paleta de cores
  const themeProfundo = '#3d0b37';
  const themePastel = '#e1bee7';
  const themeVivido = '#4a148c';
  const textColor = '#e8e9ea';
  const borderColor = 'rgba(255,255,255,0.2)';
  const placeholderColor = '#888888';

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/user', {
        headers: { Authorization: token }
      });
      setName(response.data.name);
      
      if (response.data.foto && !response.data.foto.startsWith('http')) {
        setAvatar(`https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/avatar/${response.data.foto}`);
      } else {
        setAvatar(response.data.avatar);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = () => {
    Alert.alert('Alterar Foto', 'Escolha uma opção', [
      { text: 'Câmera', onPress: openCamera },
      { text: 'Galeria', onPress: openGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permissão necessária', 'É necessário permitir o acesso à câmera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      formData.append('nome', name);
      formData.append('_method', 'PUT'); 
      
      if (avatar && !avatar.startsWith('http')) {
        const filename = avatar.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('avatar', { uri: avatar, name: filename, type });
      }

      await axios.post('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/perfil/edit_profile', formData, {
        headers: { 
          Authorization: token,
          'Content-Type': 'multipart/form-data',
        }
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themePastel} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themePastel }]}>
            <ThemedText style={{ color: '#252525', fontWeight: '600' }}>Voltar</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { shadowColor: themeVivido }]}>
          <View style={[styles.cardInner, { backgroundColor: 'transparent' }]}>
            <View style={styles.glassBackground} pointerEvents="none">
              <BlurView intensity={Platform.OS === 'android' ? 80 : 50} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
            </View>

            <View style={styles.cardContent}>
              
              <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                  <Image 
                    source={avatar ? { uri: avatar } : require('@/assets/images/placeholder.png')} 
                    style={styles.avatar} 
                  />
                  <View style={[styles.editIconBadge, { backgroundColor: themePastel }]}>
                    <Ionicons name="camera" size={20} color="#252525" />
                  </View>
                </TouchableOpacity>
                <ThemedText style={styles.changePhotoText}>Toque para alterar a foto</ThemedText>
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Nome</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: borderColor }]}
                  placeholder="Seu nome"
                  placeholderTextColor={placeholderColor}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: themePastel }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#252525" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Salvar Alterações</ThemedText>
                )}
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252525',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: '#F8F9FA',
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  cardInner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    padding: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#555',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#252525',
  },
  changePhotoText: {
    marginTop: 12,
    color: '#ccc',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#ccc',
    fontSize: 14,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  saveButton: {
    height: 50,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

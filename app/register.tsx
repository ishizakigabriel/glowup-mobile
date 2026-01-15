import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const themeProfundo = '#444';

  // Cores fixas para o tema dark/glass
  const textColor = '#FFFFFF';
  const borderColor = 'rgba(255,255,255,0.2)';
  const placeholderColor = '#888888';

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
        const api = axios.create({
            baseURL: 'https://ninfa-postlegal-bodhi.ngrok-free.dev/api', 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });
        
        // Endpoint de registro (ajuste conforme sua API, ex: 'register' ou 'signup')
        const response = await api.post('register', {
            email,
            password,
            password_confirmation: confirmPassword,
        });

        // Se a API retornar o token direto no cadastro, já logamos o usuário
        const token = response.data.token || response.data.access_token;

        if (token) {
            const bearerToken = `Bearer ${token}`;
            await AsyncStorage.setItem('userToken', bearerToken);
            router.replace('/(tabs)');
        } else {
            // Caso contrário, redireciona para o login
            Alert.alert('Sucesso', 'Conta criada com sucesso! Faça login para continuar.', [
                { text: 'OK', onPress: () => router.replace('/login') }
            ]);
        }
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Falha no cadastro. Verifique os dados e tente novamente.';
      Alert.alert('Erro no Cadastro', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.cardInner, { backgroundColor: 'transparent' }]}>
          <View style={styles.glassBackground} pointerEvents="none">
            <BlurView intensity={Platform.OS === 'android' ? 50 : 40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
          </View>

          <View style={styles.cardContent}>
            <ThemedText type="title" style={styles.title}>Crie sua conta</ThemedText>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: borderColor }]}
                placeholder="seu@email.com"
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Senha</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: borderColor }]}
                placeholder="Sua senha"
                placeholderTextColor={placeholderColor}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Confirmar Senha</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: borderColor }]}
                placeholder="Confirme sua senha"
                placeholderTextColor={placeholderColor}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors[theme].tint }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Cadastrar</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <ThemedText type="link">Já tem uma conta? Faça login</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#252525' },
  title: { textAlign: 'center', marginBottom: 40, color: '#fff' },
  inputContainer: { marginBottom: 20 },
  label: { marginBottom: 8, fontWeight: '600', color: '#ccc' },
  input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.2)' },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { marginTop: 20, alignItems: 'center' },
  card: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'transparent',
    shadowColor: '#000',
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
});

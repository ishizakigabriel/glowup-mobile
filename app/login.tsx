import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Cores dinâmicas para os inputs
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const borderColor = theme === 'dark' ? '#444444' : '#CCCCCC';
  const placeholderColor = theme === 'dark' ? '#888888' : '#999999';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
        const api = axios.create({
            // Sem barra no final de 'api'
            baseURL: 'https://ninfa-postlegal-bodhi.ngrok-free.dev/api', 
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });
        const response = await api.post('login', {
            email,
            password,
        });

        // Ajuste aqui dependendo se sua API retorna { token: "..." } ou { access_token: "..." }
        const token = response.data.token || response.data.access_token;

        if (token) {
            const bearerToken = `Bearer ${token}`;
            await AsyncStorage.setItem('userToken', bearerToken);
            
            // Redireciona para a área logada (tabs)
            router.replace('/(tabs)');
        } else {
            Alert.alert('Erro', 'Token não recebido da API.');
        }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro no Login', 'Falha na autenticação. Verifique suas credenciais ou conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Bem-vindo</ThemedText>

      <ThemedView style={styles.inputContainer}>
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
      </ThemedView>

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Senha</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, borderColor: borderColor }]}
          placeholder="Sua senha"
          placeholderTextColor={placeholderColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </ThemedView>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: Colors[theme].tint }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.buttonText}>Entrar</ThemedText>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/register')}
      >
        <ThemedText type="link">Não tem uma conta? Cadastre-se</ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <ThemedText type="link">Voltar à página inicial</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 20,
    alignItems: 'center',
  },
});
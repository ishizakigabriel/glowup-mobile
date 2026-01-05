import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Cores dinâmicas para os inputs (mesmo padrão do Login)
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const borderColor = theme === 'dark' ? '#444444' : '#CCCCCC';
  const placeholderColor = theme === 'dark' ? '#888888' : '#999999';

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
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Crie sua conta</ThemedText>

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

      <ThemedView style={styles.inputContainer}>
        <ThemedText style={styles.label}>Confirmar Senha</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, borderColor: borderColor }]}
          placeholder="Confirme sua senha"
          placeholderTextColor={placeholderColor}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
      </ThemedView>

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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { textAlign: 'center', marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  label: { marginBottom: 8, fontWeight: '600' },
  input: { height: 50, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, fontSize: 16 },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { marginTop: 20, alignItems: 'center' },
});

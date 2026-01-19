import { useState, useRef } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

// Helper para escurecer cores (padrão do projeto)
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

export default function EnderecoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;
  const numeroRef = useRef<TextInput>(null);
  
  // Estados do formulário
  const [nome, setNome] = useState(params.nome as string || '');
  const [cep, setCep] = useState(params.cep as string || '');
  const [logradouro, setLogradouro] = useState(params.logradouro as string || '');
  const [numero, setNumero] = useState(params.numero as string || '');
  const [complemento, setComplemento] = useState(params.complemento as string || '');
  const [bairro, setBairro] = useState(params.bairro as string || '');
  const [cidade, setCidade] = useState(params.cidade as string || '');
  const [estado, setEstado] = useState(params.estado as string || '');
  const [loadingCep, setLoadingCep] = useState(false);
  const [loading, setLoading] = useState(false);

  // Paleta de cores padrão
  const themeProfundo = '#3d0b37';
  const themePastel = '#e1bee7';
  const themeVivido = '#4a148c';
  const textColor = '#e8e9ea';
  const borderColor = 'rgba(255,255,255,0.2)';
  const placeholderColor = '#888888';

  const handleCepChange = async (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setCep(numericText);

    if (numericText.length === 8) {
      setLoadingCep(true);
      try {
        const { data } = await axios.get(`https://viacep.com.br/ws/${numericText}/json/`);
        if (data.erro) {
          Alert.alert('CEP não encontrado', 'Verifique o número digitado.');
        } else {
          setLogradouro(data.logradouro);
          setBairro(data.bairro);
          setCidade(data.localidade);
          setEstado(data.uf);
          numeroRef.current?.focus();
        }
      } catch (error) {
        Alert.alert('Erro', 'Falha ao consultar CEP.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSave = async () => {
    if (!nome || !cep || !logradouro || !numero || !bairro || !cidade || !estado) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        nome,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
      };
      console.log(payload);

      const baseURL = 'https://ninfa-postlegal-bodhi.ngrok-free.dev/api/enderecos';
      let response;

      if (id) {
        // Edit - PUT
        response = await axios.put(`${baseURL}/${id}`, payload, {
          headers: { Authorization: token }
        });
      } else {
        // New - POST
        response = await axios.post(baseURL, payload, {
          headers: { Authorization: token }
        });
      }

      const addressData = response.data.data || response.data;
      if (addressData && addressData.id) {
        await AsyncStorage.setItem('userAddressId', String(addressData.id));
      }
      
      // Salva o endereço formatado para exibição imediata no perfil
      const formattedAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}`;
      await AsyncStorage.setItem('userAddress', formattedAddress);

      Alert.alert('Sucesso', 'Endereço salvo com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o endereço.');
    } finally {
      setLoading(false);
    }
  };

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
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Nome (ex: Casa, Trabalho)</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: borderColor }]}
                  placeholder="Identificação do endereço"
                  placeholderTextColor={placeholderColor}
                  value={nome}
                  onChangeText={setNome}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>CEP</ThemedText>
                <View style={{ justifyContent: 'center' }}>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor: borderColor }]}
                    placeholder="00000-000"
                    placeholderTextColor={placeholderColor}
                    value={cep}
                    onChangeText={handleCepChange}
                    keyboardType="numeric"
                    maxLength={8}
                  />
                  {loadingCep && (
                    <ActivityIndicator 
                      size="small" 
                      color={themePastel} 
                      style={{ position: 'absolute', right: 10 }} 
                    />
                  )}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 2, marginRight: 10 }]}>
                    <ThemedText style={styles.label}>Rua</ThemedText>
                    <TextInput
                    style={[styles.input, { color: textColor, borderColor: borderColor }]}
                    placeholder="Nome da rua"
                    placeholderTextColor={placeholderColor}
                    value={logradouro}
                    onChangeText={setLogradouro}
                    />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                    <ThemedText style={styles.label}>Número</ThemedText>
                    <TextInput
                    ref={numeroRef}
                    style={[styles.input, { color: textColor, borderColor: borderColor }]}
                    placeholder="Nº"
                    placeholderTextColor={placeholderColor}
                    value={numero}
                    onChangeText={setNumero}
                    />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Complemento</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: borderColor }]}
                  placeholder="Apto, Bloco, etc."
                  placeholderTextColor={placeholderColor}
                  value={complemento}
                  onChangeText={setComplemento}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Bairro</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: borderColor }]}
                  placeholder="Bairro"
                  placeholderTextColor={placeholderColor}
                  value={bairro}
                  onChangeText={setBairro}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 2, marginRight: 10 }]}>
                    <ThemedText style={styles.label}>Cidade</ThemedText>
                    <TextInput
                    style={[styles.input, { color: textColor, borderColor: borderColor }]}
                    placeholder="Cidade"
                    placeholderTextColor={placeholderColor}
                    value={cidade}
                    onChangeText={setCidade}
                    />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                    <ThemedText style={styles.label}>UF</ThemedText>
                    <TextInput
                    style={[styles.input, { color: textColor, borderColor: borderColor }]}
                    placeholder="UF"
                    placeholderTextColor={placeholderColor}
                    value={estado}
                    onChangeText={setEstado}
                    maxLength={2}
                    autoCapitalize="characters"
                    />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: themePastel }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#252525" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Salvar Endereço</ThemedText>
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
  cardTitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
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
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    height: 50,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

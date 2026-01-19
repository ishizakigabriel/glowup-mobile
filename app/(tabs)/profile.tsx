import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Notifications from 'expo-notifications';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function ProfileScreen() {
  const router = useRouter();
  const addressSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '75%'], []);
  const [user, setUser] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [raioBusca, setRaioBusca] = useState(10);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminder2hEnabled, setReminder2hEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Paleta de cores
  const themeProfundo = '#3d0b37';
  const themePastel = '#e1bee7';
  const themeVivido = '#4a148c';
  const textColor = '#e8e9ea';
  const themeRedPastel = '#E57373';
  const themeCarbon = '#252525';

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchAddress();
    }, [])
  );

  const handleOpenAddressSheet = useCallback(() => {
    addressSheetRef.current?.expand();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.7}
      />
    ),
    []
  );

  const fetchAddress = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('userAddress');
      const storedId = await AsyncStorage.getItem('userAddressId');
      setAddress(storedAddress);
      setSelectedAddressId(storedId);
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await axios.get('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/user', {
        headers: { Authorization: token }
      });
      
      setUser(response.data);
      if (response.data.raio_busca) {
        setRaioBusca(Number(response.data.raio_busca));
      }
      if (response.data.aviso_24h !== undefined) {
        setReminderEnabled(Number(response.data.aviso_24h) === 1);
      }
      if (response.data.aviso_2h !== undefined) {
        setReminder2hEnabled(Number(response.data.aviso_2h) === 1);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = async (item: any) => {
    const formatted = `${item.logradouro}, ${item.numero} - ${item.bairro}, ${item.cidade} - ${item.estado}`;
    await AsyncStorage.setItem('userAddress', formatted);
    await AsyncStorage.setItem('userAddressId', String(item.id));
    setAddress(formatted);
    setSelectedAddressId(String(item.id));
    addressSheetRef.current?.close();
  };

  const handleSelectCurrentLocation = async () => {
    await AsyncStorage.removeItem('userAddress');
    await AsyncStorage.removeItem('userAddressId');
    setAddress(null);
    setSelectedAddressId(null);
    addressSheetRef.current?.close();
  };

  const handleLogout = async () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Sair', 
        style: 'destructive', 
        onPress: async () => {
          await AsyncStorage.removeItem('userToken');
          router.replace('/login');
        }
      }
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert('Excluir conta', 'Tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          await AsyncStorage.removeItem('userToken');
          router.replace('/login');
        }
      }
    ]);
  };

  const handleEditAddress = (item: any) => {
    addressSheetRef.current?.close();
    router.push({
      pathname: '/endereco',
      params: { 
        id: item.id,
        nome: item.nome,
        cep: item.cep,
        logradouro: item.logradouro,
        numero: item.numero,
        complemento: item.complemento,
        bairro: item.bairro,
        cidade: item.cidade,
        estado: item.estado
      }
    });
  };

  const handleDeleteAddress = async (id: number) => {
    Alert.alert('Excluir Endereço', 'Tem certeza que deseja excluir este endereço?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await axios.delete(`https://ninfa-postlegal-bodhi.ngrok-free.dev/api/enderecos/${id}`, {
              headers: { Authorization: token }
            });
            if (String(selectedAddressId) === String(id)) {
              await handleSelectCurrentLocation();
            }
            fetchUser();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir o endereço.');
          }
        }
      }
    ]);
  };

  const handleUpdateRaioBusca = async (value: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/perfil/raio_busca', {
        raio_busca: value
      }, {
        headers: { Authorization: token }
      });
    } catch (error) {
      console.error('Erro ao atualizar raio de busca:', error);
      Alert.alert('Erro', 'Não foi possível salvar o raio de busca.');
    }
  };

  const handleToggleReminder24h = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permissão necessária', 'Por favor, habilite as notificações nas configurações do seu dispositivo para receber lembretes.');
          return;
        }
      }
    }

    setReminderEnabled(value);

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/perfil/aviso_24h', {
        aviso_24h: value ? 1 : 0
      }, {
        headers: { Authorization: token }
      });
    } catch (error) {
      console.error('Erro ao atualizar aviso 24h:', error);
      setReminderEnabled(!value); // Reverte o estado em caso de erro
      Alert.alert('Erro', 'Não foi possível salvar a preferência.');
    }
  };

  const handleToggleReminder2h = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          Alert.alert('Permissão necessária', 'Por favor, habilite as notificações nas configurações do seu dispositivo para receber lembretes.');
          return;
        }
      }
    }

    setReminder2hEnabled(value);

    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/perfil/aviso_2h', {
        aviso_2h: value ? 1 : 0
      }, {
        headers: { Authorization: token }
      });
    } catch (error) {
      console.error('Erro ao atualizar aviso 2h:', error);
      setReminder2hEnabled(!value); // Reverte o estado em caso de erro
      Alert.alert('Erro', 'Não foi possível salvar a preferência.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themePastel} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.screenTitle}>Perfil</ThemedText>

        {/* Card do Perfil */}
        <View style={[styles.card, { shadowColor: themeVivido }]}>
          <View style={[styles.cardInner, { borderColor: themeProfundo, backgroundColor: 'transparent' }]}>
            <View style={styles.glassBackground} pointerEvents="none">
              <BlurView intensity={Platform.OS === 'android' ? 80 : 50} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
            </View>

            <View style={styles.cardContent}>
              <View style={styles.profileHeader}>
                <Image 
                  source={user?.foto ? { uri: user.foto.startsWith('http') ? user.foto : `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/avatar/${user.foto}` } : require('@/assets/images/placeholder.png')} 
                  style={styles.avatar} 
                />
                <View style={styles.userInfo}>
                  <ThemedText type="subtitle" style={[styles.userName, { color: textColor }]}>{user?.name || 'Usuário'}</ThemedText>
                  <ThemedText style={styles.userEmail}>{user?.email || 'email@exemplo.com'}</ThemedText>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => router.push('/edit_profile')}>
                  <Ionicons name="pencil" size={20} color={themePastel} />
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.optionRow} onPress={handleOpenAddressSheet}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(225, 190, 231, 0.1)' }]}>
                  <Ionicons name="location-outline" size={22} color={themePastel} />
                </View>
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionValue}>
                    {address 
                      ? (user?.enderecos?.find((e: any) => String(e.id) === String(selectedAddressId))?.nome || 'Endereço') 
                      : 'Sua localização atual'}
                  </ThemedText>
                  <ThemedText style={styles.optionLabel} numberOfLines={1}>{address || 'Usar localização do dispositivo'}</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
              <View style={styles.optionRow}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(225, 190, 231, 0.1)' }]}>
                  <Ionicons name="radio-button-on" size={22} color={themePastel} />
                </View>
                <View style={styles.optionTextContainer}>
                  <View style={styles.sliderHeader}>
                    <ThemedText style={styles.optionLabel}>Raio de busca</ThemedText>
                    <ThemedText style={styles.optionValue}>{raioBusca} km</ThemedText>
                  </View>
                  <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={1}
                    maximumValue={50}
                    step={1}
                    value={raioBusca}
                    onValueChange={setRaioBusca}
                    onSlidingComplete={handleUpdateRaioBusca}
                    minimumTrackTintColor={themePastel}
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor={themePastel}
                  />
                </View>
              </View>

              <View style={styles.optionRow}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(225, 190, 231, 0.1)' }]}>
                  <Ionicons name="alarm-outline" size={22} color={themePastel} />
                </View>
                <View style={styles.optionTextContainer}>
                  <View style={styles.switchContainer}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <ThemedText style={styles.optionValue}>Lembrete de véspera</ThemedText>
                      <ThemedText style={styles.optionDescription}>Me avise 24 horas antes para eu organizar meu dia</ThemedText>
                    </View>
                    <Switch
                      trackColor={{ false: "#767577", true: themePastel }}
                      thumbColor={Platform.OS === 'ios' ? '#fff' : "#f4f3f4"}
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={handleToggleReminder24h}
                      value={reminderEnabled}
                    />
                  </View>
                  <View style={{ height: 16 }} />
                  <View style={styles.switchContainer}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <ThemedText style={styles.optionValue}>Lembrete de saída</ThemedText>
                      <ThemedText style={styles.optionDescription}>Me lembre duas horas antes que está quase no horário do meu compromisso</ThemedText>
                    </View>
                    <Switch
                      trackColor={{ false: "#767577", true: themePastel }}
                      thumbColor={Platform.OS === 'ios' ? '#fff' : "#f4f3f4"}
                      ios_backgroundColor="#3e3e3e"
                      onValueChange={handleToggleReminder2h}
                      value={reminder2hEnabled}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.footerButtons}>
                <TouchableOpacity 
                  style={[styles.footerBtn, { borderColor: themeRedPastel, borderWidth: 1 }]} 
                  onPress={handleDeleteAccount}
                >
                  <ThemedText style={{ color: themeRedPastel, fontWeight: '600' }}>Excluir conta</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.footerBtn, { backgroundColor: themeRedPastel }]} 
                  onPress={handleLogout}
                >
                  <ThemedText style={{ color: themeCarbon, fontWeight: '600' }}>Sair da conta</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      <BottomSheet
        ref={addressSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#2E2E30' }}
        handleIndicatorStyle={{ backgroundColor: '#ccc' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
          <ThemedText type="title" style={{ color: '#F8F9FA', marginBottom: 20 }}>Meus Endereços</ThemedText>
          
          <TouchableOpacity 
            style={[styles.addressItem, !selectedAddressId && { borderColor: themePastel, borderWidth: 1 }]}
            onPress={handleSelectCurrentLocation}
          >
            <Ionicons name="navigate" size={24} color={themePastel} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Sua localização atual</ThemedText>
              <ThemedText style={{ color: '#ccc' }}>Usar localização do dispositivo</ThemedText>
            </View>
            {!selectedAddressId && <Ionicons name="checkmark-circle" size={24} color={themePastel} />}
          </TouchableOpacity>

          {user?.enderecos?.map((item: any) => (
            <View 
              key={item.id}
              style={[styles.addressItem, String(selectedAddressId) === String(item.id) && { borderColor: themePastel, borderWidth: 1 }]}
            >
              <TouchableOpacity 
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => handleSelectAddress(item)}
              >
                <Ionicons name="location" size={24} color={themePastel} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>{item.nome || 'Endereço'}</ThemedText>
                  <ThemedText style={{ color: '#ccc' }} numberOfLines={1}>
                    {`${item.logradouro}, ${item.numero}${item.complemento ? ' - ' + item.complemento : ''}`}
                  </ThemedText>
                </View>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 8 }}>
                {String(selectedAddressId) === String(item.id) && (
                  <Ionicons name="checkmark-circle" size={24} color={themePastel} />
                )}
                <TouchableOpacity onPress={() => handleEditAddress(item)}>
                  <Ionicons name="pencil-outline" size={20} color="#ccc" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAddress(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity 
            style={[styles.addAddressButton, { backgroundColor: themePastel }]}
            onPress={() => {
              addressSheetRef.current?.close();
              router.push('/endereco');
            }}
          >
            <ThemedText style={{ color: themeCarbon, fontWeight: 'bold' }}>Adicionar endereço</ThemedText>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252525',
  },
  content: {
    padding: 20,
  },
  screenTitle: {
    fontSize: 28,
    color: '#F8F9FA',
    marginBottom: 20,
  },
  // Card Styles (Glassmorphism)
  card: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'transparent',
    marginBottom: 24,
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
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#555',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#ccc',
  },
  editButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 16,
    color: '#e8e9ea',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
    lineHeight: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addAddressButton: {
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
    marginTop: 10,
  },
});

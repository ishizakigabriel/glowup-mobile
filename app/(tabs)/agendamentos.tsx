import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Platform, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

interface Agendamento {
  id: number;
  data: string;
  inicio: string;
  fim: string;
  status: number;
  created_at: string;
  servico: {
    nome: string;
    preco: string;
    categoria?: {
      cor_pastel: string;
      cor_vivido: string;
    };
  };
  estabelecimento: {
    nome: string;
    imagem?: string;
    logradouro?: string;
    lat?: string;
    long?: string;
  };
  colaborador?: {
    nome: string;
    telefone?: string;
  };
}

export default function AgendamentosScreen() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'futuros' | 'passados'>('futuros');

  const fetchAgendamentos = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
        
      const response = await axios.get('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/agendamentos', {
        headers: {
          Authorization: token,
          Accept: 'application/json',
        },
      });

      // Garante que pegamos o array correto independente do formato da resposta (com ou sem wrapper 'data')
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setAgendamentos(data);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Atualiza a lista sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchAgendamentos();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgendamentos();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const handleConfirm = (item: Agendamento) => {
    router.push({
      pathname: '/resumo',
      params: {
        agendamentoId: item.id,
        dataAgendamento: item.data,
        horarioAgendamento: item.inicio ? item.inicio.substring(0, 5) : '',
        fimAgendamento: item.fim ? item.fim.substring(0, 5) : '',
        servico: JSON.stringify(item.servico),
        estabelecimento: JSON.stringify(item.estabelecimento),
        colaborador: item.colaborador ? JSON.stringify(item.colaborador) : '',
      }
    });
  };

  const handleCancel = async (id: number) => {
    Alert.alert('Cancelar', 'Deseja realmente cancelar este agendamento?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Sim', style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          await axios.get(`https://ninfa-postlegal-bodhi.ngrok-free.dev/api/agendamentos/${id}/cancelar`, {
            headers: { Authorization: token || '' }
          });
          fetchAgendamentos(); // Recarrega a lista
        } catch (error) {
          Alert.alert('Erro', 'Não foi possível cancelar o agendamento.');
        }
      }}
    ]);
  };

  const handleOpenMaps = (lat?: string, long?: string, label?: string) => {
    if (!lat || !long) return;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${long}`;
    const urlLabel = label || 'Estabelecimento';
    const url = Platform.select({
      ios: `${scheme}${urlLabel}@${latLng}`,
      android: `${scheme}${latLng}(${urlLabel})`
    });
    if (url) Linking.openURL(url);
  };

  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  // Lógica de filtro e ordenação
  const filteredAgendamentos = agendamentos.filter((item) => {
    const itemDateTimeStr = `${item.data}T${item.inicio}`;
    const itemDate = new Date(itemDateTimeStr);
    const now = new Date();
    
    if (activeTab === 'futuros') {
      return itemDate >= now;
    } else {
      return itemDate < now;
    }
  }).filter((item) => {
    // Regra: Status 0 (Pendente) só exibe se criado há menos de 15 min
    if (item.status === 0) {
      const createdAt = new Date(item.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - createdAt) / 1000 / 60;
      return diffMinutes < 15;
    }
    return true;
  }).sort((a, b) => {
    const dateA = new Date(`${a.data}T${a.inicio}`).getTime();
    const dateB = new Date(`${b.data}T${b.inicio}`).getTime();
    // Futuros: mais próximo primeiro | Passados: mais recente primeiro
    return activeTab === 'futuros' ? dateA - dateB : dateB - dateA;
  });

  const renderItem = ({ item }: { item: Agendamento }) => {
    const corVivido = item.servico.categoria?.cor_vivido || '#E74C3C';
    const corPastel = item.servico.categoria?.cor_pastel || '#3498DB';

    let badgeColor = '#555';
    let badgeTextColor = '#fff';

    if (item.status === 0) {
      badgeColor = '#FFB347'; // Laranja Pastel
      badgeTextColor = '#252525';
    } else if (activeTab === 'futuros') {
      badgeColor = '#A8E6CF'; // Verde Pastel
      badgeTextColor = '#252525';
    }

    return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
            <ThemedText style={styles.dateText}>{formatDate(item.data)}</ThemedText>
            <ThemedText style={styles.timeText}>{formatTime(item.inicio)}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
            <ThemedText style={[styles.statusText, { color: badgeTextColor }]}>
                {item.status === 0 ? 'Pendente' : (activeTab === 'futuros' ? 'Confirmado' : 'Concluído')}
            </ThemedText>
        </View>
      </View>
      
      <View style={styles.divider} />

      <View style={styles.cardBody}>
        {item.estabelecimento.imagem && (
            <Image 
                source={{ uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/logos/${item.estabelecimento.imagem}` }} 
                style={styles.estabLogo} 
            />
        )}
        <View style={styles.infoContainer}>
            <ThemedText type="subtitle" style={styles.serviceName}>{item.servico.nome}</ThemedText>
            <ThemedText style={styles.estabName}>{item.estabelecimento.nome}</ThemedText>
            {item.colaborador && (
                <ThemedText style={styles.colaboradorName}>Profissional: {item.colaborador.nome}</ThemedText>
            )}
        </View>
      </View>

      {/* Ações para Agendamentos Futuros */}
      {activeTab === 'futuros' && (
        <View style={styles.actionsContainer}>
          {item.status === 0 && (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8E44AD' }]} onPress={() => handleConfirm(item)}>
              <ThemedText style={styles.actionButtonText}>Confirmar</ThemedText>
            </TouchableOpacity>
          )}
          
          {item.status === 1 && (
            <>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#252525', borderColor: corVivido, borderWidth: 1, flex: 1 }]} onPress={() => handleCancel(item.id)}>
                <ThemedText style={[styles.actionButtonText, { color: corPastel }]}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: corPastel, flex: 1 }]} onPress={() => handleOpenMaps(item.estabelecimento.lat, item.estabelecimento.long, item.estabelecimento.nome)}>
                <ThemedText style={[styles.actionButtonText, { color: '#252525' }]}>Como Chegar</ThemedText>
              </TouchableOpacity>
              {item.colaborador?.telefone && (
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#25D366', width: 50 }]} onPress={() => handleOpenWhatsApp(item.colaborador?.telefone)}>
                  <ThemedText style={styles.actionButtonText}>W</ThemedText>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Meus Agendamentos</ThemedText>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'futuros' && styles.activeTab]}
            onPress={() => setActiveTab('futuros')}
        >
            <ThemedText style={[styles.tabText, activeTab === 'futuros' && styles.activeTabText]}>Próximos</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'passados' && styles.activeTab]}
            onPress={() => setActiveTab('passados')}
        >
            <ThemedText style={[styles.tabText, activeTab === 'passados' && styles.activeTabText]}>Histórico</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8E44AD" />
        </View>
      ) : (
        <FlatList
          data={filteredAgendamentos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                    {activeTab === 'futuros' 
                        ? 'Você não tem agendamentos futuros.' 
                        : 'Você não tem agendamentos passados.'}
                </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#252525' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 28, color: '#F8F9FA' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.1)' },
  activeTab: { borderBottomColor: '#8E44AD' },
  tabText: { fontSize: 16, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#F8F9FA' },
  listContent: { padding: 20, paddingTop: 0, gap: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', fontSize: 16 },
  card: {
    backgroundColor: '#2E2E30',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#F8F9FA' },
  timeText: { fontSize: 16, color: '#ccc' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 32 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  estabLogo: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#444' },
  infoContainer: { flex: 1 },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#F8F9FA', marginBottom: 2 },
  estabName: { fontSize: 14, color: '#ccc', marginBottom: 2 },
  colaboradorName: { fontSize: 12, color: '#888' },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

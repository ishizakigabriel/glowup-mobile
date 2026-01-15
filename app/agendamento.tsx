import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Helper para escurecer cores (mesma lógica das telas anteriores)
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

// Helper para formatar data YYYY-MM-DD
const formatDateForApi = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper para gerar dias do calendário
const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export default function AgendamentoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extração e tratamento de parâmetros
  const estabelecimentoId = params.estabelecimentoId;
  const servicoId = params.servicoId;
  const colaboradorId = params.colaboradorId ? Number(params.colaboradorId) : null;
  const nomeServico = params.nomeServico as string;
  const precoServico = params.precoServico as string;
  const nomeEstabelecimento = params.nomeEstabelecimento as string;
  const nomeColaborador = params.nomeColaborador as string; // Opcional, apenas para display
  
  // Cores do tema
  const themeProfundo = (params.corProfundo as string) || '#444';
  const themePastel = (params.corPastel as string) || '#8E44AD';
  const themeVivido = (params.corVivido as string) || '#000';

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [horarios, setHorarios] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const calendarListRef = useRef<FlatList>(null);

  const dates = generateDates();

  useEffect(() => {
    fetchHorarios();
    setSelectedTime(null); // Reseta horário ao mudar data
  }, [selectedDate]);

  const fetchHorarios = async () => {
    setLoading(true);
    try {
      const payload = {
        data: formatDateForApi(selectedDate),
        servico_id: Number(servicoId),
        ...(colaboradorId && { colaborador_id: colaboradorId }),
      };

      const url = `https://ninfa-postlegal-bodhi.ngrok-free.dev/api/estabelecimento/${estabelecimentoId}/horarios-disponiveis`;
      const response = await axios.post(
        url,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );
      
      // Assume que a API retorna um array de strings ["08:00", "08:30", ...]
      setHorarios(response.data.data || response.data || []);
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      setHorarios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAgendamento = async () => {
    if (!selectedTime) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const payload = {
        data: formatDateForApi(selectedDate),
        servico_id: Number(servicoId),
        ...(colaboradorId && { colaborador_id: colaboradorId }),
        horario: selectedTime,
      };

      const url = `https://ninfa-postlegal-bodhi.ngrok-free.dev/api/estabelecimento/${estabelecimentoId}/lock-horario`;
      
      const response = await axios.post(
        url,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': token || '',
          },
        }
      );

      if (response.status === 201) {
        
        const agendamento = response.data;

        router.push({
          pathname: '/resumo',
          params: { 
            ...params, 
            agendamentoId: agendamento.id,
            dataAgendamento: agendamento.data, 
            horarioAgendamento: agendamento.inicio ? agendamento.inicio.substring(0, 5) : agendamento.inicio,
            fimAgendamento: agendamento.fim ? agendamento.fim.substring(0, 5) : agendamento.fim,
            servico: JSON.stringify(agendamento.servico),
            estabelecimento: JSON.stringify(agendamento.estabelecimento),
            colaborador: agendamento.colaborador ? JSON.stringify(agendamento.colaborador) : '',
          }
        });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 422) {
        const responseData = error.response.data;
        Alert.alert('Atenção', responseData.message || 'Este horário não está mais disponível.');
        
        const updatedSlots = responseData.horarios || responseData.data;
        if (Array.isArray(updatedSlots)) {
          setHorarios(updatedSlots);
        } else {
          fetchHorarios();
        }
        setSelectedTime(null);
      } else {
        Alert.alert('Erro', 'Não foi possível realizar o agendamento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Agrupamento de horários
  const morningSlots = horarios.filter(h => parseInt(h.split(':')[0]) < 12);
  const afternoonSlots = horarios.filter(h => {
    const hour = parseInt(h.split(':')[0]);
    return hour >= 12 && hour < 18;
  });
  const eveningSlots = horarios.filter(h => parseInt(h.split(':')[0]) >= 18);

  const renderTimeSection = (title: string, slots: string[]) => {
    if (slots.length === 0) return null;
    return (
      <View style={styles.sectionContainer}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <View style={styles.chipsContainer}>
          {slots.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[
                  styles.chip,
                  { borderColor: themeProfundo },
                  isSelected && { backgroundColor: themePastel, borderColor: themePastel }
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <ThemedText style={[styles.chipText, isSelected && { fontWeight: 'bold', color: '#252525' }]}>
                  {time.substring(0, 5)}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themePastel }]}>
          <ThemedText style={{ color: '#252525', fontWeight: '600' }}>Voltar</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Glassmorphism com Resumo */}
        <View style={[styles.card, { shadowColor: themeVivido }]}>
          <View style={[styles.cardInner, { borderColor: themeProfundo, backgroundColor: 'transparent' }]}>
            <View style={styles.glassBackground} pointerEvents="none">
              <BlurView intensity={Platform.OS === 'android' ? 50 : 40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
            </View>
            
            <View style={styles.cardContent}>
              <ThemedText type="subtitle" style={styles.serviceName}>{nomeServico}</ThemedText>
              <ThemedText style={styles.estabName}>{nomeEstabelecimento}</ThemedText>
              
              <View style={styles.divider} />
              
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Profissional:</ThemedText>
                <ThemedText style={[styles.value, { color: themePastel }]}>
                  {nomeColaborador || 'Automático'}
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Valor:</ThemedText>
                <ThemedText style={styles.value}>{precoServico}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarContainer}>
          <FlatList
            ref={calendarListRef}
            data={dates}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.toISOString()}
            contentContainerStyle={styles.calendarContent}
            renderItem={({ item }) => {
              const isSelected = item.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  style={[
                    styles.dateItem,
                    isSelected && { backgroundColor: themePastel }
                  ]}
                  onPress={() => setSelectedDate(item)}
                >
                  <ThemedText style={[styles.dayName, isSelected && { color: '#252525' }]}>
                    {WEEKDAYS[item.getDay()]}
                  </ThemedText>
                  <ThemedText style={[styles.dayNumber, isSelected && { color: '#252525' }]}>
                    {item.getDate()}
                  </ThemedText>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Horários Disponíveis */}
        <View style={styles.slotsContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={themePastel} style={{ marginTop: 40 }} />
          ) : horarios.length === 0 ? (
            <ThemedText style={styles.emptyText}>Não há horários disponíveis para esta data.</ThemedText>
          ) : (
            <>
              {renderTimeSection('Manhã', morningSlots)}
              {renderTimeSection('Tarde', afternoonSlots)}
              {renderTimeSection('Noite', eveningSlots)}
            </>
          )}
        </View>
      </ScrollView>

      {/* Botão de Confirmar (Fixo no rodapé se houver horário selecionado) */}
      {selectedTime && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.confirmButton, { backgroundColor: themePastel }]}
            onPress={handleAgendamento}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#252525" />
            ) : (
              <ThemedText style={styles.confirmButtonText}>Confirmar Agendamento</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252525',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Estilos do Card Glass
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'transparent',
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
  serviceName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  estabName: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#aaa',
    fontSize: 14,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Calendar Strip
  calendarContainer: {
    marginBottom: 20,
  },
  calendarContent: {
    paddingHorizontal: 16,
  },
  dateItem: {
    width: 60,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#333',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayName: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Slots
  slotsContainer: {
    paddingHorizontal: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ddd',
    marginBottom: 12,
    marginLeft: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    minWidth: 80,
    alignItems: 'center',
  },
  chipText: {
    color: '#ccc',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#252525',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

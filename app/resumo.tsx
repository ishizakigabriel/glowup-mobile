import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
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

// Helper para formatar data (YYYY-MM-DD -> DD/MM/YYYY)
const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export default function ResumoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  // Extração de parâmetros
  const {
    dataAgendamento,
    horarioAgendamento,
    fimAgendamento,
    servico,
    estabelecimento,
    colaborador,
    agendamentoId,
  } = params;

  const servicoObj = servico ? JSON.parse(servico as string) : null;
  const estabelecimentoObj = estabelecimento ? JSON.parse(estabelecimento as string) : null;
  const colaboradorObj = colaborador ? JSON.parse(colaborador as string) : null;

  const formatPrice = (price: any) => {
    if (!price) return 'R$ 0,00';
    return `R$ ${Number(price).toFixed(2).replace('.', ',')}`;
  };

  // Cores do tema
  const themeProfundo = (params.corProfundo as string) || '#444';
  const themePastel = (params.corPastel as string) || '#8E44AD';
  const themeVivido = (params.corVivido as string) || '#000';

  const handleConfirmarAgendamento = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.get(
        `https://ninfa-postlegal-bodhi.ngrok-free.dev/api/agendamentos/${agendamentoId}/confirmar`,
        {
          headers: { Authorization: token || '' }
        }
      );

      if (response.status === 200) {
        Alert.alert(
          'Sucesso!',
          'Seu agendamento foi confirmado com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)/agendamentos'),
            },
          ]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível confirmar o agendamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themePastel }]}>
          <ThemedText style={{ color: '#252525', fontWeight: '600' }}>Voltar</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Resumo</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.instructionText}>
          Confira os detalhes do seu agendamento antes de confirmar.
        </ThemedText>

        {/* Card Glassmorphism */}
        <View style={[styles.card, { shadowColor: themeVivido }]}>
          <View style={[styles.cardInner, { borderColor: themeProfundo, backgroundColor: 'transparent' }]}>
            <View style={styles.glassBackground} pointerEvents="none">
              <BlurView intensity={Platform.OS === 'android' ? 50 : 40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle" style={styles.serviceName}>{servicoObj?.nome}</ThemedText>
                  <ThemedText style={styles.estabName}>{estabelecimentoObj?.nome}</ThemedText>
                </View>
                {estabelecimentoObj?.imagem && (
                  <Image
                    source={{ uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/logos/${estabelecimentoObj.imagem}` }}
                    style={styles.estabLogo}
                  />
                )}
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.professionalRow}>
                <Image source={colaboradorObj?.foto ? { uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/colaboradores/${colaboradorObj.foto}` } : require('@/assets/images/placeholder.png')} style={styles.colaboradorPhoto} />
                <ThemedText style={[styles.colaboradorName, { color: themePastel }]}>{colaboradorObj?.nome || 'Profissional Selecionado'}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Data</ThemedText>
                <ThemedText style={styles.value}>
                  {formatDateDisplay(dataAgendamento as string)}
                </ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Horário</ThemedText>
                <ThemedText style={styles.value}>{horarioAgendamento} - {fimAgendamento}</ThemedText>
              </View>

              <View style={[styles.divider, { marginVertical: 16 }]} />

              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Valor Total</ThemedText>
                <ThemedText style={[styles.totalValue, { color: '#A8E6CF' }]}>
                  {formatPrice(servicoObj?.preco)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Fixo */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmButton, { backgroundColor: themePastel }]}
          onPress={handleConfirmarAgendamento}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#252525" />
          ) : (
            <ThemedText style={styles.confirmButtonText}>Confirmar Agendamento</ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
          disabled={loading}
        >
          <ThemedText style={styles.homeButtonText}>Voltar ao início</ThemedText>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  instructionText: {
    color: '#ccc',
    marginBottom: 20,
    fontSize: 16,
  },
  // Card Styles
  card: {
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
    padding: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  estabLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 12,
    backgroundColor: '#333',
  },
  serviceName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  estabName: {
    fontSize: 16,
    color: '#ccc',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  professionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  colaboradorPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#555',
  },
  colaboradorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    color: '#aaa',
    fontSize: 16,
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
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
    borderRadius: 32,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonText: {
    color: '#252525', // Grafite carbono
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeButton: {
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

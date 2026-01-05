import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, LayoutAnimation, Platform, StyleSheet, TouchableOpacity, UIManager, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Servico {
  id: number;
  nome: string;
  tempo_medio_duracao: string;
  preco: number | string;
  descricao?: string;
}

interface Estabelecimento {
  id: number;
  nome: string;
  descricao?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  imagem?: string;
  avaliacao_media?: number;
  servicos: Servico[];
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ServicosScreen() {
  const { id, nomeEstabelecimento } = useLocalSearchParams();
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  useEffect(() => {
    if (id) {
      fetchServicos();
    }
  }, [id]);

  const fetchServicos = async () => {
    try {
      const response = await axios.get(`https://ninfa-postlegal-bodhi.ngrok-free.dev/api/estabelecimento/${id}/servicos`);
      setEstabelecimento(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = Number(price);
    if (!isNaN(numPrice)) {
      return `R$ ${numPrice.toFixed(2).replace('.', ',')}`;
    }
    return String(price);
  };

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const renderHeader = () => {
    if (!estabelecimento) return null;

    const enderecoParts = [
      estabelecimento.logradouro,
      estabelecimento.numero,
      estabelecimento.bairro,
      estabelecimento.cidade,
      estabelecimento.estado
    ].filter(Boolean);
    const enderecoCompleto = enderecoParts.join(', ');

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleExpand}
        style={[
          styles.headerCard,
          {
            backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderColor: theme === 'dark' ? '#333' : '#E5E5E5',
          },
        ]}
      >
        <View style={styles.estabHeaderRow}>
          <Image
            source={estabelecimento.imagem ? { uri: estabelecimento.imagem } : require('@/assets/images/placeholder.png')}
            style={styles.estabImage}
          />
          <View style={styles.estabInfo}>
            <View style={styles.nameRatingRow}>
              <ThemedText type="subtitle" style={styles.estabName}>{estabelecimento.nome}</ThemedText>
              {estabelecimento.avaliacao_media != null && (
                <ThemedText style={styles.rating}>★ {Number(estabelecimento.avaliacao_media).toFixed(1)}</ThemedText>
              )}
            </View>
            {enderecoCompleto ? (
              <ThemedText style={styles.estabAddress}>{enderecoCompleto}</ThemedText>
            ) : null}
          </View>
        </View>

        {expanded && (
          <View style={[styles.expandedContent, { borderTopColor: theme === 'dark' ? '#333' : '#E5E5E5' }]}>
            <View style={styles.infoSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Contato</ThemedText>
              {estabelecimento.telefone && <ThemedText style={styles.contactText}>📞 {estabelecimento.telefone}</ThemedText>}
              {estabelecimento.email && <ThemedText style={styles.contactText}>✉️ {estabelecimento.email}</ThemedText>}
            </View>

            <View style={styles.infoSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Horário de Funcionamento</ThemedText>
              <ThemedText style={styles.contactText}>🕒 Seg a Sex: 08:00 às 17:00</ThemedText>
            </View>

            {estabelecimento.descricao && (
              <View style={styles.infoSection}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Sobre</ThemedText>
                <ThemedText style={styles.estabDescription}>{estabelecimento.descricao}</ThemedText>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.expandIconContainer}>
          <ThemedText style={styles.expandText}>{expanded ? 'Ver menos ▲' : 'Ver mais ▼'}</ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSeparator = () => (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme === 'dark' ? '#333333' : '#E0E0E0' }
      ]}
    />
  );

  const renderItem = ({ item }: { item: Servico }) => (
    <View style={styles.itemContainer}>
      <View style={styles.headerContent}>
        <ThemedText type="subtitle" style={styles.serviceName}>{item.nome}</ThemedText>
        <ThemedText style={styles.price}>{formatPrice(item.preco)}</ThemedText>
      </View>

      {item.descricao && (
        <ThemedText style={styles.description} numberOfLines={2}>
          {item.descricao}
        </ThemedText>
      )}

      <View style={styles.footerContent}>
        <ThemedText style={styles.time}>
          🕒 {item.tempo_medio_duracao} minutos
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="link">Voltar</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[theme].tint} />
        </View>
      ) : (
        <FlatList
          data={estabelecimento?.servicos || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              Nenhum serviço disponível neste estabelecimento.
            </ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { marginBottom: 10, alignSelf: 'flex-start' },
  title: { fontSize: 28 },
  listContent: { padding: 20 },
  itemContainer: {
    paddingVertical: 16,
  },
  separator: { height: 1, width: '100%' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceName: { flex: 1, marginRight: 10 },
  price: { fontWeight: 'bold', fontSize: 16, color: '#4CAF50' },
  description: { fontSize: 14, opacity: 0.7 },
  footerContent: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  time: { fontSize: 12, opacity: 0.6 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  estabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  estabImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  estabInfo: {
    flex: 1,
    gap: 4,
  },
  estabName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rating: {
    fontSize: 14,
    color: '#8E44AD',
    fontWeight: 'bold',
    marginTop: 2,
  },
  estabAddress: {
    fontSize: 14,
    opacity: 0.7,
  },
  contactText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  estabDescription: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 4,
  },
  expandedContent: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 12,
  },
  infoSection: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  expandIconContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  expandText: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
  },
});

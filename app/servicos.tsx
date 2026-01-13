import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, LayoutAnimation, Platform, StyleSheet, TouchableOpacity, UIManager, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Servico {
  id: number;
  nome: string;
  tempo_medio_duracao: string;
  preco: number | string;
  descricao?: string;
  imagem?: string;
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
  galeria?: { foto: string }[];
  distancia?: number;
  servicos: Servico[];
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const darkenColor = (hex: string, factor: number = 0.2) => {
  if (!hex) return '#242426';
  
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const num = parseInt(hex, 16);
  const r = Math.floor(((num >> 16) & 0xF8) * factor);
  const g = Math.floor(((num >> 8) & 0xF9) * factor);
  const b = Math.floor((num & 0xFA) * factor);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export default function ServicosScreen() {
  const { id, nomeEstabelecimento, corProfundo, corPastel, corVivido } = useLocalSearchParams();
  const [estabelecimento, setEstabelecimento] = useState<Estabelecimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = width - 40;

  const themeProfundo = typeof corProfundo === 'string' ? corProfundo : '#444';
  const themeVivido = typeof corVivido === 'string' ? corVivido : '#000';
  const themePastel = typeof corPastel === 'string' ? corPastel : '#8E44AD';

  useEffect(() => {
    if (id) {
      fetchServicos();
    }
  }, [id]);

  const fetchServicos = async () => {
    try {
      let latitude;
      let longitude;

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      const response = await axios.post(`https://ninfa-postlegal-bodhi.ngrok-free.dev/api/estabelecimento/${id}/servicos`, { latitude, longitude });
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
    const enderecoCompleto = estabelecimento.logradouro + ', ' + estabelecimento.numero + ' - ' + estabelecimento.bairro + ', ' + estabelecimento.cidade + ' - ' + estabelecimento.estado;

    return (
      <View
        style={[
          styles.headerCard,
          {
            shadowColor: themeVivido,
          },
        ]}
      >
        <View style={[styles.cardInner, { borderColor: themeProfundo }]}>
          <View style={styles.glassBackground}>
              <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
          </View>

          {estabelecimento.galeria && estabelecimento.galeria.length > 0 ? (
            <View style={styles.galleryContainer}>
              <FlatList
                data={estabelecimento.galeria}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item: img }) => (
                  <Image
                    source={{ uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/fotos/${img.foto}` }}
                    style={[styles.galleryImage, { width: CARD_WIDTH }]}
                  />
                )}
              />
            </View>
          ) : null}

          <TouchableOpacity activeOpacity={0.9} onPress={toggleExpand}>
          <View style={styles.cardContent}>
            <View style={styles.estabHeaderRow}>
          <Image
            source={estabelecimento.imagem ? { uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/logos/${estabelecimento.imagem}` } : require('@/assets/images/placeholder.png')}
            style={styles.estabImage}
          />
          <View style={styles.estabInfo}>
            <View style={styles.nameRatingRow}>
              <ThemedText type="subtitle" style={styles.estabName}>{estabelecimento.nome}</ThemedText>
              {estabelecimento.avaliacao_media != null && (
                <ThemedText style={[styles.rating, { color: themePastel }]}>★ {Number(estabelecimento.avaliacao_media).toFixed(1)}</ThemedText>
              )}
            </View>
            {enderecoCompleto ? (
              <ThemedText style={styles.estabAddress}>{enderecoCompleto}</ThemedText>
            ) : null}
            {estabelecimento.distancia != null && (
              <ThemedText style={[styles.estabAddress, { color: themePastel, marginTop: 2 , alignSelf: 'flex-end', marginRight: 4 }]}>{Number(estabelecimento.distancia).toFixed(1)} km</ThemedText>
            )}
          </View>
        </View>

        {expanded && (
          <View style={[styles.expandedContent, { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
            <View style={styles.infoSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Contato</ThemedText>
              {!!estabelecimento.telefone && <ThemedText style={styles.contactText}>{estabelecimento.telefone}</ThemedText>}
              {!!estabelecimento.email && <ThemedText style={styles.contactText}>{estabelecimento.email}</ThemedText>}
            </View>

            <View style={styles.infoSection}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Horário de Funcionamento</ThemedText>
              <ThemedText style={styles.contactText}>Seg a Sex: 08:00 às 17:00</ThemedText>
            </View>

            {!!estabelecimento.descricao && (
              <View style={styles.infoSection}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Sobre</ThemedText>
                <ThemedText style={styles.estabDescription}>{estabelecimento.descricao}</ThemedText>
              </View>
            )}
          </View>
        )}
        
            <View style={styles.expandIconContainer}>
              <ThemedText style={[styles.expandText, { color: themePastel }]}>{expanded ? 'Ver menos ▲' : 'Ver mais ▼'}</ThemedText>
            </View>
          </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: Servico, index: number }) => {
    const isFirst = index === 0;
    const isLast = index === (estabelecimento?.servicos.length || 0) - 1;

    return (
      <View style={[
        styles.itemShadowWrapper,
        isFirst && styles.itemFirst,
        isLast && styles.itemLast,
      ]}>
        <View style={[styles.itemInner, isFirst && styles.itemFirst, isLast && styles.itemLast]}>
          {/* Fundo Glass para cada item, criando o efeito de lista única */}
          <View style={StyleSheet.absoluteFill}>
              <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(248, 249, 250, 0.05)' }]} />
          </View>

          <View style={styles.itemContainer}>
            <View style={styles.serviceContentRow}>
              {!!item.imagem && (
                <Image
                  source={{ uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/servicos/${item.imagem}` }}
                  style={styles.serviceImage}
                />
              )}
              <View style={styles.serviceTextContainer}>
          <View style={styles.headerContent}>
            <ThemedText type="subtitle" style={styles.serviceName}>{item.nome}</ThemedText>
            <ThemedText style={styles.price}>{formatPrice(item.preco)}</ThemedText>
          </View>

          {!!item.descricao && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {item.descricao}
            </ThemedText>
          )}

          <View style={styles.footerContent}>
            <ThemedText style={styles.time}>
              {item.tempo_medio_duracao} minutos
            </ThemedText>
          </View>
              </View>
            </View>
        </View>
          {!isLast && <View style={styles.separator} />}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="link">Voltar</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themePastel} />
        </View>
      ) : (
        <FlatList
          data={estabelecimento?.servicos || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
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
  container: { 
    flex: 1,
    backgroundColor: '#252525', // Grafite Carbono
  },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  backButton: { marginBottom: 10, alignSelf: 'flex-start' },
  title: { fontSize: 28 },
  listContent: { padding: 20 },
  
  // Estilos dos Itens da Lista (Glasslist)
  itemShadowWrapper: {
    // Sombra removida conforme solicitado
    backgroundColor: 'transparent',
  },
  itemInner: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  itemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  itemContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  separator: { height: 1, width: '100%', backgroundColor: 'rgba(248, 249, 250, 0.05)' },
  
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  serviceImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#333',
  },
  serviceTextContainer: { flex: 1 },
  serviceName: { flex: 1, marginRight: 10, color: '#F8F9FA' },
  price: { fontWeight: 'bold', fontSize: 16, color: '#A8E6CF' }, // Verde Pastel
  description: { fontSize: 14, opacity: 0.7, color: '#F8F9FA' },
  footerContent: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  time: { fontSize: 12, opacity: 0.6, color: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
  headerCard: {
    borderRadius: 12,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  cardInner: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardContent: {
    padding: 16,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
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
    color: '#F8F9FA',
  },
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  estabAddress: {
    fontSize: 14,
    opacity: 0.7,
    color: '#F8F9FA',
  },
  contactText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
    color: '#F8F9FA',
  },
  estabDescription: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 4,
    color: '#F8F9FA',
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
    color: '#F8F9FA',
  },
  expandIconContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  expandText: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
    color: '#F8F9FA',
  },
  galleryContainer: {
    height: 200,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  galleryImage: {
    height: 200,
    resizeMode: 'cover',
  },
});

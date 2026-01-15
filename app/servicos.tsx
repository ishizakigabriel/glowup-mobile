import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, LayoutAnimation, Linking, Platform, StyleSheet, TouchableOpacity, UIManager, View, useWindowDimensions } from 'react-native';
import { TouchableOpacity as GHTouchableOpacity, FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

interface Servico {
  id: number;
  nome: string;
  tempo_medio_duracao: string;
  preco: number | string;
  descricao?: string;
  imagem?: string;
  colaboradores_capacitados?: Colaborador[];
}

interface Colaborador {
  id: number;
  nome: string;
  foto?: string;
  link_portfolio?: string | null;
  especialidades?: string;
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
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedService, setSelectedService] = useState<Servico | null>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);
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

  const handleOpenService = (service: Servico) => {
    setSelectedService(service);
    bottomSheetRef.current?.expand();
  };

  const handleSchedule = (colaboradorId: number | null) => {
    if (!selectedService || !estabelecimento) return;

    const profissionalNome = colaboradorId 
      ? selectedService.colaboradores_capacitados?.find(c => c.id === colaboradorId)?.nome 
      : 'Qualquer Profissional';

    router.push({
      pathname: '/agendamento',
      params: {
        estabelecimentoId: estabelecimento.id,
        servicoId: selectedService.id,
        colaboradorId: colaboradorId || '', // Passa vazio se for nulo para evitar erro de serialização
        nomeServico: selectedService.nome,
        precoServico: formatPrice(selectedService.preco),
        nomeEstabelecimento: estabelecimento.nome,
        nomeColaborador: colaboradorId ? profissionalNome : '',
        corProfundo: corProfundo as string,
        corPastel: corPastel as string,
        corVivido: corVivido as string,
      }
    });
    
    // Fecha o bottom sheet após navegar
    bottomSheetRef.current?.close();
  };

  const openPortfolio = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

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
            <View style={styles.glassBackground} pointerEvents="none">
                <BlurView intensity={Platform.OS === 'android' ? 80 : 50} tint="dark" style={StyleSheet.absoluteFill} />
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
                nestedScrollEnabled={true}
                renderItem={({ item: img }) => (
                  <Image
                    source={{ uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/fotos/${img.foto}` }}
                    style={[styles.galleryImage, { width: CARD_WIDTH }]}
                  />
                )}
              />
            </View>
          ) : null}
          <GHTouchableOpacity 
            onPress={toggleExpand} 
            activeOpacity={0.9}
          >
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
          </GHTouchableOpacity>
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
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <BlurView intensity={Platform.OS === 'android' ? 50 : 20} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? 'rgba(248, 249, 250, 0.05)' : 'rgba(60, 60, 60, 0.4)' }]} />
          </View>
          <GHTouchableOpacity 
            style={styles.itemContainer}
            onPress={() => handleOpenService(item)}
            activeOpacity={0.7}
          >
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
            <ThemedText style={[styles.time, { color: themePastel }]}>
              {item.tempo_medio_duracao} minutos
            </ThemedText>
          </View>
              </View>
            </View>
        </GHTouchableOpacity>
          {!isLast && <View style={styles.separator} />}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <GHTouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themePastel }]}>
          <ThemedText style={{ color: '#252525', fontWeight: '600' }}>Voltar</ThemedText>
        </GHTouchableOpacity>
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

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#2E2E30' }}
        handleIndicatorStyle={{ backgroundColor: '#ccc' }}
      >
        <BottomSheetScrollView style={styles.contentContainer} contentContainerStyle={{ paddingBottom: 40 }}>
          {selectedService && (
            <View style={styles.sheetContent}>
              <ThemedText type="title" style={styles.sheetTitle}>Quem fará o serviço?</ThemedText>
              <ThemedText style={styles.sheetSubtitle}>{selectedService.nome} • {formatPrice(selectedService.preco)}</ThemedText>
              
              <View style={styles.sheetDivider} />

              {/* Opção Automática */}
              <GHTouchableOpacity 
                style={[styles.colaboradorCard, { borderColor: themePastel }]} 
                onPress={() => handleSchedule(null)}
              >
                <View style={[styles.colaboradorAvatar, { backgroundColor: themePastel, justifyContent: 'center', alignItems: 'center' }]}>
                  <ThemedText style={{ fontSize: 20 }}>✨</ThemedText>
                </View>
                <View style={styles.colaboradorInfo}>
                  <ThemedText style={styles.colaboradorName}>Escolher Automaticamente</ThemedText>
                  <ThemedText style={styles.colaboradorRole}>O sistema escolhe o melhor horário</ThemedText>
                </View>
                <View style={styles.arrowContainer}>
                   <ThemedText style={{ color: themePastel, fontSize: 20 }}>→</ThemedText>
                </View>
              </GHTouchableOpacity>

              <ThemedText style={styles.sectionLabel}>Profissionais Disponíveis</ThemedText>

              {/* Lista de Colaboradores */}
              {(selectedService.colaboradores_capacitados || []).map((colaborador) => (
                <View key={colaborador.id} style={styles.colaboradorItem}>
                  <View style={styles.colaboradorRow}>
                    <Image source={colaborador.foto ? { uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/colaboradores/${colaborador.foto}` } : require('@/assets/images/placeholder.png')} style={styles.colaboradorAvatar} />
                    <View style={styles.colaboradorInfo}>
                      <ThemedText style={styles.colaboradorName}>{colaborador.nome}</ThemedText>
                      <ThemedText style={styles.colaboradorRole}>{colaborador.especialidades || 'Especialista'}</ThemedText>
                      <View style={styles.actionButtons}>
                        {colaborador.link_portfolio && (
                          <GHTouchableOpacity 
                            style={styles.portfolioButton} 
                            onPress={() => openPortfolio(colaborador.link_portfolio!)}
                          >
                            <ThemedText style={styles.portfolioText}>Ver Portfólio</ThemedText>
                          </GHTouchableOpacity>
                        )}
                        <GHTouchableOpacity 
                          style={[styles.scheduleButton, { backgroundColor: themePastel}]}
                          onPress={() => handleSchedule(colaborador.id)}
                        >
                          <ThemedText style={styles.scheduleText}>Agendar</ThemedText>
                        </GHTouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
    color: '#fff',
  },
  headerCard: {
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
  galleryContainer: {
    height: 200,
    width: '100%',
  },
  galleryImage: {
    height: 200,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  estabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estabImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#333',
  },
  estabInfo: {
    flex: 1,
  },
  nameRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  estabName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  estabAddress: {
    fontSize: 12,
    color: '#ccc',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  infoSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#ddd',
  },
  estabDescription: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
  expandIconContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemShadowWrapper: {
    marginBottom: 0,
  },
  itemInner: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  itemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 20,
  },
  itemContainer: {
    padding: 16,
  },
  serviceContentRow: {
    flexDirection: 'row',
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#333',
  },
  serviceTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A8E6CF',
  },
  description: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(232, 233, 234, 0.2)',
    marginLeft: 9,
    marginRight: 8,
  
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#2E2E30',
  },
  sheetContent: {
    padding: 24,
    flex: 1,
  },
  sheetImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#333',
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'left',
    color: '#F8F9FA',
  },
  sheetSubtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 8,
    textAlign: 'left',
  },
  sheetPrice: {
    fontSize: 20,
    color: '#A8E6CF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sheetDuration: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
  },
  sheetDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  sheetDescription: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  sheetButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  sheetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  colaboradorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  colaboradorItem: {
    marginBottom: 20,
    backgroundColor: '#2E2E30',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 16,
  },
  colaboradorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  colaboradorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    backgroundColor: '#555',
  },
  colaboradorInfo: {
    flex: 1,
  },
  colaboradorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  colaboradorRole: {
    fontSize: 12,
    color: '#aaa',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
    
  },
  portfolioButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#666',
  },
  portfolioText: {
    fontSize: 12,
    color: '#ccc',
  },
  scheduleButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 32,
  },
  scheduleText: {
    fontSize: 12,
    color: '#252525',
    fontWeight: 'bold',
  },
});

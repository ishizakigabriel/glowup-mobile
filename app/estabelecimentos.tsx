import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Estabelecimento {
  id: number;
  nome: string;
  descricao?: string;
  endereco?: string;
  imagem_url?: string;
  imagem?: string;
  avaliacao_media?: number;
  galeria?: { foto: string }[];
  distancia?: number;
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

export default function EstabelecimentosScreen() {
  const { id, nomeCategoria, corProfundo, corPastel, corVivido } = useLocalSearchParams();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const { width } = useWindowDimensions();
  const CARD_WIDTH = width - 40; // Subtrai o padding horizontal da lista (20 + 20)

  const themeProfundo = typeof corProfundo === 'string' ? corProfundo : '#444';
  const themeVivido = typeof corVivido === 'string' ? corVivido : '#000';
  const themePastel = typeof corPastel === 'string' ? corPastel : '#8E44AD';

  useEffect(() => {
    if (id) {
      fetchEstabelecimentos();
    }
  }, [id]);

  const fetchEstabelecimentos = async () => {
    try {
      let latitude;
      let longitude;

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }

      const response = await axios.post(`https://ninfa-postlegal-bodhi.ngrok-free.dev/api/categorias-servico/${id}/estabelecimentos`, {
        latitude,
        longitude
      });
      // Ajuste aqui se a resposta vier dentro de um objeto 'data' (ex: response.data.data)
      setEstabelecimentos(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Estabelecimento }) => {

    const handlePress = () => {
      router.push({
        pathname: '/servicos',
        params: { 
          id: item.id, 
          nomeEstabelecimento: item.nome,
          corProfundo: themeProfundo,
          corPastel: themePastel,
          corVivido: themeVivido
        }
      });
    };

    return (
      <View
      style={[
        styles.card,
        {
          backgroundColor: 'transparent',
          borderColor: themeProfundo,
          shadowColor: themeVivido,
        }
      ]}
    >
      <View style={[styles.cardInner, { backgroundColor: 'transparent' }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BlurView intensity={Platform.OS === 'android' ? 50 : 30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(themeProfundo, 0.3) + '88' }]} />
        </View>

        {item.galeria && item.galeria.length > 0 ? (
          <View style={styles.galleryContainer}>
            <FlatList
              data={item.galeria}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={true}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item: img }) => (
                <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
                  <Image
                    source={{ uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/fotos/${img.foto}` }}
                    style={[styles.galleryImage, { width: CARD_WIDTH }]}
                    onError={(e) => console.log(`[ERRO] Falha ao carregar imagem:`, e.nativeEvent.error)}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null}
        <TouchableOpacity style={[styles.cardBody, { zIndex: 1 }]} onPress={handlePress} activeOpacity={0.7}>
          <Image
            source={item.imagem ? { uri: `https://ninfa-postlegal-bodhi.ngrok-free.dev/storage/logos/${item.imagem}` } : require('@/assets/images/placeholder.png')}
            style={styles.cardLogo}
          />
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <ThemedText style={styles.cardTitle}>{item.nome}</ThemedText>
              <View style={styles.metaInfo}>
                {item.distancia != null && (
                  <ThemedText style={[styles.distance, { color: themePastel }]}>{Number(item.distancia).toFixed(1)} km</ThemedText>
                )}
                {item.avaliacao_media != null && (
                  <ThemedText style={[styles.rating, { color: themePastel }]}>★ {Number(item.avaliacao_media).toFixed(1)}</ThemedText>
                )}
              </View>
            </View>
            {!!item.descricao && (
              <ThemedText style={styles.cardDescription} numberOfLines={2}>
                {item.descricao}
              </ThemedText>
            )}
            {!!item.endereco && (
              <ThemedText style={styles.cardAddress}>{item.endereco}</ThemedText>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themePastel }]}>
          <ThemedText style={{ color: '#252525', fontWeight: '600' }}>Voltar</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          {nomeCategoria ? String(nomeCategoria) : 'Estabelecimentos'}
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[theme].tint} />
        </View>
      ) : (
        <FlatList
          data={estabelecimentos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              Nenhum estabelecimento encontrado nesta categoria.
            </ThemedText>
          }
        />
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
    paddingBottom: 10,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    color: '#F8F9FA',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#2E2E30',
    borderRadius: 16,
    padding: 0,
    borderWidth: 1,
    borderColor: '#444',
    flexDirection: 'column',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 50,
  },
  cardInner: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  cardContent: {
    gap: 4,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8F9FA',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    paddingEnd: 4
  },
  rating: {
    fontSize: 14,
    color: '#8E44AD',
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  cardAddress: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  galleryContainer: {
    height: 200,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 10,
  },
  galleryImage: {
    height: 200,
    resizeMode: 'cover',
    backgroundColor: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
});

import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
}

export default function EstabelecimentosScreen() {
  const { id, nomeCategoria } = useLocalSearchParams();
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  useEffect(() => {
    if (id) {
      fetchEstabelecimentos();
    }
  }, [id]);

  const fetchEstabelecimentos = async () => {
    try {
      const response = await axios.get(`https://ninfa-postlegal-bodhi.ngrok-free.dev/api/categorias-servico/${id}/estabelecimentos`);
      // Ajuste aqui se a resposta vier dentro de um objeto 'data' (ex: response.data.data)
      setEstabelecimentos(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Estabelecimento }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        router.push({
          pathname: '/servicos',
          params: { id: item.id, nomeEstabelecimento: item.nome }
        });
      }}
    >
      <Image
        source={item.imagem ? { uri: item.imagem } : require('@/assets/images/placeholder.png')}
        style={styles.itemImage}
      />
      <View style={styles.itemContent}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.itemName}>{item.nome}</ThemedText>
          {item.avaliacao_media != null && (
            <ThemedText style={styles.rating}>★ {Number(item.avaliacao_media).toFixed(1)}</ThemedText>
          )}
        </View>
        {item.descricao && (
          <ThemedText style={styles.description} numberOfLines={2}>
            {item.descricao}
          </ThemedText>
        )}
        {item.endereco && (
          <ThemedText style={styles.address}>{item.endereco}</ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSeparator = () => (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme === 'dark' ? '#333333' : '#E0E0E0' }
      ]}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ThemedText type="link">Voltar</ThemedText>
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
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              Nenhum estabelecimento encontrado nesta categoria.
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 28,
  },
  listContent: {
    padding: 20,
  },
  itemContainer: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemContent: {
    gap: 4,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rating: {
    fontSize: 14,
    color: '#8E44AD',
    fontWeight: 'bold',
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
  },
  address: {
    fontSize: 11,
    opacity: 0.5,
  },
  separator: {
    height: 1,
    width: '100%',
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

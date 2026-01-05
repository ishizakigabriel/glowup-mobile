import axios from 'axios';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Categoria {
  id: number;
  nome: string;
}

export default function HomeScreen() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const borderColor = theme === 'dark' ? '#444444' : '#CCCCCC';

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await axios.get('https://ninfa-postlegal-bodhi.ngrok-free.dev/api/categorias-servico');
        const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
        
        const sorted = data.sort((a: Categoria, b: Categoria) => a.nome.localeCompare(b.nome));
        setCategorias(sorted);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme === 'dark' ? '#fff' : '#000'} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.grid}>
          {categorias.map((item) => (
            <Link
              key={item.id}
              href={{
                pathname: "/estabelecimentos",
                params: { id: item.id, nomeCategoria: item.nome }
              }}
              asChild
            >
              <TouchableOpacity style={{ width: '48%' }}>
                <LinearGradient
                  colors={['#5A2E78', '#8E44AD']}
                  locations={[0, 0.9]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.card, { width: '100%', borderColor }]}
                >
                  <ThemedText style={{ color: '#FFFFFF' }}>{item.nome}</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      )}
    </ParallaxScrollView>
  );
}


// ... dentro do seu componente, na renderização da lista de categorias:




const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  card: {
    width: '48%',
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 70,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Categoria {
  id: number;
  nome: string;
  cor_profundo: string;
  cor_pastel: string;
  cor_vivido: string;
  icone?: string;
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

export default function HomeScreen() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      {loading ? (
        <ActivityIndicator size="large" color={theme === 'dark' ? '#fff' : '#000'} style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.grid}>
          {categorias.map((item) => (
            <Link
              key={item.id}
              href={{
                pathname: "/estabelecimentos",
                params: { 
                  id: item.id, 
                  nomeCategoria: item.nome,
                  corProfundo: item.cor_profundo,
                  corPastel: item.cor_pastel,
                  corVivido: item.cor_vivido
                }
              }}
              asChild
            >
              <TouchableOpacity style={{ width: '48%' }}>
                <View
                    style={[
                      styles.card, 
                      { 
                        width: '100%', 
                        backgroundColor: 'transparent',
                        borderColor: item.cor_profundo || '#444',
                        shadowColor: item.cor_vivido || '#000',
                      }
                    ]}
                >
                    <View style={styles.cardInner}>
                      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: darkenColor(item.cor_profundo, 0.3) + '88' }]} />
                      
                      <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                          <IconSymbol name={item.icone as any || 'scissor.fill'} size={28} color={item.cor_pastel || '#fff'} />
                        </View>
                        <ThemedText style={{ color: '#F8F9FA', fontWeight: '600', textAlign: 'center' }}>{item.nome}</ThemedText>
                      </View>
                    </View>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}


// ... dentro do seu componente, na renderização da lista de categorias:




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252525',
  },
  content: {
    padding: 16,
  },
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
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 110,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 50,
  },
  cardInner: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
  iconContainer: {
    marginBottom: 4,
  },
});

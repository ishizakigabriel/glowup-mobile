import { Link } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function TabTwoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={[styles.titleContainer, { backgroundColor: 'transparent' }]}>
          <ThemedText type="title">Perfil</ThemedText>
        </ThemedView>

        <Link href="/login" style={styles.link}>
          <ThemedText type="link">Ir para a tela de Login</ThemedText>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    gap: 8,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});

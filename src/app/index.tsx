import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { ROUTES } from '../types/routes';

export default function HomeScreen() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.azulMarino} />
      <View style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Pactia</Text>
          <Text style={styles.subtitle}>
            Formaliza acuerdos.{"\n"}
            <Text style={styles.subtitleHighlight}>Protege relaciones.</Text>
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✨ Acuerdos digitales seguros</Text>
            <Text style={styles.cardText}>
              Documenta acuerdos entre personas y profesionales con respaldo digital
            </Text>
            <View style={styles.divider} />
            <Text style={styles.cardBadge}>
              🔗 Verificación digital descentralizada
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push(ROUTES.LOGIN as any)}
        >
          <Text style={styles.buttonText}>Comenzar</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Pactia registra y respalda acuerdos digitales; no administra fondos ni actúa como intermediario financiero.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.azulMarino,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.verdeOlivo,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: Colors.blanco,
    lineHeight: 28,
  },
  subtitleHighlight: {
    color: Colors.verdeOlivo,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.blanco,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.azulMarino,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grisClaro,
    marginVertical: 16,
  },
  cardBadge: {
    fontSize: 14,
    color: Colors.verdeOlivo,
    fontWeight: '500',
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.verdeOlivo,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: Colors.verdeOlivo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: Colors.blanco,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.blanco,
    opacity: 0.5,
    marginTop: 16,
  },
});
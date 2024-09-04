import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../axiosConfig';

const LoginScreen = ({ navigation }) => {
  const [uniqueUserNumber, setUniqueUserNumber] = useState('');
  const [nom, setNom] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get('/utilisateurs');
        setUsers(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs :", error);
        Alert.alert("Erreur", "Impossible de récupérer les utilisateurs.");
      }
    };

    fetchUsers();
  }, []);

  const handleLogin = async () => {
    if (!uniqueUserNumber || !nom) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    const user = users.find(
      (user) => 
        user.uniqueUserNumber === uniqueUserNumber && 
        user.nom.toLowerCase() === nom.toLowerCase()
    );

    if (user) {
      try {
        await AsyncStorage.setItem('userRole', user.role);
        await AsyncStorage.setItem('userName', user.nom);
        await AsyncStorage.setItem('userUniqueNumber', user.uniqueUserNumber);

        // Stocker également l'ID du bus si le rôle est chauffeur
        if (user.role === 'chauffeur') {
          await AsyncStorage.setItem('busId', '1'); // Remplacez '1' par l'ID du bus réel
        }

        Alert.alert('Succès', 'Connexion réussie!');
        navigation.navigate('Home'); // Redirection vers l'écran principal
      } catch (storageError) {
        console.error("Erreur lors de la sauvegarde des données utilisateur :", storageError);
        Alert.alert('Erreur', 'Impossible de sauvegarder les données utilisateur.');
      }
    } else {
      Alert.alert('Erreur', 'Identifiants incorrects');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>

      <TextInput
        style={styles.input}
        placeholder="Numéro unique"
        value={uniqueUserNumber}
        onChangeText={setUniqueUserNumber}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Nom"
        value={nom}
        onChangeText={setNom}
        autoCapitalize="words"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    marginVertical: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#3498db',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default LoginScreen;

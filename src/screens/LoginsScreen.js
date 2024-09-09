import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../axiosConfig';

const LoginScreen = ({ navigation }) => {
  const [uniqueUserNumber, setUniqueUserNumber] = useState('');
  const [nom, setNom] = useState('');
  const [users, setUsers] = useState([]);
  const [destinations, setDestinations] = useState([]); // Stocker les destinations et trajets

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

        // Si l'utilisateur est un chauffeur, vérification du matricule et de l'adresse MAC
        if (user.role === 'chauffeur') {
          const macAddress = '54:65:03:bd:c4:d6'; // Adresse MAC du TPE Android

          try {
            const busResponse = await axiosInstance.get(`/api/buses/mac/${macAddress}`);
            const busData = busResponse.data;

            // La condition pour vérifier que le matricule est "AABNH454"
            if (busData.matricule === 'AABNH454' && busData.macAddress === macAddress) {
              // Récupérer les destinations et trajets associés à ce bus
              const destinationsResponse = await axiosInstance.get(`/api/buses/${busData.id}/destinations`);
              setDestinations(destinationsResponse.data);
              
              console.log('Destinations récupérées avec succès :', destinationsResponse.data);

              await axiosInstance.post(`/api/buses/mac/${macAddress}/update-chauffeur`, {
                chauffeurNom: user.nom,
                chauffeurUniqueNumber: user.uniqueUserNumber
              });
              console.log('Chauffeur enregistré avec succès dans la base de données du bus.');

            } else {
              Alert.alert('Erreur', 'Le bus doit avoir le matricule AABNH454 et l\'adresse MAC doit être enregistrée pour accéder aux destinations.');
              return;
            }
          } catch (error) {
            console.error("Erreur lors de la vérification du bus :", error);
            Alert.alert("Erreur", "Impossible de vérifier les informations du bus.");
            return;
          }
        }

        Alert.alert('Succès', 'Connexion réussie!');
        navigation.navigate('Home', { destinations }); // Redirection vers l'écran principal avec les destinations
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

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserManagementScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('chauffeur');  // Default role
  const [users, setUsers] = useState([]);

  const handleCreateUser = async () => {
    if (!username || !password || !role) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    const userData = { username, password, role };
    await AsyncStorage.setItem(username, JSON.stringify(userData));
    Alert.alert('Succès', `Utilisateur ${username} créé avec succès`);
    fetchAllUsers();  // Update the user list after creation
    setUsername('');
    setPassword('');
    setRole('chauffeur'); // Reset the form after creation
  };

  const fetchAllUsers = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const users = await AsyncStorage.multiGet(keys);

      const userList = users.map(([key, value]) => {
        const user = JSON.parse(value);
        return { username: key, ...user };
      });

      setUsers(userList);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs :", error);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un utilisateur</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
        value={username}
        onChangeText={setUsername}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      <View style={styles.roleSelectionContainer}>
        <Text style={styles.roleSelectionText}>Sélectionnez le rôle :</Text>
        <View style={styles.roleButtonsContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'chauffeur' && styles.roleButtonSelected]}
            onPress={() => setRole('chauffeur')}
          >
            <Text style={styles.roleButtonText}>Chauffeur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'caissiere' && styles.roleButtonSelected]}
            onPress={() => setRole('caissiere')}
          >
            <Text style={styles.roleButtonText}>Caissière</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'controlleur' && styles.roleButtonSelected]}
            onPress={() => setRole('controlleur')}
          >
            <Text style={styles.roleButtonText}>Contrôleur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'admin' && styles.roleButtonSelected]}
            onPress={() => setRole('admin')}
          >
            <Text style={styles.roleButtonText}>Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.username}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <Text style={styles.userText}>{item.username} - {item.role}</Text>
          </View>
        )}
        style={styles.userList}
      />

      <TouchableOpacity style={styles.button} onPress={handleCreateUser}>
        <Text style={styles.buttonText}>Créer l'utilisateur</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
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
  roleSelectionContainer: {
    width: '100%',
    marginVertical: 20,
  },
  roleSelectionText: {
    fontSize: 18,
    marginBottom: 10,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ccc',
    alignItems: 'center',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  roleButtonSelected: {
    backgroundColor: '#3498db',
  },
  roleButtonText: {
    color: '#fff',
  },
  userList: {
    width: '100%',
    flex: 1,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    padding: 15,
    backgroundColor: '#3498db',
    alignItems: 'center',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  userItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  userText: {
    fontSize: 18,
  },
});

export default UserManagementScreen;

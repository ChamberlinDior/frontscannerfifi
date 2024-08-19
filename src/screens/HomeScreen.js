import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, FlatList, Modal, PermissionsAndroid, Platform } from 'react-native';
import axios from 'axios';

const HomeScreen = () => {
  const [clients, setClients] = useState([]);
  const [currentClient, setCurrentClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rfid, setRfid] = useState('');
  const [newClient, setNewClient] = useState({
    nom: '',
    prenom: '',
    quartier: '',
    ville: '',
  });
  const [showClientManagement, setShowClientManagement] = useState(false);
  const [showForfaitManagement, setShowForfaitManagement] = useState(false);
  const [forfaitStatus, setForfaitStatus] = useState(null);

  const baseURL = 'http://192.168.1.81:8080/api';

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${baseURL}/clients`);
      setClients(response.data);
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la récupération des clients.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${baseURL}/clients`, newClient);
      setClients([...clients, response.data]);
      setNewClient({ nom: '', prenom: '', quartier: '', ville: '' });
      Alert.alert("Succès", "Client créé avec succès.");
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de la création du client.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRFID = async () => {
    if (!currentClient || !rfid) {
      Alert.alert("Erreur", "Veuillez sélectionner un client et entrer un RFID valide.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.put(`${baseURL}/clients/${currentClient.id}/rfid`, { rfid });
      const updatedClients = clients.map((client) =>
        client.id === currentClient.id ? { ...client, rfid: response.data.rfid } : client
      );
      setClients(updatedClients);
      setRfid('');
      Alert.alert("Succès", "RFID ajouté avec succès !");
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l'ajout du RFID.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignForfait = async (typeForfait) => {
    if (!rfid) {
      Alert.alert("Erreur", "Veuillez entrer un RFID valide.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = { rfid, typeForfait };
      const response = await axios.post(`${baseURL}/forfaits`, payload);

      if (response.status === 200) {
        const clientResponse = await axios.get(`${baseURL}/clients/rfid/${rfid}`);
        const updatedClients = clients.map((client) =>
          client.rfid === rfid ? clientResponse.data : client
        );
        setClients(updatedClients);

        Alert.alert("Succès", `Forfait ${typeForfait} attribué avec succès !`);
      } else {
        Alert.alert("Erreur", "Erreur lors de l'attribution du forfait.");
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur lors de l'attribution du forfait.");
    } finally {
      setIsLoading(false);
    }
  };

  const requestScannerPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Permission d'accès au scanner",
            message: "L'application a besoin de l'accès au scanner pour lire les cartes RFID.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Permission accordée pour le scanner.");
          // Logique pour interagir avec le scanner du POS ici.
        } else {
          console.log("Permission refusée pour le scanner.");
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleCheckForfait = async () => {
    await requestScannerPermission();

    // Assurez-vous que le scanner lit un numéro RFID valide ici
    // Vous devrez utiliser l'API spécifique du scanner pour capturer le numéro RFID

    if (!rfid) {
      Alert.alert("Erreur", "Veuillez entrer un RFID valide.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${baseURL}/forfaits/active/${rfid}`);

      // Si le client existe et a un forfait actif
      if (response.status === 200 && response.data.length > 0) {
        setForfaitStatus('Forfait Actif');
        Alert.alert("Succès", "Forfait actif trouvé pour ce RFID.");
      } 
      // Si le client existe mais n'a pas de forfait actif
      else if (response.status === 200 && response.data.length === 0) {
        setForfaitStatus('Forfait Inactif');
        Alert.alert("Information", "Le client existe, mais aucun forfait actif n'a été trouvé.");
      }
    } catch (error) {
      // Si le client n'existe pas ou erreur
      if (error.response && error.response.status === 404) {
        Alert.alert("Erreur", "Aucun client trouvé pour ce RFID.");
      } else {
        Alert.alert("Erreur", "Erreur lors de la vérification du forfait.");
      }
      setForfaitStatus('Aucun forfait activé');
    } finally {
      setIsLoading(false);
    }
  };

  const renderClient = ({ item }) => (
    <View style={styles.clientContainer}>
      <Text>Numéro Client: {item.numClient}</Text>
      <Text>Nom: {item.nom}</Text>
      <Text>Prénom: {item.prenom}</Text>
      <Text>Quartier: {item.quartier}</Text>
      <Text>Ville: {item.ville}</Text>
      <Text>RFID: {item.rfid}</Text>
      <Text>Forfait Actif: {item.forfaitActif ? 'Actif' : 'Inactif'}</Text>
      <Text>Date Expiration Forfait: {item.dateExpirationForfait ? new Date(item.dateExpirationForfait).toLocaleDateString() : 'N/A'}</Text>
      <Button title="Sélectionner" onPress={() => setCurrentClient(item)} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accueil</Text>

      <Button title="Gestion des Clients" onPress={() => setShowClientManagement(true)} />
      <Button title="Attribuer Forfait par RFID" onPress={() => setShowForfaitManagement(true)} />

      {/* Vérification du Forfait par RFID */}
      <TextInput
        style={styles.input}
        placeholder="Entrez le RFID pour vérifier"
        value={rfid}
        onChangeText={setRfid}
      />
      <Button title="Vérifier le Forfait Actif" onPress={handleCheckForfait} />
      {forfaitStatus && <Text style={styles.forfaitStatus}>{forfaitStatus}</Text>}

      {/* Gestion des Clients */}
      <Modal visible={showClientManagement} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.title}>Gestion des Clients</Text>

          <TextInput
            style={styles.input}
            placeholder="Nom"
            value={newClient.nom}
            onChangeText={(text) => setNewClient({ ...newClient, nom: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            value={newClient.prenom}
            onChangeText={(text) => setNewClient({ ...newClient, prenom: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Quartier"
            value={newClient.quartier}
            onChangeText={(text) => setNewClient({ ...newClient, quartier: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Ville"
            value={newClient.ville}
            onChangeText={(text) => setNewClient({ ...newClient, ville: text })}
          />

          <Button title="Créer un Client" onPress={handleCreateClient} />

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <FlatList
              data={clients}
              renderItem={renderClient}
              keyExtractor={(item) => item.id.toString()}
            />
          )}

          <Button title="Retour" onPress={() => setShowClientManagement(false)} />
        </View>
      </Modal>

      {/* Attribution de Forfait par RFID */}
      <Modal visible={showForfaitManagement} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.title}>Attribuer Forfait par RFID</Text>

          <TextInput
            style={styles.input}
            placeholder="Entrez le RFID"
            value={rfid}
            onChangeText={setRfid}
          />
          <Button title="Attribuer Forfait Jour (100 XAF)" onPress={() => handleAssignForfait('jour')} />
          <Button title="Attribuer Forfait Semaine (500 XAF)" onPress={() => handleAssignForfait('semaine')} />
          <Button title="Attribuer Forfait Mois (2500 XAF)" onPress={() => handleAssignForfait('mois')} />

          {isLoading ? <ActivityIndicator size="large" color="#0000ff" /> : null}

          <Button title="Retour" onPress={() => setShowForfaitManagement(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  clientContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
  },
  forfaitStatus: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
});

export default HomeScreen;

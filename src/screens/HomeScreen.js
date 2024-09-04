import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, Modal, FlatList } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const HomeScreen = ({ navigation }) => {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [rfid, setRfid] = useState('');
    const [forfaitStatus, setForfaitStatus] = useState('');
    const [isConnected, setIsConnected] = useState(true);
    const [offlineMode, setOfflineMode] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
    const [role, setRole] = useState('');
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState(null);
    const ticketRef = useRef(null);

    const [selectedDestination, setSelectedDestination] = useState('');
    const destinations = ['Owendo-Charbonnage', 'Akanda-Plein Niger', 'Charbonnage-Owendo', 'Plein Niger-Akanda'];
    const [busId, setBusId] = useState(1);
    const [uniqueUserNumber, setUniqueUserNumber] = useState('USER1234');

    useEffect(() => {
        requestCameraPermission();
        monitorNetworkStatus();
        getUserData();
    }, []);

    const requestCameraPermission = async () => {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
    };

    const monitorNetworkStatus = () => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            if (!state.isConnected) {
                setOfflineMode(true);
            } else {
                syncLocalData();
                setOfflineMode(false);
            }
        });
        return () => unsubscribe();
    };

    const syncLocalData = async () => {
        const pendingUpdates = await AsyncStorage.getItem('pendingUpdates');
        if (pendingUpdates) {
            const updates = JSON.parse(pendingUpdates);
            for (const update of updates) {
                try {
                    await axios.post('http://172.20.10.4:8080/api/forfaits', update);
                } catch (error) {
                    console.error("Erreur lors de la synchronisation des données locales", error);
                }
            }
            await AsyncStorage.removeItem('pendingUpdates');
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        setScanned(true);
        setRfid(data);
        if (offlineMode) {
            fetchOfflineForfaitStatus(data);
        } else {
            fetchForfaitStatus(data);
        }
    };

    const fetchForfaitStatus = async (rfid) => {
        try {
            if (isConnected) {
                const response = await axios.get(`http://172.20.10.4:8080/api/forfaits/status/${rfid}`);
                processForfaitResponse(response, rfid);
            } else {
                Alert.alert("Erreur", "Pas de connexion internet. Veuillez activer le mode hors ligne.");
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du statut du forfait:", error);
            Alert.alert("Erreur", "Problème lors de la vérification du forfait.");
        }
    };

    const fetchOfflineForfaitStatus = async (rfid) => {
        try {
            const storedData = await AsyncStorage.getItem(rfid);
            if (storedData) {
                const client = JSON.parse(storedData);
                setForfaitStatus(client.forfaitStatus || "Pas de forfait actif");
                presentForfaitStatus(client.forfaitStatus, client.forfaitExpiration);
            } else {
                Alert.alert("Erreur", "Pas de données hors ligne disponibles pour ce RFID.");
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données locales:", error);
            Alert.alert("Erreur", "Problème lors de la récupération des données locales.");
        }
    };

    const processForfaitResponse = async (response, rfid) => {
        if (response.status === 200) {
            const status = `Forfait actif jusqu'au ${response.data}`;
            setForfaitStatus(status);
            presentForfaitStatus(status, response.data);
            await storeLocalData(rfid, status, response.data);
        } else if (response.status === 204) {
            const status = "Pas de forfait actif";
            setForfaitStatus(status);
            presentForfaitStatus(status);
            await storeLocalData(rfid, status);
        } else if (response.status === 404) {
            const status = "Carte inactive";
            setForfaitStatus(status);
            presentForfaitStatus(status);
            await storeLocalData(rfid, status);
        }
    };

    const presentForfaitStatus = (status, expirationDate = null) => {
        const currentDate = new Date();
        const expiration = expirationDate ? new Date(expirationDate) : null;

        if (expiration && expiration < currentDate) {
            Alert.alert("Forfait expiré", `Le forfait a expiré le ${expirationDate}.`);
        } else if (expiration && expiration >= currentDate) {
            Alert.alert("Forfait actif", `Le forfait est actif jusqu'au ${expirationDate}.`);
        } else {
            Alert.alert("Statut du forfait", status);
        }
    };

    const storeLocalData = async (rfid, status, expirationDate = null) => {
        const clientData = {
            rfid,
            forfaitStatus: status,
            forfaitExpiration: expirationDate,
        };
        await AsyncStorage.setItem(rfid, JSON.stringify(clientData));
    };

    const handleAssignForfait = async (forfaitType) => {
        if (!rfid) {
            Alert.alert("Erreur", "Aucun RFID scanné.");
            return;
        }

        const clientForfaitData = {
            rfid,
            typeForfait: forfaitType,
            dateAssigned: new Date().toISOString(),
        };

        if (isConnected) {
            try {
                const response = await axios.post('http://172.20.10.4:8080/api/forfaits', clientForfaitData);
                const newForfaitStatus = `Forfait ${forfaitType} attribué, valide jusqu'à ${response.data.expirationDate}`;
                setForfaitStatus(newForfaitStatus);
                await storeLocalData(rfid, newForfaitStatus, response.data.expirationDate);
                Alert.alert("Succès", "Forfait attribué avec succès.");
            } catch (error) {
                Alert.alert("Erreur", "Problème lors de l'attribution du forfait.");
                console.error(error);
            }
        } else {
            await storePendingUpdates(clientForfaitData);
        }
    };

    const storePendingUpdates = async (clientForfaitData) => {
        try {
            const pendingUpdates = await AsyncStorage.getItem('pendingUpdates');
            const updates = pendingUpdates ? JSON.parse(pendingUpdates) : [];
            updates.push(clientForfaitData);
            await AsyncStorage.setItem('pendingUpdates', JSON.stringify(updates));
            Alert.alert("Hors ligne", "Les données du forfait ont été stockées localement et seront synchronisées lorsque la connexion sera rétablie.");
        } catch (error) {
            console.error("Erreur lors de la sauvegarde des données hors ligne:", error);
            Alert.alert("Erreur", "Problème lors de la sauvegarde des données hors ligne.");
        }
    };

    const generateTickets = () => {
        const newTickets = [];
        for (let i = 0; i < 100; i++) {
            const ticketNumber = `TICKET-${i + 1}`;
            const creationDate = new Date().toLocaleDateString('fr-FR');
            newTickets.push({
                number: ticketNumber,
                qrData: 'Transurb',
                creationDate,
            });
        }
        setTickets(newTickets);
        setIsTicketModalVisible(true);
    };

    const renderTicketPreview = ({ item }) => (
        <View style={styles.ticketCard} ref={ticketRef}>
            <Text style={styles.ticketText}>Trans'urb</Text>
            <QRCode value={item.qrData} size={100} />
            <Text style={styles.ticketText}>{item.number}</Text>
            <Text style={styles.ticketDate}>Date: {item.creationDate}</Text>
        </View>
    );

    const handlePrintTicket = async () => {
        try {
            const uri = await captureRef(ticketRef.current, {
                format: 'png',
                quality: 0.8,
            });
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error("Erreur lors de l'impression ou de l'enregistrement du ticket:", error);
            Alert.alert("Erreur", "Impossible d'imprimer ou d'enregistrer le ticket.");
        }
    };

    const getUserData = async () => {
        const storedRole = await AsyncStorage.getItem('userRole');
        const storedUsername = await AsyncStorage.getItem('userName');
        const storedAvatar = await AsyncStorage.getItem('userAvatar');
        setRole(storedRole);
        setUsername(storedUsername);
        setAvatar(storedAvatar ? { uri: storedAvatar } : null);

        if (storedRole === 'chauffeur') {
            updateBusWithChauffeurInfo(storedUsername, uniqueUserNumber);
        }
    };

    const updateBusWithChauffeurInfo = async (username, uniqueUserNumber) => {
        try {
            await axios.post(`http://172.20.10.4:8080/api/buses/${busId}/chauffeur`, {
                chauffeurName: username,
                chauffeurNumber: uniqueUserNumber
            });
            console.log("Informations du chauffeur enregistrées avec succès.");
        } catch (error) {
            console.error("Erreur lors de l'enregistrement des informations du chauffeur :", error);
        }
    };

    const handleSaveChauffeurInfo = async () => {
        if (!chauffeurName || !chauffeurUniqueNumber || !busPlateNumber) {
            Alert.alert("Erreur", "Veuillez remplir le nom, le numéro unique du chauffeur et la plaque d'immatriculation du bus.");
            return;
        }

        try {
            const busResponse = await axios.get(`http://172.20.10.4:8080/api/buses/matricule/${busPlateNumber}`);
            if (busResponse.status === 200) {
                const busId = busResponse.data.id;
                const chauffeurResponse = await axios.post(`http://172.20.10.4:8080/api/buses/${busId}/chauffeur`, {
                    chauffeurName: chauffeurName,
                    chauffeurNumber: chauffeurUniqueNumber
                });

                if (chauffeurResponse.status === 200) {
                    Alert.alert("Succès", "Informations du chauffeur enregistrées avec succès.");
                } else {
                    Alert.alert("Erreur", "Impossible de mettre à jour les informations du chauffeur.");
                }
            } else {
                Alert.alert("Erreur", "Le bus avec ce numéro de plaque n'existe pas.");
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du bus :", error);
            Alert.alert("Erreur", "Problème lors de la vérification du bus.");
        }
    };

    const handleDestinationSelection = async (destination) => {
        try {
            setSelectedDestination(destination);
            const response = await axios.post(`http://172.20.10.4:8080/api/buses/${busId}/select-destination`, null, {
                params: { destination: destination },
            });
            if (response.status === 200) {
                Alert.alert("Succès", `Destination ${destination} enregistrée avec succès.`);
            } else {
                Alert.alert("Erreur", "Impossible d'enregistrer la destination.");
            }
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de la destination :", error);
            Alert.alert("Erreur", "Problème lors de l'enregistrement de la destination.");
        }
    };

    const startTrajet = async () => {
        if (!selectedDestination) {
            Alert.alert("Erreur", "Veuillez sélectionner une destination avant de commencer le trajet.");
            return;
        }

        try {
            const response = await axios.post(`http://172.20.10.4:8080/api/buses/${busId}/start`, {
                uniqueUserNumber: uniqueUserNumber,
                destination: selectedDestination,
            });
            if (response.status === 200) {
                Alert.alert("Succès", "Le trajet a commencé avec succès.");
            } else {
                Alert.alert("Erreur", "Problème lors du démarrage du trajet.");
            }
        } catch (error) {
            Alert.alert("Erreur", "Impossible de commencer le trajet.");
            console.error("Erreur lors du démarrage du trajet :", error);
        }
    };

    const endTrajet = async () => {
        try {
            const response = await axios.post(`http://172.20.10.4:8080/api/buses/${busId}/end`);
            Alert.alert("Succès", "Le trajet a été terminé avec succès.");
        } catch (error) {
            Alert.alert("Erreur", "Impossible de terminer le trajet.");
            console.error("Erreur lors de la fin du trajet :", error);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userName');
        await AsyncStorage.removeItem('userAvatar');
        navigation.navigate('Login');
    };

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setAvatar({ uri: result.uri });
            await AsyncStorage.setItem('userAvatar', result.uri);
        }
    };

    if (hasPermission === null) {
        return <Text>Demande de permission de la caméra...</Text>;
    }
    if (hasPermission === false) {
        return <Text>Pas d'accès à la caméra</Text>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    {avatar ? (
                        <Image source={avatar} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{username?.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.usernameText}>{username}</Text>
                        <Text style={styles.roleText}>{role}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.cameraContainer}>
                    <BarCodeScanner
                        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {scanned && (
                        <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
                            <Text style={styles.scanAgainButtonText}>Scanner à nouveau</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.statusText}>
                    {forfaitStatus ? forfaitStatus : "Scannez un RFID pour voir le statut du forfait"}
                </Text>

                {/* Afficher les boutons uniquement si le rôle n'est pas "chauffeur" */}
                {role !== 'CHAUFFEUR' && (
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.squareButton} onPress={() => handleAssignForfait('jour')}>
                            <Text style={styles.buttonText}>Jour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.squareButton} onPress={() => handleAssignForfait('semaine')}>
                            <Text style={styles.buttonText}>Semaine</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.squareButton} onPress={() => handleAssignForfait('mois')}>
                            <Text style={styles.buttonText}>Mois</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.title}>Sélectionner la Destination</Text>
                <FlatList
                    data={destinations}
                    horizontal={true}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.destinationButton, selectedDestination === item && styles.selectedButton]}
                            onPress={() => handleDestinationSelection(item)}
                        >
                            <Text style={styles.destinationText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.destinationList}
                />
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={startTrajet}
                        disabled={!selectedDestination}
                    >
                        <Text style={styles.buttonText}>Commencer le Trajet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.endButton}
                        onPress={endTrajet}
                    >
                        <Text style={styles.buttonText}>Terminer le Trajet</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerButtons}>
                    <TouchableOpacity style={styles.smallButton} onPress={generateTickets}>
                        <Text style={styles.buttonText}>Générer Tickets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallButton} onPress={handleLogout}>
                        <Text style={styles.buttonText}>Déconnexion</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal
                visible={isTicketModalVisible}
                animationType="slide"
                onRequestClose={() => setIsTicketModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Aperçu des Tickets</Text>
                    <FlatList
                        data={tickets}
                        renderItem={renderTicketPreview}
                        keyExtractor={(item) => item.number}
                        contentContainerStyle={styles.ticketList}
                    />
                    <TouchableOpacity style={styles.printButton} onPress={handlePrintTicket}>
                        <Text style={styles.buttonText}>Imprimer/Enregistrer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.button, { marginTop: 20 }]}
                        onPress={() => setIsTicketModalVisible(false)}
                    >
                        <Text style={styles.buttonText}>Fermer</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f4f7',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 10,
        backgroundColor: '#3498db',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 10,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#bdc3c7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    usernameText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    roleText: {
        fontSize: 16,
        color: '#fff',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    cameraContainer: {
        height: 300,
        width: 300,
        overflow: 'hidden',
        borderRadius: 15,
        backgroundColor: '#e74c3c',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#fff',
    },
    statusText: {
        fontSize: 18,
        marginVertical: 20,
        color: '#34495e',
        textAlign: 'center',
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
        marginBottom: 20,
    },
    squareButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 25,
        width: '30%',
        alignItems: 'center',
        shadowColor: '#2c3e50',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 3,
        justifyContent: 'center',
        borderRadius: 0,
    },
    destinationButton: {
        padding: 10,
        backgroundColor: '#3498db',
        marginHorizontal: 5,
        borderRadius: 5,
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#2ecc71',
    },
    destinationText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '80%',
        marginTop: 20,
    },
    startButton: {
        flex: 1,
        marginRight: 10,
        padding: 15,
        backgroundColor: '#1abc9c',
        alignItems: 'center',
        borderRadius: 5,
    },
    endButton: {
        flex: 1,
        marginLeft: 10,
        padding: 15,
        backgroundColor: '#e74c3c',
        alignItems: 'center',
        borderRadius: 5,
    },
    footerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '80%',
        marginTop: 20,
    },
    smallButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
        shadowColor: '#2c3e50',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 3,
        borderRadius: 5,
    },
    scanAgainButton: {
        marginTop: 15,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#1abc9c',
        borderRadius: 8,
        shadowColor: '#16a085',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 3,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    ticketList: {
        width: '100%',
    },
    ticketCard: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        margin: 5,
        borderRadius: 10,
        alignItems: 'center',
    },
    ticketText: {
        fontSize: 18,
        marginVertical: 5,
    },
    ticketDate: {
        fontSize: 14,
        color: '#888',
    },
    printButton: {
        backgroundColor: '#2ecc71',
        padding: 15,
        borderRadius: 10,
        marginVertical: 10,
        alignItems: 'center',
    },
});

export default HomeScreen;

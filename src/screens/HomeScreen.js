import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const HomeScreen = () => {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [rfid, setRfid] = useState('');
    const [forfaitStatus, setForfaitStatus] = useState('');
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();

        // Surveiller la connectivité réseau
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            if (state.isConnected) {
                syncLocalData();
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const syncLocalData = async () => {
        const pendingUpdates = await AsyncStorage.getItem('pendingUpdates');
        if (pendingUpdates) {
            const updates = JSON.parse(pendingUpdates);
            for (const update of updates) {
                try {
                    await axios.post('http://192.168.1.64:8080/api/forfaits', update);
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

        // Récupérer les données depuis AsyncStorage d'abord
        try {
            const storedData = await AsyncStorage.getItem(data);
            if (storedData) {
                const client = JSON.parse(storedData);
                setForfaitStatus(client.forfaitStatus || "Pas de forfait actif");
                Alert.alert("Forfait (hors ligne)", `Le client ${data} a un ${client.forfaitStatus || "pas de forfait actif"}.`);
                return;
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données hors ligne:", error);
        }

        // Si en ligne et pas trouvé en local
        if (isConnected) {
            try {
                const response = await axios.get(`http://192.168.1.64:8080/api/forfaits/status/${data}`);
                if (response.status === 200) {
                    setForfaitStatus(`Forfait actif jusqu'au ${response.data}`);
                    Alert.alert("Forfait actif", `Le client ${data} a un forfait actif jusqu'au ${response.data}.`);

                    const clientData = {
                        rfid: data,
                        forfaitStatus: `Forfait actif jusqu'au ${response.data}`,
                        forfaitExpiration: response.data,
                    };
                    // Stocker les données localement
                    await AsyncStorage.setItem(data, JSON.stringify(clientData));
                } else if (response.status === 204) {
                    setForfaitStatus("Pas de forfait actif");
                    Alert.alert("Pas de forfait actif", `Le RFID ${data} n'a pas de forfait actif.`);
                }
            } catch (error) {
                Alert.alert("Erreur", "Problème lors de la vérification du forfait.");
                console.error(error);
            }
        } else {
            Alert.alert("Erreur", "Aucune donnée locale disponible pour ce RFID et pas de connexion internet.");
        }
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
                await axios.post('http://192.168.1.64:8080/api/forfaits', clientForfaitData);
                Alert.alert("Succès", "Forfait attribué avec succès.");
            } catch (error) {
                Alert.alert("Erreur", "Problème lors de l'attribution du forfait.");
                console.error(error);
            }
        } else {
            const pendingUpdates = await AsyncStorage.getItem('pendingUpdates');
            const updates = pendingUpdates ? JSON.parse(pendingUpdates) : [];
            updates.push(clientForfaitData);
            await AsyncStorage.setItem('pendingUpdates', JSON.stringify(updates));
            Alert.alert("Hors ligne", "Les données du forfait ont été stockées localement et seront synchronisées lorsque la connexion sera rétablie.");
        }
    };

    if (hasPermission === null) {
        return <Text>Demande de permission de la caméra...</Text>;
    }
    if (hasPermission === false) {
        return <Text>Pas d'accès à la caméra</Text>;
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Bienvenue sur l'écran principal</Text>
            <View style={styles.cameraContainer}>
                <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                />
                {scanned && <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
                    <Text style={styles.scanAgainButtonText}>Scanner à nouveau</Text>
                </TouchableOpacity>}
            </View>
            <Text style={styles.statusText}>
                {forfaitStatus ? forfaitStatus : "Scannez un RFID pour voir le statut du forfait"}
            </Text>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={() => handleAssignForfait('jour')}>
                    <Text style={styles.buttonText}>Attribuer Forfait Jour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleAssignForfait('semaine')}>
                    <Text style={styles.buttonText}>Attribuer Forfait Semaine</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => handleAssignForfait('mois')}>
                    <Text style={styles.buttonText}>Attribuer Forfait Mois</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        backgroundColor: '#f0f4f7',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 30,
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
    buttonContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80%',
    },
    button: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 10,
        marginVertical: 10,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#2c3e50',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 3,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
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
    scanAgainButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default HomeScreen;

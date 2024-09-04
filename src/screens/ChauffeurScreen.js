import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const ChauffeurScreen = () => {
    const [chauffeurName, setChauffeurName] = useState('');
    const [chauffeurNumber, setChauffeurNumber] = useState('');
    const [busDestination, setBusDestination] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const startJourney = async () => {
        const startDateTime = new Date().toISOString();
        setStartTime(startDateTime);

        try {
            const response = await axios.post('http://172.20.10.4:8080/api/buses/start', {
                chauffeurName,
                chauffeurNumber,
                busDestination,
                startTime: startDateTime,
            });
            if (response.status === 200) {
                Alert.alert('Succès', 'Le trajet a démarré.');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Problème lors du démarrage du trajet.');
            console.error(error);
        }
    };

    const endJourney = async () => {
        const endDateTime = new Date().toISOString();
        setEndTime(endDateTime);

        try {
            const response = await axios.post('http://192.168.1.80:8080/api/buses/end', {
                chauffeurName,
                chauffeurNumber,
                endTime: endDateTime,
            });
            if (response.status === 200) {
                Alert.alert('Succès', 'Le trajet a été terminé.');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Problème lors de la fin du trajet.');
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Chauffeur: {chauffeurName}</Text>
            <Text style={styles.subTitle}>Numéro Unique: {chauffeurNumber}</Text>
            <Text style={styles.subTitle}>Destination: {busDestination}</Text>

            <TouchableOpacity style={styles.button} onPress={startJourney}>
                <Text style={styles.buttonText}>Démarrer le trajet</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={endJourney}>
                <Text style={styles.buttonText}>Terminer le trajet</Text>
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
        fontWeight: 'bold',
        marginBottom: 20,
    },
    subTitle: {
        fontSize: 18,
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#3498db',
        padding: 15,
        borderRadius: 5,
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ChauffeurScreen;

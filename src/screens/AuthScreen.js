import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { auth, googleProvider } from '../firebaseConfig';

const AuthScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('chauffeur');

    const handleSignUp = async () => {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await user.updateProfile({ displayName: role });
            Alert.alert('Inscription réussie', `Bienvenue ${role}`);
            navigation.navigate('Home');
        } catch (error) {
            Alert.alert('Erreur', error.message);
        }
    };

    const handleSignIn = async () => {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            navigation.navigate('Home');
        } catch (error) {
            Alert.alert('Erreur', error.message);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            navigation.navigate('Home');
        } catch (error) {
            Alert.alert('Erreur', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Connexion / Inscription</Text>
            <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
            />
            <TextInput
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
            />
            <Text style={styles.label}>Sélectionnez votre rôle :</Text>
            <View style={styles.roleContainer}>
                <TouchableOpacity onPress={() => setRole('chauffeur')}>
                    <Text style={[styles.roleButton, role === 'chauffeur' && styles.selectedRole]}>
                        Chauffeur
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRole('controlleur')}>
                    <Text style={[styles.roleButton, role === 'controlleur' && styles.selectedRole]}>
                        Contrôleur
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRole('caissiere')}>
                    <Text style={[styles.roleButton, role === 'caissiere' && styles.selectedRole]}>
                        Caissière
                    </Text>
                </TouchableOpacity>
            </View>
            <Button title="S'inscrire" onPress={handleSignUp} />
            <Button title="Se connecter" onPress={handleSignIn} />
            <Button title="Se connecter avec Google" onPress={handleGoogleSignIn} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#f0f4f7',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 50,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    roleButton: {
        fontSize: 16,
        padding: 10,
        marginHorizontal: 10,
        backgroundColor: '#3498db',
        color: '#fff',
        borderRadius: 8,
    },
    selectedRole: {
        backgroundColor: '#1abc9c',
    },
});

export default AuthScreen;

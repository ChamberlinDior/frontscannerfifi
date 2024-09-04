import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginsScreen from './src/screens/LoginsScreen';


import HomeScreen from './src/screens/HomeScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginsScreen} />

        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
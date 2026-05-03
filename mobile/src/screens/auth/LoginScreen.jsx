import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data && response.data.data && response.data.data.token) {
        await AsyncStorage.setItem('userToken', response.data.data.token);

        const userRole = response.data.data.user?.role?.toLowerCase();
        if (userRole === 'product manager' || userRole === 'admin') {
          navigation.replace('ProductManagerDashboard');
        } else if (userRole === 'supplier manager') {
          navigation.replace('SupplierManagerDashboard');
        } else if (userRole === 'order manager') {
          navigation.replace('OrderManagerDashboard');
        } else if (userRole === 'review manager') {
          navigation.replace('ReviewManagerDashboard');
        } else if (userRole === 'loyalty manager') {
          navigation.replace('LoyaltyManagerDashboard');
        } else if (userRole === 'user manager') {
          navigation.replace('StaffManagerDashboard');
        } else {
          navigation.replace('Home');
        }
      } else {
        Alert.alert('Error', 'Invalid response from server');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to login. Please check your credentials.';
      Alert.alert('Login Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your premium account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#BBB"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#BBB"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={styles.forgotBtn} 
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.disabledBtn]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>LOGIN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>New here? <Text style={styles.registerTextBold}>Create Account</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    marginBottom: 40,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FD',
    padding: 18,
    borderRadius: 15,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  loginButton: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  disabledBtn: {
    backgroundColor: '#CCC',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  registerLink: {
    marginTop: 30,
    alignItems: 'center',
  },
  registerText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  registerTextBold: {
    fontWeight: '900',
    color: '#000',
  }
});

export default LoginScreen;

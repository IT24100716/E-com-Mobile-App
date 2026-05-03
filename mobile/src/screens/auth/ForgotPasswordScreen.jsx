import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      Alert.alert('OTP Sent', 'Check your email for the recovery code.');
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      setStep(3);
    } catch (err) {
      Alert.alert('Invalid OTP', 'The code you entered is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Minimum 6 characters required.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
        password
      });
      Alert.alert('Success', 'Password reset successfully. You can now log in.', [
        { text: 'LOGIN', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Text style={styles.title}>Recovery</Text>
            <Text style={styles.subtitle}>Reset your premium account password</Text>

            {step === 1 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#BBB"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOTP} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SEND RECOVERY CODE</Text>}
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View style={styles.form}>
                <Text style={styles.instructions}>Enter the 6-digit code sent to {email}</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity 
                  style={[styles.primaryBtn, otp.length < 6 && styles.disabledBtn]} 
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.length < 6}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>VERIFY CODE</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryBtnText}>CHANGE EMAIL</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>NEW PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>RESET PASSWORD</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  scrollContainer: { flexGrow: 1 },
  content: { paddingHorizontal: 30, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#000', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: '#999', marginTop: 8, marginBottom: 40, fontWeight: '600' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1.5, marginBottom: 10 },
  input: { backgroundColor: '#F8F9FD', padding: 18, borderRadius: 15, fontSize: 15, fontWeight: '600', color: '#000', borderWidth: 1, borderColor: '#F0F0F0' },
  primaryBtn: { backgroundColor: '#000', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  disabledBtn: { backgroundColor: '#EEE' },
  secondaryBtn: { marginTop: 20, alignItems: 'center' },
  secondaryBtnText: { fontSize: 12, fontWeight: '900', color: '#BBB', letterSpacing: 1 },
  instructions: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 30, fontWeight: '600' },
  otpInput: { backgroundColor: '#F8F9FD', padding: 25, borderRadius: 15, fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 10, color: '#000', marginBottom: 30 }
});

export default ForgotPasswordScreen;

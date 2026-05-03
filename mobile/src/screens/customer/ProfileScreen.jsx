import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/api';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Info/Edit, 2: Change Pass (Email), 3: OTP, 4: New Pass

  // Edit states
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data && response.data.data && response.data.data.user) {
        const u = response.data.data.user;
        setUser(u);
        setEditName(u.name);
        setEditPhone(u.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Session Expired', 'Please log in again.');
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setActionLoading(true);
    try {
      await api.put(`/users/${user.id}`, {
        name: editName,
        phone: editPhone
      });
      Alert.alert('Success', 'Profile updated successfully.');
      fetchProfile();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently erase your profile and order history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'ERASE PROFILE',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await api.delete(`/users/${user.id}`);
              Alert.alert('Deleted', 'Your account has been removed.');
              handleLogout();
            } catch (err) {
              Alert.alert('Error', 'Could not delete account.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSendOTP = async () => {
    setActionLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: user.email });
      Alert.alert('OTP Sent', 'Check your email for the recovery code.');
      setStep(3);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) return;
    setActionLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: user.email, otp });
      setStep(4);
    } catch (err) {
      Alert.alert('Invalid OTP', 'The code is incorrect.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Minimum 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: user.email,
        otp,
        password: newPassword
      });
      Alert.alert('Success', 'Password updated! Please log in again.');
      handleLogout();
    } catch (err) {
      Alert.alert('Error', 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MY ACCOUNT</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* User Header */}
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Feather name="user" size={32} color="#fff" />
            </View>
            <Text style={styles.userName}>{user?.name?.toUpperCase()}</Text>
            <Text style={styles.userEmailText}>{user?.email}</Text>
          </View>

          {step === 1 && (
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>EDIT PROFILE</Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS (READ ONLY)</Text>
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={user?.email}
                  editable={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, actionLoading && styles.disabledBtn]}
                onPress={handleUpdateProfile}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SAVE CHANGES</Text>}
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { marginTop: 40 }]}>SECURITY</Text>

              <TouchableOpacity style={styles.actionBtn} onPress={() => setStep(2)}>
                <View style={styles.actionIconWrap}>
                  <Feather name="lock" size={18} color="#000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Update Password</Text>
                  <Text style={styles.actionSub}>Reset using email OTP</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#DDD" />
              </TouchableOpacity>

              <View style={styles.dangerZone}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Feather name="log-out" size={18} color="#fff" />
                  <Text style={styles.logoutBtnText}>LOGOUT</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteLink} onPress={handleDeleteAccount}>
                  <Text style={styles.deleteLinkText}>Permanently Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.formSection}>
              <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}>
                <Feather name="arrow-left" size={16} color="#000" />
                <Text style={styles.backLinkText}>BACK TO PROFILE</Text>
              </TouchableOpacity>
              <Text style={styles.formTitle}>RESET PASSWORD</Text>
              <Text style={styles.formSub}>A 6-digit OTP will be sent to your email:</Text>
              <View style={styles.emailDisplay}><Text style={styles.emailText}>{user.email}</Text></View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOTP} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SEND OTP</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>VERIFY OTP</Text>
              <Text style={styles.formSub}>Check your inbox and enter the code.</Text>
              <TextInput style={styles.otpInput} placeholder="000000" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />
              <TouchableOpacity style={[styles.primaryBtn, otp.length < 6 && styles.disabledBtn]} onPress={handleVerifyOTP} disabled={actionLoading || otp.length < 6}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>VERIFY CODE</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 4 && (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>NEW PASSWORD</Text>
              <Text style={styles.formSub}>Must be at least 6 characters long.</Text>
              <View style={styles.inputWrap}><Text style={styles.inputLabel}>NEW PASSWORD</Text><TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={newPassword} onChangeText={setNewPassword} /></View>
              <View style={styles.inputWrap}><Text style={styles.inputLabel}>CONFIRM PASSWORD</Text><TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} /></View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>SAVE PASSWORD</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F8F9FD' },
  headerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  userCard: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: '900', color: '#000', marginTop: 20, letterSpacing: -0.5 },
  userEmailText: { fontSize: 13, color: '#999', fontWeight: '600', marginTop: 4 },

  content: { paddingHorizontal: 25, marginTop: 30 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#BBB', letterSpacing: 2, marginBottom: 20 },
  inputWrap: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1.5, marginBottom: 10 },
  input: { backgroundColor: '#F8F9FD', padding: 18, borderRadius: 15, fontSize: 15, fontWeight: '900', color: '#000', borderWidth: 1, borderColor: '#F0F0F0' },
  readOnlyInput: { backgroundColor: '#F0F0F0', color: '#AAA' },
  primaryBtn: { backgroundColor: '#000', padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  disabledBtn: { backgroundColor: '#CCC' },

  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F8F9FD', gap: 15 },
  actionIconWrap: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#F8F9FD', justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '900', color: '#000' },
  actionSub: { fontSize: 11, color: '#AAA', fontWeight: '600', marginTop: 2 },

  dangerZone: { marginTop: 60, alignItems: 'center' },
  logoutBtn: { backgroundColor: '#FF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15, gap: 12, width: '100%' },
  logoutBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  deleteLink: { marginTop: 25 },
  deleteLinkText: { fontSize: 12, fontWeight: '700', color: '#FF4444', opacity: 0.6, textDecorationLine: 'underline' },

  formSection: { paddingHorizontal: 25, marginTop: 20 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 30 },
  backLinkText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 1 },
  formTitle: { fontSize: 24, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  formSub: { fontSize: 13, color: '#999', fontWeight: '600', marginTop: 10, lineHeight: 20, marginBottom: 30 },
  emailDisplay: { backgroundColor: '#F8F9FD', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 30 },
  emailText: { fontSize: 15, fontWeight: '900', color: '#000', fontStyle: 'italic' },
  otpInput: { backgroundColor: '#F8F9FD', padding: 25, borderRadius: 15, fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: 10, color: '#000', marginBottom: 30 }
});

export default ProfileScreen;

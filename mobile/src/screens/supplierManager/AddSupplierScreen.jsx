import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

const COUNTRY_CODES = [
  { code: '+94', name: 'Sri Lanka', maxLength: 9 },
  { code: '+1', name: 'USA/Canada', maxLength: 10 },
  { code: '+44', name: 'UK', maxLength: 10 },
  { code: '+91', name: 'India', maxLength: 10 },
  { code: '+61', name: 'Australia', maxLength: 9 },
  { code: '+86', name: 'China', maxLength: 11 },
  { code: '+971', name: 'UAE', maxLength: 9 },
  { code: '+65', name: 'Singapore', maxLength: 8 },
  { code: '+49', name: 'Germany', maxLength: 11 },
  { code: '+33', name: 'France', maxLength: 9 },
  { code: '+81', name: 'Japan', maxLength: 10 },
];

const AddSupplierScreen = ({ navigation, route }) => {
  const editingSupplier = route.params?.supplier;
  const isEditing = !!editingSupplier;

  const [formData, setFormData] = useState({
    name: editingSupplier?.name || '',
    email: editingSupplier?.email || '',
    phone: editingSupplier?.phone || '',
    type: editingSupplier?.type || 'Local',
    status: editingSupplier?.status || 'Active',
    address: editingSupplier?.address || '',
  });

  const [countryCode, setCountryCode] = useState('+94');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize phone and country code if editing
  useEffect(() => {
    if (editingSupplier?.phone) {
      const phone = editingSupplier.phone;
      const match = COUNTRY_CODES.find(c => phone.startsWith(c.code));
      if (match) {
        setCountryCode(match.code);
        setPhoneNumber(phone.replace(match.code, ''));
      } else {
        setPhoneNumber(phone);
      }
    }
  }, [editingSupplier]);

  // Sync phone field in formData whenever code or number changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, phone: `${countryCode}${phoneNumber}` }));
  }, [countryCode, phoneNumber]);

  const validatePhone = () => {
    if (formData.type === 'Local') {
      // Sri Lanka validation: +94 followed by 9 digits
      const fullPhone = `${countryCode}${phoneNumber}`;
      if (!fullPhone.startsWith('+94')) return false;
      const digits = phoneNumber.replace(/\s/g, '');
      return digits.length === 9;
    }
    return phoneNumber.length >= 7; // Basic international validation
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields (Supplier Name, Email)');
      return;
    }

    if (!validatePhone()) {
      const msg = formData.type === 'Local'
        ? 'Invalid Sri Lanka number. Format: +94 7X XXX XXXX (9 digits after code)'
        : 'Invalid phone number format.';
      Alert.alert('Invalid Phone', msg);
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        Alert.alert('Success', 'Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        Alert.alert('Success', 'Supplier registered successfully');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Supplier Submit Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type) => {
    updateField('type', type);
    if (type === 'Local') {
      setCountryCode('+94');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'EDIT SUPPLIER' : 'REGISTER SUPPLIER'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Supplier Identity</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supplier Name *</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={18} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => updateField('name', text)}
                  placeholder="Enter supplier name or Company name"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supplier Type</Text>
              <View style={styles.typeSelector}>
                {['Local', 'International'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      formData.type === type && styles.typeOptionActive
                    ]}
                    onPress={() => handleTypeChange(type)}
                  >
                    <Text style={[
                      styles.typeText,
                      formData.type === type && styles.typeTextActive
                    ]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Contact Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                  style={[styles.countryPicker, formData.type === 'Local' && styles.disabledPicker]}
                  onPress={() => formData.type === 'International' && setShowCountryModal(true)}
                  disabled={formData.type === 'Local'}
                >
                  <Text style={styles.countryCodeText}>{countryCode}</Text>
                  {formData.type === 'International' && <Feather name="chevron-down" size={14} color="#666" />}
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9]/g, '');
                    setPhoneNumber(filtered);
                  }}
                  placeholder={formData.type === 'Local' ? '771234567' : 'Enter number'}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                  maxLength={COUNTRY_CODES.find(c => c.code === countryCode)?.maxLength || 15}
                />
              </View>
              {formData.type === 'Local' && (
                <Text style={styles.hintText}>Sri Lanka (+94) numbers must be 9 digits.</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => updateField('email', text)}
                  placeholder="contact@supplier.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Address</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => updateField('address', text)}
                  placeholder="Enter physical location or warehouse address"
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {isEditing ? 'UPDATE PARTNER' : 'REGISTER PARTNER'}
                </Text>
                <Feather name="check-circle" size={18} color="#fff" style={{ marginLeft: 10 }} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Selection Modal */}
      <Modal
        visible={showCountryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setCountryCode(item.code);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={styles.countryNameText}>{item.name}</Text>
                  <Text style={styles.countryCodeItemText}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  formSection: {
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 20,
    color: '#000',
    letterSpacing: -0.5,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 55,
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 15,
  },
  textArea: {
    height: 100,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  typeOption: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  typeOptionActive: {
    backgroundColor: '#000',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#999',
  },
  typeTextActive: {
    color: '#fff',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  countryPicker: {
    width: 100,
    height: 55,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  disabledPicker: {
    backgroundColor: '#f0f0f0',
    opacity: 0.8,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
  phoneInput: {
    flex: 1,
    height: 55,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 15,
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  hintText: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#000',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '60%',
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  countryCodeItemText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
});

export default AddSupplierScreen;

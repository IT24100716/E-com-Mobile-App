import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  SafeAreaView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const AdminStaffScreen = ({ navigation }) => {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    roleId: '',
    password: ''
  });

  const fetchData = async () => {
    try {
      const [staffRes, rolesRes] = await Promise.all([
        api.get('/staff?take=1000'),
        api.get('/roles?take=1000')
      ]);
      const staffData = staffRes.data?.data?.staff || staffRes.data?.staff || staffRes.data?.data || staffRes.data || [];
      setStaff(Array.isArray(staffData) ? staffData : []);
      
      const rolesData = rolesRes.data?.data?.roles || rolesRes.data?.roles || rolesRes.data?.data || rolesRes.data || [];
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error('Error fetching staff data:', error);
      Alert.alert('Error', 'Failed to fetch staff data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSaveStaff = async () => {
    if (!form.name || !form.email || !form.roleId) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, form);
        Alert.alert('Success', 'Staff member updated successfully');
      } else {
        await api.post('/staff', form);
        Alert.alert('Success', 'Staff member created successfully. Credentials sent via email.');
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Save staff error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = (id) => {
    Alert.alert(
      'Delete Staff',
      'Are you sure you want to delete this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/staff/${id}`);
              Alert.alert('Success', 'Staff member deleted');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete staff member');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setForm({ name: '', email: '', roleId: '', password: '' });
    setEditingStaff(null);
  };

  const filteredStaff = (staff || []).filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStaffItem = ({ item }) => (
    <View style={styles.staffCard}>
      <View style={styles.staffHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{item.name}</Text>
          <Text style={styles.staffEmail}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: '#F0F0F0' }]}>
          <Text style={styles.roleText}>{item.role?.name?.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={() => {
            setEditingStaff(item);
            setForm({
              name: item.name,
              email: item.email,
              roleId: item.roleId || item.role?.id || '',
              password: ''
            });
            setIsModalOpen(true);
          }}
        >
          <Feather name="edit-2" size={16} color="#3498DB" />
          <Text style={[styles.actionText, { color: '#3498DB' }]}>EDIT</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => handleDeleteStaff(item.id)}
        >
          <Feather name="trash-2" size={16} color="#FF4757" />
          <Text style={[styles.actionText, { color: '#FF4757' }]}>DELETE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>STAFF MEMBERS</Text>
          <Text style={styles.headerSub}>{staff.length} registered accounts</Text>
        </View>
        <TouchableOpacity onPress={() => { resetForm(); setIsModalOpen(true); }} style={styles.addBtnHeader}>
          <Feather name="plus-circle" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name, email or role..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Feather name="x" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStaffItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search" size={60} color="#EEE" />
              <Text style={styles.emptyTitle}>NO STAFF FOUND</Text>
              <Text style={styles.emptySub}>Try adjusting your search criteria</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => { resetForm(); setIsModalOpen(true); }}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingStaff ? 'EDIT STAFF' : 'ADD NEW STAFF'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Enter full name"
                    value={form.name}
                    onChangeText={(val) => setForm({ ...form, name: val })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(val) => setForm({ ...form, email: val })}
                  />
                </View>

                {!editingStaff && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>PASSWORD (OPTIONAL)</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="Auto-generated if blank"
                      secureTextEntry
                      value={form.password}
                      onChangeText={(val) => setForm({ ...form, password: val })}
                    />
                    <Text style={styles.helperText}>Credentials will be sent to the user's email.</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SYSTEM ROLE</Text>
                  <View style={styles.roleGrid}>
                    {roles.map((role) => (
                      <TouchableOpacity 
                        key={role.id}
                        style={[
                          styles.roleOption, 
                          form.roleId === role.id && styles.roleOptionActive
                        ]}
                        onPress={() => setForm({ ...form, roleId: role.id })}
                      >
                        <Text style={[
                          styles.roleOptionText,
                          form.roleId === role.id && styles.roleOptionTextActive
                        ]}>
                          {role.name?.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                  onPress={handleSaveStaff}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingStaff ? 'UPDATE ACCOUNT' : 'CREATE ACCOUNT'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  backBtn: {
    padding: 5
  },
  addBtnHeader: {
    padding: 5
  },
  headerTitleContainer: {
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000'
  },
  headerSub: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    letterSpacing: 1
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 20,
    paddingBottom: 100
  },
  staffCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900'
  },
  staffInfo: {
    flex: 1
  },
  staffName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000'
  },
  staffEmail: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 2
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  roleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#333',
    letterSpacing: 0.5
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F9F9F9',
    paddingTop: 15,
    gap: 15
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    backgroundColor: '#000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginTop: 20
  },
  emptySub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 8
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: '70%',
    maxHeight: '90%',
    padding: 25
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000'
  },
  form: {
    gap: 20
  },
  inputGroup: {
    gap: 8
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5
  },
  input: {
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 55,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  helperText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600'
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5
  },
  roleOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#fff'
  },
  roleOptionActive: {
    backgroundColor: '#000',
    borderColor: '#000'
  },
  roleOptionText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999'
  },
  roleOptionTextActive: {
    color: '#fff'
  },
  saveBtn: {
    backgroundColor: '#000',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  saveBtnDisabled: {
    opacity: 0.7
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2
  }
});

export default AdminStaffScreen;

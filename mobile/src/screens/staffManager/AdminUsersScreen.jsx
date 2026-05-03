import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  SafeAreaView,
  Platform,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const AdminUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: ''
  });

  const fetchUsers = async () => {
    try {
      // Get all loyalty members (customers)
      const response = await api.get('/loyalty/members');
      const customers = Array.isArray(response.data?.data) ? response.data.data :
                        Array.isArray(response.data) ? response.data : [];
      setUsers(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      Alert.alert('Error', 'Failed to fetch customer data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const validatePhone = (phone) => {
    // Simple 10-digit validation for Sri Lanka or general use
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const handleEditPress = (user) => {
    setSelectedUser(user);
    setForm({
      name: user.name || '',
      phone: user.phone || ''
    });
    setIsModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (form.phone && !validatePhone(form.phone)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: form.name,
        phone: form.phone
      });
      
      Alert.alert('Success', 'Customer details updated successfully');
      setIsModalOpen(false);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Update user error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await api.delete(`/users/${selectedUser.id}`);
              Alert.alert('Success', 'Customer deleted successfully');
              setIsModalOpen(false);
              fetchUsers();
            } catch (error) {
              console.error('Delete user error:', error);
              Alert.alert('Error', 'Failed to delete customer');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => handleEditPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone && (
             <View style={styles.phoneRow}>
                <Feather name="phone" size={10} color="#999" />
                <Text style={styles.userPhone}>{item.phone}</Text>
             </View>
          )}
        </View>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.balance || 0} pts</Text>
        </View>
      </View>
      
      <View style={styles.userFooter}>
        <View style={styles.metaInfo}>
          <Feather name="calendar" size={12} color="#999" />
          <Text style={styles.metaText}>Joined {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</Text>
        </View>
        <View style={styles.editBadge}>
           <Feather name="edit-2" size={12} color="#3498DB" />
           <Text style={styles.editText}>EDIT</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>CUSTOMERS</Text>
          <Text style={styles.headerSub}>Client Management</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={60} color="#EEE" />
              <Text style={styles.emptyTitle}>NO CUSTOMERS FOUND</Text>
              <Text style={styles.emptySub}>Try a different search term</Text>
            </View>
          }
        />
      )}

      {/* Edit Customer Modal */}
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
              <View>
                <Text style={styles.modalTitle}>EDIT CUSTOMER</Text>
                <Text style={styles.modalSub}>{selectedUser?.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={18} color="#999" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="Enter full name"
                      value={form.name}
                      onChangeText={(text) => setForm({ ...form, name: text })}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PHONE NUMBER (10 DIGITS)</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="phone" size={18} color="#999" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. 0771234567"
                      value={form.phone}
                      onChangeText={(text) => setForm({ ...form, phone: text.replace(/[^0-9]/g, '') })}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                  <Text style={styles.helperText}>Example: 0771234567</Text>
                </View>

                <View style={styles.statsRow}>
                   <View style={styles.statBox}>
                      <Text style={styles.statLabel}>EARNED</Text>
                      <Text style={styles.statValue}>{selectedUser?.earned || 0}</Text>
                   </View>
                   <View style={styles.statBox}>
                      <Text style={styles.statLabel}>REDEEMED</Text>
                      <Text style={styles.statValue}>{selectedUser?.redeemed || 0}</Text>
                   </View>
                   <View style={styles.statBox}>
                      <Text style={styles.statLabel}>BALANCE</Text>
                      <Text style={[styles.statValue, { color: '#2ED573' }]}>{selectedUser?.balance || 0}</Text>
                   </View>
                </View>

                <TouchableOpacity 
                  style={[styles.saveBtn, submitting && styles.disabledBtn]}
                  onPress={handleUpdateUser}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelBtn}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.deleteModalBtn}
                  onPress={handleDeleteUser}
                  disabled={submitting}
                >
                  <Feather name="trash-2" size={16} color="#FF4757" />
                  <Text style={styles.deleteModalBtnText}>DELETE CUSTOMER</Text>
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
    paddingBottom: 40
  },
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000'
  },
  userEmail: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 2
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  userPhone: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600'
  },
  pointsBadge: {
    backgroundColor: '#F8F9FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000'
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F9F9F9',
    paddingTop: 15
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  metaText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600'
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  editText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3498DB'
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 25,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5
  },
  modalSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 2
  },
  form: {
    paddingBottom: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    marginBottom: 10
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#000'
  },
  helperText: {
    fontSize: 10,
    color: '#BBB',
    marginTop: 6,
    marginLeft: 5,
    fontWeight: '600'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginTop: 10
  },
  statBox: {
    width: (width - 70) / 3,
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#999',
    marginBottom: 4
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000'
  },
  saveBtn: {
    backgroundColor: '#000',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1
  },
  disabledBtn: {
    opacity: 0.7
  },
  cancelBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1
  },
  deleteModalBtn: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10
  },
  deleteModalBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF4757',
    letterSpacing: 1
  }
});

export default AdminUsersScreen;

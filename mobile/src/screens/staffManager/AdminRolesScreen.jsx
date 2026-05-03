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

const AdminRolesScreen = ({ navigation }) => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: ''
  });

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles?take=1000');
      const rolesData = Array.isArray(response.data?.data?.roles) ? response.data.data.roles :
                        Array.isArray(response.data?.roles) ? response.data.roles :
                        Array.isArray(response.data?.data) ? response.data.data :
                        Array.isArray(response.data) ? response.data : [];
      setRoles(rolesData);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRoles();
  };

  const handleSaveRole = async () => {
    if (!form.name) {
      Alert.alert('Missing Name', 'Please enter a role name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, form);
        Alert.alert('Success', 'Role updated successfully');
      } else {
        await api.post('/roles', form);
        Alert.alert('Success', 'Role created successfully');
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (error) {
      console.error('Save role error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = (id) => {
    Alert.alert(
      'Delete Role',
      'Are you sure you want to delete this role? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/roles/${id}`);
              Alert.alert('Success', 'Role deleted');
              fetchRoles();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete role');
            }
          }
        }
      ]
    );
  };

  const renderRoleItem = ({ item }) => (
    <View style={styles.roleCard}>
      <View style={styles.roleHeader}>
        <View style={styles.roleIconContainer}>
          <MaterialCommunityIcons name="shield-account" size={24} color="#000" />
        </View>
        <View style={styles.roleInfo}>
          <Text style={styles.roleName}>{item.name}</Text>
          <Text style={styles.roleUserCount}>{item.users?.length || 0} users assigned</Text>
        </View>
        <View style={styles.roleActions}>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => {
              setEditingRole(item);
              setForm({
                name: item.name,
                description: item.description || ''
              });
              setIsModalOpen(true);
            }}
          >
            <Feather name="edit-2" size={18} color="#3498DB" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteBtn}
            onPress={() => handleDeleteRole(item.id)}
          >
            <Feather name="trash-2" size={18} color="#FF4757" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description ? (
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      ) : (
        <View style={styles.noDescriptionBox}>
          <Text style={styles.noDescriptionText}>No description provided for this role.</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>ROLES & ACCESS</Text>
          <Text style={styles.headerSub}>Manage Permission Levels</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRoleItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="shield-off" size={60} color="#EEE" />
              <Text style={styles.emptyTitle}>NO ROLES DEFINED</Text>
              <Text style={styles.emptySub}>Create roles to manage team access</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          setEditingRole(null);
          setForm({ name: '', description: '' });
          setIsModalOpen(true);
        }}
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
              <Text style={styles.modalTitle}>{editingRole ? 'EDIT ROLE' : 'CREATE NEW ROLE'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ROLE NAME</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="e.g. Sales Manager"
                    value={form.name}
                    onChangeText={(text) => setForm({ ...form, name: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>DESCRIPTION</Text>
                  <TextInput 
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe what this role manages..."
                    value={form.description}
                    onChangeText={(text) => setForm({ ...form, description: text })}
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.saveBtn, submitting && styles.disabledBtn]}
                  onPress={handleSaveRole}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingRole ? 'UPDATE ROLE' : 'CREATE ROLE'}</Text>
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
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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
  backBtn: {
    padding: 5
  },
  listContent: {
    padding: 20,
    paddingBottom: 100
  },
  roleCard: {
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
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#F8F9FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  roleInfo: {
    flex: 1
  },
  roleName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000'
  },
  roleUserCount: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 2
  },
  roleActions: {
    flexDirection: 'row',
    gap: 15
  },
  descriptionBox: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F9F9F9'
  },
  descriptionText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    fontWeight: '500'
  },
  noDescriptionBox: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F9F9F9'
  },
  noDescriptionText: {
    fontSize: 12,
    color: '#CCC',
    fontStyle: 'italic'
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
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
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1
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
  input: {
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    padding: 15,
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  saveBtn: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1
  },
  disabledBtn: {
    opacity: 0.7
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
  }
});

export default AdminRolesScreen;

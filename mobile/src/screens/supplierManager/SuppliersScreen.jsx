import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const SuppliersScreen = ({ navigation }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      console.log('[SuppliersScreen] Fetching suppliers from:', api.defaults.baseURL);
      const response = await api.get('/suppliers', { params: { skip: 0, take: 100 } });
      
      let supplierList = [];
      if (Array.isArray(response.data?.data?.suppliers)) {
        supplierList = response.data.data.suppliers;
      } else if (Array.isArray(response.data?.suppliers)) {
        supplierList = response.data.suppliers;
      } else if (Array.isArray(response.data?.data)) {
        supplierList = response.data.data;
      } else if (Array.isArray(response.data)) {
        supplierList = response.data;
      }

      console.log(`[SuppliersScreen] Received ${supplierList.length} suppliers`);
      setSuppliers(supplierList);
    } catch (error) {
      console.error('[SuppliersScreen] Fetch Error:', error.message);
      Alert.alert('Connection Error', 'Failed to load suppliers. Please ensure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Supplier',
      'Are you sure you want to delete this supplier? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/suppliers/${id}`);
              setSuppliers(suppliers.filter(s => s.id !== id));
              Alert.alert('Success', 'Supplier deleted successfully');
            } catch (error) {
              console.error('Delete Error:', error);
              Alert.alert('Error', 'Failed to delete supplier');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (supplier) => {
    navigation.navigate('AddSupplier', { supplier });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  const getImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=500&q=80';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http')) return cleanUrl;
    return `https://e-com-mobile-app-production.up.railway.app${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter(s =>
    s?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const renderSupplierItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.supplierCard}
        activeOpacity={0.7}
        onPress={() => handleEdit(item)}
      >
        <Image
          source={{ uri: getImageUrl(item.imageUrl) }}
          style={styles.supplierImage}
        />
        <View style={styles.supplierInfo}>
          <View style={styles.supplierHeader}>
            <Text style={styles.categoryText}>{item.type || 'LOCAL'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? '#e8f5e9' : '#fff3e0' }]}>
              <Text style={[styles.statusText, { color: item.status === 'Active' ? '#4caf50' : '#ff9800' }]}>
                {item.status || 'Active'}
              </Text>
            </View>
          </View>

          <Text style={styles.supplierName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.phoneRow}>
            <Feather name="phone" size={14} color="#495057" style={{ marginRight: 6 }} />
            <Text style={styles.phoneText}>{item.phone || 'No Phone'}</Text>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactItem}>
              <Feather name="mail" size={12} color="#999" />
              <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Feather name="trash-2" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={isSidebarOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsSidebarOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setIsSidebarOpen(false)} 
          />
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarLogo}>RICH APPAREL</Text>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarItems}>
              <SidebarItem 
                icon="grid" 
                label="Dashboard" 
                onPress={() => {
                  setIsSidebarOpen(false);
                  navigation.navigate('SupplierManagerDashboard');
                }} 
              />
              <SidebarItem 
                icon="users" 
                label="Suppliers" 
                active
                onPress={() => setIsSidebarOpen(false)} 
              />
              <SidebarItem 
                icon="truck" 
                label="Restock Requests" 
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => {
                    navigation.navigate('RestockRequests');
                  }, 100);
                }} 
              />
              <SidebarItem 
                icon="settings" 
                label="Settings" 
                onPress={() => setIsSidebarOpen(false)} 
              />
            </ScrollView>

            <TouchableOpacity 
              style={styles.sidebarFooter}
              onPress={() => {
                setIsSidebarOpen(false);
                navigation.replace('Login');
              }}
            >
              <Feather name="log-out" size={18} color="#ff4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SUPPLIER DIRECTORY</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search suppliers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
          {searchTerm !== '' && (
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
          data={filteredSuppliers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSupplierItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No suppliers found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSupplier')}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const SidebarItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.sidebarItem, active && styles.sidebarItemActive]}
    onPress={onPress}
  >
    <Feather name={icon} size={20} color={active ? '#000' : '#666'} />
    <Text style={[styles.sidebarItemLabel, active && styles.sidebarItemLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  supplierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  supplierImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  supplierInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#adb5bd',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212529',
    marginBottom: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phoneText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 11,
    color: '#868e96',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtons: {
    justifyContent: 'space-between',
    paddingLeft: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#adb5bd',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContent: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarLogo: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  sidebarItems: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 5,
  },
  sidebarItemActive: {
    backgroundColor: '#f5f5f5',
  },
  sidebarItemLabel: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  sidebarItemLabelActive: {
    color: '#000',
    fontWeight: '800',
  },
  sidebarFooter: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#ff4444',
  },
});

export default SuppliersScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const RestockRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const init = async () => {
      const storedRole = await AsyncStorage.getItem('userRole');
      if (storedRole) setUserRole(storedRole.toLowerCase());
      
      await fetchUserRole();
      await fetchRequests();
    };
    init();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await api.get('/auth/profile');
      const role = response.data?.data?.user?.role?.name?.toLowerCase() || 
                   response.data?.data?.user?.role?.toLowerCase() || 
                   'product manager';
      console.log('[RestockRequests] Verified Role:', role);
      setUserRole(role);
      await AsyncStorage.setItem('userRole', role);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/restock-requests');
      setRequests(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching restock requests:', error);
      Alert.alert('Error', 'Failed to load restock requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (id, action) => {
    setUpdatingId(id);
    try {
      if (action === 'approve') {
        await api.patch(`/restock-requests/${id}/approve`);
      } else if (action === 'process') {
        await api.patch(`/restock-requests/${id}/process`);
      } else if (action === 'complete') {
        await api.patch(`/restock-requests/${id}/complete`);
      } else if (action === 'addToStock') {
        await api.patch(`/restock-requests/${id}/add-to-stock`);
      } else if (action === 'Rejected') {
        await api.patch(`/restock-requests/${id}/status`, { status: 'Rejected' });
      }
      
      Alert.alert('Success', `Request updated successfully`);
      fetchRequests();
    } catch (error) {
      console.error('Status Update Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fff3e0', text: '#ff9800' };
      case 'Approved': return { bg: '#e3f2fd', text: '#2196f3' };
      case 'Processing': return { bg: '#e8eaf6', text: '#3f51b5' };
      case 'Completed': return { bg: '#e8f5e9', text: '#4caf50' };
      case 'Rejected': return { bg: '#ffebee', text: '#f44336' };
      case 'Closed': return { bg: '#f5f5f5', text: '#666' };
      default: return { bg: '#f5f5f5', text: '#9e9e9e' };
    }
  };

  const renderAttribute = (key, value, isLast) => {
    let displayValue = value;
    let colorHex = null;

    // Handle nested objects (found: object with keys {size, colour, sex, material})
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const parts = Object.entries(value)
        .filter(([k]) => !['stock', 'priceAdj', 'quantity', 'imageUrl', 'id'].includes(k))
        .map(([k, v]) => {
          if (k === 'colour' || k === 'color') {
            if (typeof v === 'string' && v.includes('|')) return v.split('|')[0];
            return v;
          }
          return v;
        });
      displayValue = parts.join(' | ');
    } else if (key === 'colour' || key === 'color') {
      if (typeof value === 'string' && value.includes('|')) {
        const parts = value.split('|');
        displayValue = parts[0];
        colorHex = parts[1];
      } else if (typeof value === 'string' && value.startsWith('#')) {
        colorHex = value;
        displayValue = '';
      }
    }

    if (Array.isArray(value)) displayValue = value.join(', ');

    return (
      <View key={key} style={styles.attributeItem}>
        <View style={styles.attributeChip}>
          {colorHex && (
            <View style={[styles.colorBall, { backgroundColor: colorHex, width: 10, height: 10 }]} />
          )}
          <Text style={styles.attributeTextMinimal}>{displayValue}</Text>
        </View>
        {!isLast && <Text style={styles.separatorMinimal}>|</Text>}
      </View>
    );
  };

  const renderRequestItem = ({ item }) => {
    const status = getStatusColor(item.status);
    const isUpdating = updatingId === item.id;
    
    const isProductManager = userRole === 'product manager' || userRole === 'admin';
    const isSupplierManager = userRole === 'supplier manager' || userRole === 'admin';

    return (
      <View style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.product?.name}</Text>
            <Text style={styles.skuText}>SKU: {item.product?.sku}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Quantity:</Text>
            <Text style={styles.detailValue}>{item.quantity} units</Text>
          </View>

          {item.variantDetails && Array.isArray(item.variantDetails) && item.variantDetails.length > 0 && (
            <View style={styles.variantsContainer}>
              <Text style={styles.variantsTitle}>VARIANTS BREAKDOWN</Text>
              {item.variantDetails.map((v, idx) => {
                const attributes = Object.entries(v).filter(
                  ([key]) => !['stock', 'priceAdj', 'quantity', 'imageUrl', 'id'].includes(key)
                );

                return (
                  <View key={idx} style={styles.variantDetailRow}>
                    <View style={styles.attributeRow}>
                      {attributes.map(([key, value], vIdx) => 
                        renderAttribute(key, value, vIdx === attributes.length - 1)
                      )}
                    </View>
                    <Text style={styles.variantDetailQty}>{v.quantity} units</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested By:</Text>
            <Text style={styles.detailValue}>{item.requestedBy?.name || item.user?.name}</Text>
          </View>

          {item.product?.supplier && (
            <View style={styles.supplierContainer}>
              <View style={styles.supplierHeader}>
                <Feather name="truck" size={12} color="#000" />
                <Text style={styles.supplierTitle}>SUPPLIER DETAILS</Text>
              </View>
              <View style={styles.supplierContent}>
                <View style={styles.supplierRow}>
                  <Feather name="user" size={14} color="#666" style={styles.supplierIcon} />
                  <Text style={styles.supplierName}>{item.product.supplier.name}</Text>
                </View>
                <View style={styles.supplierContactRow}>
                  <View style={styles.supplierContactItem}>
                    <Feather name="phone" size={12} color="#999" />
                    <Text style={styles.supplierContactText}>{item.product.supplier.phone || 'No phone'}</Text>
                  </View>
                  <View style={styles.supplierContactItem}>
                    <Feather name="mail" size={12} color="#999" />
                    <Text style={styles.supplierContactText} numberOfLines={1}>{item.product.supplier.email || 'No email'}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {isSupplierManager && item.status === 'Pending' && (
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleStatusUpdate(item.id, 'approve')}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>APPROVE</Text>}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleStatusUpdate(item.id, 'Rejected')}
                disabled={isUpdating}
              >
                <Text style={styles.rejectBtnText}>REJECT</Text>
              </TouchableOpacity>
            </View>
          )}

          {isSupplierManager && item.status === 'Approved' && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.processBtn]}
              onPress={() => handleStatusUpdate(item.id, 'process')}
              disabled={isUpdating}
            >
              <Text style={styles.btnText}>START PROCESSING</Text>
            </TouchableOpacity>
          )}

          {isSupplierManager && item.status === 'Processing' && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => handleStatusUpdate(item.id, 'complete')}
              disabled={isUpdating}
            >
              <Text style={styles.btnText}>MARK COMPLETED</Text>
            </TouchableOpacity>
          )}

          {isProductManager && item.status === 'Completed' && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.stockBtn]}
              onPress={() => handleStatusUpdate(item.id, 'addToStock')}
              disabled={isUpdating}
            >
              <Text style={styles.btnText}>ADD TO STOCK & CLOSE</Text>
            </TouchableOpacity>
          )}

          {item.status === 'Closed' && (
            <View style={styles.finalStatusRow}>
              <Feather name="check-circle" size={16} color="#4caf50" />
              <Text style={[styles.finalStatusText, { color: '#4caf50' }]}>
                Fulfilled & Closed
              </Text>
            </View>
          )}

          {item.status === 'Rejected' && (
            <View style={styles.finalStatusRow}>
              <Feather name="x-circle" size={16} color="#f44336" />
              <Text style={[styles.finalStatusText, { color: '#f44336' }]}>
                Request Rejected
              </Text>
            </View>
          )}
        </View>
      </View>
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
                  navigation.navigate(userRole === 'supplier manager' ? 'SupplierManagerDashboard' : 'ProductManagerDashboard');
                }} 
              />
              {userRole === 'supplier manager' ? (
                <SidebarItem 
                  icon="users" 
                  label="Suppliers" 
                  onPress={() => {
                    setIsSidebarOpen(false);
                    navigation.navigate('Suppliers');
                  }} 
                />
              ) : (
                <>
                  <SidebarItem 
                    icon="package" 
                    label="Products" 
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('Products');
                    }} 
                  />
                  <SidebarItem 
                    icon="layers" 
                    label="Categories" 
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('Categories');
                    }} 
                  />
                  <SidebarItem 
                    icon="rotate-ccw" 
                    label="Replacements" 
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('AdminReplacements');
                    }} 
                  />
                </>
              )}
              <SidebarItem 
                icon="truck" 
                label="Restock" 
                active
                onPress={() => setIsSidebarOpen(false)} 
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
        <Text style={styles.headerTitle}>RESTOCK MANAGEMENT</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="truck" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No restock requests found</Text>
            </View>
          }
        />
      )}

      {(userRole === 'product manager' || userRole === 'admin') && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateRestockRequest')}
        >
          <Feather name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
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
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  skuText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardBody: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f5f5f5',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#000',
    fontWeight: '700',
  },
  variantsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  variantsTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
    letterSpacing: 1,
  },
  variantDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  attributeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flex: 1,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  attributeTextMinimal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  separatorMinimal: {
    marginHorizontal: 6,
    color: '#eee',
    fontSize: 12,
  },
  variantDetailQty: {
    fontSize: 12,
    color: '#000',
    fontWeight: '800',
    marginLeft: 10,
  },
  supplierContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderLeftWidth: 4,
    borderLeftColor: '#000',
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  supplierTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  supplierContent: {
    gap: 4,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  supplierIcon: {
    marginRight: 8,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  supplierContactRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 4,
  },
  supplierContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  supplierContactText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: '#000',
  },
  rejectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  processBtn: {
    backgroundColor: '#3f51b5',
  },
  completeBtn: {
    backgroundColor: '#4caf50',
  },
  stockBtn: {
    backgroundColor: '#000',
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rejectBtnText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  finalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  finalStatusText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
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

export default RestockRequestsScreen;

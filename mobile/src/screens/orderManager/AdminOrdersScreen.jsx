import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
  ScrollView,
  Image,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const STATUS_FILTERS = [
  { label: 'ALL', value: '' },
  { label: 'PENDING', value: 'pending' },
  { label: 'CONFIRMED', value: 'confirmed' },
  { label: 'ON THE WAY', value: 'shipped' },
  { label: 'DELIVERED', value: 'delivered' },
];

const AdminOrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data?.data?.orders || response.data?.orders || response.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };
  
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update order status error:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.id.toLowerCase().includes(searchLower) || 
      (order.user?.name && order.user.name.toLowerCase().includes(searchLower)) ||
      (order.contactEmail && order.contactEmail.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === '' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFB000';
      case 'confirmed': return '#5856D6';
      case 'shipped': return '#007AFF';
      case 'delivered': return '#34C759';
      case 'cancelled': return '#FF3B30';
      default: return '#999';
    }
  };

  const renderOrderItem = ({ item }) => {
    const sFee = item.shippingFee || (item.deliveryMethod === "express_delivery" ? 500 : (item.deliveryMethod === "pickup" ? 0 : 350));
    const totalAmount = (item.total || 0) + sFee;

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('AdminOrderDetail', { orderId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}
            onPress={() => {
              setSelectedOrderForStatus(item);
              setIsStatusModalOpen(true);
            }}
          >
            <View style={styles.statusBadgeContent}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
              <Feather name="chevron-down" size={10} color={getStatusColor(item.status)} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.customerInfo}>
            <Feather name="user" size={14} color="#999" />
            <Text style={styles.customerName}>{item.user?.name || 'Guest Customer'}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>SETTLEMENT</Text>
            <Text style={styles.priceValue}>LKR {totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.itemsBadge}>
            <Text style={styles.itemsCount}>{item.items?.length || 0} ITEMS · {item.payment?.status?.toUpperCase() || 'UNPAID'}</Text>
          </View>
          <View style={styles.viewLink}>
            <Text style={styles.viewLinkText}>VIEW DETAILS</Text>
            <Feather name="arrow-right" size={12} color="#000" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>ORDERS ARCHIVE</Text>
          <Text style={styles.headerSub}>Database of all transactions</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={onRefresh}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Sidebar Modal */}
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
                  setTimeout(() => navigation.navigate('OrderManagerDashboard'), 100);
                }}
              />
              <SidebarItem
                icon="package"
                label="All Orders"
                active
                onPress={() => setIsSidebarOpen(false)}
              />
              <SidebarItem
                icon="credit-card"
                label="Payments"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminPayments'), 100);
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

      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Reference, Name, or Email..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
          {STATUS_FILTERS.map(filter => (
            <TouchableOpacity 
              key={filter.label}
              style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter.value)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter.value && styles.filterChipTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="package" size={64} color="#eee" />
              <Text style={styles.emptyText}>No orders discovered for the selected criteria.</Text>
            </View>
          }
        />
      )}
      {/* Status Selection Modal */}
      <Modal
        visible={isStatusModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsStatusModalOpen(false)}
      >
        <View style={styles.pickerModalContainer}>
          <Pressable 
            style={styles.pickerModalOverlay} 
            onPress={() => setIsStatusModalOpen(false)} 
          />
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Update Status</Text>
                <Text style={styles.pickerSubTitle}>Order #{selectedOrderForStatus?.id?.slice(-8).toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsStatusModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerOptions}>
              {STATUS_FILTERS.filter(f => f.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pickerOption,
                    selectedOrderForStatus?.status === opt.value && styles.pickerOptionActive
                  ]}
                  onPress={() => {
                    setIsStatusModalOpen(false);
                    const oid = selectedOrderForStatus?.id;
                    setTimeout(() => handleUpdateStatus(oid, opt.value), 100);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionDot, { backgroundColor: getStatusColor(opt.value) }]} />
                    <Text style={[
                      styles.pickerOptionLabel,
                      selectedOrderForStatus?.status === opt.value && styles.pickerOptionLabelActive
                    ]}>
                      {opt.label}
                    </Text>
                  </View>
                  {selectedOrderForStatus?.status === opt.value && (
                    <Feather name="check" size={20} color="#000" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#F8F9FA',
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
  menuButton: {
    padding: 8,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  headerSub: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  statusFilter: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#F5F5F5',
  },
  filterChipActive: {
    backgroundColor: '#000',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  orderDate: {
    fontSize: 11,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  statusBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  itemsBadge: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemsCount: {
    fontSize: 9,
    fontWeight: '900',
    color: '#999',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '700',
    marginTop: 20,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewLinkText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  // Sidebar Styles
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
  // Picker Modal Styles
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    paddingHorizontal: 25,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  pickerSubTitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
  },
  pickerOptions: {
    gap: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#eee',
  },
  pickerOptionActive: {
    backgroundColor: '#fff',
    borderColor: '#000',
    borderWidth: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  optionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pickerOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  pickerOptionLabelActive: {
    color: '#000',
    fontWeight: '900',
  },
});

export default AdminOrdersScreen;

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
  Image,
  Dimensions,
  ScrollView,
  Linking,
  Alert,
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
  { label: 'PAID', value: 'paid' },
  { label: 'FAILED', value: 'failed' },
  { label: 'REFUNDED', value: 'refunded' },
];

const AdminPaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPaymentForStatus, setSelectedPaymentForStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments?take=1000');
      setPayments(response.data?.data?.payments || response.data?.payments || response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handleUpdateStatus = async (paymentId, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/payments/${paymentId}/status`, { status: newStatus });
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: newStatus } : p));
      Alert.alert('Success', `Payment status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update payment status error:', error);
      Alert.alert('Error', 'Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      p.id.toLowerCase().includes(searchLower) || 
      (p.orderId && p.orderId.toLowerCase().includes(searchLower)) ||
      (p.method && p.method.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === '' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'pending': return '#FFB000';
      case 'failed': return '#FF3B30';
      case 'refunded': return '#5856D6';
      default: return '#999';
    }
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `https://e-com-mobile-app-production.up.railway.app${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const renderPaymentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.paymentCard}
      onPress={() => item.orderId && navigation.navigate('AdminOrderDetail', { orderId: item.orderId })}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.paymentId}>PAYMENT #{item.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderRef}>ORDER #{item.orderId?.slice(-8).toUpperCase() || 'N/A'}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}
          onPress={() => {
            setSelectedPaymentForStatus(item);
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
        <View style={styles.infoGroup}>
          <Text style={styles.infoLabel}>METHOD</Text>
          <Text style={styles.infoValue}>{item.method?.replace(/_/g, ' ').toUpperCase() || 'N/A'}</Text>
        </View>
        <View style={styles.infoGroup}>
          <Text style={styles.infoLabel}>AMOUNT</Text>
          <Text style={styles.amountValue}>LKR {item.amount?.toLocaleString()}</Text>
        </View>
      </View>

      {item.paymentProof && (
        <TouchableOpacity 
          style={styles.proofPreviewContainer}
          onPress={() => Linking.openURL(getImageUrl(item.paymentProof))}
        >
          <Image source={{ uri: getImageUrl(item.paymentProof) }} style={styles.proofImage} />
          <View style={styles.proofBadge}>
            <Feather name="image" size={12} color="#fff" />
            <Text style={styles.proofBadgeText}>VIEW PROOF</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>FINANCIAL AUDIT</Text>
          <Text style={styles.headerSub}>Payment settlement monitoring</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={onRefresh}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

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
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminOrders'), 100);
                }}
              />
              <SidebarItem
                icon="credit-card"
                label="Payments"
                active
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
            placeholder="Search Reference, Order ID..."
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
          data={filteredPayments}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="credit-card" size={64} color="#eee" />
              <Text style={styles.emptyText}>No financial records found.</Text>
            </View>
          }
        />
      )}

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
                <Text style={styles.pickerTitle}>Update Settlement Status</Text>
                <Text style={styles.pickerSubTitle}>Payment #{selectedPaymentForStatus?.id?.slice(-8).toUpperCase()}</Text>
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
                    selectedPaymentForStatus?.status === opt.value && styles.pickerOptionActive
                  ]}
                  onPress={() => {
                    setIsStatusModalOpen(false);
                    const pid = selectedPaymentForStatus?.id;
                    setTimeout(() => handleUpdateStatus(pid, opt.value), 100);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionDot, { backgroundColor: getStatusColor(opt.value) }]} />
                    <Text style={[
                      styles.pickerOptionLabel,
                      selectedPaymentForStatus?.status === opt.value && styles.pickerOptionLabelActive
                    ]}>
                      {opt.label}
                    </Text>
                  </View>
                  {selectedPaymentForStatus?.status === opt.value && (
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
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  paymentId: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
  },
  orderRef: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
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
    marginBottom: 15,
  },
  infoGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#333',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  proofPreviewContainer: {
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: '#F5F5F5',
  },
  proofImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  proofBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  proofBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
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

export default AdminPaymentsScreen;

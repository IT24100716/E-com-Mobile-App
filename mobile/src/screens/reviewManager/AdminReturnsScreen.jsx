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
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const RETURN_STATUS_FILTERS = [
  { label: 'ALL', value: '' },
  { label: 'PENDING', value: 'pending' },
  { label: 'APPROVED', value: 'approved' },
  { label: 'REJECTED', value: 'rejected' },
  { label: 'PICKED', value: 'return picked' },
];

const AdminReturnsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'process'
  const [returns, setReturns] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockLoading, setRestockLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedReturnForStatus, setSelectedReturnForStatus] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [submittingRestock, setSubmittingRestock] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchReturns = async (pageNum = 0, isRefresh = false) => {
    if (pageNum > 0) setLoadingMore(true);
    try {
      const response = await api.get(`/returns?skip=${pageNum * 10}&take=10`);
      const newReturns = response.data?.data?.returns || response.data?.returns || [];
      
      if (isRefresh) {
        setReturns(newReturns);
        setPage(0);
        setHasMore(newReturns.length === 10);
      } else {
        setReturns(prev => {
          const combined = [...prev, ...newReturns];
          // Deduplicate by ID
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
          );
          return unique;
        });
        setHasMore(newReturns.length === 10);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && activeTab === 'requests' && !searchTerm) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReturns(nextPage);
    }
  };

  const fetchRestockRequests = async () => {
    setRestockLoading(true);
    try {
      const response = await api.get('/restock-requests');
      const allRequests = response.data?.data || response.data || [];
      // Filter for replacements related to returns (looking for "||META||" in notes)
      const returnRelated = allRequests.filter(r => r.notes?.includes("||META||"));
      setRestockRequests(returnRelated);
    } catch (error) {
      console.error('Error fetching restock requests:', error);
    } finally {
      setRestockLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
    fetchRestockRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'requests') fetchReturns(0, true);
    else fetchRestockRequests();
  };

  const handleCreateRestock = async (returnReq) => {
    if (submittingRestock) return;
    setSubmittingRestock(true);
    try {
      // Create a restock request for each item in the return
      const requests = returnReq.items.map(item => {
        const itemMeta = JSON.stringify({
          type: "return_replacement",
          returnId: returnReq.id,
          orderId: returnReq.order?.id,
          userId: returnReq.order?.userId,
          customerName: returnReq.order?.user?.name || "Unknown",
          customerEmail: returnReq.order?.contactEmail || returnReq.order?.user?.email || "",
          customerPhone: returnReq.order?.contactNumber || returnReq.order?.user?.phone || "",
          customerAddress: returnReq.order?.address || "",
          deliveryMethod: returnReq.order?.deliveryMethod || "Standard",
          reason: returnReq.reason,
          returnImage: returnReq.imageUrl,
          originalItemPrice: item.price,
        });

        return {
          productId: item.productId,
          quantity: item.quantity,
          variantDetails: item.variantAttributes ? [item.variantAttributes] : [],
          notes: `Auto-generated replacement for return #${returnReq.orderId.slice(-8).toUpperCase()} ||META||${itemMeta}`
        };
      });

      await Promise.all(requests.map(req => api.post('/restock-requests', req)));
      
      Alert.alert('Success', `Successfully created ${requests.length} replacement request(s)`);
      fetchRestockRequests();
    } catch (error) {
      console.error('Create restock error:', error);
      Alert.alert('Error', 'Failed to create replacement requests');
    } finally {
      setSubmittingRestock(false);
    }
  };

  const handleRestockAction = async (id, action) => {
    setUpdating(true);
    try {
      let endpoint = `/restock-requests/${id}/${action}`;
      if (action === 'status') {
         // Generic status update if needed
      }
      
      await api.patch(endpoint);
      Alert.alert('Success', `Replacement process updated: ${action.toUpperCase()}`);
      fetchRestockRequests();
    } catch (error) {
      console.error('Restock action error:', error);
      Alert.alert('Error', 'Failed to update process status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddToStock = async (id) => {
    setUpdating(true);
    try {
      await api.patch(`/restock-requests/${id}/add-to-stock`);
      Alert.alert('Success', 'Items added back to inventory and replacement completed.');
      fetchRestockRequests();
    } catch (error) {
      console.error('Add to stock error:', error);
      Alert.alert('Error', 'Failed to add items to stock');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (returnId, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/returns/${returnId}/status`, { status: newStatus });
      setReturns(returns.map(r => r.id === returnId ? { ...r, status: newStatus } : r));
      Alert.alert('Success', `Return status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update return status error:', error);
      Alert.alert('Error', 'Failed to update return status');
    } finally {
      setUpdating(false);
    }
  };

  const filteredReturns = returns.filter(ret => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      ret.id.toLowerCase().includes(searchLower) || 
      (ret.order?.user?.name && ret.order.user.name.toLowerCase().includes(searchLower)) ||
      (ret.reason && ret.reason.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === '' || ret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFB000';
      case 'approved': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'return picked': return '#007AFF';
      default: return '#999';
    }
  };

  const getRestockStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#FFB000';
      case 'Approved': return '#5856D6';
      case 'Processing': return '#007AFF';
      case 'Completed': return '#34C759';
      case 'Closed': return '#8E8E93';
      default: return '#999';
    }
  };

  const renderReturnItem = ({ item }) => (
    <View style={styles.returnCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.returnId}>RETURN #{item.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderRef}>Order: #{item.orderId.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}
          onPress={() => {
            setSelectedReturnForStatus(item);
            setIsStatusModalOpen(true);
          }}
        >
          <View style={styles.statusBadgeContent}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
            <Feather name="chevron-down" size={10} color={getStatusColor(item.status)} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.customerRow}>
        <Feather name="user" size={14} color="#999" />
        <Text style={styles.customerName}>{item.order?.user?.name || 'Customer'}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.returnDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>REASON FOR RETURN</Text>
        <Text style={styles.reasonText}>{item.reason}</Text>
      </View>

      <View style={styles.itemsList}>
        <Text style={styles.itemsLabel}>ITEMS ({item.items?.length || 0})</Text>
        {item.items?.map((subItem, idx) => (
          <View key={idx} style={styles.subItem}>
            <Text style={styles.subItemName} numberOfLines={1}>{subItem.product?.name || 'Product'}</Text>
            <Text style={styles.subItemQty}>x{subItem.quantity}</Text>
          </View>
        ))}
      </View>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.returnImage} resizeMode="cover" />
      )}

      {item.status === 'approved' && (
        <TouchableOpacity 
          style={[styles.restockButton, submittingRestock && { opacity: 0.5 }]}
          onPress={() => handleCreateRestock(item)}
          disabled={submittingRestock}
        >
          <Feather name="package" size={16} color="#fff" />
          <Text style={styles.restockButtonText}>REQUEST PRODUCT</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderProcessItem = ({ item }) => (
    <View style={styles.returnCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.returnId}>{item.product?.name}</Text>
          <Text style={styles.orderRef}>QTY: {item.quantity} · {item.user?.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getRestockStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getRestockStatusColor(item.status) }]}>
            {item.status === 'Closed' ? 'FULFILLED' : item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.processActions}>
        {item.status === 'Pending' && (
          <TouchableOpacity style={styles.processButton} onPress={() => handleRestockAction(item.id, 'approve')}>
            <Text style={styles.processButtonText}>APPROVE</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Approved' && (
          <TouchableOpacity style={[styles.processButton, { backgroundColor: '#007AFF' }]} onPress={() => handleRestockAction(item.id, 'process')}>
            <Text style={styles.processButtonText}>START PROCESSING</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Processing' && (
          <TouchableOpacity style={[styles.processButton, { backgroundColor: '#5856D6' }]} onPress={() => handleRestockAction(item.id, 'complete')}>
            <Text style={styles.processButtonText}>MARK COMPLETED</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Completed' && (
          <TouchableOpacity style={[styles.processButton, { backgroundColor: '#34C759' }]} onPress={() => handleAddToStock(item.id)}>
            <Text style={styles.processButtonText}>ADD TO STOCK</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Closed' && (
          <View style={styles.fulfilledBadge}>
            <Feather name="check-circle" size={16} color="#34C759" />
            <Text style={styles.fulfilledText}>PROCESS COMPLETED</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>RETURNS ARCHIVE</Text>
          <Text style={styles.headerSub}>Manage order return requests</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={onRefresh}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Sidebar Modal remains the same */}
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
                  setTimeout(() => navigation.navigate('ProductManagerDashboard'), 100);
                }}
              />
              <SidebarItem
                icon="package"
                label="Products"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('Products'), 100);
                }}
              />
              <SidebarItem
                icon="rotate-ccw"
                label="Return Requests"
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

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]} 
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>REQUESTS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'process' && styles.activeTab]} 
          onPress={() => setActiveTab('process')}
        >
          <Text style={[styles.tabText, activeTab === 'process' && styles.activeTabText]}>RETURN PROCESS</Text>
          {restockRequests.filter(r => r.status === 'Pending').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{restockRequests.filter(r => r.status === 'Pending').length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, customer, or reason..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
        </View>
        {activeTab === 'requests' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
            {RETURN_STATUS_FILTERS.map(filter => (
              <TouchableOpacity 
                key={filter.label}
                style={[styles.filterChip, statusFilter === filter.value && styles.filterChipActive]}
                onPress={() => setStatusFilter(filter.value)}
              >
                <Text style={[styles.filterChipText, statusFilter === filter.value && styles.filterChipTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {(loading || restockLoading) ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'requests' ? filteredReturns : restockRequests}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'requests' ? renderReturnItem : renderProcessItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="rotate-ccw" size={64} color="#eee" />
              <Text style={styles.emptyText}>No items discovered for this criteria.</Text>
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
                <Text style={styles.pickerTitle}>Update Return Status</Text>
                <Text style={styles.pickerSubTitle}>Return #{selectedReturnForStatus?.id?.slice(-8).toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsStatusModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerOptions}>
              {RETURN_STATUS_FILTERS.filter(f => f.value !== '').map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pickerOption,
                    selectedReturnForStatus?.status === opt.value && styles.pickerOptionActive
                  ]}
                  onPress={() => {
                    setIsStatusModalOpen(false);
                    const rid = selectedReturnForStatus?.id;
                    setTimeout(() => handleUpdateStatus(rid, opt.value), 100);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.optionDot, { backgroundColor: getStatusColor(opt.value) }]} />
                    <Text style={[
                      styles.pickerOptionLabel,
                      selectedReturnForStatus?.status === opt.value && styles.pickerOptionLabelActive
                    ]}>
                      {opt.label}
                    </Text>
                  </View>
                  {selectedReturnForStatus?.status === opt.value && (
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
  returnCard: {
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
    marginBottom: 12,
  },
  returnId: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  orderRef: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  dot: {
    marginHorizontal: 8,
    color: '#ccc',
    fontWeight: '900',
  },
  returnDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  reasonBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  reasonLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    fontWeight: '500',
  },
  itemsList: {
    marginBottom: 15,
  },
  itemsLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  subItemName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    fontWeight: '500',
  },
  subItemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    marginLeft: 10,
  },
  returnImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 5,
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
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 15,
    gap: 10,
  },
  restockButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  processActions: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 15,
  },
  processButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fulfilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  fulfilledText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#34C759',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 6,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#FF3B30',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
});

export default AdminReturnsScreen;

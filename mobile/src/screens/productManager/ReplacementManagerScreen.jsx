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

const { width, height } = Dimensions.get('window');

const ReplacementManagerScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Send Product Modal States
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/restock-requests');
      const all = response.data?.data || response.data || [];
      // Filter for replacements (return-related)
      const filtered = all.filter(r => r.notes?.includes("||META||"));
      setRequests(filtered);
    } catch (error) {
      console.error('Error fetching replacements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProducts = async () => {
    setProductLoading(true);
    try {
      const response = await api.get('/products', { params: { skip: 0, take: 50 } });
      setAllProducts(response.data?.data?.products || response.data?.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const parseNotesMeta = (notes) => {
    if (!notes || !notes.includes("||META||")) return null;
    try {
      const afterTag = notes.split("||META||")[1];
      const jsonBlock = afterTag.split("||")[0];
      return JSON.parse(jsonBlock);
    } catch (e) {
      return null;
    }
  };

  const parseFulfillmentMeta = (notes) => {
    if (!notes || !notes.includes("||FULFILLMENT||")) return null;
    try {
      const afterTag = notes.split("||FULFILLMENT||")[1];
      const jsonBlock = afterTag.split("||")[0];
      return JSON.parse(jsonBlock);
    } catch (e) {
      return null;
    }
  };

  const handleSendReplacement = async (product, variant = null) => {
    if (!selectedRequest) return;
    const meta = parseNotesMeta(selectedRequest.notes);
    if (!meta) {
      Alert.alert('Error', 'Missing metadata in request');
      return;
    }

    setSubmitting(true);
    try {
      // Price Check
      const originalPrice = meta.originalItemPrice || 0;
      const newPrice = variant ? variant.price : product.price;

      if (originalPrice > 0 && newPrice > originalPrice) {
        Alert.alert('Price Warning', `Replacement item (${newPrice} LKR) is more expensive than original (${originalPrice} LKR).`);
        setSubmitting(false);
        return;
      }

      const orderData = {
        userId: meta.userId,
        items: [
          {
            productId: product.id,
            quantity: 1,
            price: 0,
            variantAttributes: variant ? variant.attributes : (product.variants?.length > 0 ? product.variants[0].attributes : {}),
            variantId: variant?.id || (product.variants?.length > 0 ? product.variants[0].id : null)
          }
        ],
        address: meta.customerAddress,
        contactNumber: meta.customerPhone,
        contactEmail: meta.customerEmail,
        returnRequestId: meta.returnId,
        notes: `Replacement for Return #${meta.returnId.slice(-8).toUpperCase()}`,
      };

      await api.post('/orders/return-replacement', orderData);

      const fulfillment = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        imageUrl: product.imageUrl || (product.images && product.images[0]),
        variantAttributes: variant ? variant.attributes : (product.variants?.length > 0 ? product.variants[0].attributes : {})
      };

      await api.patch(`/restock-requests/${selectedRequest.id}/status`, { 
        status: 'Closed',
        extraNotes: fulfillment 
      });

      Alert.alert('Success', 'Replacement order created successfully!');
      setIsSendModalOpen(false);
      setSelectedRequest(null);
      setSelectedProduct(null);
      fetchRequests();
    } catch (error) {
      console.error('Send replacement error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create replacement order');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#FFB000';
      case 'Approved': return '#5856D6';
      case 'Processing': return '#007AFF';
      case 'Completed': return '#34C759';
      case 'Closed': return '#8E8E93';
      default: return '#999';
    }
  };

  const filteredRequests = requests.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const meta = parseNotesMeta(r.notes);
    return (
      r.product?.name?.toLowerCase().includes(searchLower) ||
      meta?.customerName?.toLowerCase().includes(searchLower) ||
      r.id.toLowerCase().includes(searchLower)
    );
  });

  const renderRequestItem = ({ item }) => {
    const meta = parseNotesMeta(item.notes);
    const fulfillment = parseFulfillmentMeta(item.notes);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.product?.name}</Text>
            <Text style={styles.metaText}>
              REQ #{item.id.slice(-6).toUpperCase()} · {meta?.customerName || 'Customer'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status === 'Closed' ? 'FULFILLED' : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={12} color="#999" />
            <Text style={styles.infoText} numberOfLines={1}>{meta?.customerAddress}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="help-circle" size={12} color="#999" />
            <Text style={styles.infoText} numberOfLines={1}>Reason: {meta?.reason}</Text>
          </View>
        </View>

        {item.status !== 'Closed' ? (
          <View style={styles.actions}>
            {item.status === 'Pending' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => {
                Alert.alert('Approve', 'Approve this replacement request?', [
                  { text: 'No' },
                  { text: 'Yes', onPress: () => api.patch(`/restock-requests/${item.id}/approve`).then(fetchRequests) }
                ]);
              }}>
                <Text style={styles.actionBtnText}>APPROVE</Text>
              </TouchableOpacity>
            )}
            {(item.status === 'Approved' || item.status === 'Processing' || item.status === 'Completed') && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#000' }]} 
                onPress={() => {
                  setSelectedRequest(item);
                  setIsSendModalOpen(true);
                  fetchProducts();
                }}
              >
                <Feather name="send" size={14} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>SEND REPLACEMENT</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.fulfillmentBox}>
            <View style={styles.fulfilledLine}>
              <Feather name="check-circle" size={14} color="#34C759" />
              <Text style={styles.fulfilledTitle}>SENT REPLACEMENT</Text>
            </View>
            <Text style={styles.fulfilledProduct}>{fulfillment?.name}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REPLACEMENTS</Text>
        <TouchableOpacity onPress={onRefresh}>
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
        <View style={styles.sidebarModal}>
          <Pressable style={styles.sidebarOverlay} onPress={() => setIsSidebarOpen(false)} />
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
                onPress={() => { setIsSidebarOpen(false); navigation.navigate('ProductManagerDashboard'); }} 
              />
              <SidebarItem 
                icon="package" 
                label="Products" 
                onPress={() => { setIsSidebarOpen(false); navigation.navigate('Products'); }} 
              />
              <SidebarItem 
                icon="layers" 
                label="Categories" 
                onPress={() => { setIsSidebarOpen(false); navigation.navigate('Categories'); }} 
              />
              <SidebarItem 
                icon="rotate-ccw" 
                label="Replacements" 
                active 
              />
              <SidebarItem 
                icon="truck" 
                label="Restock" 
                onPress={() => { setIsSidebarOpen(false); navigation.navigate('RestockRequests'); }} 
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

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search replacement requests..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={item => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="truck" size={60} color="#eee" />
              <Text style={styles.emptyText}>No replacement requests found.</Text>
            </View>
          }
        />
      )}

      {/* Send Product Modal */}
      <Modal
        visible={isSendModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSendModalOpen(false)}
      >
        <View style={styles.sendModalContainer}>
          <Pressable style={styles.sendModalOverlay} onPress={() => setIsSendModalOpen(false)} />
          <View style={styles.sendModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Replacement Product</Text>
              <TouchableOpacity onPress={() => setIsSendModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <Feather name="search" size={16} color="#999" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search products to send..."
                value={productSearch}
                onChangeText={setProductSearch}
              />
            </View>

            {productLoading ? (
              <ActivityIndicator style={{ margin: 20 }} color="#000" />
            ) : (
              <FlatList
                data={allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.productOption}>
                    <TouchableOpacity 
                      style={styles.productOptionMain}
                      onPress={() => setSelectedProduct(selectedProduct?.id === item.id ? null : item)}
                    >
                      <Image source={{ uri: item.imageUrl || (item.images && item.images[0]) }} style={styles.optImg} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.optName}>{item.name}</Text>
                        <Text style={styles.optPrice}>{item.price} LKR · {item.stock} in stock</Text>
                      </View>
                      <Feather name={selectedProduct?.id === item.id ? "chevron-up" : "chevron-down"} size={16} color="#999" />
                    </TouchableOpacity>

                    {selectedProduct?.id === item.id && (
                      <View style={styles.variantList}>
                        {item.variants && item.variants.length > 0 ? (
                          item.variants.map((v, i) => (
                            <TouchableOpacity 
                              key={i} 
                              style={styles.variantBtn}
                              onPress={() => handleSendReplacement(item, v)}
                            >
                              <Text style={styles.variantBtnText}>
                                Send {Object.values(v.attributes || {}).join(' / ')} ({v.stock} avail)
                              </Text>
                              <Feather name="arrow-right" size={12} color="#000" />
                            </TouchableOpacity>
                          ))
                        ) : (
                          <TouchableOpacity 
                            style={styles.variantBtn}
                            onPress={() => handleSendReplacement(item)}
                          >
                            <Text style={styles.variantBtnText}>Send Standard Version</Text>
                            <Feather name="arrow-right" size={12} color="#000" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>
        {submitting && (
          <View style={styles.submitOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.submitText}>Creating replacement order...</Text>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

const SidebarItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={[styles.sidebarItem, active && styles.sidebarItemActive]} onPress={onPress}>
    <Feather name={icon} size={20} color={active ? '#000' : '#666'} />
    <Text style={[styles.sidebarItemLabel, active && styles.sidebarItemLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: '#000' },
  searchContainer: { padding: 15, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#000' },
  list: { padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  productName: { fontSize: 15, fontWeight: '800', color: '#000' },
  metaText: { fontSize: 10, color: '#999', fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '900' },
  infoBox: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 11, color: '#666', marginLeft: 8, flex: 1 },
  actions: { borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12 },
  actionBtn: {
    backgroundColor: '#F1F3F5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 11, fontWeight: '900', color: '#000' },
  fulfillmentBox: { borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12 },
  fulfilledLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  fulfilledTitle: { fontSize: 10, fontWeight: '900', color: '#34C759' },
  fulfilledProduct: { fontSize: 12, color: '#666', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 13, color: '#999', fontWeight: '600', marginTop: 15 },
  
  // Sidebar
  sidebarModal: { flex: 1, flexDirection: 'row' },
  sidebarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebarContent: { width: width * 0.75, height: '100%', backgroundColor: '#fff', paddingTop: 50 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25 },
  sidebarLogo: { fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  sidebarItems: { flex: 1, padding: 15 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 5 },
  sidebarItemActive: { backgroundColor: '#F1F3F5' },
  sidebarItemLabel: { marginLeft: 15, fontSize: 15, fontWeight: '600', color: '#666' },
  sidebarItemLabelActive: { color: '#000', fontWeight: '800' },

  // Send Modal
  sendModalContainer: { flex: 1, justifyContent: 'flex-end' },
  sendModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sendModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: height * 0.8, padding: 25 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '900' },
  modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5', paddingHorizontal: 12, borderRadius: 10, height: 40, marginBottom: 20 },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  productOption: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', paddingBottom: 15 },
  productOptionMain: { flexDirection: 'row', alignItems: 'center' },
  optImg: { width: 50, height: 60, borderRadius: 8 },
  optName: { fontSize: 14, fontWeight: '700' },
  optPrice: { fontSize: 12, color: '#999', marginTop: 2 },
  variantList: { marginTop: 15, gap: 8, paddingLeft: 10 },
  variantBtn: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  variantBtnText: { fontSize: 12, fontWeight: '700', color: '#333' },
  submitOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  submitText: { color: '#fff', marginTop: 15, fontWeight: '700' }
});

export default ReplacementManagerScreen;

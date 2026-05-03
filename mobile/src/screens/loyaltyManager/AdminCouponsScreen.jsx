import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  Pressable,
  KeyboardAvoidingView
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const AdminCouponsScreen = ({ navigation }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    code: '',
    discount: '',
    discountType: 'percentage',
    minCartValue: '',
    targetType: 'all',
    audienceType: 'all',
    audienceUserIds: []
  });

  const [allUsers, setAllUsers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);


  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons');
      // Backend returns { coupons: [], total: 0 }
      const fetchedData = response.data?.data;
      if (fetchedData && Array.isArray(fetchedData.coupons)) {
        setCoupons(fetchedData.coupons);
      } else if (Array.isArray(fetchedData)) {
        setCoupons(fetchedData);
      } else {
        setCoupons([]);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      Alert.alert('Error', 'Failed to fetch coupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchUsers();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setAllProducts(response.data?.data?.products || response.data?.products || []);
    } catch (error) {
      console.error('Fetch products error:', error);
    }
  };


  const fetchUsers = async () => {
    try {
      const response = await api.get('/loyalty/members');
      setAllUsers(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };


  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const handleSaveCoupon = async () => {
    if (!form.code || !form.discount || !form.minCartValue) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        discount: parseFloat(form.discount),
        minCartValue: parseFloat(form.minCartValue),
        audienceUserIds: form.audienceType === 'specific' ? selectedUsers.map(u => u.id) : [],
        targetProductIds: form.targetType === 'product' ? selectedProducts.map(p => p.id) : []
      };


      if (editingId) {
        await api.put(`/coupons/${editingId}`, payload);
        Alert.alert('Success', 'Coupon updated successfully');
      } else {
        await api.post('/coupons', payload);
        Alert.alert('Success', 'Coupon created successfully');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error('Save coupon error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      code: '',
      discount: '',
      discountType: 'percentage',
      minCartValue: '',
      targetType: 'all',
      audienceType: 'all',
      audienceUserIds: []
    });
    setSelectedUsers([]);
    setSelectedProducts([]);
    setEditingId(null);
    setCustomerSearch('');
    setProductSearch('');
  };


  const handleEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discount: coupon.discount.toString(),
      discountType: coupon.discountType,
      minCartValue: coupon.minCartValue.toString(),
      targetType: coupon.targetType,
      audienceType: coupon.audienceType,
      audienceUserIds: coupon.audienceUserIds || [],
      targetProductIds: coupon.targetProductIds || []
    });

    if (coupon.audienceType === 'specific' && coupon.audienceUserIds) {
      const matchedUsers = allUsers.filter(u => coupon.audienceUserIds.includes(u.id));
      setSelectedUsers(matchedUsers);
    } else {
      setSelectedUsers([]);
    }

    if (coupon.targetType === 'product' && coupon.targetProductIds) {
      const matchedProducts = allProducts.filter(p => coupon.targetProductIds.includes(p.id));
      setSelectedProducts(matchedProducts);
    } else {
      setSelectedProducts([]);
    }
    
    setIsModalOpen(true);

  };


  const handleDeleteCoupon = (id) => {
    Alert.alert(
      'Delete Coupon',
      'Are you sure you want to delete this coupon?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/coupons/${id}`);
              fetchCoupons();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete coupon');
            }
          }
        }
      ]
    );
  };

  const renderCouponItem = ({ item }) => (
    <View style={styles.couponCard}>
      <View style={styles.couponHeader}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{item.code}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
            <Feather name="edit-2" size={16} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteCoupon(item.id)}>
            <Feather name="trash-2" size={16} color="#FF4757" />
          </TouchableOpacity>
        </View>

      </View>
      
      <View style={styles.couponMain}>
        <View>
          <Text style={styles.discountValue}>
            {item.discountType === 'percentage' ? `${item.discount}%` : `LKR ${item.discount}`}
            <Text style={styles.offLabel}> OFF</Text>
          </Text>
          <Text style={styles.minSpend}>Min Spend: LKR {item.minCartValue}</Text>

        </View>
        <View style={styles.statusTag}>
          <Text style={styles.statusText}>{item.targetType.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.couponFooter}>
        <Feather name="users" size={12} color="#A4B0BE" />
        <Text style={styles.footerText}>Target: {item.audienceType === 'all' ? 'All Customers' : 'Specific Group'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>COUPONS</Text>
          <Text style={styles.headerSub}>Manage active offers</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Sidebar Modal */}
      <Modal
        visible={isSidebarOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsSidebarOpen(false)}
      >
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarProfile}>
                <View style={styles.sidebarAvatar}>
                  <Text style={styles.sidebarAvatarText}>L</Text>
                </View>
                <View>
                  <Text style={styles.sidebarName}>Loyalty Manager</Text>
                  <Text style={styles.sidebarRole}>Administrator</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarMenu}>
              <SidebarItem 
                icon="grid" 
                label="Dashboard" 
                onPress={() => {
                  setIsSidebarOpen(false);
                  navigation.navigate('LoyaltyManagerDashboard');
                }} 
              />
              <SidebarItem 
                icon="users" 
                label="Loyalty" 
                onPress={() => {
                  setIsSidebarOpen(false);
                  navigation.navigate('AdminLoyalty');
                }} 
              />
              <SidebarItem 
                icon="tag" 
                label="Coupons" 
                active={true}
                onPress={() => {
                  setIsSidebarOpen(false);
                }} 
              />
            </View>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity 
                style={styles.logoutBtn}
                onPress={() => navigation.replace('Login')}
              >
                <Feather name="log-out" size={18} color="#FF4757" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Pressable 
            style={styles.sidebarBackdrop} 
            onPress={() => setIsSidebarOpen(false)} 
          />
        </View>
      </Modal>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          renderItem={renderCouponItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="ticket-percent" size={64} color="#EEE" />
              <Text style={styles.emptyText}>No active coupons</Text>
              <TouchableOpacity 
                style={styles.createFirstBtn}
                onPress={() => setIsModalOpen(true)}
              >
                <Text style={styles.createFirstBtnText}>CREATE YOUR FIRST COUPON</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Coupon Modal */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'EDIT COUPON' : 'NEW COUPON'}</Text>
              <TouchableOpacity onPress={() => { setIsModalOpen(false); resetForm(); }}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>


            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PROMO CODE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. SAVE20"
                  autoCapitalize="characters"
                  value={form.code}
                  onChangeText={(val) => setForm({ ...form, code: val.toUpperCase() })}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>DISCOUNT</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="20"
                    keyboardType="numeric"
                    value={form.discount}
                    onChangeText={(val) => setForm({ ...form, discount: val })}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>TYPE</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity 
                      style={[styles.typeBtn, form.discountType === 'percentage' && styles.typeBtnActive]}
                      onPress={() => setForm({ ...form, discountType: 'percentage' })}
                    >
                      <Text style={[styles.typeText, form.discountType === 'percentage' && styles.typeTextActive]}>%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.typeBtn, form.discountType === 'fixed' && styles.typeBtnActive]}
                      onPress={() => setForm({ ...form, discountType: 'fixed' })}
                    >
                      <Text style={[styles.typeText, form.discountType === 'fixed' && styles.typeTextActive]}>LKR</Text>
                    </TouchableOpacity>

                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MINIMUM PURCHASE (LKR)</Text>

                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={form.minCartValue}
                  onChangeText={(val) => setForm({ ...form, minCartValue: val })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TARGET PRODUCTS</Text>
                <View style={styles.audienceSelector}>
                  {['all', 'product'].map((type) => (
                    <TouchableOpacity 
                      key={type}
                      style={[styles.audienceBtn, form.targetType === type && styles.audienceBtnActive]}
                      onPress={() => setForm({ ...form, targetType: type })}
                    >
                      <Text style={[styles.audienceText, form.targetType === type && styles.audienceTextActive]}>
                        {type === 'product' ? 'SELECT' : type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {form.targetType === 'product' && (
                <View style={styles.specificCustomerSection}>
                  <Text style={styles.inputLabel}>SEARCH & SELECT PRODUCTS</Text>
                  <View style={styles.searchBox}>
                    <Feather name="package" size={16} color="#999" />
                    <TextInput 
                      style={styles.searchInputSmall}
                      placeholder="Search product name..."
                      value={productSearch}
                      onChangeText={setProductSearch}
                    />
                  </View>

                  {productSearch.length > 0 && (
                    <View style={styles.searchResults}>
                      {allProducts
                        .filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()) && !selectedProducts.find(sp => sp.id === p.id))
                        .slice(0, 5)
                        .map(product => (
                          <TouchableOpacity 
                            key={product.id} 
                            style={styles.searchResultItem}
                            onPress={() => {
                              setSelectedProducts([...selectedProducts, product]);
                              setProductSearch('');
                            }}
                          >
                            <Text style={styles.resultName}>{product.name}</Text>
                            <Feather name="plus" size={14} color="#000" />
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}

                  <View style={styles.selectedContainer}>
                    <Text style={styles.selectedLabel}>SELECTED ({selectedProducts.length}):</Text>
                    <View style={styles.chipContainer}>
                      {selectedProducts.map(product => (
                        <View key={product.id} style={[styles.userChip, { backgroundColor: '#3498db' }]}>
                          <Text style={styles.chipText}>{product.name}</Text>
                          <TouchableOpacity onPress={() => setSelectedProducts(selectedProducts.filter(p => p.id !== product.id))}>
                            <Feather name="x" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TARGET AUDIENCE</Text>

                <View style={styles.audienceSelector}>
                  {['all', 'new', 'specific'].map((type) => (
                    <TouchableOpacity 
                      key={type}
                      style={[styles.audienceBtn, form.audienceType === type && styles.audienceBtnActive]}
                      onPress={() => setForm({ ...form, audienceType: type })}
                    >
                      <Text style={[styles.audienceText, form.audienceType === type && styles.audienceTextActive]}>
                        {type === 'specific' ? 'SELECT' : type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {form.audienceType === 'specific' && (
                <View style={styles.specificCustomerSection}>
                  <Text style={styles.inputLabel}>SEARCH & SELECT CUSTOMERS</Text>
                  <View style={styles.searchBox}>
                    <Feather name="search" size={16} color="#999" />
                    <TextInput 
                      style={styles.searchInputSmall}
                      placeholder="Search by name..."
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                    />
                  </View>

                  {customerSearch.length > 0 && (
                    <View style={styles.searchResults}>
                      {allUsers
                        .filter(u => u.name?.toLowerCase().includes(customerSearch.toLowerCase()) && !selectedUsers.find(su => su.id === u.id))
                        .slice(0, 5)
                        .map(user => (
                          <TouchableOpacity 
                            key={user.id} 
                            style={styles.searchResultItem}
                            onPress={() => {
                              setSelectedUsers([...selectedUsers, user]);
                              setCustomerSearch('');
                            }}
                          >
                            <Text style={styles.resultName}>{user.name}</Text>
                            <Feather name="plus" size={14} color="#000" />
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}

                  <View style={styles.selectedContainer}>
                    <Text style={styles.selectedLabel}>SELECTED ({selectedUsers.length}):</Text>
                    <View style={styles.chipContainer}>
                      {selectedUsers.map(user => (
                        <View key={user.id} style={styles.userChip}>
                          <Text style={styles.chipText}>{user.name}</Text>
                          <TouchableOpacity onPress={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))}>
                            <Feather name="x" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}


              <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleSaveCoupon}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{editingId ? 'UPDATE COUPON' : 'CREATE COUPON'}</Text>}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => { resetForm(); setIsModalOpen(true); }}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F7',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF0F7',
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 30,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
    zIndex: 999,
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
  addBtn: {
    padding: 8,
  },
  listContent: {
    padding: 20,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  couponMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  discountValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
  },
  offLabel: {
    fontSize: 14,
    color: '#FF4757',
  },
  minSpend: {
    fontSize: 11,
    color: '#A4B0BE',
    fontWeight: '600',
    marginTop: 4,
  },
  statusTag: {
    backgroundColor: '#F1F2F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2F3542',
  },
  couponFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
  },
  footerText: {
    fontSize: 10,
    color: '#A4B0BE',
    fontWeight: '600',
    marginLeft: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: '#A4B0BE',
    fontWeight: '700',
    marginTop: 15,
  },
  createFirstBtn: {
    marginTop: 24,
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstBtnText: {
    color: '#fff',
    fontSize: 11,
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
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A4B0BE',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A4B0BE',
  },
  typeTextActive: {
    color: '#000',
  },
  audienceSelector: {
    gap: 10,
  },
  audienceBtn: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  audienceBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  audienceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A4B0BE',
    textAlign: 'center',
  },
  audienceTextActive: {
    color: '#000',
  },
  submitBtn: {
    backgroundColor: '#000',
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  // Sidebar Styles
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContent: {
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sidebarAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sidebarAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  sidebarName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  sidebarRole: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  sidebarMenu: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: '#F8F9FD',
  },
  sidebarLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginLeft: 14,
  },
  sidebarLabelActive: {
    color: '#000',
    fontWeight: '800',
  },
  sidebarFooter: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F6',
    paddingTop: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF4757',
    marginLeft: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editBtn: {
    padding: 4,
  },
  // Specific Customer Styles

  specificCustomerSection: {
    backgroundColor: '#F8F9FD',
    borderRadius: 20,
    padding: 15,
    marginTop: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEF0F7',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#EEF0F7',
    marginBottom: 10,
  },
  searchInputSmall: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
    padding: 0,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF0F7',
    marginBottom: 15,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FD',
  },
  resultName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  selectedContainer: {
    marginTop: 5,
  },
  selectedLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#A4B0BE',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  chipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});

const SidebarItem = ({ icon, label, onPress, active = false }) => (
  <TouchableOpacity 
    style={[styles.sidebarItem, active && styles.sidebarItemActive]} 
    onPress={onPress}
  >
    <Feather name={icon} size={20} color={active ? '#000' : '#666'} />
    <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

export default AdminCouponsScreen;

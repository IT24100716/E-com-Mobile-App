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
  SafeAreaView
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
    audienceType: 'all'
  });

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons');
      setCoupons(response.data?.data || response.data || []);
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
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const handleCreateCoupon = async () => {
    if (!form.code || !form.discount || !form.minCartValue) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/coupons', {
        ...form,
        discount: parseFloat(form.discount),
        minCartValue: parseFloat(form.minCartValue)
      });
      
      Alert.alert('Success', 'Coupon created successfully');
      setIsModalOpen(false);
      setForm({
        code: '',
        discount: '',
        discountType: 'percentage',
        minCartValue: '',
        targetType: 'all',
        audienceType: 'all'
      });
      fetchCoupons();
    } catch (error) {
      console.error('Create coupon error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
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
        <TouchableOpacity onPress={() => handleDeleteCoupon(item.id)}>
          <Feather name="trash-2" size={18} color="#FF4757" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.couponMain}>
        <View>
          <Text style={styles.discountValue}>
            {item.discountType === 'percentage' ? `${item.discount}%` : `$${item.discount}`}
            <Text style={styles.offLabel}> OFF</Text>
          </Text>
          <Text style={styles.minSpend}>Min Spend: ${item.minCartValue}</Text>
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
        <TouchableOpacity style={styles.addBtnHeader} onPress={() => setIsModalOpen(true)}>
          <Feather name="plus" size={24} color="#000" />
        </TouchableOpacity>
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
              <SidebarItem 
                icon="settings" 
                label="Loyalty Settings" 
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEW COUPON</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                      <Text style={[styles.typeText, form.discountType === 'fixed' && styles.typeTextActive]}>$</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MINIMUM PURCHASE ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={form.minCartValue}
                  onChangeText={(val) => setForm({ ...form, minCartValue: val })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TARGET AUDIENCE</Text>
                <View style={styles.audienceSelector}>
                  {['all', 'new'].map((type) => (
                    <TouchableOpacity 
                      key={type}
                      style={[styles.audienceBtn, form.audienceType === type && styles.audienceBtnActive]}
                      onPress={() => setForm({ ...form, audienceType: type })}
                    >
                      <Text style={[styles.audienceText, form.audienceType === type && styles.audienceTextActive]}>
                        {type.toUpperCase()} CUSTOMERS
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleCreateCoupon}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>CREATE COUPON</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 15,
    backgroundColor: '#fff',
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
  addBtnHeader: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEF0F7',
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

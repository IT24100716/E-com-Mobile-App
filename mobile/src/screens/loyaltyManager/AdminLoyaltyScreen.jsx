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
  Pressable,
  Dimensions,
  SafeAreaView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import { Feather, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const AdminLoyaltyScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/loyalty/members');
      const members = response.data?.data || response.data || [];
      setUsers(members);
    } catch (error) {
      console.error('Error fetching members:', error);
      Alert.alert('Error', 'Failed to fetch loyalty data');
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

  const handleUpdatePoints = async (type) => {
    if (!pointsAmount || isNaN(pointsAmount)) {
      Alert.alert('Invalid Input', 'Please enter a valid points amount');
      return;
    }

    setSubmitting(true);
    Keyboard.dismiss();
    try {
      const amount = parseInt(pointsAmount) * (type === 'add' ? 1 : -1);
      const payload = {
        userId: selectedUser.id,
        points: amount,
        type: type === 'add' ? 'admin_reward' : 'admin_deduction',
        reason: reason || (type === 'add' ? 'Admin reward' : 'Admin adjustment')
      };
      console.log("[AdminLoyalty] Sending point update payload:", payload);
      await api.post('/loyalty', payload);
      
      Alert.alert('Success', `Points ${type === 'add' ? 'added' : 'deducted'} successfully`);
      setIsModalOpen(false);
      setPointsAmount('');
      setReason('');
      fetchUsers();
    } catch (error) {
      console.error('Update points error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update points');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setIsModalOpen(true);
      }}
    >
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsValue}>{item.balance}</Text>
        <Text style={styles.pointsLabel}>NET BALANCE</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statEarned}>+{item.earned}</Text>
          <Text style={styles.statRedeemed}>-{item.redeemed}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color="#DDD" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>LOYALTY</Text>
          <Text style={styles.headerSub}>Manage engagement points</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.replace('Login')}>
          <Feather name="log-out" size={20} color="#FF4757" />
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
                active={true}
                onPress={() => {
                  setIsSidebarOpen(false);
                }} 
              />
              <SidebarItem 
                icon="tag" 
                label="Coupons" 
                onPress={() => {
                  setIsSidebarOpen(false);
                  navigation.navigate('AdminCoupons');
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

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
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
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color="#EEE" />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          }
        />
      )}

      {/* Point Adjustment Modal */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ADJUST POINTS</Text>
                <TouchableOpacity onPress={() => {
                  Keyboard.dismiss();
                  setIsModalOpen(false);
                }}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {selectedUser && (
                <View style={styles.selectedUserInfo}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{selectedUser.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.selectedName}>{selectedUser.name}</Text>
                    <Text style={styles.currentPoints}>Current Balance: {selectedUser.balance} pts</Text>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AMOUNT</Text>
                <TextInput
                  style={styles.pointsInput}
                  placeholder="e.g. 50"
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  value={pointsAmount}
                  onChangeText={setPointsAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>REASON (OPTIONAL)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="e.g. Loyalty bonus"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.deductBtn]} 
                  onPress={() => {
                    Keyboard.dismiss();
                    handleUpdatePoints('deduct');
                  }} 
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#FF4757" /> : <Text style={styles.deductBtnText}>DEDUCT</Text>}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.addBtn]} 
                  onPress={() => {
                    Keyboard.dismiss();
                    handleUpdatePoints('add');
                  }} 
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>AWARD POINTS</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE3E3',
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
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  details: {
    marginLeft: 14,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F3542',
  },
  userEmail: {
    fontSize: 11,
    color: '#A4B0BE',
    fontWeight: '600',
  },
  pointsContainer: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
  },
  pointsLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#A4B0BE',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statEarned: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2ED573',
  },
  statRedeemed: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF4757',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 13,
    color: '#A4B0BE',
    fontWeight: '700',
    marginTop: 15,
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
    minHeight: 450,
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
    color: '#000',
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  smallAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    marginLeft: 12,
  },
  currentPoints: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 12,
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
  pointsInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  reasonInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deductBtn: {
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FF4757',
  },
  deductBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF4757',
  },
  addBtn: {
    backgroundColor: '#000',
    flex: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
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

export default AdminLoyaltyScreen;

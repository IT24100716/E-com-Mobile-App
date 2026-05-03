import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  SafeAreaView,
  Modal,
  Pressable
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const LoyaltyManagerDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/loyalty');
      setData(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching loyalty dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const kpis = [
    {
      label: 'TOTAL POINTS',
      value: data?.totalPointsEarned || '0',
      sub: 'Cumulative points awarded',
      icon: 'star-circle',
      color: '#FFD700',
      onPress: () => navigation.navigate('AdminLoyalty')
    },
    {
      label: 'ACTIVE COUPONS',
      value: data?.activeCoupons || '0',
      sub: 'Live promotional codes',
      icon: 'ticket-percent',
      color: '#FF4757',
      onPress: () => navigation.navigate('AdminCoupons')
    },
    {
      label: 'TOP CUSTOMERS',
      value: data?.topCustomers?.length || '0',
      sub: 'High loyalty score users',
      icon: 'account-group',
      color: '#2F3542',
      onPress: () => navigation.navigate('AdminLoyalty')
    },
    {
      label: 'REDEEMED',
      value: data?.totalPointsRedeemed || '0',
      sub: 'Points spent by users',
      icon: 'cart-arrow-down',
      color: '#2ED573',
      onPress: () => navigation.navigate('AdminLoyalty')
    }
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>LOYALTY HUB</Text>
          <Text style={styles.headerSub}>Engagement & Rewards</Text>
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
                active={true}
                onPress={() => {
                  setIsSidebarOpen(false);
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.kpiCard}
              onPress={kpi.onPress}
            >
              <View style={[styles.iconBox, { backgroundColor: kpi.color + '15' }]}>
                <MaterialCommunityIcons name={kpi.icon} size={24} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiSub}>{kpi.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <View style={styles.actionRow}>
          <ActionCard 
            title="Manage Points" 
            icon="database-edit" 
            color="#5352ED"
            onPress={() => navigation.navigate('AdminLoyalty')}
          />
          <ActionCard 
            title="Create Coupon" 
            icon="plus-circle" 
            color="#2ED573"
            onPress={() => navigation.navigate('AdminCoupons')}
          />
        </View>

        {/* Top Customers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TOP LOYALTY USERS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminLoyalty')}>
            <Text style={styles.seeAll}>SEE ALL</Text>
          </TouchableOpacity>
        </View>
        
        {data?.topCustomers?.map((customer, index) => (
          <View key={index} style={styles.customerItem}>
            <View style={styles.customerAvatar}>
              <Text style={styles.avatarText}>{customer.name?.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerEmail}>{customer.email}</Text>
            </View>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsValueText}>{customer.netPoints}</Text>
              <Text style={styles.pointsLabelText}>PTS</Text>
            </View>
          </View>
        ))}

        {(!data?.topCustomers || data.topCustomers.length === 0) && (
          <View style={styles.emptyState}>
            <Feather name="users" size={32} color="#DDD" />
            <Text style={styles.emptyText}>No loyalty data yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionCard = ({ title, icon, color, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={28} color={color} />
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

const SidebarItem = ({ icon, label, onPress, active = false }) => (
  <TouchableOpacity 
    style={[styles.sidebarItem, active && styles.sidebarItemActive]} 
    onPress={onPress}
  >
    <Feather name={icon} size={20} color={active ? '#000' : '#666'} />
    <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    paddingBottom: 20,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  headerSub: {
    fontSize: 9,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  kpiCard: {
    width: (width - 64) / 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F2F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2F3542',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  kpiSub: {
    fontSize: 9,
    color: '#A4B0BE',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: 10,
    fontWeight: '900',
    color: '#5352ED',
    letterSpacing: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 64) / 2,
    backgroundColor: '#F8F9FD',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF0F7',
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2F3542',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F2F6',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F3542',
  },
  customerEmail: {
    fontSize: 11,
    color: '#A4B0BE',
    fontWeight: '600',
    marginTop: 2,
  },
  pointsBadge: {
    alignItems: 'flex-end',
  },
  pointsValueText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
  },
  pointsLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A4B0BE',
    marginTop: -2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A4B0BE',
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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

export default LoyaltyManagerDashboard;

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

const StaffManagerDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/overall');
      setData(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching staff dashboard data:', error);
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
      label: 'CUSTOMERS',
      value: data?.metrics?.platform?.customerCount || '0',
      sub: 'Managed clients',
      icon: 'account-group',
      color: '#2ED573',
      onPress: () => navigation.navigate('AdminUsers')
    },
    {
      label: 'TOTAL STAFF',
      value: data?.metrics?.platform?.staffCount || '0',
      sub: 'Internal team',
      icon: 'shield-account',
      color: '#3498DB',
      onPress: () => navigation.navigate('AdminStaff')
    },
    {
      label: 'ACTIVE ROLES',
      value: data?.metrics?.platform?.rolesCount || '0',
      sub: 'Permission sets',
      icon: 'lock-open',
      color: '#E67E22',
      onPress: () => navigation.navigate('AdminRoles')
    }
  ];

  const sidebarItems = [
    { label: 'Customers', icon: 'users', screen: 'AdminUsers' },
    { label: 'Staff Management', icon: 'shield', screen: 'AdminStaff' },
    { label: 'Role & Permissions', icon: 'lock', screen: 'AdminRoles' },
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
          <Text style={styles.headerTitle}>STAFF PORTAL</Text>
          <Text style={styles.headerSub}>Team & Access Control</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Feather name="user" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Hero Summary */}
          <View style={styles.heroSection}>
            <View>
              <Text style={styles.heroGreeting}>Team Overview</Text>
              <Text style={styles.heroDate}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </View>
            <TouchableOpacity style={styles.addQuickButton} onPress={() => navigation.navigate('AdminStaff')}>
              <Feather name="user-plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* KPI Grid */}
          <View style={styles.kpiGrid}>
            {kpis.map((kpi, idx) => (
              <TouchableOpacity key={idx} style={styles.kpiCard} onPress={kpi.onPress}>
                <View style={[styles.kpiIconBox, { backgroundColor: kpi.color + '15' }]}>
                  <MaterialCommunityIcons name={kpi.icon} size={28} color={kpi.color} />
                </View>
                <Text style={styles.kpiValue}>{kpi.value}</Text>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiSub}>{kpi.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Information Section */}
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information-outline" size={24} color="#3498DB" />
            <View style={styles.infoTextContent}>
              <Text style={styles.infoTitle}>Administrative Access</Text>
              <Text style={styles.infoSub}>Use the sidebar to manage customer accounts, staff details, and permission roles.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modern Sidebar Modal */}
      <Modal
        visible={isSidebarOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSidebarOpen(false)}
      >
        <View style={styles.sidebarOverlay}>
          <View style={styles.sidebarContainer}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogo}>
                <MaterialCommunityIcons name="shield-account" size={32} color="#000" />
              </View>
              <Text style={styles.sidebarTitle}>STAFF PANEL</Text>
              <Text style={styles.sidebarVersion}>v1.0.3</Text>
            </View>

            <View style={styles.sidebarItems}>
              {sidebarItems.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.sidebarItem}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    setTimeout(() => {
                      navigation.navigate(item.screen);
                    }, 100);
                  }}
                >
                  <View style={styles.sidebarItemIcon}>
                    <Feather name={item.icon} size={20} color="#000" />
                  </View>
                  <Text style={styles.sidebarItemLabel}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color="#DDD" />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('Login')}>
              <Feather name="log-out" size={20} color="#FF4757" />
              <Text style={styles.logoutText}>SIGN OUT</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={styles.sidebarBackdrop} onPress={() => setIsSidebarOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  headerCenter: {
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000'
  },
  headerSub: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    letterSpacing: 1
  },
  menuButton: {
    padding: 5
  },
  profileButton: {
    padding: 5
  },
  content: {
    padding: 20
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5
  },
  heroDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 2
  },
  addQuickButton: {
    backgroundColor: '#000',
    width: 45,
    height: 45,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  kpiCard: {
    width: (width - 55) / 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  kpiIconBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    marginBottom: 2
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 4
  },
  kpiSub: {
    fontSize: 9,
    color: '#CCC',
    fontWeight: '600'
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 24,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  infoTextContent: {
    marginLeft: 15,
    flex: 1
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    marginBottom: 4
  },
  infoSub: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    lineHeight: 18
  },
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row'
  },
  sidebarContainer: {
    width: width * 0.75,
    backgroundColor: '#fff',
    height: '100%',
    padding: 25,
    paddingTop: 60,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  sidebarHeader: {
    marginBottom: 40
  },
  sidebarLogo: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#F8F9FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5
  },
  sidebarVersion: {
    fontSize: 10,
    color: '#CCC',
    fontWeight: '700',
    marginTop: 2
  },
  sidebarItems: {
    flex: 1
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginBottom: 5
  },
  sidebarItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8F9FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  sidebarItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#000'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF5F5',
    borderRadius: 18,
    gap: 12
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF4757',
    letterSpacing: 1
  }
});

export default StaffManagerDashboard;

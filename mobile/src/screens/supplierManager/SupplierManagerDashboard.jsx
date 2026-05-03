import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { StatusBar } from 'expo-status-bar';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const SupplierManagerDashboard = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/supplier');
      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch supplier dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=500&q=80';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http')) return cleanUrl;
    return `https://e-com-mobile-app-production.up.railway.app${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  // Prepare chart data
  const chartData = {
    labels: data?.chartData?.map(d => d.name) || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        data: data?.chartData?.map(d => d.requests) || [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        strokeWidth: 3
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(173, 171, 170, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#fff"
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SUPPLIER MANAGER</Text>
        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Feather name="log-out" size={20} color="#000" />
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
                active
                onPress={() => setIsSidebarOpen(false)}
              />
              <SidebarItem
                icon="users"
                label="Suppliers"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => {
                    navigation.navigate('Suppliers');
                  }, 100);
                }}
              />
              <SidebarItem
                icon="truck"
                label="Restock Requests"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => {
                    navigation.navigate('RestockRequests');
                  }, 100);
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Title */}
        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitle}>Supplier Overview</Text>
          <Text style={styles.pageSubtitle}>Monitor supplier performance and restock status.</Text>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {/* Total Suppliers */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => navigation.navigate('Suppliers')}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>PARTNERS</Text>
              <Feather name="users" size={16} color="#ccc" />
            </View>
            <Text style={styles.kpiValue}>{data?.totalSuppliers || '0'}</Text>
            <Text style={styles.kpiDesc}>Total Suppliers</Text>
          </TouchableOpacity>

          {/* Active Suppliers */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>ACTIVE</Text>
              <MaterialIcons name="check-circle" size={16} color="#ccc" />
            </View>
            <Text style={styles.kpiValue}>{data?.activeSuppliers || '0'}</Text>
            <Text style={styles.kpiDesc}>Active Partners</Text>
          </View>

          {/* Pending Restocks */}
          <View style={styles.kpiCard}>
            <TouchableOpacity onPress={() => navigation.navigate('RestockRequests')}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>RESTOCK</Text>
                <View style={styles.warningBadge}>
                  <Text style={styles.warningText}>PENDING</Text>
                </View>
              </View>
              <Text style={styles.kpiValue}>{data?.pendingRestocks || '0'}</Text>
              <Text style={styles.kpiDesc}>Restock Requests</Text>
            </TouchableOpacity>
          </View>

          {/* Total Supplied Products */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>INVENTORY</Text>
              <MaterialIcons name="inventory" size={16} color="#ccc" />
            </View>
            <Text style={styles.kpiValue}>{data?.totalSuppliedProducts || '0'}</Text>
            <Text style={styles.kpiDesc}>Products Supplied</Text>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Restock Trends</Text>
              <Text style={styles.chartSubtitle}>Weekly restock request frequency</Text>
            </View>
          </View>

          <LineChart
            data={chartData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
          />
        </View>

        {/* Top Suppliers */}
        <View style={styles.topSellingContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Key Partners</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Suppliers')}>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topSellingScroll}>
            {data?.topSuppliers?.map((supplier, index) => (
              <View key={supplier.id || index} style={styles.topProductCard}>
                <View style={styles.topProductImageContainer}>
                  <Image source={{ uri: getImageUrl(supplier.imageUrl) }} style={styles.topProductImage} />
                </View>
                <View style={styles.topProductDetails}>
                  <Text style={styles.topProductCat}>{supplier.type || 'LOCAL'}</Text>
                  <Text style={styles.topProductName} numberOfLines={1}>{supplier.name}</Text>
                  <Text style={styles.topProductSales}>{supplier.productCount} Products</Text>
                </View>
              </View>
            ))}

            {(!data?.topSuppliers || data.topSuppliers.length === 0) && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No supplier data available yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSupplier')}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  pageTitleContainer: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: (width - 40) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ccc',
    letterSpacing: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  kpiDesc: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '600',
  },
  warningBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ff9800',
  },
  chartContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -15,
  },
  topSellingContainer: {
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  topSellingScroll: {
    paddingLeft: 20,
    paddingBottom: 10,
  },
  topProductCard: {
    width: 160,
    marginRight: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  topProductImageContainer: {
    height: 160,
    width: '100%',
    backgroundColor: '#f9f9f9',
  },
  topProductImage: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  topProductDetails: {
    padding: 12,
  },
  topProductCat: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ccc',
    letterSpacing: 1,
    marginBottom: 4,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  topProductSales: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
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

export default SupplierManagerDashboard;

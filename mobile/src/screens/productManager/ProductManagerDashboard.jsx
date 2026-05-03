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

const ProductManagerDashboard = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard');
      if (response.data && response.data.data) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http')) return cleanUrl;
    return `http://192.168.8.134:5001${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  // Prepare chart data
  const chartData = {
    labels: data?.chartData?.map(d => d.name) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: data?.chartData?.map(d => d.products) || [0, 0, 0, 0, 0, 0],
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
        <Text style={styles.headerTitle}>PRODUCT MANAGER</Text>
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
                icon="package"
                label="Products"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => {
                    navigation.navigate('Products');
                  }, 100);
                }}
              />
              <SidebarItem
                icon="layers"
                label="Categories"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('Categories'), 100);
                }}
              />
              <SidebarItem
                icon="rotate-ccw"
                label="Replacements"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminReplacements'), 100);
                }}
              />
              <SidebarItem
                icon="truck"
                label="Restock"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('RestockRequests'), 100);
                }}
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
          <Text style={styles.pageTitle}>Overview</Text>
          <Text style={styles.pageSubtitle}>Performance analytics for the current cycle.</Text>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {/* Total Products */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => navigation.navigate('Products')}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>INVENTORY</Text>
              <MaterialIcons name="inventory" size={16} color="#ccc" />
            </View>
            <Text style={styles.kpiValue}>{data?.totalProducts || '0'}</Text>
            <Text style={styles.kpiDesc}>Total Products</Text>
          </TouchableOpacity>

          {/* Active Products */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>LIVE</Text>
              <MaterialIcons name="visibility" size={16} color="#ccc" />
            </View>
            <Text style={styles.kpiValue}>{data?.activeProducts || '0'}</Text>
            <Text style={styles.kpiDesc}>Active Products</Text>
          </View>

          {/* Low Stock */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>ATTENTION</Text>
              <View style={styles.warningBadge}>
                <Text style={styles.warningText}>WARNING</Text>
              </View>
            </View>
            <Text style={styles.kpiValue}>{data?.lowStockProducts || '0'}</Text>
            <Text style={styles.kpiDesc}>Low Stock</Text>
          </View>

          {/* Total Categories */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => navigation.navigate('Categories')}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>STRUCTURE</Text>
              <MaterialIcons name="category" size={16} color="#ccc" />
            </View>
            <Text style={styles.kpiValue}>{data?.totalCategories || '0'}</Text>
            <Text style={styles.kpiDesc}>Total Categories</Text>
          </TouchableOpacity>

          {/* Pending Replacements */}
          <TouchableOpacity
            style={styles.kpiCard}
            onPress={() => navigation.navigate('AdminReplacements')}
          >
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>FULFILLMENT</Text>
              <Feather name="truck" size={16} color="#ccc" />
            </View>
            <View style={styles.row}>
              <Text style={styles.kpiValue}>{data?.totalReturns || '0'}</Text>
              {data?.pendingReturns > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
                  <Text style={styles.badgeText}>{data.pendingReturns}</Text>
                </View>
              )}
            </View>
            <Text style={styles.kpiDesc}>Replacement Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Production Velocity</Text>
              <Text style={styles.chartSubtitle}>Daily product creation count</Text>
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

        {/* Top Selling Products */}
        <View style={styles.topSellingContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Selling</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topSellingScroll}>
            {data?.topSellingProducts?.map((product, index) => (
              <TouchableOpacity key={product.id || index} style={styles.topProductCard}>
                <View style={styles.topProductImageContainer}>
                  <Image source={{ uri: getImageUrl(product.imageUrl) }} style={styles.topProductImage} />
                  {index < 3 && (
                    <View style={index === 0 ? styles.rankBadgeTop : styles.rankBadgeTrending}>
                      <Text style={index === 0 ? styles.rankTextTop : styles.rankTextTrending}>
                        {index === 0 ? 'TOP' : 'TRENDING'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.topProductDetails}>
                  <Text style={styles.topProductCat}>{product.category || 'PREMIUM'}</Text>
                  <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.topProductSales}>{product.totalSales} Sales</Text>
                </View>
              </TouchableOpacity>
            ))}

            {(!data?.topSellingProducts || data.topSellingProducts.length === 0) && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No sales data available yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const SidebarItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.sidebarItem, active && styles.activeSidebarItem]}
    onPress={onPress}
  >
    <Feather name={icon} size={20} color={active ? "#000" : "#666"} />
    <Text style={[styles.sidebarItemLabel, active && styles.activeSidebarItemLabel]}>{label}</Text>
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
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sidebarLogo: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#000',
  },
  sidebarItems: {
    flex: 1,
    paddingHorizontal: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  activeSidebarItem: {
    backgroundColor: '#f5f5f5',
  },
  sidebarItemLabel: {
    marginLeft: 15,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeSidebarItemLabel: {
    color: '#000',
    fontWeight: 'bold',
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff4444',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    backgroundColor: '#f9f9f9', // Body remains light
  },
  pageTitleContainer: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    color: '#aaa',
  },
  warningBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    marginBottom: 2,
  },
  kpiDesc: {
    fontSize: 10,
    color: '#888',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -20, // To align Y axis labels better
  },
  topSellingContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },
  topSellingScroll: {
    paddingRight: 20,
    gap: 15,
  },
  topProductCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  topProductImageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  topProductImage: {
    width: '100%',
    height: '100%',
  },
  rankBadgeTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankBadgeTrending: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankTextTop: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rankTextTrending: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  topProductDetails: {
    paddingHorizontal: 5,
  },
  topProductCat: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#aaa',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  topProductSales: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    width: width - 40,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});

export default ProductManagerDashboard;

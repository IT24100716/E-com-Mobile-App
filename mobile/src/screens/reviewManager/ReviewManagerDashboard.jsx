import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const ReviewManagerDashboard = ({ navigation }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/review');
      setData(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      label: 'TOTAL REVIEWS',
      value: data?.totalReviews || '0',
      sub: 'Customer feedback',
      icon: 'message-square',
      color: '#000',
      onPress: () => navigation.navigate('AdminReviews')
    },
    {
      label: 'AVG RATING',
      value: `${data?.averageRating || '0.0'} / 5`,
      sub: 'Satisfaction level',
      icon: 'star',
      color: '#FFB000',
      onPress: () => navigation.navigate('AdminReviews')
    },
    {
      label: 'PENDING RETURNS',
      value: data?.pendingReturns || '0',
      sub: 'Awaiting review',
      icon: 'rotate-ccw',
      color: '#FF3B30',
      onPress: () => navigation.navigate('AdminReturns')
    },
    {
      label: 'TOTAL RETURNS',
      value: data?.totalReturns || '0',
      sub: 'Processed returns',
      icon: 'package',
      color: '#007AFF',
      onPress: () => navigation.navigate('AdminReturns')
    },
  ];

  const chartData = {
    labels: data?.chartData?.length > 0
      ? data.chartData.map(d => d.name)
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: data?.chartData?.length > 0
        ? data.chartData.map(d => d.reviews)
        : [0, 0, 0, 0, 0, 0, 0],
      strokeWidth: 3
    }]
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>REVIEW MANAGER</Text>
          <Text style={styles.headerSub}>FEEDBACK & RETURNS</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
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
                icon="message-square"
                label="Product Reviews"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminReviews'), 100);
                }}
              />
              <SidebarItem
                icon="rotate-ccw"
                label="Return Requests"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminReturns'), 100);
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {kpis.map((kpi, index) => (
            <TouchableOpacity
              key={index}
              style={styles.kpiCard}
              onPress={kpi.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Feather name={kpi.icon} size={16} color={kpi.color} />
              </View>
              <Text
                style={styles.kpiValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {kpi.value}
              </Text>
              <Text style={styles.kpiSub}>{kpi.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>REVIEW VELOCITY</Text>
              <Text style={styles.sectionSubtitle}>Daily feedback trends</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>TRENDING</Text>
            </View>
          </View>

          <LineChart
            data={chartData}
            width={width - 70}
            height={220}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#000' }
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#000' }]}
            onPress={() => navigation.navigate('AdminReviews')}
          >
            <Feather name="message-square" size={24} color="#fff" />
            <Text style={styles.quickCardTitleLight}>REVIEWS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('AdminReturns')}
          >
            <Feather name="rotate-ccw" size={24} color="#000" />
            <Text style={styles.quickCardTitle}>RETURNS</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Reviews */}
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>RECENT FEEDBACK</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AdminReviews')}>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#000" style={{ marginTop: 20 }} />
        ) : (
          data?.recentReviews?.map((review) => (
            <View key={review.id} style={styles.activityCard}>
              <View style={styles.activityIcon}>
                <Feather name="user" size={20} color="#000" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{review.user?.name || 'Customer'}</Text>
                <Text style={styles.activityMeta} numberOfLines={1}>{review.product?.name || 'Product'}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color="#FFB000" />
                <Text style={styles.ratingText}>{review.rating}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  refreshButton: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 25,
  },
  kpiCard: {
    width: (width - 55) / 2,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    marginBottom: 4,
  },
  kpiSub: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  chart: {
    marginLeft: -20,
    marginTop: 10,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  quickCardTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  quickCardTitleLight: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 15,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  activityMeta: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFB000',
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
});

export default ReviewManagerDashboard;

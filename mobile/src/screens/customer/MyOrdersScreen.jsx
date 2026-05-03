import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  pending:   { label: 'PENDING',   color: '#FFB000', icon: 'clock' },
  confirmed: { label: 'CONFIRMED', color: '#007AFF', icon: 'check-circle' },
  shipped:   { label: 'ON THE WAY', color: '#5856D6', icon: 'local-shipping' },
  delivered: { label: 'DELIVERED', color: '#34C759', icon: 'card-giftcard' },
  cancelled: { label: 'CANCELLED', color: '#FF3B30', icon: 'cancel' },
};

const MyOrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      // The backend response structure: { success: true, data: { orders: [...], total: ... } }
      const fetchedOrders = response.data?.data?.orders || response.data?.orders || [];
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatPrice = (price) => {
    return `LKR ${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    return `https://e-com-mobile-app-production.up.railway.app${mainImage.startsWith('/') ? '' : '/'}${mainImage}`;
  };

  const renderOrderItem = ({ item, index }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const itemCount = item.items?.reduce((acc, i) => acc + i.quantity, 0) || 0;
    const firstItem = item.items?.[0];

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('TrackOrder', { orderId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderId}>ORDER #{item.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
            {item.method === 'return_replacement' && (
              <View style={[styles.statusBadge, { backgroundColor: '#FF950020', marginTop: 5 }]}>
                <Text style={[styles.statusText, { color: '#FF9500' }]}>REPLACEMENT</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: getImageUrl(firstItem?.product) }} 
              style={styles.productImage} 
            />
            {item.items?.length > 1 && (
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>+{item.items.length - 1}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.itemSummary} numberOfLines={1}>
              {firstItem?.product?.name || 'Multiple Items'}
            </Text>
            <Text style={styles.itemMeta}>{itemCount} {itemCount === 1 ? 'item' : 'items'} • {item.deliveryMethod?.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.orderTotal}>{formatPrice(item.total)}</Text>
          </View>

          <Feather name="chevron-right" size={20} color="#ccc" />
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.trackButton}
            onPress={() => navigation.navigate('TrackOrder', { orderId: item.id })}
          >
            <Feather name="truck" size={14} color="#000" />
            <Text style={styles.trackButtonText}>TRACK ORDER</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>MY ORDERS</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="package" size={64} color="#eee" />
          <Text style={styles.emptyTitle}>NO ORDERS YET</Text>
          <Text style={styles.emptySub}>Looks like you haven't placed any orders.</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopButtonText}>START SHOPPING</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  backButton: {
    padding: 5,
  },
  refreshButton: {
    padding: 5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    marginBottom: 15,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 60,
    height: 75,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  itemCountBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#000',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  itemCountText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 15,
  },
  itemSummary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
  },
  itemMeta: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginTop: 4,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    marginTop: 8,
  },
  cardFooter: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    marginTop: 20,
    letterSpacing: 2,
  },
  emptySub: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  shopButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 30,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  }
});

export default MyOrdersScreen;

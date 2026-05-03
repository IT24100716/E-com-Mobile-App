import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const ProductsScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      console.log('[ProductsScreen] Fetching products from:', api.defaults.baseURL);
      const response = await api.get('/products', { params: { skip: 0, take: 50 } });
      
      let productList = [];
      if (response.data?.data?.products) {
        productList = response.data.data.products;
      } else if (response.data?.products) {
        productList = response.data.products;
      } else if (Array.isArray(response.data?.data)) {
        productList = response.data.data;
      } else if (Array.isArray(response.data)) {
        productList = response.data;
      }

      console.log(`[ProductsScreen] Received ${productList?.length || 0} items`);
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      console.error('[ProductsScreen] Fetch Error:', error.message);
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'The server is taking too long to respond. Please try again.');
      } else {
        Alert.alert('Connection Error', 'Could not connect to the server. Please ensure the backend is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/products/${id}`);
              setProducts(products.filter(p => p.id !== id));
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Delete Error:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (product) => {
    navigation.navigate('AddProduct', { product });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const getImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';
    }
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http')) return cleanUrl;
    return `https://e-com-mobile-app-production.up.railway.app${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  const getStockStatus = (stock) => {
    const s = parseInt(stock) || 0;
    if (s <= 0) return { label: 'OUT OF STOCK', color: '#ff4444', bg: '#ffebee' };
    if (s <= 10) return { label: 'LOW STOCK', color: '#ff9800', bg: '#fff3e0' };
    return { label: 'IN STOCK', color: '#4caf50', bg: '#e8f5e9' };
  };

  const filteredProducts = Array.isArray(products) ? products.filter(p =>
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const renderProductItem = ({ item }) => {
    const status = getStockStatus(item.stock);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => handleEdit(item)}
      >
        <Image
          source={{ uri: getImageUrl(item.imageUrl || item.images?.[0]) }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.categoryText}>{item.category?.name || 'Uncategorized'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.skuText}>SKU: {item.sku || 'N/A'}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{item.price?.toLocaleString()} LKR</Text>
            <Text style={styles.stockCountText}>{item.stock} units left</Text>
          </View>
        </View>

        <View style={styles.actionColumn}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => navigation.navigate('CreateRestockRequest', { product: item })}
          >
            <Feather name="truck" size={18} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
            <Feather name="edit-2" size={18} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
            <Feather name="trash-2" size={18} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('ProductManagerDashboard'), 100);
                }}
              />
              <SidebarItem
                icon="package"
                label="Products"
                active
                onPress={() => setIsSidebarOpen(false)}
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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRODUCT INVENTORY</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or SKU..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Feather name="x" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="package" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Feather name="plus" size={28} color="#fff" />
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
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  sidebarHeader: {
    padding: 25,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  sidebarLogo: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#000',
  },
  sidebarItems: {
    flex: 1,
    padding: 15,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  sidebarItemActive: {
    backgroundColor: '#f1f3f5',
  },
  sidebarItemLabel: {
    marginLeft: 15,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sidebarItemLabelActive: {
    color: '#000',
    fontWeight: '700',
  },
  sidebarFooter: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#ff4444',
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: 90,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#adb5bd',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  skuText: {
    fontSize: 11,
    color: '#868e96',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  stockCountText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  actionColumn: {
    justifyContent: 'space-between',
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f3f5',
    marginLeft: 5,
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#adb5bd',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  }
});

export default ProductsScreen;

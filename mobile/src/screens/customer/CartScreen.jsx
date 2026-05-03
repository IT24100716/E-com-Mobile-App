import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const CartScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchCart = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/cart');
      console.log('Cart Response:', response.data);
      const cart = response.data?.data || response.data;
      const items = cart?.items || [];
      setCartItems(items);
      calculateTotal(items);
    } catch (error) {
      console.error('Fetch Cart Error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again to view your bag.');
        navigation.replace('Login');
      } else {
        Alert.alert('Connection Error', 'Failed to sync your shopping bag. Please check your internet connection.');
      }
      setCartItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCart(cartItems.length === 0);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart(false);
  };

  const calculateTotal = (items) => {
    if (!Array.isArray(items)) return;
    const sum = items.reduce((acc, item) => {
      const price = item.product?.price || 0;
      return acc + (price * (item.quantity || 1));
    }, 0);
    setTotal(sum);
  };

  const formatPrice = (price) => {
    return `LKR ${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const updateQuantity = async (itemId, newQty) => {
    if (newQty < 1) return;
    try {
      await api.put(`/cart/${itemId}`, { quantity: newQty });
      const updatedItems = cartItems.map(item => 
        item.id === itemId ? { ...item, quantity: newQty } : item
      );
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
    } catch (error) {
      console.error('Update Qty Error:', error.response?.data || error.message);
      const msg = error.response?.data?.message || 'Failed to update quantity';
      Alert.alert('Error', msg);
    }
  };

  const [removingItems, setRemovingItems] = useState(new Set());

  const removeItem = async (itemId) => {
    if (removingItems.has(itemId)) return;

    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your bag?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            setRemovingItems(prev => new Set(prev).add(itemId));
            try {
              console.log(`[Cart] Attempting to remove item: ${itemId}`);
              await api.delete(`/cart/${itemId}`);
              
              const updatedItems = cartItems.filter(item => item.id !== itemId);
              setCartItems(updatedItems);
              calculateTotal(updatedItems);
            } catch (error) {
              console.error('Remove Item Error:', error.response?.data || error.message);
              const msg = error.response?.data?.message || 'Could not remove item. Please try again.';
              Alert.alert('Remove Failed', msg);
            } finally {
              setRemovingItems(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
              });
            }
          }
        }
      ]
    );
  };

  const handleCheckout = () => {
    navigation.navigate('Checkout');
  };

  const parseColor = (val) => {
    if (!val) return { name: '', hex: '#eee' };
    if (typeof val !== 'string') return { name: String(val), hex: '#eee' };
    if (val.includes('|')) {
      const [name, hex] = val.split('|');
      // If the name itself is just a hex code, hide it
      return { name: name.startsWith('#') ? '' : name, hex: hex.startsWith('#') ? hex : `#${hex}` };
    }
    if (val.startsWith('#')) return { name: '', hex: val };
    return { name: val, hex: '#888' };
  };

  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    
    if (!mainImage) {
      return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    }
    
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) {
      return mainImage;
    }
    
    const path = typeof mainImage === 'string' ? mainImage : mainImage.url;
    if (!path) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://192.168.8.134:5001${cleanPath}`;
  };

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
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>SHOPPING BAG</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
      >
        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="shopping-bag" size={80} color="#eee" />
            <Text style={styles.emptyText}>Your bag is empty</Text>
            <TouchableOpacity 
              style={styles.shopButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.shopButtonText}>START SHOPPING</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.itemsList}>
              {cartItems.map((item) => {
                const colorData = parseColor(item.variantAttributes?.colour || item.variantAttributes?.color);
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.cartItem}
                    onPress={() => navigation.navigate('ProductDetails', { product: item.product })}
                  >
                    <Image source={{ uri: getImageUrl(item.product) }} style={styles.itemImage} />
                    <View style={styles.itemDetails}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                        <TouchableOpacity onPress={() => removeItem(item.id)}>
                          <Feather name="x" size={18} color="#999" />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.variantRow}>
                        {item.variantAttributes?.size ? (
                          <Text style={styles.itemVariant}>{item.variantAttributes.size} | </Text>
                        ) : null}
                        {colorData.hex !== '#eee' && (
                          <View style={[styles.miniColorCircle, { backgroundColor: colorData.hex }]} />
                        )}
                        {colorData.name ? (
                          <Text style={styles.itemVariant}> {colorData.name}</Text>
                        ) : null}
                      </View>

                      <View style={styles.priceRow}>
                        <Text style={styles.itemPrice}>{formatPrice(item.product.price)}</Text>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Feather name="minus" size={16} color="#000" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{item.quantity}</Text>
                          <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Feather name="plus" size={16} color="#000" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(total)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>

              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutText}>PROCEED TO CHECKOUT</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  itemsList: {
    marginBottom: 30,
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemImage: {
    width: 90,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    width: '85%',
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  miniColorCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 2,
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  itemVariant: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 12,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    padding: 25,
    marginBottom: 40,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  checkoutButton: {
    backgroundColor: '#000',
    height: 65,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  }
});

export default CartScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const ProductDetailsScreen = ({ navigation, route }) => {
  const { product: initialProduct } = route.params;
  const [product, setProduct] = useState(initialProduct);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    // Only fetch if ID is valid (24 chars hex)
    const id = String(initialProduct.id || '');
    const isValidId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isValidId) {
      fetchProductDetails(id);
    }
  }, [initialProduct.id]);

  const fetchProductDetails = async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      const fullProduct = response.data?.data || response.data || initialProduct;
      setProduct(fullProduct);
    } catch (error) {
      console.warn('Refresh failed:', error.message);
    }
  };

  const getImageUrl = (p) => {
    const images = p?.images || [];
    const mainImage = images[0] || p?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    const path = typeof mainImage === 'string' ? mainImage : mainImage.url;
    if (!path) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `http://192.168.8.134:5001${cleanPath}`;
  };

  const imageUrl = getImageUrl(product);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(price || 0);
  };

  const getAttr = (v, name) => {
    if (!v) return null;
    const attrs = v.attributes || v;
    if (typeof attrs !== 'object') return null;
    const search = name.toLowerCase();
    let key = Object.keys(attrs).find(k => k.toLowerCase() === search);
    if (key) return attrs[key];
    if (search === 'color' || search === 'colour') {
      key = Object.keys(attrs).find(k => {
        const lk = k.toLowerCase();
        return lk.includes('color') || lk.includes('colour');
      });
      if (key) return attrs[key];
    }
    if (search === 'sex' || search === 'gender') {
      key = Object.keys(attrs).find(k => k.toLowerCase() === 'sex' || k.toLowerCase() === 'gender');
      if (key) return attrs[key];
    }
    return null;
  };

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;

  const totalVariantStock = hasVariants 
    ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : Number(product.stock || 0);

  const getSelectedVariant = () => {
    if (!hasVariants || !selectedSize || !selectedColor) return null;
    return variants.find(v => {
      const vSize = String(getAttr(v, 'size') || '').toUpperCase().trim();
      const vColor = String(getAttr(v, 'color') || '').trim();
      return vSize === selectedSize && vColor === selectedColor;
    });
  };

  const selectedVariant = getSelectedVariant();
  const availableStock = selectedVariant ? Number(selectedVariant.stock) : totalVariantStock;

  const getProductSex = () => {
    if (hasVariants) {
      for (const v of variants) {
        const sex = getAttr(v, 'sex') || getAttr(v, 'gender');
        if (sex && typeof sex === 'string' && sex.length > 1) return sex.toUpperCase();
      }
    }
    const textToSearch = (product.name + " " + (product.description || "")).toLowerCase();
    if (textToSearch.includes('unisex')) return 'UNISEX';
    if (textToSearch.includes('women') || textToSearch.includes('ladies')) return 'WOMEN';
    if (textToSearch.includes('men') || textToSearch.includes('gent')) return 'MEN';
    const catName = product.category?.name?.toLowerCase() || '';
    if (catName.includes('women')) return 'WOMEN';
    if (catName.includes('men')) return 'MEN';
    return 'UNISEX';
  };

  const productSex = getProductSex();


  const handleAddToCart = async () => {
    if (hasVariants && (!selectedSize || !selectedColor)) {
      Alert.alert('Selection Required', 'Please select a size and color before adding to cart.');
      return;
    }

    if (quantity > availableStock) {
      Alert.alert('Stock Exceeded', `Sorry, only ${availableStock} units are available for this selection.`);
      return;
    }

    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Login Required', 'Please login to add items to your bag.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    setAddingToCart(true);
    try {
      const cartData = {
        productId: product.id,
        quantity: quantity,
        variantAttributes: hasVariants ? {
          size: selectedSize,
          colour: selectedColor
        } : null
      };

      const response = await api.post('/cart', cartData);
      if (response.data) {
        Alert.alert('Success', `${product.name} added to your bag!`, [
          { text: 'View Bag', onPress: () => navigation.navigate('Cart') },
          { text: 'Keep Shopping', style: 'cancel' }
        ]);
      }
    } catch (error) {
      console.error('Add to Cart Error:', error.response?.data || error.message);
      Alert.alert('Error', error.response?.data?.message || 'Failed to add item to cart.');
    } finally {
      setAddingToCart(false);
    }
  };

  const renderVariantSelectors = () => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    
    const parseColor = (val) => {
      if (!val) return { name: 'Unknown', hex: '#eee' };
      if (typeof val !== 'string') return { name: String(val), hex: '#eee' };
      if (val.includes('|')) {
        const [name, hex] = val.split('|');
        return { name, hex };
      }
      if (val.startsWith('#') || ['red','blue','green','black','white','yellow','pink','purple'].includes(val.toLowerCase())) {
        return { name: val, hex: val };
      }
      return { name: val, hex: '#888' };
    };

    const allSizes = [...new Set(variants.map(v => {
      const val = getAttr(v, 'size');
      return val ? String(val).toUpperCase().trim() : null;
    }))].filter(Boolean);

    const allColorsRaw = [...new Set(variants.map(v => {
      const val = getAttr(v, 'color');
      return val ? String(val).trim() : null;
    }))].filter(Boolean);

    const displaySizes = allSizes.length > 0 ? allSizes : [];
    const displayColors = allColorsRaw.length > 0 ? allColorsRaw : [];

    const isSizeAvailable = (size) => {
      if (variants.length === 0) return product.stock > 0;
      return variants.some(v => {
        const s = getAttr(v, 'size');
        return s && String(s).toUpperCase().trim() === size && Number(v.stock) > 0;
      });
    };

    const isColorAvailable = (colorRaw) => {
      if (variants.length === 0) return product.stock > 0;
      if (!selectedSize) {
        return variants.some(v => getAttr(v, 'color') === colorRaw && Number(v.stock) > 0);
      }
      return variants.some(v => 
        String(getAttr(v, 'size')).toUpperCase().trim() === selectedSize && 
        getAttr(v, 'color') === colorRaw && 
        Number(v.stock) > 0
      );
    };

    if (displaySizes.length === 0 && displayColors.length === 0) return null;

    return (
      <View style={styles.variantsSection}>
        {displaySizes.length > 0 && (
          <>
            <Text style={styles.variantLabel}>SIZE: <Text style={styles.selectedLabelText}>{selectedSize || 'None'}</Text></Text>
            <View style={styles.sizeGrid}>
              {displaySizes.map((size, index) => {
                const available = isSizeAvailable(size);
                return (
                  <TouchableOpacity 
                    key={`size-${size}-${index}`}
                    style={[
                      styles.sizeChip,
                      selectedSize === size && styles.activeSizeChip,
                      !available && styles.disabledChip
                    ]}
                    onPress={() => available && setSelectedSize(size)}
                    disabled={!available}
                  >
                    <Text style={[
                      styles.sizeText,
                      selectedSize === size && styles.activeSizeText,
                      !available && styles.disabledText
                    ]}>{size}</Text>
                    {!available && <View style={styles.diagonalLine} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {displayColors.length > 0 && (
          <>
            <Text style={styles.variantLabel}>COLOUR: <Text style={styles.selectedLabelText}>{selectedColor ? parseColor(selectedColor).name : 'None'}</Text></Text>
            <View style={styles.colorGrid}>
              {displayColors.map((colorRaw, index) => {
                const available = isColorAvailable(colorRaw);
                const { name, hex } = parseColor(colorRaw);
                return (
                  <TouchableOpacity 
                    key={`color-${colorRaw}-${index}`}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: hex },
                      selectedColor === colorRaw && styles.activeColorCircle,
                      !available && styles.disabledColorCircle
                    ]}
                    onPress={() => available && setSelectedColor(colorRaw)}
                    disabled={!available}
                  >
                    {selectedColor === colorRaw && (
                      <Feather name="check" size={16} color={hex.toLowerCase() === '#ffffff' ? '#000' : '#fff'} />
                    )}
                    {!available && <View style={styles.diagonalLine} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name.toUpperCase()}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Feather name="shopping-bag" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.mainImage} resizeMode="cover" />
          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.imageActionButton}>
              <Feather name="heart" size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageActionButton}>
              <Feather name="share-2" size={20} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>PREMIUM COLLECTION</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.statusRow}>
            <View style={[styles.stockBadge, { backgroundColor: availableStock > 0 ? '#e8f5e9' : '#ffebee' }]}>
              <View style={[styles.stockDot, { backgroundColor: availableStock > 0 ? '#4caf50' : '#f44336' }]} />
              <Text style={[styles.stockText, { color: availableStock > 0 ? '#2e7d32' : '#c62828' }]}>
                {availableStock > 0 ? `${availableStock} IN STOCK` : 'OUT OF STOCK'}
              </Text>
            </View>
            <Text style={styles.skuText}>REF: {product.sku || 'N/A'}</Text>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4].map(i => <Feather key={i} name="star" size={14} color="#000" fill="#000" />)}
              <Feather name="star" size={14} color="#000" />
            </View>
            <Text style={styles.ratingText}>4.0 (2 Reviews)</Text>
          </View>

          <Text style={styles.priceText}>{formatPrice(product.price)}</Text>

          <View style={styles.attributesRow}>
            <View style={styles.attributeItem}>
              <Text style={styles.attributeLabel}>SEX:</Text>
              <Text style={styles.attributeValue}>{productSex}</Text>
            </View>
            <View style={styles.attributeItem}>
              <Text style={styles.attributeLabel}>MATERIAL:</Text>
              <Text style={styles.attributeValue}>{getAttr(product.variants?.[0] || {}, 'material')?.toUpperCase() || 'COTTON'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {renderVariantSelectors()}

          <View style={styles.quantitySection}>
            <Text style={styles.variantLabel}>QUANTITY</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.qtyButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Feather name="minus" size={20} color="#000" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.qtyButton}
                onPress={() => setQuantity(Math.min(availableStock || 1, quantity + 1))}
                disabled={availableStock !== null && quantity >= availableStock}
              >
                <Feather name="plus" size={20} color={(availableStock !== null && quantity >= availableStock) ? '#CCC' : '#000'} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.addToCartButton, 
              (availableStock === 0 || quantity > availableStock || addingToCart) && styles.disabledButton
            ]}
            onPress={handleAddToCart}
            disabled={availableStock === 0 || quantity > availableStock || addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="shopping-bag" size={20} color="#fff" />
                <Text style={styles.addToCartText}>
                  {availableStock === 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                </Text>
              </>
            )}
          </TouchableOpacity>


          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>DESCRIPTION</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  imageContainer: {
    width: width,
    height: width * 1.3,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageActions: {
    position: 'absolute',
    top: 20,
    right: 20,
    gap: 15,
  },
  imageActionButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  badgeContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  contentContainer: {
    padding: 25,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skuText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#bbb',
    letterSpacing: 1,
  },
  productName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  priceText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000',
    marginBottom: 25,
  },
  attributesRow: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 25,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attributeLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#bbb',
    letterSpacing: 1,
  },
  attributeValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 25,
  },
  variantsSection: {
    marginBottom: 30,
  },
  variantLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    marginBottom: 15,
  },
  selectedLabelText: {
    color: '#888',
    fontWeight: '700',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },
  sizeChip: {
    width: 60,
    height: 45,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  activeSizeChip: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  activeSizeText: {
    color: '#fff',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeColorCircle: {
    borderWidth: 2,
    borderColor: '#000',
  },
  disabledChip: {
    backgroundColor: '#fff',
    borderColor: '#f0f0f0',
    opacity: 0.4,
  },
  disabledText: {
    color: '#ddd',
  },
  disabledColorCircle: {
    opacity: 0.3,
  },
  diagonalLine: {
    position: 'absolute',
    width: '120%',
    height: 1,
    backgroundColor: '#ff4444',
    transform: [{ rotate: '-45deg' }],
  },
  quantitySection: {
    marginBottom: 35,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    width: 140,
    height: 55,
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  qtyButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addToCartButton: {
    backgroundColor: '#000',
    height: 65,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  checkoutButton: {
    backgroundColor: '#fff',
    height: 65,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  checkoutText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#666',
    textAlign: 'justify',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default ProductDetailsScreen;

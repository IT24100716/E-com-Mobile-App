import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

const ProductCard = ({ product, onPress }) => {
  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
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

  // Total Stock calculation including variants
  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
  const totalStock = hasVariants 
    ? product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : Number(product?.stock || 0);

  const isOutOfStock = totalStock === 0;

  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      activeOpacity={0.8}
      onPress={() => onPress && onPress(product)}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image} 
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.wishlistButton}>
          <Feather name="heart" size={16} color="#000" />
        </TouchableOpacity>
        
        {isOutOfStock && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>SOLD OUT</Text>
          </View>
        )}
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.brandText} numberOfLines={1}>
          {product?.category?.name || 'PREMIUM'}
        </Text>
        <Text style={styles.nameText} numberOfLines={2}>
          {product?.name || 'Unknown Product'}
        </Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{formatPrice(product?.price)}</Text>
          <View style={[styles.addButton, isOutOfStock && { backgroundColor: '#EEE' }]}>
            <Feather name={isOutOfStock ? "slash" : "plus"} size={14} color={isOutOfStock ? "#CCC" : "#fff"} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 20,
    marginRight: 15,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.3,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  detailsContainer: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    lineHeight: 18,
    height: 36,
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
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default ProductCard;

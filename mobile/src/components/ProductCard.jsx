import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
// Card width is dynamic to fit 2 columns on most phones, with a small gap
const CARD_WIDTH = width * 0.42;

const ProductCard = ({ product, onPress }) => {
  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    if (mainImage.url && mainImage.url.startsWith('http')) return mainImage.url;
    
    const path = typeof mainImage === 'string' ? mainImage : mainImage.url;
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

  return (
    <TouchableOpacity 
      style={styles.cardContainer}
      activeOpacity={0.8}
      onPress={() => onPress && onPress(product)}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image} 
          resizeMode="cover"
        />
        {/* Wishlist Button (Aesthetic touch) */}
        <TouchableOpacity style={styles.wishlistButton}>
          <Feather name="heart" size={16} color="#000" />
        </TouchableOpacity>
        
        {/* Out of Stock Badge */}
        {product?.stock === 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>SOLD OUT</Text>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.brandText} numberOfLines={1}>
          {product?.category?.name || 'PREMIUM'}
        </Text>
        <Text style={styles.nameText} numberOfLines={2}>
          {product?.name || 'Unknown Product'}
        </Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{formatPrice(product?.price)}</Text>
          <View style={styles.addButton}>
            <Feather name="plus" size={14} color="#fff" />
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
    height: CARD_WIDTH * 1.3, // Taller aspect ratio for fashion
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  detailsContainer: {
    paddingTop: 12,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    width: 26,
    height: 26,
    backgroundColor: '#000',
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default ProductCard;

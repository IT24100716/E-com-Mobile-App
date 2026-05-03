import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const CreateRestockRequestScreen = ({ navigation, route }) => {
  const { product } = route.params || {};
  const [variantQuantities, setVariantQuantities] = useState({});
  const [totalQuantity, setTotalQuantity] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize variant quantities if product has variants
  useEffect(() => {
    if (product?.variants && Array.isArray(product.variants)) {
      const initial = {};
      product.variants.forEach((v, index) => {
        initial[index] = '';
      });
      setVariantQuantities(initial);
    }
  }, [product]);

  // Update total quantity whenever variant quantities change
  useEffect(() => {
    if (product?.variants && Array.isArray(product.variants)) {
      const total = Object.values(variantQuantities).reduce((sum, val) => {
        const num = parseInt(val) || 0;
        return sum + num;
      }, 0);
      setTotalQuantity(total.toString());
    }
  }, [variantQuantities, product]);

  const handleVariantChange = (index, value) => {
    setVariantQuantities(prev => ({
      ...prev,
      [index]: value
    }));
  };

  const handleSubmit = async () => {
    const finalQuantity = parseInt(totalQuantity);
    
    if (!finalQuantity || finalQuantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter at least one quantity for restock.');
      return;
    }

    setLoading(true);
    try {
      const variantDetails = product?.variants?.map((v, index) => {
        const q = parseInt(variantQuantities[index]) || 0;
        if (q > 0) {
          return {
            ...v,
            quantity: q
          };
        }
        return null;
      }).filter(Boolean);

      await api.post('/restock-requests', {
        productId: product.id,
        quantity: finalQuantity,
        variantDetails: variantDetails || [],
        notes: notes.trim()
      });
      
      Alert.alert(
        'Success', 
        'Restock request sent successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('RestockRequests') }]
      );
    } catch (error) {
      console.error('Create Restock Request Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send restock request');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';
    }
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http')) return cleanUrl;
    
    // Ensure relative paths are handled correctly
    const baseUrl = 'https://e-com-mobile-app-production.up.railway.app';
    const separator = cleanUrl.startsWith('/') ? '' : '/';
    return `${baseUrl}${separator}${cleanUrl}`;
  };

  const hasVariants = product?.variants && Array.isArray(product.variants) && product.variants.length > 0;

  const renderAttribute = (key, value, isLast) => {
    let displayValue = value;
    let colorHex = null;

    // Handle nested objects (found: object with keys {size, colour, sex, material})
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const parts = Object.entries(value)
        .filter(([k]) => !['stock', 'priceAdj', 'quantity', 'imageUrl', 'id'].includes(k))
        .map(([k, v]) => {
          if (k === 'colour' || k === 'color') {
            if (typeof v === 'string' && v.includes('|')) return v.split('|')[0];
            return v;
          }
          return v;
        });
      displayValue = parts.join(' | ');
    } else if (key === 'colour' || key === 'color') {
      if (typeof value === 'string' && value.includes('|')) {
        const parts = value.split('|');
        displayValue = parts[0];
        colorHex = parts[1];
      } else if (typeof value === 'string' && value.startsWith('#')) {
        colorHex = value;
        displayValue = '';
      }
    }

    if (Array.isArray(value)) displayValue = value.join(', ');

    return (
      <View key={key} style={styles.attributeItem}>
        <View style={styles.attributeChip}>
          {colorHex && (
            <View style={[styles.colorBall, { backgroundColor: colorHex }]} />
          )}
          <Text style={styles.attributeText}>{displayValue}</Text>
        </View>
        {!isLast && <Text style={styles.separator}>|</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REQUEST RESTOCK</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Product Preview Card */}
        <View style={styles.productCard}>
          <Image 
            source={{ uri: getImageUrl(product?.imageUrl || product?.images?.[0]) }} 
            style={styles.productImage} 
            resizeMode="cover"
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product?.name}</Text>
            <Text style={styles.productSku}>SKU: {product?.sku}</Text>
            {product?.supplier?.name && (
              <View style={styles.supplierBadge}>
                <Feather name="truck" size={10} color="#666" />
                <Text style={styles.supplierText}>{product.supplier.name}</Text>
              </View>
            )}
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>Total Stock: {product?.stock}</Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          {hasVariants ? (
            <View style={styles.variantsSection}>
              <Text style={styles.sectionLabel}>VARIANTS RESTOCK</Text>
              {product.variants.map((variant, index) => {
                const attributes = Object.entries(variant).filter(
                  ([key]) => !['stock', 'priceAdj', 'quantity', 'imageUrl', 'id'].includes(key)
                );

                return (
                  <View key={index} style={styles.variantRow}>
                    <View style={styles.variantInfo}>
                      <View style={styles.attributeRow}>
                        {attributes.map(([key, value], idx) => 
                          renderAttribute(key, value, idx === attributes.length - 1)
                        )}
                      </View>
                      <Text style={styles.variantStock}>In Stock: {variant.stock}</Text>
                    </View>
                    <View style={styles.variantInputWrapper}>
                      <TextInput
                        style={styles.variantInput}
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={variantQuantities[index]}
                        onChangeText={(val) => handleVariantChange(index, val)}
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                );
              })}
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Quantity:</Text>
                <Text style={styles.totalValue}>{totalQuantity}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>RESTOCK QUANTITY</Text>
              <View style={styles.inputWrapper}>
                <Feather name="hash" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount needed"
                  keyboardType="numeric"
                  value={totalQuantity === '0' ? '' : totalQuantity}
                  onChangeText={setTotalQuantity}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add instructions or reason for restock..."
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>SEND RESTOCK REQUEST</Text>
                <Feather name="send" size={18} color="#fff" style={{ marginLeft: 10 }} />
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  scrollContent: {
    padding: 20,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#eee',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  supplierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  supplierText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  stockBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#eee',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  form: {
    gap: 25,
  },
  variantsSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    marginBottom: 15,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  variantInfo: {
    flex: 1,
  },
  attributeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorBall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  attributeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  separator: {
    marginHorizontal: 8,
    color: '#ddd',
    fontSize: 14,
  },
  variantStock: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  variantInputWrapper: {
    width: 80,
    height: 45,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 10,
  },
  variantInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 15,
  },
  textArea: {
    height: 120,
  },
  submitButton: {
    backgroundColor: '#000',
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cancelButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CreateRestockRequestScreen;

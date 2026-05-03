import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import api from '../../api/api';

const PAGE_SIZE = 7;

// Generate a full spectrum of colors for the "World Colors" advanced picker
const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const generateWorldColors = () => {
  const colors = [];
  // Grayscale row
  const grays = [0, 15, 30, 45, 60, 75, 90, 100];
  grays.forEach(l => colors.push(hslToHex(0, 0, l)));
  
  // Color spectrum (3 lightness levels x 12 hues)
  const lightnessLevels = [70, 50, 30];
  const hues = Array.from({length: 12}, (_, i) => i * 30);
  
  lightnessLevels.forEach(l => {
    hues.forEach(h => {
      colors.push(hslToHex(h, 100, l));
    });
  });
  return colors;
};

const WORLD_COLORS = generateWorldColors();

const { width } = Dimensions.get('window');

const AddProductScreen = ({ navigation, route }) => {
  const editingProduct = route.params?.product;
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // Form State
  const [name, setName] = useState(editingProduct?.name || '');
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [price, setPrice] = useState(editingProduct?.price?.toString() || '');
  const [costPrice, setCostPrice] = useState(editingProduct?.costPrice?.toString() || '');
  const [stock, setStock] = useState(editingProduct?.stock?.toString() || '');
  const [categoryId, setCategoryId] = useState(editingProduct?.categoryId || '');
  const [supplierId, setSupplierId] = useState(editingProduct?.supplierId || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [images, setImages] = useState(editingProduct?.images || (editingProduct?.imageUrl ? [editingProduct.imageUrl] : []));
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [variants, setVariants] = useState(
    editingProduct?.variants 
      ? (typeof editingProduct.variants === 'string' ? JSON.parse(editingProduct.variants) : editingProduct.variants)
      : []
  ); 

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Total stock sync
  useEffect(() => {
    if (variants.length > 0) {
      const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      setStock(totalStock.toString());
    }
  }, [variants]);

  const handleAiDescription = async () => {
    if (!name || name.length < 2) {
      Alert.alert('Info', 'Please enter a product name first to generate a description.');
      return;
    }

    setGeneratingDesc(true);
    try {
      const response = await api.get(`/ai/generate-product-description?name=${encodeURIComponent(name)}`);
      if (response.data?.success && response.data?.data?.description) {
        setDescription(response.data.data.description);
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Could not generate description. Please check your backend logs.';
      Alert.alert('AI Generation Failed', errMsg);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers')
      ]);
      setCategories(catRes.data?.data?.categories || []);
      setSuppliers(supRes.data?.data?.suppliers || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [pickingFor, setPickingFor] = useState(null); // { vIdx, attrName }
  const [tempColor, setTempColor] = useState('#000000');
  const [tempColorName, setTempColorName] = useState('');
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);

  const openColorPicker = (vIdx, attrName, current) => {
    console.log('--- OPENING COLOR PICKER ---');
    console.log('Target:', attrName, 'Index:', vIdx);
    setPickingFor({ vIdx, attrName });
    setTempColor(current || '#000000');
    setTempColorName('');
    setShowAdvancedPicker(false);
    setIsColorPickerVisible(true);
  };

  const handleColorPick = () => {
    if (pickingFor) {
      // Always save the hex. If a name is given, store "name|hex" so we can display both.
      const name = tempColorName.trim();
      const valueToSave = name ? `${name}|${tempColor}` : tempColor;
      console.log('Saving color value:', valueToSave);
      updateVariant(pickingFor.vIdx, pickingFor.attrName, valueToSave);
    }
    setIsColorPickerVisible(false);
  };

  // Helper: parse a stored color value into { name, hex }
  const parseColorValue = (val) => {
    if (!val) return { name: '', hex: '#000000' };
    if (val.includes('|')) {
      const [name, hex] = val.split('|');
      return { name, hex };
    }
    if (val.startsWith('#')) return { name: '', hex: val };
    return { name: val, hex: '#888888' };
  };

  const isColorAttribute = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower.includes('color') || lower.includes('colour') || lower.includes('tone') || lower.includes('hue');
  };

  const handleCategorySelect = (id) => {
    setCategoryId(id);
    const category = categories.find(c => c.id === id);
    if (category && variants.length === 0) {
      let config = category.variantConfig;
      if (typeof config === 'string') {
        try { config = JSON.parse(config); } catch (e) { config = []; }
      }
      
      if (config && Array.isArray(config) && config.length > 0) {
        const initialAttributes = {};
        config.forEach(cfg => {
          initialAttributes[cfg.name] = cfg.options?.[0] || "";
        });
        setVariants([{ attributes: initialAttributes, stock: 0 }]);
      }
    }
  };

  const addVariant = () => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      Alert.alert('Error', 'Please select a category first.');
      return;
    }

    let config = category.variantConfig;
    if (typeof config === 'string') config = JSON.parse(config);

    const initialAttributes = {};
    if (variants.length > 0) {
      // Inherit from the first variant
      Object.assign(initialAttributes, variants[0].attributes);
    } else if (Array.isArray(config)) {
      config.forEach(cfg => {
        initialAttributes[cfg.name] = cfg.options?.[0] || "";
      });
    }
    setVariants([...variants, { attributes: initialAttributes, stock: 0 }]);
  };

  const updateVariant = (index, field, value) => {
    const updated = [...variants];
    if (field === 'stock') {
      updated[index][field] = parseInt(value) || 0;
    } else {
      updated[index].attributes[field] = value;
    }
    setVariants(updated);
  };

  const removeVariant = (index) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can only upload up to 5 images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index) => {
    const updated = [...images];
    updated.splice(index, 1);
    setImages(updated);
  };

  const generateSku = () => {
    if (!name) {
      Alert.alert('Info', 'Please enter a product name first to generate SKU');
      return;
    }
    const prefix = "RA";
    const cleanName = name.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    setSku(`${prefix}-${cleanName}-${randomPart}`);
  };

  const handleSubmit = async () => {
    // Basic Frontend Validation matching backend Zod schema
    if (!name || name.length < 2) {
      Alert.alert('Validation Error', 'Product name must be at least 2 characters');
      return;
    }
    if (!description || description.length < 10) {
      Alert.alert('Validation Error', 'Description must be at least 10 characters');
      return;
    }
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive price');
      return;
    }
    if (!stock || isNaN(stock) || parseInt(stock) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid non-negative stock count');
      return;
    }
    if (!categoryId) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (!supplierId) {
      Alert.alert('Validation Error', 'Please select a supplier');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price.toString());
      formData.append('costPrice', costPrice ? costPrice.toString() : '0');
      formData.append('stock', stock.toString());
      formData.append('categoryId', categoryId);
      formData.append('supplierId', supplierId);
      formData.append('sku', sku || generateSkuString(name));
      formData.append('isActive', 'true');
      formData.append('variants', JSON.stringify(variants));

      // Append images
      images.forEach((uri, index) => {
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('images', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename,
          type: type,
        });
      });

      console.log('Sending Product Data...');
      const response = editingProduct 
        ? await api.put(`/products/${editingProduct.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await api.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

      Alert.alert('Success', `Product ${editingProduct ? 'updated' : 'published'} successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Add Product Error:', error.response?.data || error.message);
      
      let errorMsg = 'Failed to add product';
      if (error.response?.data?.errors) {
        // Concatenate all validation errors from backend
        errorMsg = error.response.data.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }

      Alert.alert('Publication Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const generateSkuString = (n) => {
    const prefix = "RA";
    const cleanName = n.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${cleanName}-${randomPart}`;
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  let variantConfig = selectedCategory?.variantConfig;
  if (typeof variantConfig === 'string') variantConfig = JSON.parse(variantConfig);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="x" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingProduct ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveBtn}>SAVE</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Image Upload Section */}
          <Text style={styles.sectionLabel}>Product Gallery ({images.length}/5)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(index)}>
                  <Feather name="x" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImgBtn} onPress={pickImage}>
                <Feather name="camera" size={24} color="#adb5bd" />
                <Text style={styles.addImgText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Basic Details */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Premium Cotton Shirt"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>SKU Code</Text>
              <TouchableOpacity onPress={generateSku}>
                <Text style={styles.generateText}>AUTO-GENERATE</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="RA-XXXX-XXXX"
              value={sku}
              onChangeText={setSku}
            />
          </View>

          {/* Description after SKU as requested */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Product Description *</Text>
              <TouchableOpacity onPress={handleAiDescription} disabled={generatingDesc}>
                {generatingDesc ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <View style={styles.aiBtnContainer}>
                    <MaterialIcons name="auto-awesome" size={14} color="#000" />
                    <Text style={styles.generateText}>AI GENERATE</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the material, fit, and style..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.inputLabel}>Selling Price (LKR) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Cost Price (LKR)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={costPrice}
                onChangeText={setCostPrice}
              />
            </View>
          </View>

          {/* Profit Margin Indicator */}
          {price && costPrice && parseFloat(price) > 0 && (() => {
            const sell = parseFloat(price);
            const cost = parseFloat(costPrice);
            const profit = sell - cost;
            const margin = ((profit / sell) * 100).toFixed(1);
            const isPositive = profit > 0;
            const isNeutral = profit === 0;
            const marginColor = isNeutral ? '#868e96' : isPositive ? (parseFloat(margin) >= 30 ? '#2b8a3e' : '#e67700') : '#e03131';
            
            return (
              <View style={styles.marginRow}>
                <View style={styles.marginItem}>
                  <Text style={styles.marginLabel}>PROFIT</Text>
                  <Text style={[styles.marginValue, { color: marginColor }]}>
                    {isPositive ? '+' : ''}{profit.toFixed(2)} LKR
                  </Text>
                </View>
                <View style={styles.marginDivider} />
                <View style={styles.marginItem}>
                  <Text style={styles.marginLabel}>MARGIN</Text>
                  <Text style={[styles.marginValue, { color: marginColor }]}>
                    {margin}%
                  </Text>
                </View>
                <View style={styles.marginDivider} />
                <View style={styles.marginItem}>
                  <Text style={styles.marginLabel}>STATUS</Text>
                  <Text style={[styles.marginBadge, { backgroundColor: marginColor + '18', color: marginColor }]}>
                    {isNeutral ? 'BREAK-EVEN' : isPositive ? (parseFloat(margin) >= 30 ? 'HEALTHY' : 'LOW') : 'LOSS'}
                  </Text>
                </View>
              </View>
            );
          })()}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.chip, categoryId === cat.id && styles.activeChip]}
                    onPress={() => handleCategorySelect(cat.id)}
                  >
                    <Text style={[styles.chipText, categoryId === cat.id && styles.activeChipText]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          {/* Variant Selection Section */}
          {categoryId ? (
            <View style={styles.variantSection}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>Product Variants</Text>
                <TouchableOpacity onPress={addVariant}>
                  <Text style={styles.generateText}>+ ADD VARIANT</Text>
                </TouchableOpacity>
              </View>

              {variants.map((variant, vIdx) => (
                <View key={vIdx} style={styles.variantCard}>
                  <View style={styles.variantHeader}>
                    <Text style={styles.variantTitle}>Variant #{vIdx + 1}</Text>
                    <TouchableOpacity onPress={() => removeVariant(vIdx)}>
                      <Feather name="trash-2" size={16} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.attributesRow}>
                    {variantConfig?.map(cfg => {
                      const isColor = isColorAttribute(cfg.name);
                      const currentVal = variant.attributes[cfg.name];
                      
                      return (
                        <View key={cfg.name} style={[styles.attrInput, { flex: 1 }]}>
                          <Text style={styles.attrLabel}>{cfg.name}</Text>
                          <View style={styles.attrPicker}>
                            {/* Category-defined options */}
                            {cfg.options?.map(opt => {
                              if (isColor) {
                                return (
                                  <TouchableOpacity 
                                    key={opt}
                                    style={[
                                      styles.colorCircle, 
                                      { backgroundColor: opt },
                                      currentVal === opt && styles.activeColorCircle
                                    ]}
                                    onPress={() => updateVariant(vIdx, cfg.name, opt)}
                                  >
                                    {currentVal === opt && (
                                      <Feather name="check" size={12} color={opt === '#FFFFFF' || opt === 'white' ? '#000' : '#fff'} />
                                    )}
                                  </TouchableOpacity>
                                );
                              }
                              return (
                                <TouchableOpacity 
                                  key={opt}
                                  style={[styles.attrChip, currentVal === opt && styles.activeAttrChip]}
                                  onPress={() => updateVariant(vIdx, cfg.name, opt)}
                                >
                                  <Text style={[styles.attrChipText, currentVal === opt && styles.activeAttrChipText]}>{opt}</Text>
                                </TouchableOpacity>
                              );
                            })}

                            {/* Picker Icon + Custom Color Display for Color Attributes */}
                            {isColor && (
                              <View style={styles.colorPickerArea}>
                                {/* Show selected custom color as a tag */}
                                {currentVal && !cfg.options?.includes(currentVal) && (() => {
                                  const parsed = parseColorValue(currentVal);
                                  return (
                                    <View style={styles.selectedColorTag}>
                                      <View style={[styles.selectedColorSwatch, { backgroundColor: parsed.hex }]} />
                                      <Text style={styles.selectedColorName}>{parsed.name || parsed.hex}</Text>
                                    </View>
                                  );
                                })()}
                                <TouchableOpacity 
                                  style={styles.pickerIconButton}
                                  onPress={() => openColorPicker(vIdx, cfg.name, currentVal)}
                                >
                                  <Feather name="edit-3" size={18} color="#000" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attrLabel}>Stock Count</Text>
                      <TextInput
                        style={styles.miniInput}
                        keyboardType="numeric"
                        value={variant.stock.toString()}
                        onChangeText={(val) => updateVariant(vIdx, 'stock', val)}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {variants.length === 0 && (
                <View style={styles.variantEmpty}>
                  <Text style={styles.variantEmptyText}>No variants added. Using base stock.</Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Supplier *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {suppliers.map(sup => (
                  <TouchableOpacity 
                    key={sup.id} 
                    style={[styles.chip, supplierId === sup.id && styles.activeChip]}
                    onPress={() => setSupplierId(sup.id)}
                  >
                    <Text style={[styles.chipText, supplierId === sup.id && styles.activeChipText]}>{sup.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Base Stock / Total *</Text>
            <TextInput
              style={[styles.input, variants.length > 0 && styles.readOnlyInput]}
              placeholder="Total Units"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
              editable={variants.length === 0}
            />
            {variants.length > 0 && <Text style={styles.infoText}>Auto-calculated from variants</Text>}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>PUBLISH PRODUCT</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Color Picker Modal */}
      <Modal
        visible={isColorPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsColorPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.colorPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Color Atelier</Text>
              <TouchableOpacity onPress={() => setIsColorPickerVisible(false)}>
                <Feather name="x" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {showAdvancedPicker ? (
                <View style={styles.advancedPickerContainer}>
                  <Text style={styles.modalSubLabel}>COLOUR PICKER</Text>
                  
                  <View style={styles.wheelWrapper}>
                    <TouchableWithoutFeedback 
                      onPress={(evt) => {
                        const { locationX, locationY } = evt.nativeEvent;
                        const SIZE = 260;
                        const RADIUS = SIZE / 2;
                        const dx = locationX - RADIUS;
                        const dy = locationY - RADIUS;
                        
                        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        if (angle < 0) angle += 360;
                        
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= RADIUS) {
                          const saturation = Math.min(100, Math.max(0, (distance / RADIUS) * 100));
                          setTempColor(hslToHex(angle, saturation, 50));
                        }
                      }}
                    >
                      <Svg width={260} height={260} viewBox="0 0 260 260">
                        <Defs>
                          <RadialGradient id="whiteCenter" cx="50%" cy="50%" r="50%">
                            <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                          </RadialGradient>
                        </Defs>
                        {Array.from({ length: 360 }, (_, i) => {
                          const startAngle = (i * Math.PI) / 180;
                          const endAngle = ((i + 1.5) * Math.PI) / 180;
                          const r = 130;
                          const cx = 130;
                          const cy = 130;
                          const x1 = cx + r * Math.cos(startAngle);
                          const y1 = cy + r * Math.sin(startAngle);
                          const x2 = cx + r * Math.cos(endAngle);
                          const y2 = cy + r * Math.sin(endAngle);
                          return (
                            <Path
                              key={i}
                              d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
                              fill={`hsl(${i}, 100%, 50%)`}
                            />
                          );
                        })}
                        <SvgCircle cx="130" cy="130" r="130" fill="url(#whiteCenter)" />
                      </Svg>
                    </TouchableWithoutFeedback>
                    <View style={[styles.wheelPreviewCenter, { backgroundColor: tempColor }]} />
                  </View>

                  <View style={styles.wheelHexRow}>
                    <View style={[styles.wheelSelectedSwatch, { backgroundColor: tempColor }]} />
                    <Text style={styles.wheelHexText}>{tempColor.toUpperCase()}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.modalAddButton} 
                    onPress={() => setShowAdvancedPicker(false)}
                  >
                    <Text style={styles.modalAddButtonText}>USE THIS COLOR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.modalSubLabel}>PRESET TONES</Text>
                  <View style={styles.colorGrid}>
                    {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#808080', '#A52A2A', '#800080'].map(c => (
                      <TouchableOpacity 
                        key={c}
                        style={[styles.modalColorCircle, { backgroundColor: c }, tempColor === c && styles.activeModalColorCircle]}
                        onPress={() => setTempColor(c)}
                      >
                        {tempColor === c && (
                          <Feather name="check" size={16} color={c === '#FFFFFF' || c === '#FFFF00' ? '#000' : '#fff'} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.discoverySection}>
                    <Text style={styles.modalSubLabel}>NEW COLOUR DISCOVERY</Text>
                    <View style={styles.discoveryRow}>
                      <TouchableOpacity 
                        style={[styles.discoveryPreview, { backgroundColor: tempColor }]}
                        onPress={() => setShowAdvancedPicker(true)}
                      />
                      <TextInput
                        style={styles.colorNameInput}
                        value={tempColorName}
                        onChangeText={setTempColorName}
                        placeholder="COLOUR NAME (Optional)"
                        placeholderTextColor="#adb5bd"
                        autoCapitalize="characters"
                      />
                    </View>
                    
                    <View style={styles.customHexRow}>
                      <View style={styles.hexInputWrapper}>
                        <Text style={styles.hexSymbol}>#</Text>
                        <TextInput
                          style={styles.modalHexInput}
                          value={tempColor.replace('#', '')}
                          onChangeText={(val) => setTempColor('#' + val)}
                          placeholder="FFFFFF"
                          maxLength={6}
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.modalAddButton} onPress={handleColorPick}>
                    <Text style={styles.modalAddButtonText}>ADD COLOR TO VARIANT</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  saveBtn: {
    fontWeight: '900',
    fontSize: 13,
    color: '#000',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 50,
    backgroundColor: '#fafafa',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  imageScroll: {
    marginBottom: 28,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
  },
  removeImgBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#E53935',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 3,
  },
  addImgBtn: {
    width: 100,
    height: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  addImgText: {
    fontSize: 10,
    color: '#aaa',
    marginTop: 6,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  inputGroup: {
    marginBottom: 22,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  generateText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1a1a1a',
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
  aiBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantSection: {
    marginBottom: 28,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eee',
  },
  variantCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  attributesRow: {
    marginBottom: 10,
  },
  attrInput: {
    marginBottom: 8,
  },
  attrLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#adb5bd',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  attrPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attrChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  activeAttrChip: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  attrChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  activeAttrChipText: {
    color: '#fff',
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeColorCircle: {
    borderColor: '#000',
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  customColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  colorHexInput: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
    width: 70,
  },
  colorPreview: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  miniInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#eee',
  },
  variantEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  variantEmptyText: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
  },
  readOnlyInput: {
    backgroundColor: '#e9ecef',
    color: '#6c757d',
  },
  infoText: {
    fontSize: 10,
    color: '#ff9800',
    marginTop: 5,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  marginItem: {
    flex: 1,
    alignItems: 'center',
  },
  marginLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#adb5bd',
    letterSpacing: 1,
    marginBottom: 4,
  },
  marginValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  marginDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e9ecef',
  },
  marginBadge: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  activeChip: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  activeChipText: {
    color: '#fff',
  },
  submitBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  colorPickerModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  modalBody: {
    padding: 20,
  },
  modalSubLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#adb5bd',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
    justifyContent: 'center',
  },
  modalColorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeModalColorCircle: {
    borderColor: '#000',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  customHexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  hexInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hexSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#adb5bd',
    marginRight: 4,
  },
  modalHexInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  modalColorPreview: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  modalAddButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAddButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  colorPickerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  selectedColorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    gap: 8,
  },
  selectedColorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColorName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pickerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  discoverySection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 20,
    marginBottom: 20,
  },
  discoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  discoveryPreview: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  colorNameInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  advancedPickerContainer: {
    width: '100%',
    height: 420,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wheelWrapper: {
    width: 260,
    height: 260,
    borderRadius: 130,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 15,
    overflow: 'hidden',
  },
  wheelHexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignSelf: 'center',
  },
  wheelSelectedSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  wheelHexText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#333',
  },
  wheelPreviewCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    pointerEvents: 'none',
  },
  backToSimpleBtn: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  backToSimpleText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }
});

export default AddProductScreen;

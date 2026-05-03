import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import api from '../../api/api';

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

const WORLD_COLORS = (() => {
  const colors = [];
  [0, 20, 40, 60, 80, 100].forEach(l => colors.push(hslToHex(0, 0, l)));
  [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].forEach(h => {
    [30, 50, 70, 90].forEach(l => {
      colors.push(hslToHex(h, 100, l));
    });
  });
  return colors;
})();

const { width } = Dimensions.get('window');

const AddCategoryScreen = ({ navigation, route }) => {
  const editingCategory = route.params?.category;
  const [name, setName] = useState(editingCategory?.name || '');
  const [description, setDescription] = useState(editingCategory?.description || '');
  const [image, setImage] = useState(editingCategory?.imageUrl || null);
  const [variantConfig, setVariantConfig] = useState(
    editingCategory?.variantConfig 
      ? (typeof editingCategory.variantConfig === 'string' ? JSON.parse(editingCategory.variantConfig) : editingCategory.variantConfig)
      : []
  ); 
  const [loading, setLoading] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Color Picker State
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [activeAttrIndex, setActiveAttrIndex] = useState(null);
  const [tempColor, setTempColor] = useState('#000000');
  const [tempColorName, setTempColorName] = useState('');
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);

  const isColorAttribute = (attrName) => {
    const n = (attrName || '').toLowerCase().trim();
    return n === 'color' || n === 'colour';
  };

  const handleAiDescription = async () => {
    if (!name || name.trim().length < 2) {
      Alert.alert('Info', 'Please enter a category name first to generate a description.');
      return;
    }

    setGeneratingDesc(true);
    try {
      const response = await api.get(`/ai/generate-category-description?name=${encodeURIComponent(name.trim())}`);
      if (response.data?.success && response.data?.data?.description) {
        setDescription(response.data.data.description);
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error) {
      console.error('AI Generation Error:', error);
      Alert.alert('AI Unavailable', 'Could not generate description. Please ensure GROQ_API_KEY is configured.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const addAttribute = () => {
    setVariantConfig([...variantConfig, { name: '', options: [] }]);
  };

  const removeAttribute = (index) => {
    const newConfig = [...variantConfig];
    newConfig.splice(index, 1);
    setVariantConfig(newConfig);
  };

  const updateAttributeName = (index, val) => {
    const newConfig = [...variantConfig];
    newConfig[index].name = val;

    const normalizedName = val.toLowerCase().trim();
    if ((normalizedName === "size" || normalizedName === "sizes") && newConfig[index].options.length === 0) {
      newConfig[index].options = ["S", "M", "L", "XL", "XXL"];
    } else if ((normalizedName === "sex" || normalizedName === "gender") && newConfig[index].options.length === 0) {
      newConfig[index].options = ["Men", "Women", "Unisex"];
    }

    setVariantConfig(newConfig);
  };

  const addOption = (attrIndex) => {
    const newConfig = [...variantConfig];
    const attrName = newConfig[attrIndex].name;
    
    if (!attrName) {
      Alert.alert('Error', 'Please enter attribute name first (e.g. Size)');
      return;
    }

    if (isColorAttribute(attrName)) {
      setActiveAttrIndex(attrIndex);
      setTempColor('#000000');
      setTempColorName('');
      setShowAdvancedPicker(false);
      setIsColorPickerVisible(true);
    } else {
      newConfig[attrIndex].options.push('');
      setVariantConfig(newConfig);
    }
  };

  const handleColorPick = () => {
    if (activeAttrIndex !== null) {
      const newConfig = [...variantConfig];
      const cName = tempColorName.trim();
      const valueToSave = cName ? `${cName}|${tempColor}` : tempColor;
      
      if (!newConfig[activeAttrIndex].options.includes(valueToSave)) {
        newConfig[activeAttrIndex].options.push(valueToSave);
        setVariantConfig(newConfig);
      }
    }
    setIsColorPickerVisible(false);
  };

  const updateOption = (attrIndex, optIndex, val) => {
    const newConfig = [...variantConfig];
    newConfig[attrIndex].options[optIndex] = val;
    setVariantConfig(newConfig);
  };

  const removeOption = (attrIndex, optIndex) => {
    const newConfig = [...variantConfig];
    newConfig[attrIndex].options.splice(optIndex, 1);
    setVariantConfig(newConfig);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    const filteredConfig = variantConfig
      .filter(attr => attr.name.trim() !== '')
      .map(attr => ({
        name: attr.name.trim(),
        options: attr.options.filter(opt => opt.trim() !== '')
      }));

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('variantConfig', JSON.stringify(filteredConfig));
      formData.append('isActive', 'true');

      if (image) {
        const uriParts = image.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: image,
          name: `category_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      Alert.alert('Success', `Category ${editingCategory ? 'updated' : 'created'} successfully`);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>{editingCategory ? 'EDIT CATEGORY' : 'CREATE CATEGORY'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveBtn}>SAVE</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageSection}>
            <Text style={styles.inputLabel}>Category Image</Text>
            <TouchableOpacity 
              style={styles.imagePicker} 
              onPress={pickImage}
            >
              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <View style={styles.imageOverlay}>
                    <Feather name="edit-2" size={20} color="#fff" />
                  </View>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Feather name="image" size={32} color="#adb5bd" />
                  <Text style={styles.imagePlaceholderText}>TAP TO UPLOAD</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Footwear, Apparel"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Description</Text>
              <TouchableOpacity 
                style={styles.aiBtn} 
                onPress={handleAiDescription}
                disabled={generatingDesc}
              >
                {generatingDesc ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={14} color="#6366f1" />
                    <Text style={styles.aiBtnText}>AI GENERATE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief description of this category..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.variantSection}>
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>Variant Configuration</Text>
              <TouchableOpacity onPress={addAttribute} style={styles.addAttrBtn}>
                <Feather name="plus" size={14} color="#000" />
                <Text style={styles.addAttrBtnText}>ADD ATTRIBUTE</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDesc}>Define what options (like Size, Color) products in this category can have.</Text>

            {variantConfig.map((attr, attrIdx) => (
              <View key={attrIdx} style={styles.attrCard}>
                <View style={styles.attrHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>ATTRIBUTE NAME</Text>
                    <TextInput
                      style={styles.attrNameInput}
                      placeholder="e.g. Size, Material"
                      value={attr.name}
                      onChangeText={(val) => updateAttributeName(attrIdx, val)}
                    />
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteAttrBtn}
                    onPress={() => removeAttribute(attrIdx)}
                  >
                    <Feather name="trash-2" size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsArea}>
                  <Text style={styles.miniLabel}>OPTIONS</Text>
                  <View style={styles.optionsGrid}>
                    {attr.options.map((opt, optIndex) => {
                      const isColor = isColorAttribute(attr.name);
                      let colorHex = '#ddd';
                      let displayName = opt;
                      
                      if (isColor) {
                        if (opt.includes('|')) {
                          [displayName, colorHex] = opt.split('|');
                        } else if (opt.startsWith('#')) {
                          colorHex = opt;
                          displayName = opt;
                        }
                      }

                      return (
                        <View key={optIndex} style={styles.optionItem}>
                          {isColor ? (
                            <View style={styles.colorOptionRow}>
                              <View style={[styles.colorSwatch, { backgroundColor: colorHex }]} />
                              <Text style={styles.optionItemText} numberOfLines={1}>{displayName}</Text>
                            </View>
                          ) : (
                            <TextInput
                              style={styles.optionInput}
                              placeholder="Option"
                              value={opt}
                              onChangeText={(val) => updateOption(attrIdx, optIndex, val)}
                              autoFocus={opt === ''}
                            />
                          )}
                          <TouchableOpacity onPress={() => removeOption(attrIdx, optIndex)}>
                            <Feather name="x" size={14} color="#adb5bd" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    <TouchableOpacity 
                      style={styles.addOptionChip}
                      onPress={() => addOption(attrIdx)}
                    >
                      <Feather name="plus" size={14} color="#666" />
                      <Text style={styles.addOptionChipText}>ADD {isColorAttribute(attr.name) ? 'COLOR' : ''}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {variantConfig.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="layers-clear" size={40} color="#eee" />
                <Text style={styles.emptyStateText}>No variants defined yet.</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.disabledBtn]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>CREATE CATEGORY</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isColorPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsColorPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.colorPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showAdvancedPicker ? 'COLOR SPECTRUM' : 'SELECT COLOR'}</Text>
              <TouchableOpacity onPress={() => setIsColorPickerVisible(false)}>
                <Feather name="x" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {showAdvancedPicker ? (
                <View style={styles.advancedPickerContainer}>
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
                    <Text style={styles.modalAddButtonText}>ADD COLOR TO CATEGORY</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
  },
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  imageSection: {
    marginBottom: 25,
    alignItems: 'center',
  },
  imagePicker: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#adb5bd',
    marginTop: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  variantSection: {
    marginTop: 10,
    marginBottom: 30,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDesc: {
    fontSize: 11,
    color: '#888',
    marginBottom: 20,
  },
  addAttrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addAttrBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  aiBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  attrCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  attrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
    paddingBottom: 15,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#adb5bd',
    letterSpacing: 1,
    marginBottom: 6,
  },
  attrNameInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    padding: 0,
  },
  deleteAttrBtn: {
    padding: 5,
  },
  optionsArea: {},
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 5,
  },
  optionInput: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    minWidth: 40,
    padding: 0,
  },
  addOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    gap: 4,
  },
  addOptionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 12,
    color: '#adb5bd',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
  colorOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  optionItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    maxWidth: 60,
  },
});

export default AddCategoryScreen;

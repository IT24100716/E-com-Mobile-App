import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const CreateReturnScreen = ({ route, navigation }) => {
  const { order } = route.params;
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleItemSelection = (item) => {
    const isSelected = selectedItems.find(i => i.productId === item.productId);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => i.productId !== item.productId));
    } else {
      setSelectedItems([...selectedItems, {
        productId: item.productId,
        quantity: item.quantity,
        variantAttributes: item.variantAttributes
      }]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item to return');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the return');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('orderId', order.id);
      formData.append('reason', reason);
      formData.append('items', JSON.stringify(selectedItems));

      if (image) {
        const uriParts = image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: image.uri,
          name: `return_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      await api.post('/returns', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Return request submitted successfully. We will review it shortly.', [
        { text: 'OK', onPress: () => navigation.popToTop() }
      ]);
    } catch (error) {
      console.error('Return submission error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    return `https://e-com-mobile-app-production.up.railway.app${mainImage.startsWith('/') ? '' : '/'}${mainImage}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>REQUEST RETURN</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>SELECT ITEMS TO RETURN</Text>
        {order.items?.map((item) => {
          const isSelected = selectedItems.find(i => i.productId === item.productId);
          return (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.itemCard, isSelected && styles.itemCardSelected]}
              onPress={() => toggleItemSelection(item)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: getImageUrl(item.product) }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product?.name}</Text>
                <Text style={styles.itemMeta}>QTY: {item.quantity} • {item.variantAttributes?.size || 'Standard'}</Text>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Feather name="check" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionLabel}>REASON FOR RETURN</Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="Please describe why you are returning these items..."
          multiline
          numberOfLines={4}
          value={reason}
          onChangeText={setReason}
          textAlignVertical="top"
        />

        <Text style={styles.sectionLabel}>ADD PHOTO EVIDENCE (OPTIONAL)</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.pickedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="camera" size={32} color="#ccc" />
              <Text style={styles.imagePlaceholderText}>Upload Proof</Text>
            </View>
          )}
          {image && (
            <TouchableOpacity style={styles.removeImage} onPress={() => setImage(null)}>
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>SUBMIT REQUEST</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  backButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 15,
    marginTop: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemCardSelected: {
    borderColor: '#000',
    backgroundColor: '#F8F9FA',
  },
  itemImage: {
    width: 50,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    fontSize: 13,
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkboxActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    height: 120,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 20,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 30,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ccc',
    letterSpacing: 1,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#000',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default CreateReturnScreen;

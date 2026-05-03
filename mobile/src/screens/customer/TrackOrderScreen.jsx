import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

const STEPS = [
  { key: 'pending', label: 'Placed', icon: 'clock' },
  { key: 'confirmed', label: 'Confirmed', icon: 'check-circle' },
  { key: 'shipped', label: 'On the Way', icon: 'local-shipping' },
  { key: 'delivered', label: 'Delivered', icon: 'home' },
];

const TrackOrderScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    address: '',
    contactNumber: '',
    contactEmail: '',
    deliveryMethod: ''
  });

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    productId: '',
    rating: 5,
    comment: '',
    image: null
  });
  const [reviewingProduct, setReviewingProduct] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    return `http://192.168.8.134:5001${mainImage.startsWith('/') ? '' : '/'}${mainImage}`;
  };

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateShipping = async () => {
    if (!editForm.address || editForm.address.length < 10) {
      Alert.alert('Error', 'Address must be at least 10 characters');
      return;
    }
    if (!/^\d{10}$/.test(editForm.contactNumber)) {
      Alert.alert('Error', 'Contact number must be 10 digits');
      return;
    }

    setEditLoading(true);
    try {
      await api.put(`/orders/${orderId}`, editForm);
      Alert.alert('Success', 'Shipping details updated successfully. Note: You cannot edit these details again.');
      setIsEditModalOpen(false);
      fetchOrder();
    } catch (error) {
      console.error('Update shipping error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update shipping details');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = () => {
    setEditForm({
      address: order.address,
      contactNumber: order.contactNumber,
      contactEmail: order.contactEmail,
      deliveryMethod: order.deliveryMethod
    });
    setIsEditModalOpen(true);
  };

  const handlePickReviewImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to upload review images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setReviewForm({ ...reviewForm, image: result.assets[0] });
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewForm.comment || reviewForm.comment.length < 5) {
      Alert.alert('Error', 'Please write at least a short comment.');
      return;
    }

    setReviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('productId', reviewForm.productId);
      formData.append('orderId', orderId);
      formData.append('rating', reviewForm.rating.toString());
      formData.append('comment', reviewForm.comment);
      formData.append('userId', order.userId); // Backend service needs this or it's inferred from auth

      if (reviewForm.image) {
        const uriParts = reviewForm.image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('image', {
          uri: reviewForm.image.uri,
          name: `review_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      if (reviewForm.id) {
        // Update existing review
        await api.put(`/reviews/${reviewForm.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Success', 'Review updated successfully');
      } else {
        // Create new review
        await api.post('/reviews', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Success', 'Review submitted successfully');
      }

      setIsReviewModalOpen(false);
      fetchOrder();
    } catch (error) {
      console.error('Submit review error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const openReviewModal = (product) => {
    const existingReview = order?.reviews?.find(r => r.productId === product.id);
    if (existingReview?.reply) {
      Alert.alert('Feedback Locked', 'A manager has already replied to your feedback. It can no longer be edited.');
      return;
    }
    if (existingReview) {
      setReviewForm({
        id: existingReview.id,
        productId: product.id,
        rating: existingReview.rating,
        comment: existingReview.comment,
        image: existingReview.imageUrl ? { uri: existingReview.imageUrl } : null
      });
    } else {
      setReviewForm({
        id: null,
        productId: product.id,
        rating: 5,
        comment: '',
        image: null
      });
    }
    setReviewingProduct(product);
    setIsReviewModalOpen(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.delete(`/orders/${orderId}/cancel`);
              Alert.alert('Success', 'Order cancelled successfully');
              fetchOrder();
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel order');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatPrice = (price) => {
    return `LKR ${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStepIndex = (status) => {
    if (status === 'cancelled') return -1;
    const idx = STEPS.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentIdx = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>TRACK ORDER</Text>
          <Text style={styles.headerSub}>#{orderId.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {order.method === 'return_replacement' && (
          <View style={[styles.cancelledBanner, { backgroundColor: '#FFF9EB', borderColor: '#FFECC0' }]}>
            <MaterialIcons name="cached" size={32} color="#FF9500" />
            <Text style={[styles.cancelledText, { color: '#FF9500' }]}>FREE REPLACEMENT ORDER</Text>
            <Text style={[styles.headerSub, { textAlign: 'center', marginTop: 5 }]}>
              Sent as part of your return request
            </Text>
          </View>
        )}

        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <MaterialIcons name="cancel" size={32} color="#FF3B30" />
            <Text style={styles.cancelledText}>THIS ORDER WAS CANCELLED</Text>
          </View>
        ) : (
          <View style={styles.progressCard}>
            <View style={styles.stepsContainer}>
              {STEPS.map((step, index) => {
                const isActive = index <= currentIdx;
                const isCurrent = index === currentIdx;

                return (
                  <View key={step.key} style={styles.stepItem}>
                    <View style={styles.iconContainer}>
                      {index > 0 && (
                        <View style={[styles.connector, isActive && styles.connectorActive]} />
                      )}
                      <View style={[styles.iconCircle, isActive && styles.iconCircleActive, isCurrent && styles.iconCircleCurrent]}>
                        {isActive && !isCurrent ? (
                          <Feather name="check" size={14} color="#fff" />
                        ) : (
                          step.icon === 'local-shipping' || step.icon === 'home' ? (
                            <MaterialIcons name={step.icon} size={16} color={isActive ? "#fff" : "#ccc"} />
                          ) : (
                            <Feather name={step.icon} size={16} color={isActive ? "#fff" : "#ccc"} />
                          )
                        )}
                      </View>
                    </View>
                    <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="package" size={16} color="#000" />
            <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
          </View>
          {order.items?.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Image
                source={{ uri: getImageUrl(item.product) }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || 'Product'}</Text>
                <Text style={styles.itemMeta}>QTY: {item.quantity} • {item.variantAttributes?.size || 'Standard'}</Text>
                {order.status === 'delivered' && (
                  <TouchableOpacity
                    style={[
                      styles.writeReviewSmall,
                      (() => {
                        const r = order.reviews?.find(rev => rev.productId === item.product.id);
                        return r?.reply ? { backgroundColor: '#F0F7FF', borderColor: '#007AFF' } : null;
                      })()
                    ]}
                    onPress={() => openReviewModal(item.product)}
                  >
                    {(() => {
                      const r = order.reviews?.find(rev => rev.productId === item.product.id);
                      if (r?.reply) return <Feather name="check-circle" size={12} color="#007AFF" />;
                      return <Ionicons name="star" size={12} color="#FF9500" />;
                    })()}
                    <Text style={[
                      styles.writeReviewText,
                      (() => {
                        const r = order.reviews?.find(rev => rev.productId === item.product.id);
                        return r?.reply ? { color: '#007AFF' } : null;
                      })()
                    ]}>
                      {(() => {
                        const r = order.reviews?.find(rev => rev.productId === item.product.id);
                        if (!r) return 'WRITE REVIEW';
                        if (r.reply) return 'REPLIED';
                        return 'EDIT REVIEW';
                      })()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}

          {order.reviews && order.reviews.length > 0 && (
            <View style={styles.orderReviewsSection}>
              <Text style={styles.reviewsTitle}>YOUR FEEDBACK</Text>
              {order.reviews.map(review => (
                <View key={review.id} style={styles.reviewSummaryCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewProductNameMini}>{order.items?.find(i => i.productId === review.productId)?.product?.name}</Text>
                    <View style={styles.starsRowMini}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= review.rating ? "star" : "star-outline"}
                          size={10}
                          color="#FF9500"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewCommentText}>{review.comment}</Text>
                  {review.imageUrl && (
                    <Image source={{ uri: review.imageUrl }} style={styles.reviewThumbnail} />
                  )}

                  {review.reply && (
                    <View style={styles.managerReplyBox}>
                      <View style={styles.replyHeader}>
                        <Feather name="corner-down-right" size={12} color="#007AFF" />
                        <Text style={styles.replyTitle}>MANAGER RESPONSE</Text>
                      </View>
                      <Text style={styles.replyText}>{review.reply}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatPrice(order.total - (order.shippingFee || 0))}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryValue}>{formatPrice(order.shippingFee || 0)}</Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10 }]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(order.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={16} color="#000" />
            <Text style={styles.sectionTitle}>DELIVERY DETAILS</Text>
          </View>
          <View style={styles.deliveryContent}>
            <Text style={styles.deliveryAddress}>{order.address}</Text>
            <View style={styles.deliveryMeta}>
              <View style={styles.metaRow}>
                <Feather name="phone" size={12} color="#999" />
                <Text style={styles.metaText}>{order.contactNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="mail" size={12} color="#999" />
                <Text style={styles.metaText}>{order.contactEmail}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="truck" size={12} color="#999" />
                <Text style={styles.metaText}>{order.deliveryMethod?.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {order.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelOrder}
            >
              <Feather name="x-circle" size={18} color="#FF3B30" />
              <Text style={styles.cancelButtonText}>CANCEL ORDER</Text>
            </TouchableOpacity>
          )}
          {order.status === 'delivered' && (!order.returns || order.returns.length === 0) && (
            <TouchableOpacity
              style={styles.returnButton}
              onPress={() => navigation.navigate('CreateReturn', { order })}
            >
              <Feather name="rotate-ccw" size={18} color="#000" />
              <Text style={styles.returnButtonText}>REQUEST RETURN</Text>
            </TouchableOpacity>
          )}

          {order.status === 'pending' && !order.isUpdatedByUser && (
            <TouchableOpacity
              style={[styles.returnButton, { borderColor: '#007AFF', backgroundColor: '#F0F7FF' }]}
              onPress={openEditModal}
            >
              <Feather name="edit-2" size={18} color="#007AFF" />
              <Text style={[styles.returnButtonText, { color: '#007AFF' }]}>EDIT SHIPPING DETAILS</Text>
            </TouchableOpacity>
          )}

          {order.returns && order.returns.length > 0 && (
            <View style={styles.returnBanner}>
              <View style={styles.returnBannerContent}>
                <Feather name="rotate-ccw" size={20} color="#FF9500" />
                <View>
                  <Text style={styles.returnBannerTitle}>RETURN IN PROGRESS</Text>
                  <Text style={styles.returnBannerSub}>Status: {order.returns[0].status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Edit Shipping Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT SHIPPING DETAILS</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.warningBox}>
                <Feather name="alert-circle" size={16} color="#FF9500" />
                <Text style={styles.warningText}>
                  Note: Shipping details can only be updated ONCE while the order is pending.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Delivery Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  value={editForm.address}
                  onChangeText={(val) => setEditForm({ ...editForm, address: val })}
                  placeholder="Enter full address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={editForm.contactNumber}
                  onChangeText={(val) => setEditForm({ ...editForm, contactNumber: val })}
                  placeholder="07XXXXXXXX"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  value={editForm.contactEmail}
                  onChangeText={(val) => setEditForm({ ...editForm, contactEmail: val })}
                  placeholder="email@example.com"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, editLoading && styles.disabledButton]}
                onPress={handleUpdateShipping}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>UPDATE DETAILS</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={isReviewModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsReviewModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>WRITE A REVIEW</Text>
              <TouchableOpacity onPress={() => setIsReviewModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.reviewProductHeader}>
                <Image
                  source={{ uri: getImageUrl(reviewingProduct) }}
                  style={styles.reviewProductImage}
                />
                <Text style={styles.reviewProductName}>{reviewingProduct?.name}</Text>
              </View>

              <Text style={styles.inputLabel}>Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewForm({ ...reviewForm, rating: star })}
                  >
                    <Ionicons
                      name={star <= reviewForm.rating ? "star" : "star-outline"}
                      size={32}
                      color="#FF9500"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Experience</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  value={reviewForm.comment}
                  onChangeText={(val) => setReviewForm({ ...reviewForm, comment: val })}
                  placeholder="Tell others what you think about this product..."
                />
              </View>

              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickReviewImage}>
                <Feather name="camera" size={20} color="#000" />
                <Text style={styles.uploadBtnText}>
                  {reviewForm.image ? 'CHANGE PHOTO' : 'ADD PHOTO'}
                </Text>
              </TouchableOpacity>
              {reviewForm.image && (
                <Image source={{ uri: reviewForm.image.uri }} style={styles.proofPreview} />
              )}

              <TouchableOpacity
                style={[styles.saveButton, reviewLoading && styles.disabledButton]}
                onPress={handleSubmitReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>SUBMIT REVIEW</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    marginTop: 2,
  },
  backButton: {
    padding: 5,
  },
  refreshButton: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  cancelledBanner: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF3B30',
    marginTop: 10,
    letterSpacing: 1,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 40,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconCircleActive: {
    backgroundColor: '#000',
  },
  iconCircleCurrent: {
    backgroundColor: '#000',
    transform: [{ scale: 1.2 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  connector: {
    position: 'absolute',
    right: '50%',
    top: 20,
    height: 2,
    width: width * 0.22,
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  connectorActive: {
    backgroundColor: '#000',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ccc',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: '#000',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemImage: {
    width: 40,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
  },
  itemMeta: {
    fontSize: 9,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
  },
  summaryContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    textTransform: 'uppercase',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  deliveryContent: {
    gap: 15,
  },
  deliveryAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
  },
  deliveryMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF3B30',
    marginBottom: 10,
  },
  backLink: {
    fontSize: 12,
    fontWeight: '900',
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  actionContainer: {
    marginTop: 10,
    gap: 15,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    gap: 10,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 1,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  returnButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  returnBanner: {
    backgroundColor: '#FFF9EB',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FFECC0',
  },
  returnBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  returnBannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF9500',
    letterSpacing: 1,
  },
  returnBannerSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    minHeight: width * 1.2,
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalBody: {
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9EB',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFECC0',
  },
  warningText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '700',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#999',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#eee',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  writeReviewSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#FFF9EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFECC0',
  },
  writeReviewText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF9500',
    letterSpacing: 0.5,
  },
  reviewProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 25,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
  },
  reviewProductImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  reviewProductName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
    justifyContent: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  uploadBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  proofPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  orderReviewsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  reviewsTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 10,
  },
  reviewSummaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewProductNameMini: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    flex: 1,
  },
  starsRowMini: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCommentText: {
    fontSize: 12,
    color: '#444',
    lineHeight: 16,
  },
  reviewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#eee',
  },
  managerReplyBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  replyTitle: {
    fontSize: 8,
    fontWeight: '900',
    color: '#007AFF',
    letterSpacing: 0.5,
  },
  replyText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
});

export default TrackOrderScreen;

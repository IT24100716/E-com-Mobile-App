import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Modal, Pressable } from 'react-native';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const STATUS_STEPS = [
  { label: 'PENDING', value: 'pending', icon: 'clock' },
  { label: 'CONFIRMED', value: 'confirmed', icon: 'check-circle' },
  { label: 'ON THE WAY', value: 'shipped', icon: 'truck' },
  { label: 'DELIVERED', value: 'delivered', icon: 'package' },
  { label: 'CANCELLED', value: 'cancelled', icon: 'x-circle' },
];

const AdminOrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data?.data || response.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrder({ ...order, status: newStatus });
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update status error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update status';
      Alert.alert('Error', errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const getImageUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500';
    if (url.startsWith('http')) return url;
    return `https://e-com-mobile-app-production.up.railway.app${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.value === order?.status);
  const sFee = order?.shippingFee ?? (order?.deliveryMethod === "express_delivery" ? 500 : (order?.deliveryMethod === "pickup" ? 0 : 350));
  const subtotal = order?.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
  
  const couponDiscount = order?.orderDiscount?.couponDiscount || 0;
  const pointsDiscount = order?.orderDiscount?.pointsValue || 0;
  
  const settlementTotal = Math.max(0, subtotal + sFee - couponDiscount - pointsDiscount);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>ORDER DETAILS</Text>
          <Text style={styles.headerSub}>#{orderId.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={fetchOrderDetail}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status Tracker */}
        <View style={styles.sectionCard}>
          <View style={styles.trackerContainer}>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <React.Fragment key={step.value}>
                  <View style={styles.stepItem}>
                    <View style={[
                      styles.stepIcon, 
                      isCompleted && styles.stepIconCompleted,
                      isCurrent && styles.stepIconCurrent
                    ]}>
                      <Feather 
                        name={step.icon} 
                        size={14} 
                        color={isCurrent ? '#000' : (isCompleted ? '#fff' : '#999')} 
                      />
                    </View>
                    <Text style={[
                      styles.stepLabel, 
                      (isCompleted || isCurrent) && styles.stepLabelCompleted,
                      isCurrent && { fontWeight: '900' }
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View style={[styles.stepLine, index < currentStepIndex && styles.stepLineCompleted]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.primaryAction, { backgroundColor: '#000' }]}
            onPress={() => setIsStatusModalOpen(true)}
            disabled={updating}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionText}>UPDATE ORDER STATUS</Text>
              <Feather name="chevron-down" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Selection Modal */}
        <Modal
          visible={isStatusModalOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsStatusModalOpen(false)}
        >
          <View style={styles.pickerModalContainer}>
            <Pressable 
              style={styles.pickerModalOverlay} 
              onPress={() => setIsStatusModalOpen(false)} 
            />
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Update Status</Text>
                <TouchableOpacity onPress={() => setIsStatusModalOpen(false)}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.pickerOptions}>
                {STATUS_STEPS.map((step) => (
                  <TouchableOpacity
                    key={step.value}
                    style={[
                      styles.pickerOption,
                      order?.status === step.value && styles.pickerOptionActive
                    ]}
                    onPress={() => {
                      setIsStatusModalOpen(false);
                      setTimeout(() => handleUpdateStatus(step.value), 100);
                    }}
                  >
                    <View style={styles.optionLeft}>
                      <Feather name={step.icon} size={20} color={order?.status === step.value ? '#000' : '#666'} />
                      <Text style={[
                        styles.pickerOptionLabel,
                        order?.status === step.value && styles.pickerOptionLabelActive
                      ]}>
                        {step.label}
                      </Text>
                    </View>
                    {order?.status === step.value && (
                      <Feather name="check" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Customer Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>
          <View style={styles.infoRow}>
            <Feather name="user" size={16} color="#999" />
            <Text style={styles.infoText}>{order?.user?.name || 'Guest Customer'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.infoRow} 
            onPress={() => Linking.openURL(`mailto:${order?.contactEmail || order?.user?.email}`)}
          >
            <Feather name="mail" size={16} color="#999" />
            <Text style={[styles.infoText, { color: '#007AFF' }]}>{order?.contactEmail || order?.user?.email || 'N/A'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${order?.contactNumber || order?.user?.phone}`)}
          >
            <Feather name="phone" size={16} color="#999" />
            <Text style={[styles.infoText, { color: '#007AFF' }]}>{order?.contactNumber || order?.user?.phone || 'N/A'}</Text>
          </TouchableOpacity>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color="#999" />
            <Text style={styles.infoText}>{order?.address || 'N/A'}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PROCURED ITEMS</Text>
          {order?.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Image source={{ uri: getImageUrl(item.product?.images?.[0] || item.product?.imageUrl) }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || 'Product'}</Text>
                <Text style={styles.itemVariant}>
                  {item.variantAttributes ? Object.entries(item.variantAttributes).map(([k,v]) => `${k}: ${v}`).join(' · ') : 'Standard'}
                </Text>
                <Text style={styles.itemPrice}>LKR {item.price?.toLocaleString()} x {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>LKR {(item.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ITEMS SUBTOTAL</Text>
            <Text style={styles.summaryValue}>LKR {subtotal.toLocaleString()}</Text>
          </View>

          {order?.orderDiscount?.couponDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#34C759' }]}>COUPON DISCOUNT ({order.orderDiscount.couponCode || 'PROMO'})</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>-LKR {order.orderDiscount.couponDiscount.toLocaleString()}</Text>
            </View>
          )}

          {order?.orderDiscount?.pointsUsed > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#FF9500' }]}>LOYALTY REDEEMED ({order.orderDiscount.pointsUsed} PTS)</Text>
              <Text style={[styles.summaryValue, { color: '#FF9500' }]}>-LKR {order.orderDiscount.pointsValue.toLocaleString()}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>DELIVERY FEE ({order?.deliveryMethod?.replace('_', ' ') || 'STANDARD'})</Text>
            <Text style={styles.summaryValue}>LKR {sFee.toLocaleString()}</Text>
          </View>
          
          <View style={[styles.summaryRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 }]}>
            <Text style={styles.totalLabel}>SETTLEMENT TOTAL</Text>
            <Text style={styles.totalValue}>LKR {settlementTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>FINANCIAL SETTLEMENT</Text>
            <View style={[styles.statusBadgeSmall, { backgroundColor: order?.payment?.status === 'paid' ? '#34C75920' : '#FFB00020' }]}>
              <Text style={[styles.statusTextSmall, { color: order?.payment?.status === 'paid' ? '#34C759' : '#FFB000' }]}>
                {order?.payment?.status?.toUpperCase() || 'UNPAID'}
              </Text>
            </View>
          </View>
          <View style={styles.paymentBox}>
            <Feather name="credit-card" size={20} color="#000" />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentText}>{order?.method?.replace('_', ' ').toUpperCase() || 'N/A'}</Text>
              <Text style={styles.paymentSubText}>Electronic Remittance</Text>
            </View>
          </View>
          {order?.payment?.paymentProof && (
             <TouchableOpacity 
               style={styles.proofContainer}
               onPress={() => Linking.openURL(getImageUrl(order.payment.paymentProof))}
             >
               <Image source={{ uri: getImageUrl(order.payment.paymentProof) }} style={styles.proofPreview} />
               <View style={styles.proofOverlay}>
                 <Feather name="eye" size={20} color="#fff" />
                 <Text style={styles.proofText}>VIEW PROOF</Text>
               </View>
             </TouchableOpacity>
          )}
        </View>
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
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  headerSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerAction: {
    padding: 8,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  trackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIconCompleted: {
    backgroundColor: '#000',
  },
  stepIconCurrent: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#999',
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#000',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#F5F5F5',
    marginTop: -18,
  },
  stepLineCompleted: {
    backgroundColor: '#000',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  primaryAction: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Picker Modal Styles
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 25,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  pickerOptions: {
    gap: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#eee',
  },
  pickerOptionActive: {
    backgroundColor: '#fff',
    borderColor: '#000',
    borderWidth: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  pickerOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  pickerOptionLabelActive: {
    color: '#000',
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  itemVariant: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '700',
    maxWidth: '70%',
  },
  summaryValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '700',
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
  paymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
  },
  paymentSubText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  proofContainer: {
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  proofPreview: {
    width: '100%',
    height: '100%',
  },
  proofOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  proofText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextSmall: {
    fontSize: 8,
    fontWeight: '900',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default AdminOrderDetailScreen;

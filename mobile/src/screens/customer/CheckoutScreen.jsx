import React, { useState, useEffect } from 'react';
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
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const CheckoutScreen = ({ navigation }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    phone: '0772345678',
    email: 'nomal@user.com',
    address: '',
    deliveryMethod: 'standard_delivery',
    paymentMethod: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    proofImage: null,
  });
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [pointsDiscount, setPointsDiscount] = useState(0);
  
  // Coupon State
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponInput, setCouponInput] = useState('');
  const [isCouponModalVisible, setIsCouponModalVisible] = useState(false);
  const [evaluatingCoupon, setEvaluatingCoupon] = useState(false);

  const getShippingFee = (method) => {
    if (method === 'express_delivery') return 500;
    if (method === 'standard_delivery') return 350;
    return 0;
  };
  
  const shippingFee = getShippingFee(formData.deliveryMethod);
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const finalTotal = total + shippingFee - pointsDiscount - couponDiscount;

  useEffect(() => {
    fetchCart();
    fetchUserProfile();
    fetchLoyaltyBalance();
    fetchAvailableCoupons();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      const user = response.data?.data?.user || response.data?.user;
      if (user) {
        setFormData(prev => ({
          ...prev,
          email: user.email || prev.email,
          phone: user.phone || prev.phone,
        }));
      }
    } catch (error) {
      console.error('Fetch Profile Error:', error);
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      const response = await api.get('/coupons/available');
      setAvailableCoupons(response.data?.data?.coupons || response.data?.coupons || []);
    } catch (error) {
      console.error('Fetch Coupons Error:', error);
    }
  };

  const handleApplyCoupon = async (code) => {
    const targetCode = code || couponInput;
    if (!targetCode) return;

    setEvaluatingCoupon(true);
    try {
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const response = await api.post('/coupons/evaluate', {
        couponCode: targetCode,
        items: orderItems,
        total: total
      });

      setAppliedCoupon(response.data.data);
      setCouponInput('');
      setIsCouponModalVisible(false);
      Alert.alert('Success', `Coupon "${targetCode}" applied!`);
    } catch (error) {
      console.error('Apply Coupon Error:', error);
      Alert.alert('Coupon Error', error.response?.data?.message || 'Invalid coupon code');
    } finally {
      setEvaluatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };


  useEffect(() => {
    const pts = parseInt(redeemPoints);
    if (!isNaN(pts) && pts > 0 && pts <= loyaltyBalance) {
      setPointsDiscount(pts);
    } else {
      setPointsDiscount(0);
    }
  }, [redeemPoints, loyaltyBalance]);

  const fetchLoyaltyBalance = async () => {
    try {
      const response = await api.get('/loyalty');
      // API returns { success: true, data: { balance: 100 } }
      const balance = response.data?.data?.balance ?? response.data?.balance ?? 0;
      setLoyaltyBalance(balance);
    } catch (error) {
      console.error('Fetch Loyalty Error:', error);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      const items = response.data?.data?.items || response.data?.items || [];
      if (items.length === 0) {
        Alert.alert('Empty Cart', 'Your cart is empty. Redirecting back...', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        return;
      }
      setCartItems(items);
      setCartItems(items);
      const sum = items.reduce((acc, item) => acc + (Number(item.product.price) * item.quantity), 0);
      setTotal(sum);
    } catch (error) {
      console.error('Fetch Cart Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load order summary. Please try again.', [
        { text: 'Go Back', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload the slip.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        setFormData({ ...formData, proofImage: result.assets[0] });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const formatPrice = (price) => {
    return `LKR ${Number(price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    return `https://e-com-mobile-app-production.up.railway.app${mainImage.startsWith('/') ? '' : '/'}${mainImage}`;
  };

  const parseColor = (val) => {
    if (!val) return { name: '', hex: '#eee' };
    if (typeof val !== 'string') return { name: String(val), hex: '#eee' };
    if (val.includes('|')) {
      const [name, hex] = val.split('|');
      return { name: name.startsWith('#') ? '' : name, hex: hex.startsWith('#') ? hex : `#${hex}` };
    }
    if (val.startsWith('#')) return { name: '', hex: val };
    return { name: val, hex: '#888' };
  };



  const handleCheckout = async () => {
    // 1. Auto-apply points if they are in the input but not yet "applied"
    let finalPointsUsed = pointsDiscount;
    const inputPts = parseInt(redeemPoints);
    if (!isNaN(inputPts) && inputPts > 0) {
      if (inputPts <= loyaltyBalance) {
        finalPointsUsed = inputPts;
      } else {
        return Alert.alert('Insufficient Points', `You only have ${loyaltyBalance} points available.`);
      }
    }

    // Basic validtion
    if (!formData.address || formData.address.length < 10) {
      return Alert.alert('Validation Error', 'Please enter a valid address (min 10 characters).');
    }
    if (!formData.phone || formData.phone.length !== 10) {
      return Alert.alert('Validation Error', 'Please enter a valid 10-digit phone number.');
    }
    
    // Payment validation
    if (formData.paymentMethod === 'card') {
      if (formData.cardNumber.length < 19) return Alert.alert('Validation Error', 'Please enter a valid 16-digit card number.');
      if (formData.expiryDate.length < 7) return Alert.alert('Validation Error', 'Please enter a valid expiry date (MM / YY).');
      if (formData.cvv.length < 3) return Alert.alert('Validation Error', 'Please enter a valid 3-digit CVV.');
    } else if (formData.paymentMethod === 'bank_deposit') {
      if (!formData.proofImage) return Alert.alert('Validation Error', 'Please upload your deposit slip image.');
    }

    setLoading(true);

    try {
      // 1. Create Order
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
        variantAttributes: item.variantAttributes
      }));

      const orderData = {
        items: orderItems,
        total: total,
        shippingFee: shippingFee,
        address: formData.address,
        contactNumber: formData.phone,
        contactEmail: formData.email,
        deliveryMethod: formData.deliveryMethod,
        pointsUsed: finalPointsUsed,
        couponCode: appliedCoupon?.couponCode || ""
      };

      const orderRes = await api.post('/orders', orderData);
      const orderId = orderRes.data.data.id;

      // 2. Process Payment
      const settlementAmount = (total + shippingFee - finalPointsUsed - couponDiscount);
      
      if (formData.paymentMethod === 'bank_deposit') {
        const paymentPayload = new FormData();
        paymentPayload.append('orderId', orderId);
        paymentPayload.append('amount', settlementAmount.toString());
        paymentPayload.append('method', formData.paymentMethod);
        paymentPayload.append('status', 'pending');
        
        const uriParts = formData.proofImage.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        paymentPayload.append('proofImage', {
          uri: formData.proofImage.uri,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        });

        await api.post('/payments', paymentPayload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const paymentPayload = {
          orderId: orderId,
          amount: settlementAmount,
          method: formData.paymentMethod,
          status: formData.paymentMethod === 'card' ? 'paid' : 'pending',
        };
        await api.post('/payments', paymentPayload);
      }

      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'VIEW ORDERS', onPress: () => navigation.navigate('Orders') },
        { text: 'CONTINUE SHOPPING', onPress: () => navigation.navigate('Home') }
      ]);

    } catch (error) {
      console.error('Checkout Error:', error.response?.data || error);
      Alert.alert('Checkout Failed', error.response?.data?.message || 'Something went wrong while placing your order.');
    } finally {
      setLoading(false);
    }
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHECKOUT</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Left Side Equivalent: Forms */}
        <View style={styles.formContainer}>
          
          {/* 01 SHIPPING */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>01</Text>
            </View>
            <Text style={styles.sectionTitle}>SHIPPING</Text>
          </View>

          <View style={styles.whiteCard}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.inputLabel}>PHONE</Text>
                <TextInput 
                  style={styles.input} 
                  value={formData.phone} 
                  keyboardType="numeric"
                  maxLength={10}
                  onChangeText={(t) => {
                    const numbersOnly = t.replace(/\D/g, '');
                    setFormData({...formData, phone: numbersOnly});
                  }}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>EMAIL</Text>
                <TextInput 
                  style={styles.input} 
                  value={formData.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(t) => setFormData({...formData, email: t})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADDRESS <Text style={styles.inputHint}>[min 10 characters]</Text></Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                multiline 
                placeholder="House number, street name, city..."
                value={formData.address}
                onChangeText={(t) => setFormData({...formData, address: t})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DELIVERY METHOD</Text>
              <View style={styles.paymentOptions}>
                {[
                  { id: 'standard_delivery', label: 'STANDARD', desc: 'LKR 350' },
                  { id: 'express_delivery', label: 'EXPRESS', desc: 'LKR 500' },
                  { id: 'pickup', label: 'PICKUP', desc: 'FREE' }
                ].map((opt) => (
                  <TouchableOpacity 
                    key={opt.id}
                    style={[styles.paymentBtn, formData.deliveryMethod === opt.id && styles.activePaymentBtn, { padding: 10 }]}
                    onPress={() => setFormData({...formData, deliveryMethod: opt.id})}
                  >
                    <Text style={[styles.paymentBtnText, {fontSize: 11, marginBottom: 4}, formData.deliveryMethod === opt.id && styles.activePaymentBtnText]}>{opt.label}</Text>
                    <Text style={[{fontSize: 9, color: '#999', fontWeight: 'bold'}, formData.deliveryMethod === opt.id && {color: '#ccc'}]}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 02 PAYMENT METHOD */}
          <View style={[styles.sectionHeader, { marginTop: 30 }]}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>02</Text>
            </View>
            <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
          </View>

          <View style={styles.whiteCard}>
            <View style={styles.paymentOptions}>
              {[
                { id: 'card', icon: 'credit-card', label: 'CARD' },
                { id: 'bank_deposit', icon: 'account-balance', label: 'BANK' },
                { id: 'cash_on_delivery', icon: 'payments', label: 'CASH' }
              ].map((opt) => (
                <TouchableOpacity 
                  key={opt.id}
                  style={[styles.paymentBtn, formData.paymentMethod === opt.id && styles.activePaymentBtn]}
                  onPress={() => setFormData({...formData, paymentMethod: opt.id})}
                >
                  <MaterialIcons name={opt.icon} size={24} color={formData.paymentMethod === opt.id ? '#fff' : '#adb5bd'} />
                  <Text style={[styles.paymentBtnText, formData.paymentMethod === opt.id && styles.activePaymentBtnText]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dynamic Payment Forms */}
            <View style={styles.dynamicPaymentContainer}>
              {formData.paymentMethod === 'card' && (
                <View style={styles.cardForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CARD NUMBER</Text>
                    <TextInput 
                      style={[styles.input, styles.monoInput]} 
                      placeholder="0000 0000 0000 0000"
                      keyboardType="numeric"
                      value={formData.cardNumber}
                      maxLength={19}
                      onChangeText={(t) => {
                        const formatted = t.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setFormData({...formData, cardNumber: formatted});
                      }}
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                      <Text style={styles.inputLabel}>EXPIRY</Text>
                      <TextInput 
                        style={[styles.input, styles.monoInput, { textAlign: 'center' }]} 
                        placeholder="MM / YY"
                        keyboardType="numeric"
                        maxLength={7}
                        value={formData.expiryDate}
                        onChangeText={(t) => {
                          let v = t.replace(/\D/g, '');
                          if (v.length >= 2) v = v.slice(0, 2) + ' / ' + v.slice(2, 4);
                          setFormData({...formData, expiryDate: v});
                        }}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput 
                        style={[styles.input, styles.monoInput, { textAlign: 'center' }]} 
                        placeholder="•••"
                        keyboardType="numeric"
                        secureTextEntry
                        maxLength={3}
                        value={formData.cvv}
                        onChangeText={(t) => setFormData({...formData, cvv: t.replace(/\D/g, '')})}
                      />
                    </View>
                  </View>
                </View>
              )}

              {formData.paymentMethod === 'bank_deposit' && (
                <View style={styles.bankForm}>
                  <View style={styles.bankDetailsBox}>
                    <Text style={styles.bankDetailRow}><Text style={styles.bankDetailLabel}>Bank:</Text> Rich Apparel Trust Bank</Text>
                    <Text style={styles.bankDetailRow}><Text style={styles.bankDetailLabel}>A/C:</Text> 0123 4567 8910</Text>
                  </View>
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                    <Feather name="upload-cloud" size={20} color="#000" />
                    <Text style={styles.uploadBtnText}>
                      {formData.proofImage ? 'CHANGE DEPOSIT SLIP' : 'UPLOAD DEPOSIT SLIP'}
                    </Text>
                  </TouchableOpacity>
                  {formData.proofImage && (
                    <Image source={{ uri: formData.proofImage.uri }} style={styles.proofPreview} />
                  )}
                </View>
              )}

              {formData.paymentMethod === 'cash_on_delivery' && (
                <View style={styles.codForm}>
                  <View style={styles.codIconCircle}>
                    <MaterialIcons name="payments" size={30} color="#000" />
                  </View>
                  <Text style={styles.codText}>Pay the full amount upon delivery at your doorstep.</Text>
                </View>
              )}
            </View>
            <View style={styles.secureFooter}>
              <Feather name="lock" size={14} color="#adb5bd" />
              <Text style={styles.secureText}>ENCRYPTED 256-BIT SECURE TRANSACTION</Text>
            </View>
          </View>
        </View>

        {/* Right Side Equivalent: Summary (Black Card) */}
        <View style={styles.summaryContainer}>
          <View style={styles.blackCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>SUMMARY</Text>
              <View style={styles.unitBadge}>
                <Text style={styles.unitBadgeText}>{cartItems.length} UNIT</Text>
              </View>
            </View>

            {cartItems.map((item) => {
              const colorData = parseColor(item.variantAttributes?.colour || item.variantAttributes?.color);
              return (
                <View key={item.id} style={styles.summaryItem}>
                  <Image source={{ uri: getImageUrl(item.product) }} style={styles.itemThumb} />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.product.name.toUpperCase()}</Text>
                    
                    <View style={styles.variantRow}>
                      {item.variantAttributes?.size ? (
                        <Text style={styles.itemSub}>{item.variantAttributes.size} | </Text>
                      ) : null}
                      {colorData.hex !== '#eee' && (
                        <View style={[styles.miniColorCircle, { backgroundColor: colorData.hex }]} />
                      )}
                      {colorData.name ? (
                        <Text style={styles.itemSub}> {colorData.name}</Text>
                      ) : null}
                    </View>

                    <Text style={styles.itemSub}>QTY {item.quantity}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.product.price)}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.loyaltySection}>
              <View style={styles.loyaltyHeader}>
                <MaterialIcons name="local-offer" size={16} color="#fff" />
                <Text style={styles.loyaltyTitle}>COUPONS & OFFERS</Text>
              </View>

              {!appliedCoupon ? (
                <View style={styles.pointsRow}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.pointsInputWrapper, { width: '100%' }]}>
                      <View style={[styles.pointsDot, { backgroundColor: '#FFD700' }]} />
                      <TextInput 
                        style={styles.pointsValueInput}
                        placeholder="Enter coupon code"
                        placeholderTextColor="#444"
                        value={couponInput}
                        onChangeText={setCouponInput}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleApplyCoupon()}
                    disabled={evaluatingCoupon || !couponInput}
                    style={{ marginLeft: 10, justifyContent: 'center', height: 40, marginTop: 10 }}
                  >
                    {evaluatingCoupon ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.useMaxText, { color: '#FFD700' }]}>APPLY</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.appliedCouponCard}>
                  <View style={styles.couponInfo}>
                    <Feather name="check-circle" size={16} color="#4caf50" />
                    <Text style={styles.appliedCouponText}>{appliedCoupon.couponCode}</Text>
                  </View>
                  <TouchableOpacity onPress={removeCoupon}>
                    <Feather name="x-circle" size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              )}

              {availableCoupons.length > 0 && !appliedCoupon && (
                <TouchableOpacity 
                  style={styles.showAvailableBtn}
                  onPress={() => setIsCouponModalVisible(true)}
                >
                  <Text style={styles.showAvailableText}>VIEW AVAILABLE OFFERS ({availableCoupons.length})</Text>
                  <Feather name="chevron-right" size={14} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.loyaltySection}>
              <View style={styles.loyaltyHeader}>
                <MaterialIcons name="verified-user" size={16} color="#fff" />
                <Text style={styles.loyaltyTitle}>REWARDS & LOYALTY</Text>
              </View>

              <View style={styles.pointsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointsLabel}>AVAILABLE BALANCE: {loyaltyBalance} PTS</Text>
                  <View style={[styles.pointsInputWrapper, { width: '100%' }]}>
                    <View style={styles.pointsDot} />
                    <TextInput 
                      style={styles.pointsValueInput}
                      placeholder="Enter points"
                      placeholderTextColor="#444"
                      keyboardType="numeric"
                      value={redeemPoints}
                      onChangeText={setRedeemPoints}
                    />
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setRedeemPoints(loyaltyBalance.toString());
                  }}
                  style={{ marginLeft: 15, justifyContent: 'center', height: 40, marginTop: 25 }}
                >
                  <Text style={styles.useMaxText}>USE ALL</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.rowLabel}>SUBTOTAL</Text>
              <Text style={styles.rowValue}>{formatPrice(total)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.rowLabel}>DELIVERY</Text>
              <Text style={styles.rowValue}>{shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}</Text>
            </View>
            {couponDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.rowLabel, { color: '#FFD700' }]}>COUPON DISCOUNT ({appliedCoupon?.couponCode})</Text>
                <Text style={[styles.rowValue, { color: '#FFD700' }]}>- {formatPrice(couponDiscount)}</Text>
              </View>
            )}
            {pointsDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.rowLabel, { color: '#4caf50' }]}>LOYALTY DISCOUNT</Text>
                <Text style={[styles.rowValue, { color: '#4caf50' }]}>- {formatPrice(pointsDiscount)}</Text>
              </View>
            )}

            <View style={styles.totalContainer}>
              <Text style={styles.totalLarge}>{formatPrice(finalTotal)}</Text>
              <TouchableOpacity 
                style={styles.placeOrderBtn}
                onPress={handleCheckout}
              >
                <Text style={styles.placeOrderText}>PLACE ORDER</Text>
                <Feather name="chevron-right" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Available Coupons Modal */}
        <Modal
          visible={isCouponModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsCouponModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.couponModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>AVAILABLE OFFERS</Text>
                <TouchableOpacity onPress={() => setIsCouponModalVisible(false)}>
                  <Feather name="x" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.couponList}>
                {availableCoupons.map((coupon) => (
                  <TouchableOpacity 
                    key={coupon.id} 
                    style={styles.couponCard}
                    onPress={() => handleApplyCoupon(coupon.code)}
                  >
                    <View style={styles.couponCardHeader}>
                      <View style={styles.couponBadge}>
                        <Text style={styles.couponBadgeText}>{coupon.code}</Text>
                      </View>
                      <Text style={styles.discountValue}>
                        {coupon.discountType === 'percentage' ? `${coupon.discount}% OFF` : `LKR ${coupon.discount} OFF`}
                      </Text>
                    </View>
                    <Text style={styles.couponCondition}>Min. order: LKR {coupon.minCartValue}</Text>
                    <View style={styles.applyHint}>
                      <Text style={styles.applyHintText}>Tap to apply</Text>
                      <Feather name="arrow-right" size={12} color="#999" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f4f4' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  scrollContent: { paddingBottom: 120 },
  formContainer: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  sectionBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  sectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  whiteCard: { backgroundColor: '#fff', borderRadius: 24, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#000', marginBottom: 10, letterSpacing: 0.5 },
  inputHint: { color: '#adb5bd', fontWeight: 'normal' },
  input: { backgroundColor: '#f9f9f9', height: 55, borderRadius: 12, paddingHorizontal: 15, fontSize: 14, fontWeight: '600', color: '#000', borderWidth: 1, borderColor: '#eee' },
  textArea: { height: 100, paddingTop: 15, textAlignVertical: 'top' },
  pickerContainer: { height: 55, backgroundColor: '#f9f9f9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderWidth: 1, borderColor: '#eee' },
  pickerText: { fontSize: 14, fontWeight: '600', color: '#000' },
  paymentOptions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  paymentBtn: { flex: 1, height: 80, borderRadius: 16, backgroundColor: '#f9f9f9', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#eee' },
  activePaymentBtn: { backgroundColor: '#000', borderColor: '#000' },
  paymentBtnText: { fontSize: 11, fontWeight: '900', color: '#adb5bd' },
  activePaymentBtnText: { color: '#fff' },
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  secureText: { fontSize: 9, color: '#adb5bd', fontWeight: '800' },
  
  summaryContainer: { padding: 20 },
  blackCard: { backgroundColor: '#000', borderRadius: 32, padding: 30 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  summaryTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  unitBadge: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  unitBadgeText: { fontSize: 9, fontWeight: '900' },
  summaryItem: { flexDirection: 'row', marginBottom: 20, gap: 15 },
  itemThumb: { width: 60, height: 75, borderRadius: 12, backgroundColor: '#222' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemTitle: { color: '#fff', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniColorCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
    borderWidth: 0.5,
    borderColor: '#333',
  },
  itemSub: { color: '#666', fontSize: 10, fontWeight: '800' },
  itemPrice: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 4 },
  
  loyaltySection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 25 },
  loyaltyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  loyaltyTitle: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  promoRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  promoInput: { flex: 1, height: 45, backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 15, color: '#fff', fontSize: 11, fontWeight: '700' },
  applyBtn: { backgroundColor: '#fff', paddingHorizontal: 15, borderRadius: 10, justifyContent: 'center' },
  applyBtnText: { fontSize: 9, fontWeight: '900' },
  couponGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 25 },
  couponChip: { borderHorizontal: 1, borderWidth: 1, borderColor: '#333', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  couponText: { color: '#666', fontSize: 8, fontWeight: '900' },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pointsLabel: { color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 10 },
  pointsInputWrapper: { width: 100, height: 40, backgroundColor: '#111', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  pointsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  pointsValueInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '900', padding: 0 },
  applyPointsBtn: { backgroundColor: '#fff', paddingHorizontal: 12, height: 40, borderRadius: 10, justifyContent: 'center', marginLeft: 10 },
  applyPointsText: { color: '#000', fontSize: 10, fontWeight: '900' },
  useMaxText: { color: '#666', fontSize: 10, fontWeight: '900' },
  
  summaryDivider: { height: 1, backgroundColor: '#222', marginVertical: 25 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel: { color: '#666', fontSize: 11, fontWeight: '900' },
  rowValue: { color: '#fff', fontSize: 12, fontWeight: '900' },
  totalContainer: { marginTop: 20, alignItems: 'center' },
  totalLarge: { color: '#fff', fontSize: 42, fontWeight: '900', marginBottom: 20 },
  placeOrderBtn: { backgroundColor: '#fff', height: 60, borderRadius: 30, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeOrderText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  
  dynamicPaymentContainer: { marginTop: 20 },
  monoInput: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 2 },
  cardForm: { gap: 15 },
  bankForm: { gap: 15 },
  bankDetailsBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  bankDetailRow: { fontSize: 12, marginBottom: 5, color: '#333' },
  bankDetailLabel: { fontWeight: '800', color: '#999', textTransform: 'uppercase' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f3f5', padding: 15, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: '#dee2e6', borderStyle: 'dashed' },
  uploadBtnText: { fontSize: 11, fontWeight: '800', color: '#000', letterSpacing: 1 },
  proofPreview: { width: '100%', height: 120, borderRadius: 12, marginTop: 10 },
  codForm: { alignItems: 'center', padding: 20 },
  codIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  codText: { fontSize: 11, fontWeight: '700', color: '#666', textAlign: 'center', letterSpacing: 1, lineHeight: 18 },

  // New Coupon Styles
  appliedCouponCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#111', 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#4caf50'
  },
  couponInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appliedCouponText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  showAvailableBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 15, 
    paddingVertical: 10 
  },
  showAvailableText: { color: '#999', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'flex-end' 
  },
  couponModalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 25, 
    maxHeight: '70%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 25 
  },
  modalTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  couponList: { marginBottom: 20 },
  couponCard: { 
    backgroundColor: '#f8f9fa', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee'
  },
  couponCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  couponBadge: { 
    backgroundColor: '#000', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  couponBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  discountValue: { fontSize: 16, fontWeight: '900', color: '#000' },
  couponCondition: { fontSize: 11, color: '#666', fontWeight: '600' },
  applyHint: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-end', 
    marginTop: 10, 
    gap: 5 
  },
  applyHintText: { fontSize: 10, fontWeight: '800', color: '#999' }
});

export default CheckoutScreen;

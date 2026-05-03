import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const CustomerCouponsScreen = ({ navigation }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons/available');
      setCoupons(response.data?.data?.coupons || response.data?.coupons || []);
    } catch (error) {
      console.error('Fetch available coupons error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCoupons();
  };

  const handleShowDetails = (coupon) => {
    setSelectedCoupon(coupon);
    setIsDetailModalOpen(true);
  };

  const renderCouponItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.couponCard}
      onPress={() => handleShowDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconCircle}>
          <Feather name="tag" size={24} color="#000" />
        </View>
      </View>
      
      <View style={styles.cardMain}>
        <Text style={styles.discountText}>
          {item.discountType === 'percentage' ? `${item.discount}% OFF` : `LKR ${item.discount} OFF`}
        </Text>
        <Text style={styles.codeText}>Code: {item.code}</Text>
        <Text style={styles.minSpendText}>Min Spend: LKR {item.minCartValue}</Text>
      </View>

      <TouchableOpacity 
        style={styles.copyBtn}
        onPress={() => {
          alert('Coupon Code Copied!');
        }}
      >
        <Feather name="copy" size={18} color="#000" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>COUPONS</Text>
        <Text style={styles.headerSub}>Exclusive offers for you</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          renderItem={renderCouponItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="tag" size={60} color="#eee" />
              <Text style={styles.emptyTitle}>NO OFFERS YET</Text>
              <Text style={styles.emptySub}>Check back later for exclusive deals</Text>
            </View>
          }
        />
      )}

      {/* Coupon Detail Modal */}
      <Modal
        visible={isDetailModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDetailModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>COUPON DETAILS</Text>
              <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedCoupon && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailTicket}>
                  <View style={styles.ticketTop}>
                    <Text style={styles.ticketDiscount}>
                      {selectedCoupon.discountType === 'percentage' ? `${selectedCoupon.discount}%` : `LKR ${selectedCoupon.discount}`}
                    </Text>
                    <Text style={styles.ticketOff}>OFF YOUR ORDER</Text>
                  </View>
                  
                  <View style={styles.tearLine}>
                    <View style={styles.tearCircleLeft} />
                    <View style={styles.dashLine} />
                    <View style={styles.tearCircleRight} />
                  </View>

                  <View style={styles.ticketBottom}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>COUPON CODE</Text>
                      <View style={styles.detailCodeBox}>
                        <Text style={styles.detailCodeText}>{selectedCoupon.code}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>MINIMUM PURCHASE</Text>
                      <Text style={styles.detailValue}>LKR {selectedCoupon.minCartValue}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>VALID FOR</Text>
                      <Text style={styles.detailValue}>
                        {selectedCoupon.targetType === 'all' ? 'All Products' : 'Specific Items'}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.applyBtn}
                      onPress={() => setIsDetailModalOpen(false)}
                    >
                      <Text style={styles.applyBtnText}>USE NOW</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.termsContainer}>
                  <Text style={styles.termsTitle}>TERMS & CONDITIONS</Text>
                  <Text style={styles.termsText}>• This coupon can only be used once per customer.</Text>
                  <Text style={styles.termsText}>• Valid for orders above LKR {selectedCoupon.minCartValue}.</Text>
                  {selectedCoupon.targetType !== 'all' && (
                    <Text style={styles.termsText}>• Applicable only to selected items in your rewards list.</Text>
                  )}
                  <Text style={styles.termsText}>• Cannot be combined with other offers.</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    // Elevation for Android
    elevation: 2,
  },
  cardLeft: {
    marginRight: 15,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  discountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  codeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 2,
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  minSpendText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  copyBtn: {
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginTop: 20,
  },
  emptySub: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontWeight: '600',
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
    minHeight: '60%',
    maxHeight: '90%',
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
  },
  detailTicket: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  ticketTop: {
    backgroundColor: '#000',
    padding: 30,
    alignItems: 'center',
  },
  ticketDiscount: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  ticketOff: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 5,
    opacity: 0.8,
  },
  tearLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 30,
    marginVertical: -15,
    zIndex: 10,
  },
  tearCircleLeft: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    marginLeft: -15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dashLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    marginHorizontal: 10,
  },
  tearCircleRight: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    marginRight: -15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  ticketBottom: {
    padding: 25,
    paddingTop: 35,
  },
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  detailCodeBox: {
    backgroundColor: '#F8F9FD',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#000',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailCodeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 3,
  },
  applyBtn: {
    backgroundColor: '#000',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  termsContainer: {
    paddingBottom: 40,
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
    marginBottom: 15,
  },
  termsText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 18,
    marginBottom: 5,
  }

});

export default CustomerCouponsScreen;

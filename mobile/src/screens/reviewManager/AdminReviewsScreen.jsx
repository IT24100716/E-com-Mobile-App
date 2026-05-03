import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const AdminReviewsScreen = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchReviews = async (pageNum = 0, isRefresh = false) => {
    if (pageNum > 0) setLoadingMore(true);
    try {
      const response = await api.get(`/reviews?skip=${pageNum * 10}&take=10`);
      const newReviews = response.data?.data?.reviews || response.data?.reviews || [];
      
      if (isRefresh) {
        setReviews(newReviews);
        setPage(0);
        setHasMore(newReviews.length === 10);
      } else {
        setReviews(prev => {
          const combined = [...prev, ...newReviews];
          // Deduplicate by ID
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
          );
          return unique;
        });
        setHasMore(newReviews.length === 10);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReviews(0);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews(0, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && !searchTerm) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReviews(nextPage);
    }
  };

  const handleReplyReview = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply message.');
      return;
    }

    setReplyLoading(true);
    try {
      const response = await api.patch(`/reviews/${replyingReview.id}/reply`, { reply: replyText });
      const updatedReview = response.data?.data || response.data;
      
      setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
      Alert.alert('Success', 'Reply submitted successfully');
      setIsReplyModalOpen(false);
      setReplyText('');
    } catch (error) {
      console.error('Reply review error:', error);
      Alert.alert('Error', 'Failed to submit reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const openReplyModal = (review) => {
    setReplyingReview(review);
    setReplyText(review.reply || '');
    setIsReplyModalOpen(true);
  };

  const filteredReviews = reviews.filter(review => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (review.user?.name && review.user.name.toLowerCase().includes(searchLower)) ||
      (review.product?.name && review.product.name.toLowerCase().includes(searchLower)) ||
      (review.comment && review.comment.toLowerCase().includes(searchLower))
    );
  });

  const getImageUrl = (product) => {
    const images = product?.images || [];
    const mainImage = images[0] || product?.imageUrl;
    if (!mainImage) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60';
    if (typeof mainImage === 'string' && mainImage.startsWith('http')) return mainImage;
    return `http://192.168.8.134:5001${mainImage.startsWith('/') ? '' : '/'}${mainImage}`;
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.user?.name || 'C').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.userName}>{item.user?.name || 'Customer'}</Text>
              {item.orderId && (
                <View style={styles.orderIdBadge}>
                  <Text style={styles.orderIdText}>#{item.orderId.slice(-6).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewDate}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date(parseInt(item.id.substring(0, 8), 16) * 1000).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.replyButton}
          onPress={() => openReplyModal(item)}
        >
          <Feather name="message-circle" size={18} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Image source={{ uri: getImageUrl(item.product) }} style={styles.productThumbSmall} />
        <Text style={styles.productName}>{item.product?.name || 'Deleted Product'}</Text>
      </View>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons 
            key={star} 
            name={star <= item.rating ? "star" : "star-outline"} 
            size={16} 
            color="#FFB000" 
            style={{ marginRight: 2 }}
          />
        ))}
        <Text style={styles.ratingText}>{item.rating}.0</Text>
      </View>

      <Text style={styles.commentText}>{item.comment}</Text>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.reviewImage} resizeMode="cover" />
      )}

      {item.reply && (
        <View style={styles.replyBox}>
          <View style={styles.replyHeader}>
            <Feather name="corner-down-right" size={12} color="#007AFF" />
            <Text style={styles.replyTitle}>MANAGER RESPONSE</Text>
          </View>
          <Text style={styles.replyText}>{item.reply}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>PRODUCT REVIEWS</Text>
          <Text style={styles.headerSub}>Customer feedback management</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={onRefresh}>
          <Feather name="refresh-cw" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Sidebar Modal */}
      <Modal
        visible={isSidebarOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsSidebarOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsSidebarOpen(false)}
          />
          <View style={styles.sidebarContent}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarLogo}>RICH APPAREL</Text>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarItems}>
              <SidebarItem
                icon="grid"
                label="Dashboard"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('ReviewManagerDashboard'), 100);
                }}
              />
              <SidebarItem
                icon="message-square"
                label="Product Reviews"
                active
                onPress={() => setIsSidebarOpen(false)}
              />
              <SidebarItem
                icon="rotate-ccw"
                label="Return Requests"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminReturns'), 100);
                }}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.sidebarFooter}
              onPress={() => {
                setIsSidebarOpen(false);
                navigation.replace('Login');
              }}
            >
              <Feather name="log-out" size={18} color="#ff4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, product, or keyword..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#000" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={64} color="#eee" />
              <Text style={styles.emptyText}>No reviews found matching your search.</Text>
            </View>
          }
        />
      )}

      {/* Reply Modal */}
      <Modal
        visible={isReplyModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsReplyModalOpen(false)}
      >
        <View style={styles.replyModalOverlay}>
          <View style={styles.replyModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>REPLY TO REVIEW</Text>
              <TouchableOpacity onPress={() => setIsReplyModalOpen(false)}>
                <Feather name="x" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <View style={styles.originalReviewPreview}>
                <Text style={styles.originalReviewUser}>{replyingReview?.user?.name}</Text>
                <Text style={styles.originalReviewComment} numberOfLines={2}>"{replyingReview?.comment}"</Text>
              </View>

              <Text style={styles.inputLabel}>Your Response</Text>
              <TextInput
                style={[styles.replyInput, styles.textArea]}
                multiline
                numberOfLines={4}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write your response to the customer..."
              />

              <TouchableOpacity 
                style={[styles.submitReplyBtn, replyLoading && { opacity: 0.7 }]}
                onPress={handleReplyReview}
                disabled={replyLoading}
              >
                {replyLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitReplyBtnText}>SUBMIT RESPONSE</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const SidebarItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.sidebarItem, active && styles.sidebarItemActive]}
    onPress={onPress}
  >
    <Feather name={icon} size={20} color={active ? '#000' : '#666'} />
    <Text style={[styles.sidebarItemLabel, active && styles.sidebarItemLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

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
  menuButton: {
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
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
  },
  headerAction: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    height: 45,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  reviewDate: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    marginTop: 2,
  },
  replyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  productThumbSmall: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#eee',
  },
  productName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  orderIdBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 0.5,
    borderColor: '#007AFF',
  },
  orderIdText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#007AFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFB000',
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginTop: 15,
  },
  replyBox: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  replyTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#007AFF',
    letterSpacing: 1,
  },
  replyText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    fontWeight: '500',
  },
  replyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  replyModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '60%',
  },
  originalReviewPreview: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  originalReviewUser: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  originalReviewComment: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  replyInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  submitReplyBtn: {
    backgroundColor: '#000',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitReplyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Sidebar Styles
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContent: {
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#fff',
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarLogo: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  sidebarItems: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginBottom: 5,
  },
  sidebarItemActive: {
    backgroundColor: '#f5f5f5',
  },
  sidebarItemLabel: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  sidebarItemLabelActive: {
    color: '#000',
    fontWeight: '800',
  },
  sidebarFooter: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#ff4444',
  },
});

export default AdminReviewsScreen;

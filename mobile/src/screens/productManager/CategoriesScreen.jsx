import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const CategoriesScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/categories?skip=0&take=1000');
      const data = response.data?.data?.categories || response.data?.categories || response.data?.data || response.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category? This will affect products linked to it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${id}`);
              setCategories(categories.filter(c => c.id !== id));
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (category) => {
    navigation.navigate('AddCategory', { category });
  };

  const filteredCategories = categories.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80';
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith('http')) return cleanUrl;
    return `https://e-com-mobile-app-production.up.railway.app${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  const renderCategoryItem = ({ item }) => (
    <View style={styles.categoryCard}>
      <Image
        source={{ uri: getImageUrl(item.imageUrl) }}
        style={styles.categoryImage}
      />
      <View style={styles.categoryInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#e8f5e9' : '#f1f3f5' }]}>
            <Text style={[styles.statusText, { color: item.isActive ? '#4caf50' : '#868e96' }]}>
              {item.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>
        <Text style={styles.categoryDesc} numberOfLines={2}>
          {item.description || 'No description provided'}
        </Text>

        {item.variantConfig && (
          <View style={styles.variantContainer}>
            <Text style={styles.variantLabel}>VARIANTS:</Text>
            <View style={styles.variantChips}>
              {(() => {
                try {
                  const config = typeof item.variantConfig === 'string'
                    ? JSON.parse(item.variantConfig)
                    : (item.variantConfig || []);
                  return Array.isArray(config) ? config.map((v, idx) => (
                    <View key={idx} style={styles.variantChip}>
                      <Text style={styles.variantChipText}>{v.name}</Text>
                    </View>
                  )) : null;
                } catch (e) {
                  return null;
                }
              })()}
            </View>
          </View>
        )}
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
          <Feather name="edit-2" size={18} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
          <Feather name="trash-2" size={18} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
                  setTimeout(() => navigation.navigate('ProductManagerDashboard'), 100);
                }}
              />
              <SidebarItem
                icon="package"
                label="Products"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('Products'), 100);
                }}
              />
              <SidebarItem
                icon="layers"
                label="Categories"
                active
                onPress={() => setIsSidebarOpen(false)}
              />
              <SidebarItem
                icon="rotate-ccw"
                label="Replacements"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('AdminReplacements'), 100);
                }}
              />
              <SidebarItem
                icon="truck"
                label="Restock"
                onPress={() => {
                  setIsSidebarOpen(false);
                  setTimeout(() => navigation.navigate('RestockRequests'), 100);
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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PRODUCT CATEGORIES</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Feather name="x" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="layers" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No categories found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCategory')}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>
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
    backgroundColor: '#f8f9fa',
  },
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebarContent: {
    width: width * 0.75,
    backgroundColor: '#fff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  sidebarHeader: {
    padding: 25,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  sidebarLogo: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#000',
  },
  sidebarItems: {
    flex: 1,
    padding: 15,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
  },
  sidebarItemActive: {
    backgroundColor: '#f1f3f5',
  },
  sidebarItemLabel: {
    marginLeft: 15,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sidebarItemLabelActive: {
    color: '#000',
    fontWeight: '700',
  },
  sidebarFooter: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#ff4444',
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    flexDirection: 'row',
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    marginRight: 15,
  },
  categoryInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  categoryDesc: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 18,
  },
  variantContainer: {
    marginTop: 5,
  },
  variantLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#adb5bd',
    letterSpacing: 1,
    marginBottom: 5,
  },
  variantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  variantChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#495057',
  },
  actionColumn: {
    justifyContent: 'space-between',
    paddingLeft: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f3f5',
    marginLeft: 10,
  },
  actionButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#adb5bd',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  }
});

export default CategoriesScreen;

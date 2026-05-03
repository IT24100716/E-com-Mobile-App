import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../../api/api';
import ProductCard from '../../components/ProductCard';

const { width } = Dimensions.get('window');

const CategoryProductsScreen = ({ route, navigation }) => {
  const { categoryType } = route.params; // 'Women', 'Men', 'Sporty', 'All'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilteredProducts();
  }, [categoryType]);

  const getAttr = (v, name) => {
    if (!v) return null;
    const attrs = v.attributes || v;
    if (typeof attrs !== 'object') return null;
    const search = name.toLowerCase();
    let key = Object.keys(attrs).find(k => k.toLowerCase() === search);
    return key ? attrs[key] : null;
  };

  const getProductSex = (product) => {
    if (product.variants && Array.isArray(product.variants)) {
      for (const v of product.variants) {
        const sex = getAttr(v, 'sex') || getAttr(v, 'gender');
        if (sex) return sex.toLowerCase();
      }
    }
    const catName = product.category?.name?.toLowerCase() || '';
    if (catName.includes('women')) return 'women';
    if (catName.includes('men')) return 'men';
    if (catName.includes('unisex')) return 'unisex';
    return 'unisex';
  };

  const fetchFilteredProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/products?take=100');
      const allProducts = response.data?.data?.products || response.data?.products || response.data?.data || response.data || [];
      
      let filtered = [];
      if (categoryType === 'All') {
        filtered = allProducts;
      } else if (categoryType === 'Women') {
        filtered = allProducts.filter(p => {
          const sex = getProductSex(p);
          return sex === 'women' || sex === 'unisex';
        });
      } else if (categoryType === 'Men') {
        filtered = allProducts.filter(p => {
          const sex = getProductSex(p);
          return sex === 'men' || sex === 'unisex';
        });
      } else if (categoryType === 'Sporty') {
        filtered = allProducts.filter(p => {
          const catName = p.category?.name?.toLowerCase() || '';
          return catName.includes('sport');
        });
      }

      setProducts(filtered);
    } catch (error) {
      console.error('Error fetching filtered products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryType.toUpperCase()} COLLECTION</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.productWrapper}>
              <ProductCard 
                product={item} 
                onPress={() => navigation.navigate('ProductDetails', { product: item })} 
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="shopping-bag" size={50} color="#EEE" />
              <Text style={styles.emptyText}>No products found in this category</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 2, color: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 10 },
  productWrapper: { width: (width - 20) / 2, padding: 5 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 15, fontSize: 14, color: '#999', fontWeight: '600' }
});

export default CategoryProductsScreen;

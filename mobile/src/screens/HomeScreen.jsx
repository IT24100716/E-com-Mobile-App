import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '../api/api';
import ProductCard from '../components/ProductCard';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // The backend route is GET /products
      const response = await api.get('/products');
      const responseData = response.data?.data?.products || response.data?.products || response.data?.data || response.data || [];

      // Limit to 6 products for "New Arrivals" horizontal scroll
      setProducts(Array.isArray(responseData) ? responseData.slice(0, 6) : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: '1', title: "WOMEN'S", sub: "COLLECTION", image: require('../../assets/img/split_image_2.png') },
    { id: '2', title: "MEN'S", sub: "WEAR", image: require('../../assets/img/split_image_1.png') },
    { id: '3', title: "SPORTY", sub: "WEAR", image: require('../../assets/img/split_image_3.png') },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerLogo}>RICH APPAREL</Text>
        <TouchableOpacity>
          <Feather name="shopping-bag" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 1. Hero Section */}
        <ImageBackground
          source={require('../../assets/img/main_hero_bg.png')}
          style={styles.heroBanner}
        >
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTextSmall}>RICH APPAREL
            </Text>
            <Text style={styles.heroTextLarge}>IT'S ATTITUDE</Text>
            <TouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>SHOP NOW</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* 2. Categories Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionSubtitle}>CURATED COLLECTIONS</Text>
          <Text style={styles.sectionTitle}>SHOP BY CATEGORY</Text>
          <View style={styles.titleUnderline} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {categories.map((cat) => (
              <TouchableOpacity key={cat.id} style={styles.categoryCard}>
                <ImageBackground source={cat.image} style={styles.categoryImage} imageStyle={{ borderRadius: 20 }}>
                  <View style={styles.categoryOverlay}>
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                    <Text style={styles.categorySub}>{cat.sub}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3. New Arrivals Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>NEW ARRIVALS</Text>
              <Text style={styles.sectionSubtitleLeft}>LATEST DROPS</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>SEE ALL</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <ProductCard product={item} />}
              contentContainerStyle={styles.productsScroll}
            />
          )}
        </View>

      </ScrollView>
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
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroBanner: {
    width: width,
    height: 450,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  heroTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 3,
    marginBottom: 5,
  },
  heroTextLarge: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 30,
    lineHeight: 45,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    gap: 10,
  },
  heroButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  sectionContainer: {
    marginTop: 40,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    letterSpacing: 1,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#000',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  categoriesScroll: {
    paddingHorizontal: 15,
    gap: 15,
  },
  categoryCard: {
    width: width * 0.7,
    height: 350,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  categoryOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    height: '100%',
    justifyContent: 'flex-end',
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  categorySub: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    opacity: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionSubtitleLeft: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 3,
    marginTop: 2,
  },
  seeAllButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  seeAllText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  productsScroll: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  loaderContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default HomeScreen;

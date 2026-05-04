import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Animated,
  Platform,
  Image,
  Modal,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../../api/api';
import ProductCard from '../../components/ProductCard';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [newArrivals, setNewArrivals] = useState([]);
  const [mensCollection, setMensCollection] = useState([]);
  const [womensCollection, setWomensCollection] = useState([]);
  const [sportyCollection, setSportyCollection] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sidebarAnim = useRef(new Animated.Value(-width)).current;
  const brandsRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Auto-scroll logic for brands
  useEffect(() => {
    let scrollValue = 0;
    const interval = setInterval(() => {
      if (brandsRef.current) {
        scrollValue += 120; // width of brand circle + margin
        if (scrollValue >= 120 * 6) scrollValue = 0; // reset after 6 items
        brandsRef.current.scrollToOffset({ offset: scrollValue, animated: true });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const getAttr = (v, name) => {
    const attrs = v.attributes || v;
    if (!attrs || typeof attrs !== 'object') return null;
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
    return 'unisex';
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?take=100');
      const responseData = response.data?.data?.products || response.data?.products || response.data?.data || response.data || [];
      const productsList = Array.isArray(responseData) ? responseData : [];

      setAllProducts(productsList);
      setNewArrivals(productsList.slice(0, 8));

      setMensCollection(productsList.filter(p => {
        const sex = getProductSex(p);
        return sex === 'men' || sex === 'unisex';
      }).slice(0, 8));

      setWomensCollection(productsList.filter(p => {
        const sex = getProductSex(p);
        return sex === 'women' || sex === 'unisex';
      }).slice(0, 8));

      setSportyCollection(productsList.filter(p => {
        const catName = p.category?.name?.toLowerCase() || '';
        return catName.includes('sport');
      }).slice(0, 8));

    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSearch = () => {
    if (isSearchOpen) {
      Animated.parallel([
        Animated.timing(searchAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start(() => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      });
    } else {
      setIsSearchOpen(true);
      Animated.parallel([
        Animated.timing(searchAnim, { toValue: width * 0.75, duration: 300, useNativeDriver: false }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    }
  };

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(sidebarAnim, { toValue: -width, duration: 300, useNativeDriver: false }).start(() => setIsSidebarOpen(false));
    } else {
      setIsSidebarOpen(true);
      Animated.timing(sidebarAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setSearchResults([]);
    } else {
      const filtered = allProducts.filter(p => p.name?.toLowerCase().includes(text.toLowerCase())).slice(0, 8);
      setSearchResults(filtered);
    }
  };

  const categories = [
    { id: '1', title: "WOMEN", sub: "COLLECTION", type: 'Women', image: require('../../../assets/img/split_image_2.png'), icon: 'shoe-heel' },
    { id: '2', title: "MEN", sub: "WEAR", type: 'Men', image: require('../../../assets/img/split_image_1.png'), icon: 'tie' },
    { id: '3', title: "SPORT", sub: "SERIES", type: 'Sporty', image: require('../../../assets/img/split_image_3.png'), icon: 'run-fast' },
  ];

  const brandLogos = [
    { id: 1, img: require('../../../assets/img/brand1.jpg') },
    { id: 2, img: require('../../../assets/img/brand2.jpg') },
    { id: 3, img: require('../../../assets/img/brand3.jpg') },
    { id: 4, img: require('../../../assets/img/brand4.png') },
    { id: 5, img: require('../../../assets/img/brand1.jpg') }, // Reusing for sliding demo
    { id: 6, img: require('../../../assets/img/brand2.jpg') },
    { id: 7, img: require('../../../assets/img/brand3.jpg') },
    { id: 8, img: require('../../../assets/img/brand4.png') },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}>
        {!isSearchOpen && (
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleSidebar}><Feather name="menu" size={24} color="#000" /></TouchableOpacity>
            <Text style={styles.headerLogo}>RICH APPAREL</Text>
          </View>
        )}
        <Animated.View style={[styles.searchContainer, { width: searchAnim }]}>
          {isSearchOpen && <TextInput style={styles.searchInput} placeholder="Search styles..." placeholderTextColor="#999" value={searchQuery} onChangeText={handleSearch} autoFocus />}
        </Animated.View>
        <TouchableOpacity onPress={toggleSearch} style={styles.iconBtn}><Feather name={isSearchOpen ? "x" : "search"} size={22} color="#000" /></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.heroCarousel}>
          <ImageBackground source={require('../../../assets/img/main_hero_bg.png')} style={styles.heroSlide}>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTag}>PREMIUM 2026</Text>
              <Text style={styles.heroTitle}>NOT JUST FASHION</Text>
              <Text style={styles.heroSub}>IT'S ATTITUDE</Text>
              <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'All' })}>
                <Text style={styles.heroBtnText}>SHOP NOW</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </ImageBackground>
          <ImageBackground source={require('../../../assets/img/hero1.jpg')} style={styles.heroSlide}>
            <View style={[styles.heroOverlay, { alignItems: 'flex-end' }]}>
              <Text style={styles.heroTag}>NEW ARRIVALS</Text>
              <Text style={[styles.heroTitle, { textAlign: 'right' }]}>SUMMER VIBES</Text>
              <Text style={[styles.heroSub, { textAlign: 'right' }]}>UP TO 40% OFF</Text>
              <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'Women' })}>
                <Text style={styles.heroBtnText}>EXPLORE</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><View><Text style={styles.label}>CURATED FOR YOU</Text><Text style={styles.title}>SHOP BY CATEGORY</Text></View></View>
          <View style={styles.categoryGrid}>
            <TouchableOpacity style={styles.catLarge} onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'Women' })}>
              <ImageBackground source={categories[0].image} style={styles.catImg} imageStyle={{ borderRadius: 24 }}>
                <View style={styles.catOverlay}><View style={styles.catTextContainer}><Text style={styles.catTitle}>WOMEN'S</Text><Text style={styles.catSub}>ELEGANCE</Text></View></View>
              </ImageBackground>
            </TouchableOpacity>
            <View style={styles.catSmallCol}>
              <TouchableOpacity style={styles.catSmall} onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'Men' })}>
                <ImageBackground source={categories[1].image} style={styles.catImg} imageStyle={{ borderRadius: 24 }}>
                  <View style={styles.catOverlay}><View style={styles.catTextContainer}><Text style={styles.catTitleSmall}>MEN'S</Text></View></View>
                </ImageBackground>
              </TouchableOpacity>
              <TouchableOpacity style={styles.catSmall} onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'Sporty' })}>
                <ImageBackground source={categories[2].image} style={styles.catImg} imageStyle={{ borderRadius: 24 }}>
                  <View style={styles.catOverlay}><View style={styles.catTextContainer}><Text style={styles.catTitleSmall}>SPORTY</Text></View></View>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><View><Text style={styles.label}>LATEST DROPS</Text><Text style={styles.title}>NEW ARRIVALS</Text></View><TouchableOpacity onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'All' })}><Text style={styles.seeAll}>VIEW ALL</Text></TouchableOpacity></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
            {loading ? <ActivityIndicator color="#000" /> : newArrivals.map(p => (<ProductCard key={p.id} product={p} onPress={() => navigation.navigate('ProductDetails', { product: p })} />))}
          </ScrollView>
        </View>

        <View style={styles.promoBanner}>
          <View style={[styles.promoImg, { backgroundColor: '#000', borderRadius: 30 }]}>
            <View style={styles.promoOverlay}>
              <Text style={styles.promoTag}>SHOP NOW</Text>
              <Text style={styles.promoTitle}>GET YOUR OWN STYLE</Text>
              <Text style={styles.promoSub}>Reedem your Points now</Text>
              <TouchableOpacity style={styles.promoBtn}><Text style={styles.promoBtnText}>GET THE DEALS</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><View><Text style={styles.label}>PREMIUM WEAR</Text><Text style={styles.title}>MEN'S ESSENTIALS</Text></View><TouchableOpacity onPress={() => navigation.navigate('CategoryProducts', { categoryType: 'Men' })}><Feather name="arrow-right" size={20} color="#000" /></TouchableOpacity></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
            {loading ? null : mensCollection.map(p => (<ProductCard key={p.id} product={p} onPress={() => navigation.navigate('ProductDetails', { product: p })} />))}
          </ScrollView>
        </View>

        {/* World Class Brands Section with Auto-Slide */}
        <View style={styles.section}>
          <Text style={styles.labelCentered}>WORLD CLASS PARTNERS</Text>
          <Text style={styles.titleCentered}>TRUSTED BRANDS</Text>
          <FlatList
            ref={brandsRef}
            data={brandLogos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.brandScroll}
            renderItem={({ item }) => (
              <View style={styles.brandCircle}>
                <Image source={item.img} style={styles.brandImg} />
              </View>
            )}
          />
        </View>

        <View style={styles.trustSection}>
          <View style={styles.trustItem}><Feather name="truck" size={24} color="#000" /><Text style={styles.trustTitle}>FREE SHIPPING</Text><Text style={styles.trustSub}>On orders over Rs. 5000</Text></View>
          <View style={styles.trustItem}><Feather name="shield" size={24} color="#000" /><Text style={styles.trustTitle}>SECURE PAYMENT</Text><Text style={styles.trustSub}>100% protected payments</Text></View>
          <View style={styles.trustItem}><Feather name="refresh-cw" size={24} color="#000" /><Text style={styles.trustTitle}>EASY RETURNS</Text><Text style={styles.trustSub}>7-day return policy</Text></View>
        </View>

        <View style={styles.footer}><Text style={styles.footerText}>© 2026 RICH APPAREL PVT LTD</Text><Text style={styles.footerSub}>CRAFTED FOR THE BOLD</Text></View>
      </ScrollView>

      <Modal transparent visible={isSidebarOpen} onRequestClose={toggleSidebar} animationType="none">
        <View style={styles.sidebarOverlay}><TouchableOpacity style={styles.sidebarBlur} onPress={toggleSidebar} activeOpacity={1} /><Animated.View style={[styles.sidebarContent, { left: sidebarAnim, paddingTop: 20 + insets.top }]}><View style={styles.sidebarHeader}><Text style={styles.sidebarBrand}>RICH APPAREL</Text><TouchableOpacity onPress={toggleSidebar}><Feather name="x" size={24} color="#000" /></TouchableOpacity></View><View style={styles.sidebarNav}>{['Women', 'Men', 'Sporty', 'All'].map((t, i) => (<TouchableOpacity key={i} style={styles.sidebarItem} onPress={() => { toggleSidebar(); navigation.navigate('CategoryProducts', { categoryType: t }); }}><Text style={styles.sidebarItemText}>{t.toUpperCase()}'S WEAR</Text><Feather name="chevron-right" size={16} color="#DDD" /></TouchableOpacity>))}</View><View style={styles.sidebarFooter}><Text style={styles.versionText}>VER. 2.5.0 • PREMIUM EDITION</Text></View></Animated.View></View>
      </Modal>

      {isSearchOpen && searchQuery.length > 0 && (
        <Animated.View style={[styles.resultsOverlay, { opacity: opacityAnim, top: 60 + insets.top }]}><View style={styles.resultsContainer}>{searchResults.length > 0 ? (<ScrollView keyboardShouldPersistTaps="handled">{searchResults.map((item) => (<TouchableOpacity key={item.id} style={styles.resultItem} onPress={() => { toggleSearch(); navigation.navigate('ProductDetails', { product: item }); }}><Image source={{ uri: item.images?.[0] }} style={styles.resultThumb} /><View style={styles.resultInfo}><Text style={styles.resultName}>{item.name}</Text><Text style={styles.resultPrice}>Rs. {item.price?.toLocaleString()}</Text></View><Feather name="chevron-right" size={16} color="#DDD" /></TouchableOpacity>))}</ScrollView>) : (<View style={styles.emptyResults}><Feather name="search" size={40} color="#F0F0F0" /><Text style={styles.emptyText}>No matches found</Text></View>)}</View></Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zize: 1000, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  headerLogo: { fontSize: 16, fontWeight: '900', letterSpacing: 2, color: '#000' },
  iconBtn: { padding: 8 },
  searchContainer: { height: 45, justifyContent: 'center' },
  searchInput: { backgroundColor: '#f8f8f8', height: 40, borderRadius: 20, paddingHorizontal: 20, fontSize: 14, fontWeight: '600', borderWidth: 1, borderColor: '#eee' },
  heroCarousel: { width: width, height: 500 },
  heroSlide: { width: width, height: 500, justifyContent: 'center' },
  heroOverlay: { padding: 40, backgroundColor: 'rgba(0,0,0,0.1)', flex: 1, justifyContent: 'center' },
  heroTag: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 10 },
  heroTitle: { color: '#fff', fontSize: 44, fontWeight: '900', lineHeight: 46, marginBottom: 5 },
  heroSub: { color: '#fff', fontSize: 32, fontWeight: '300', marginBottom: 30 },
  heroBtn: { backgroundColor: '#000', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 25, borderRadius: 30, alignSelf: 'flex-start', gap: 10 },
  heroBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  section: { marginTop: 50, paddingHorizontal: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 25 },
  label: { fontSize: 10, fontWeight: '900', color: '#999', letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  seeAll: { fontSize: 12, fontWeight: '900', borderBottomWidth: 1.5, borderBottomColor: '#000', paddingBottom: 2 },
  rowScroll: { paddingBottom: 10 },
  categoryGrid: { flexDirection: 'row', height: 400, gap: 15, marginTop: 10 },
  catLarge: { flex: 1.3 },
  catSmallCol: { flex: 1, gap: 15 },
  catSmall: { flex: 1 },
  catImg: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  catOverlay: { flex: 1, justifyContent: 'flex-end', borderRadius: 24, overflow: 'hidden' },
  catTextContainer: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, width: '100%' },
  catTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  catSub: { color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.9, marginTop: 2 },
  catTitleSmall: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  promoBanner: { marginTop: 50, paddingHorizontal: 25 },
  promoImg: { width: '100%', height: 220, justifyContent: 'center' },
  promoOverlay: { padding: 30, backgroundColor: 'rgba(0,0,0,0.3)', flex: 1, justifyContent: 'center', borderRadius: 30 },
  promoTag: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  promoTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginVertical: 5 },
  promoSub: { color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.9, marginBottom: 20 },
  promoBtn: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignSelf: 'flex-start' },
  promoBtnText: { color: '#000', fontWeight: '900', fontSize: 11 },
  labelCentered: { fontSize: 10, fontWeight: '900', color: '#999', letterSpacing: 2, textAlign: 'center', marginBottom: 5 },
  titleCentered: { fontSize: 24, fontWeight: '900', color: '#000', textAlign: 'center', marginBottom: 30 },
  brandScroll: { paddingHorizontal: 10, paddingBottom: 20 },
  brandCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', marginRight: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
  brandImg: { width: '80%', height: '80%', resizeMode: 'contain' },
  trustSection: { marginTop: 60, backgroundColor: '#F9F9F9', paddingVertical: 50, paddingHorizontal: 25, gap: 40 },
  trustItem: { alignItems: 'center', gap: 10 },
  trustTitle: { fontSize: 13, fontWeight: '900', color: '#000', letterSpacing: 1 },
  trustSub: { fontSize: 11, color: '#999', fontWeight: '600' },
  footer: { paddingVertical: 60, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  footerText: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 1 },
  footerSub: { fontSize: 10, color: '#BBB', fontWeight: '700', marginTop: 5 },
  resultsOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.98)', zIndex: 99 },
  resultsContainer: { paddingHorizontal: 20, paddingTop: 10 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultThumb: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F8F9FD' },
  resultInfo: { flex: 1, marginLeft: 15 },
  resultName: { fontSize: 15, fontWeight: '700', color: '#000' },
  resultPrice: { fontSize: 13, color: '#999' },
  emptyResults: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, fontSize: 14, color: '#CCC' },
  sidebarOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebarBlur: { flex: 1 },
  sidebarContent: { position: 'absolute', top: 0, bottom: 0, width: width * 0.75, backgroundColor: '#fff', paddingHorizontal: 20 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  sidebarBrand: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  sidebarNav: { flex: 1 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F8F9FD' },
  sidebarItemText: { flex: 1, fontSize: 14, fontWeight: '900', color: '#333' },
  sidebarFooter: { paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#F8F9FD' },
  versionText: { fontSize: 10, color: '#CCC', fontWeight: '900', textAlign: 'center' }
});

export default HomeScreen;

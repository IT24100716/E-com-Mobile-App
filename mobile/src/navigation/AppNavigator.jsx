import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/customer/HomeScreen';
import ProductManagerDashboard from '../screens/productManager/ProductManagerDashboard';
import ProductsScreen from '../screens/productManager/ProductsScreen';
import AddProductScreen from '../screens/productManager/AddProductScreen';
import CategoriesScreen from '../screens/productManager/CategoriesScreen';
import AddCategoryScreen from '../screens/productManager/AddCategoryScreen';
import SupplierManagerDashboard from '../screens/supplierManager/SupplierManagerDashboard';
import SuppliersScreen from '../screens/supplierManager/SuppliersScreen';
import AddSupplierScreen from '../screens/supplierManager/AddSupplierScreen';
import RestockRequestsScreen from '../screens/supplierManager/RestockRequestsScreen';
import CreateRestockRequestScreen from '../screens/productManager/CreateRestockRequestScreen';
import ProductDetailsScreen from '../screens/customer/ProductDetailsScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import MyOrdersScreen from '../screens/customer/MyOrdersScreen';
import TrackOrderScreen from '../screens/customer/TrackOrderScreen';
import OrderManagerDashboard from '../screens/orderManager/OrderManagerDashboard';
import AdminOrdersScreen from '../screens/orderManager/AdminOrdersScreen';
import AdminOrderDetailScreen from '../screens/orderManager/AdminOrderDetailScreen';
import AdminPaymentsScreen from '../screens/orderManager/AdminPaymentsScreen';
import ReviewManagerDashboard from '../screens/reviewManager/ReviewManagerDashboard';
import AdminReviewsScreen from '../screens/reviewManager/AdminReviewsScreen';
import AdminReturnsScreen from '../screens/reviewManager/AdminReturnsScreen';
import ReplacementManagerScreen from '../screens/productManager/ReplacementManagerScreen';
import CreateReturnScreen from '../screens/customer/CreateReturnScreen';
import CustomerCouponsScreen from '../screens/customer/CustomerCouponsScreen';
import CategoryProductsScreen from '../screens/customer/CategoryProductsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';


// Loyalty Manager Screens
import LoyaltyManagerDashboard from '../screens/loyaltyManager/LoyaltyManagerDashboard';
import AdminLoyaltyScreen from '../screens/loyaltyManager/AdminLoyaltyScreen';
import AdminCouponsScreen from '../screens/loyaltyManager/AdminCouponsScreen';

// Staff Manager Screens
import StaffManagerDashboard from '../screens/staffManager/StaffManagerDashboard';
import AdminStaffScreen from '../screens/staffManager/AdminStaffScreen';
import AdminRolesScreen from '../screens/staffManager/AdminRolesScreen';

import AdminUsersScreen from '../screens/staffManager/AdminUsersScreen';



const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ─────────── Placeholder Screens ─────────── */
const NotificationsScreen = () => (
  <View style={{ flex: 1, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' }}>
    <Feather name="bell" size={48} color="#eee" />
    <Text style={{ fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 2, marginTop: 20 }}>NOTIFICATIONS</Text>
    <Text style={{ fontSize: 11, color: '#999', marginTop: 8, fontWeight: '600' }}>No new notifications</Text>
  </View>
);


/* ─────────── Nested Stacks ─────────── */
const HomeStack = createNativeStackNavigator();
const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    <HomeStack.Screen name="CategoryProducts" component={CategoryProductsScreen} />
  </HomeStack.Navigator>
);

const OrdersStack = createNativeStackNavigator();
const OrdersStackScreen = () => (
  <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
    <OrdersStack.Screen name="MyOrdersMain" component={MyOrdersScreen} />
    <OrdersStack.Screen name="TrackOrder" component={TrackOrderScreen} />
  </OrdersStack.Navigator>
);

const CartStack = createNativeStackNavigator();
const CartStackScreen = () => (
  <CartStack.Navigator screenOptions={{ headerShown: false }}>
    <CartStack.Screen name="CartMain" component={CartScreen} />
    <CartStack.Screen name="Checkout" component={CheckoutScreen} />
  </CartStack.Navigator>
);

/* ─────────── Custom Frosted Glass Tab Bar ─────────── */
const ICON_MAP = {
  HomeTab: 'home',
  Orders: 'package',
  Cart: 'shopping-bag',
  Coupons: 'tag',
  Profile: 'user',
};


const LABEL_MAP = {
  HomeTab: 'Home',
  Orders: 'Orders',
  Cart: 'Cart',
  Coupons: 'Coupons',
  Profile: 'Profile',
};


function GlassTabBar({ state, descriptors, navigation }) {
  return (
    <View style={tabStyles.outerWrapper}>
      <View style={tabStyles.glassContainer}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={tabStyles.tabItem}
            >
              <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
                <Feather
                  name={ICON_MAP[route.name] || 'circle'}
                  size={22}
                  color={isFocused ? '#fff' : '#666'}
                />
              </View>
              <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
                {LABEL_MAP[route.name]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ─────────── Bottom Tab Navigator ─────────── */
const CustomerTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <GlassTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="HomeTab" component={HomeStackScreen} />
    <Tab.Screen name="Orders" component={OrdersStackScreen} />
    <Tab.Screen name="Cart" component={CartStackScreen} />
    <Tab.Screen name="Coupons" component={CustomerCouponsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

/* ─────────── Root Navigator ─────────── */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Home" component={CustomerTabs} />
        <Stack.Screen name="ProductManagerDashboard" component={ProductManagerDashboard} />
        <Stack.Screen name="Products" component={ProductsScreen} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="AddCategory" component={AddCategoryScreen} />
        <Stack.Screen name="SupplierManagerDashboard" component={SupplierManagerDashboard} />
        <Stack.Screen name="Suppliers" component={SuppliersScreen} />
        <Stack.Screen name="AddSupplier" component={AddSupplierScreen} />
        <Stack.Screen name="RestockRequests" component={RestockRequestsScreen} />
        <Stack.Screen name="CreateRestockRequest" component={CreateRestockRequestScreen} />
        
        {/* Order Manager Screens */}
        <Stack.Screen name="OrderManagerDashboard" component={OrderManagerDashboard} />
        <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
        <Stack.Screen name="AdminOrderDetail" component={AdminOrderDetailScreen} />
        <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} />

        {/* Review Manager Screens */}
        <Stack.Screen name="ReviewManagerDashboard" component={ReviewManagerDashboard} />
        <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} />
        <Stack.Screen name="AdminReturns" component={AdminReturnsScreen} />
        <Stack.Screen name="AdminReplacements" component={ReplacementManagerScreen} />

        {/* Customer Return Screen */}
        <Stack.Screen name="CreateReturn" component={CreateReturnScreen} />

        {/* Loyalty Manager Screens */}
        <Stack.Screen name="LoyaltyManagerDashboard" component={LoyaltyManagerDashboard} />
        <Stack.Screen name="AdminLoyalty" component={AdminLoyaltyScreen} />
        <Stack.Screen name="AdminCoupons" component={AdminCouponsScreen} />

        {/* Staff Manager Screens */}
        <Stack.Screen name="StaffManagerDashboard" component={StaffManagerDashboard} />
        <Stack.Screen name="AdminStaff" component={AdminStaffScreen} />
        <Stack.Screen name="AdminRoles" component={AdminRolesScreen} />

        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />


      </Stack.Navigator>
    </NavigationContainer>
  );
};

/* ─────────── Tab Bar Styles (Apple Liquid Glass) ─────────── */
const tabStyles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    // Shadow for the floating effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#000',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    color: '#888',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: '#000',
    fontWeight: '900',
  },
});

export default AppNavigator;

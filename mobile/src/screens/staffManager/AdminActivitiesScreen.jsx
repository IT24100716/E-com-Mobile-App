import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  SafeAreaView,
  Platform,
  RefreshControl
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/api';

const { width } = Dimensions.get('window');

const AdminActivitiesScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActivities = async () => {
    try {
      const response = await api.get('/activities');
      const activitiesData = response.data?.data?.activities || response.data?.activities || response.data?.data || response.data || [];
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return '#2ECC71';
    if (action.includes('UPDATE')) return '#3498DB';
    if (action.includes('DELETE')) return '#FF4757';
    return '#999';
  };

  const getActionIcon = (type) => {
    switch (type) {
      case 'LOYALTY': return 'star-circle';
      case 'PRODUCT': return 'package-variant';
      case 'ORDER': return 'cart';
      case 'USER': return 'account-cog';
      default: return 'bell-outline';
    }
  };

  const filteredActivities = (activities || []).filter(a => 
    a.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderActivityItem = ({ item }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={[styles.iconBox, { backgroundColor: getActionColor(item.action) + '15' }]}>
          <MaterialCommunityIcons name={getActionIcon(item.type)} size={20} color={getActionColor(item.action)} />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityMsg}>{item.message}</Text>
          <Text style={styles.activityMeta}>
            {item.userName} • {item.roleName} • {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
      {item.details && (
        <View style={styles.detailsBox}>
           <Text style={styles.detailsText} numberOfLines={2}>
             Target: {item.targetName || 'System'} • Action: {item.action}
           </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>ACTIVITY LOGS</Text>
          <Text style={styles.headerSub}>Audit trail & history</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#999" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by user or action..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          data={filteredActivities}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderActivityItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={60} color="#EEE" />
              <Text style={styles.emptyTitle}>NO ACTIVITY LOGGED</Text>
              <Text style={styles.emptySub}>The audit trail is currently empty</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  backBtn: {
    padding: 5
  },
  headerTitleContainer: {
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000'
  },
  headerSub: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    letterSpacing: 1
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#fff'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#000',
    fontWeight: '600'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 20,
    paddingBottom: 40
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  activityInfo: {
    flex: 1
  },
  activityMsg: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    lineHeight: 18
  },
  activityMeta: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginTop: 4
  },
  detailsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F9F9F9'
  },
  detailsText: {
    fontSize: 10,
    color: '#BBB',
    fontWeight: '500',
    fontStyle: 'italic'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 100
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    marginTop: 20
  },
  emptySub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 8
  }
});

export default AdminActivitiesScreen;

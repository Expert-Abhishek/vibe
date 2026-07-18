import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { adminState, Driver, Guide } from './admin-state';

// Interfaces
interface Voucher {
  id: string;
  code: string;
  desc: string;
  type: 'percent' | 'flat';
  val: number;
}

interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Current Admin Tab: 'dashboard' | 'plan' | 'voucher' | 'driver' | 'guide'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'plan' | 'voucher' | 'driver' | 'guide'>('dashboard');

  // Vouchers state
  const [vouchers, setVouchers] = useState<Voucher[]>([
    { id: 'v1', code: 'VIBE15', desc: '15% Off all cabs bookings', type: 'percent', val: 15 },
    { id: 'v2', code: 'SAVE100', desc: 'Flat ₹100 Off long tours', type: 'flat', val: 100 },
    { id: 'v3', code: 'TOUR50', desc: '50% Off first guide hire', type: 'percent', val: 50 },
  ]);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherDesc, setNewVoucherDesc] = useState('');
  const [newVoucherType, setNewVoucherType] = useState<'percent' | 'flat'>('percent');
  const [newVoucherVal, setNewVoucherVal] = useState('');
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

  // Checkpoints state
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    { id: 'p1', name: 'Bengaluru Palace', latitude: 12.9982, longitude: 77.5920, address: 'Bengaluru, Karnataka' },
    { id: 'p2', name: 'Mysuru Palace', latitude: 12.3053, longitude: 76.6552, address: 'Mysuru, Karnataka' },
    { id: 'p3', name: 'Hampi Virupaksha', latitude: 15.3350, longitude: 76.4600, address: 'Hampi, Bellary, Karnataka' },
    { id: 'p4', name: 'Jog Falls', latitude: 14.2272, longitude: 74.8114, address: 'Shivamogga, Karnataka' },
  ]);
  const [newCpName, setNewCpName] = useState('');
  const [newCpAddr, setNewCpAddr] = useState('');
  const [newCpLat, setNewCpLat] = useState('');
  const [newCpLng, setNewCpLng] = useState('');

  // Per hour vehicle prices
  const [vehiclePrices, setVehiclePrices] = useState({
    '5seater': adminState.vehicleRatesPerHour['5seater'],
    '7seater': adminState.vehicleRatesPerHour['7seater'],
    '4x4jeep': adminState.vehicleRatesPerHour['4x4jeep'],
    'auto': adminState.vehicleRatesPerHour['auto'],
  });

  const [quoteInputs, setQuoteInputs] = useState<Record<string, string>>({});
  const [adminUpdateTrigger, setAdminUpdateTrigger] = useState(0);

  // Drivers state
  const [drivers, setDrivers] = useState<Driver[]>(adminState.drivers);

  // Guides state
  const [guides, setGuides] = useState<Guide[]>(adminState.guides);

  // Platform booking fees metrics (simulated)
  const totalBookingsDriver = 21000;
  const totalBookingsGuide = 24500;
  const platformFeePercentage = 0.10; // 10% platform fee

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceAlt: isDark ? '#16161B' : '#EFEFF4',
    line: isDark ? '#2C2C34' : '#E5E5EA',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
    danger: '#ef4444',
  };

  // Voucher managers
  const handleSaveVoucher = () => {
    if (!newVoucherCode.trim() || !newVoucherDesc.trim() || !newVoucherVal.trim()) {
      Alert.alert('Error', 'Please fill all voucher fields.');
      return;
    }
    const val = parseFloat(newVoucherVal);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Error', 'Discount value must be a positive number.');
      return;
    }

    if (editingVoucherId) {
      // Edit
      setVouchers(prev =>
        prev.map(v =>
          v.id === editingVoucherId
            ? { ...v, code: newVoucherCode.toUpperCase(), desc: newVoucherDesc, type: newVoucherType, val }
            : v
        )
      );
      Alert.alert('Success', 'Voucher updated successfully.');
      setEditingVoucherId(null);
    } else {
      // Add
      if (vouchers.find(v => v.code === newVoucherCode.toUpperCase())) {
        Alert.alert('Error', 'Voucher with this code already exists.');
        return;
      }
      const newV: Voucher = {
        id: `v_${Date.now()}`,
        code: newVoucherCode.toUpperCase(),
        desc: newVoucherDesc,
        type: newVoucherType,
        val,
      };
      setVouchers(prev => [...prev, newV]);
      Alert.alert('Success', 'Voucher created successfully.');
    }

    // Reset inputs
    setNewVoucherCode('');
    setNewVoucherDesc('');
    setNewVoucherType('percent');
    setNewVoucherVal('');
  };

  const handleEditVoucherClick = (v: Voucher) => {
    setEditingVoucherId(v.id);
    setNewVoucherCode(v.code);
    setNewVoucherDesc(v.desc);
    setNewVoucherType(v.type);
    setNewVoucherVal(v.val.toString());
  };

  const handleDeleteVoucher = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this voucher?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setVouchers(prev => prev.filter(v => v.id !== id)),
      },
    ]);
  };

  // Checkpoints manager
  const handleAddCheckpoint = () => {
    if (!newCpName.trim() || !newCpAddr.trim() || !newCpLat.trim() || !newCpLng.trim()) {
      Alert.alert('Error', 'Please fill all checkpoint fields.');
      return;
    }
    const lat = parseFloat(newCpLat);
    const lng = parseFloat(newCpLng);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Latitude and Longitude must be valid numbers.');
      return;
    }

    const newCp: Checkpoint = {
      id: `cp_${Date.now()}`,
      name: newCpName,
      address: newCpAddr,
      latitude: lat,
      longitude: lng,
    };
    setCheckpoints(prev => [...prev, newCp]);
    Alert.alert('Success', `Checkpoint "${newCpName}" added successfully.`);
    setNewCpName('');
    setNewCpAddr('');
    setNewCpLat('');
    setNewCpLng('');
  };

  const handleDeleteCheckpoint = (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this checkpoint?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setCheckpoints(prev => prev.filter(cp => cp.id !== id)),
      },
    ]);
  };

  // Pricing settings update
  const handleUpdatePrice = (key: '5seater' | '7seater' | '4x4jeep' | 'auto', valStr: string) => {
    const val = parseFloat(valStr);
    if (isNaN(val) || val <= 0) return;
    setVehiclePrices(prev => {
      const next = { ...prev, [key]: val };
      adminState.vehicleRatesPerHour[key] = val;
      return next;
    });
  };

  const handleSendQuote = (requestId: string) => {
    const priceStr = quoteInputs[requestId];
    const priceVal = parseFloat(priceStr);
    if (!priceVal || isNaN(priceVal)) {
      Alert.alert('Invalid Price', 'Please enter a valid numeric price to quote.');
      return;
    }

    adminState.customTripRequests.forEach(req => {
      if (req.id === requestId) {
        req.status = 'Quoted';
        req.quotedPrice = priceVal;
      }
    });

    Alert.alert('Quote Sent!', `Custom route quote of ₹${priceVal} has been sent successfully.`);
    setAdminUpdateTrigger(prev => prev + 1);
  };

  // Driver KYC & Toggle Actions
  const handleToggleDriverStatus = (id: string) => {
    setDrivers(prev => {
      const updated = prev.map(d => {
        if (d.id === id) {
          const nextStatus = d.status === 'Active' ? 'Inactive' : 'Active';
          return { ...d, status: nextStatus as any };
        }
        return d;
      });
      adminState.drivers = updated;
      return updated;
    });
  };

  const handleDriverKyc = (id: string, action: 'Accept' | 'Decline') => {
    setDrivers(prev => {
      const updated = prev.map(d => {
        if (d.id === id) {
          if (action === 'Accept') {
            return { ...d, status: 'Active' as any, kycDone: true };
          } else {
            return { ...d, status: 'KYC Declined' as any, kycDone: false };
          }
        }
        return d;
      });
      adminState.drivers = updated;
      return updated;
    });
    Alert.alert(`KYC ${action}ed`, `The driver status has been updated successfully.`);
  };

  // Guide KYC & Toggle Actions
  const handleToggleGuideStatus = (id: string) => {
    setGuides(prev => {
      const updated = prev.map(g => {
        if (g.id === id) {
          const nextStatus = g.status === 'Active' ? 'Inactive' : 'Active';
          return { ...g, status: nextStatus as any };
        }
        return g;
      });
      adminState.guides = updated;
      return updated;
    });
  };

  const handleGuideKyc = (id: string, action: 'Accept' | 'Decline') => {
    setGuides(prev => {
      const updated = prev.map(g => {
        if (g.id === id) {
          if (action === 'Accept') {
            return { ...g, status: 'Active' as any, kycDone: true };
          } else {
            return { ...g, status: 'KYC Declined' as any, kycDone: false };
          }
        }
        return g;
      });
      adminState.guides = updated;
      return updated;
    });
    Alert.alert(`KYC ${action}ed`, `The guide status has been updated successfully.`);
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Logout of Admin Portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => router.replace('/(auth)/sign-in') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Navbar */}
      <View style={[styles.navbar, { borderBottomColor: colors.line }]}>
        <View style={styles.navLeft}>
          <FontAwesome5 name="user-shield" size={scale(18)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Vibe Admin Panel</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="exit-to-app" size={scale(18)} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Render Tab Content */}

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <View>
            <Text style={[styles.tabHeading, { color: colors.amber }]}>Revenue & Registration Summary</Text>

            {/* platform revenue */}
            <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={styles.cardSectionLabel}>TOTAL PLATFORM BOOKINGS REVENUE</Text>
              <Text style={[styles.revenueTitle, { color: colors.amber }]}>
                ₹{((totalBookingsDriver + totalBookingsGuide) * platformFeePercentage).toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.revenueSubtext, { color: colors.textMuted }]}>
                Calculated at 10% platform fee from completed rides and tours
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.line }]} />

              <View style={styles.revenueSplitRow}>
                <View style={styles.splitBox}>
                  <Text style={[styles.splitLabel, { color: colors.textMuted }]}>DRIVER BOOKINGS VALUE</Text>
                  <Text style={[styles.splitVal, { color: colors.textPrimary }]}>₹{totalBookingsDriver.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.splitFee, { color: colors.success }]}>Platform Fee (10%): ₹{(totalBookingsDriver * 0.1).toFixed(0)}</Text>
                </View>
                <View style={[styles.verticalDivider, { backgroundColor: colors.line }]} />
                <View style={styles.splitBox}>
                  <Text style={[styles.splitLabel, { color: colors.textMuted }]}>GUIDE TOURS VALUE</Text>
                  <Text style={[styles.splitVal, { color: colors.textPrimary }]}>₹{totalBookingsGuide.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.splitFee, { color: colors.success }]}>Platform Fee (10%): ₹{(totalBookingsGuide * 0.1).toFixed(0)}</Text>
                </View>
              </View>
            </View>

            {/* counts driver and guide */}
            <View style={styles.countsRow}>
              <View style={[styles.countCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <MaterialIcons name="directions-car" size={scale(24)} color={colors.amber} />
                <Text style={[styles.countNumber, { color: colors.textPrimary }]}>
                  {drivers.length}
                </Text>
                <Text style={[styles.countLabel, { color: colors.textMuted }]}>Drivers Registered</Text>
                <View style={styles.countBadgeRow}>
                  <Text style={[styles.tinyBadge, { backgroundColor: 'rgba(16,185,129,0.1)', color: colors.success }]}>
                    {drivers.filter(d => d.status === 'Active').length} Active
                  </Text>
                  <Text style={[styles.tinyBadge, { backgroundColor: 'rgba(245,197,24,0.1)', color: colors.amber }]}>
                    {drivers.filter(d => d.status === 'Pending KYC').length} Pending
                  </Text>
                </View>
              </View>

              <View style={[styles.countCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <MaterialIcons name="explore" size={scale(24)} color={colors.amber} />
                <Text style={[styles.countNumber, { color: colors.textPrimary }]}>
                  {guides.length}
                </Text>
                <Text style={[styles.countLabel, { color: colors.textMuted }]}>Guides Registered</Text>
                <View style={styles.countBadgeRow}>
                  <Text style={[styles.tinyBadge, { backgroundColor: 'rgba(16,185,129,0.1)', color: colors.success }]}>
                    {guides.filter(g => g.status === 'Active').length} Active
                  </Text>
                  <Text style={[styles.tinyBadge, { backgroundColor: 'rgba(245,197,24,0.1)', color: colors.amber }]}>
                    {guides.filter(g => g.status === 'Pending KYC').length} Pending
                  </Text>
                </View>
              </View>
            </View>

            {/* quick action hints */}
            <View style={[styles.infoBox, { borderColor: colors.amber }]}>
              <MaterialIcons name="info-outline" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                Partner KYC approvals and active toggling can be completed under the Driver and Guide tabs below.
              </Text>
            </View>
          </View>
        )}

        {/* 2. PLAN TAB (Checkpoints & Vehicle rates) */}
        {activeTab === 'plan' && (
          <View>
            <Text style={[styles.tabHeading, { color: colors.amber }]}>Vehicle Per-Hour Pricing rates</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Set Charge Rates per hour</Text>
              
              {/* pricing inputs */}
              <View style={styles.priceItemRow}>
                <Text style={[styles.priceLabel, { color: colors.textPrimary }]}>5 Seater Premium (₹/hour)</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.textPrimary, borderColor: colors.line }]}
                  keyboardType="numeric"
                  value={vehiclePrices['5seater'].toString()}
                  onChangeText={(t) => handleUpdatePrice('5seater', t)}
                />
              </View>

              <View style={styles.priceItemRow}>
                <Text style={[styles.priceLabel, { color: colors.textPrimary }]}>7 Seater Spacious (₹/hour)</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.textPrimary, borderColor: colors.line }]}
                  keyboardType="numeric"
                  value={vehiclePrices['7seater'].toString()}
                  onChangeText={(t) => handleUpdatePrice('7seater', t)}
                />
              </View>

              <View style={styles.priceItemRow}>
                <Text style={[styles.priceLabel, { color: colors.textPrimary }]}>4x4 Jeep Offroader (₹/hour)</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.textPrimary, borderColor: colors.line }]}
                  keyboardType="numeric"
                  value={vehiclePrices['4x4jeep'].toString()}
                  onChangeText={(t) => handleUpdatePrice('4x4jeep', t)}
                />
              </View>

              <View style={styles.priceItemRow}>
                <Text style={[styles.priceLabel, { color: colors.textPrimary }]}>Eco Auto (₹/hour)</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.textPrimary, borderColor: colors.line }]}
                  keyboardType="numeric"
                  value={vehiclePrices['auto'].toString()}
                  onChangeText={(t) => handleUpdatePrice('auto', t)}
                />
              </View>
            </View>

            <Text style={[styles.tabHeading, { color: colors.amber }]}>Itinerary Checkpoints</Text>

            {/* create checkpoint */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Create New Checkpoint</Text>
              
              <TextInput
                style={[styles.inputField, { color: colors.textPrimary, borderColor: colors.line }]}
                placeholder="Checkpoint Name (e.g. Abbey Falls)"
                placeholderTextColor={colors.textMuted}
                value={newCpName}
                onChangeText={setNewCpName}
              />
              <TextInput
                style={[styles.inputField, { color: colors.textPrimary, borderColor: colors.line }]}
                placeholder="Address / Region"
                placeholderTextColor={colors.textMuted}
                value={newCpAddr}
                onChangeText={setNewCpAddr}
              />
              <View style={styles.coordinateRow}>
                <TextInput
                  style={[styles.coordInput, { color: colors.textPrimary, borderColor: colors.line }]}
                  placeholder="Latitude (e.g. 12.43)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={newCpLat}
                  onChangeText={setNewCpLat}
                />
                <TextInput
                  style={[styles.coordInput, { color: colors.textPrimary, borderColor: colors.line }]}
                  placeholder="Longitude (e.g. 75.72)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={newCpLng}
                  onChangeText={setNewCpLng}
                />
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.amber }]} onPress={handleAddCheckpoint}>
                <Text style={styles.primaryBtnText}>Add Checkpoint</Text>
              </TouchableOpacity>
            </View>

            {/* checkpoints list */}
            <View style={styles.checkpointsListContainer}>
              <Text style={[styles.listHeader, { color: colors.textMuted }]}>ACTIVE CHECKPOINTS</Text>
              {checkpoints.map(cp => (
                <View key={cp.id} style={[styles.listItemRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cpName, { color: colors.textPrimary }]}>{cp.name}</Text>
                    <Text style={[styles.cpAddr, { color: colors.textMuted }]}>{cp.address}</Text>
                    <Text style={[styles.cpCoords, { color: colors.textMuted }]}>
                      Lat: {cp.latitude.toFixed(4)}, Lng: {cp.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.deleteAction} onPress={() => handleDeleteCheckpoint(cp.id)}>
                    <MaterialIcons name="delete" size={scale(20)} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Custom Route Quoting Requests */}
            <Text style={[styles.tabHeading, { color: colors.amber, marginTop: verticalScale(20) }]}>
              Custom Route Manual Quotes
            </Text>

            <View style={styles.checkpointsListContainer}>
              <Text style={[styles.listHeader, { color: colors.textMuted }]}>
                PENDING CUSTOM TRIP REQUESTS
              </Text>
              
              {adminState.customTripRequests.filter(r => r.status === 'Pending').length === 0 ? (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, padding: scale(16), alignItems: 'center' }]}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                    No pending custom route quote requests.
                  </Text>
                </View>
              ) : (
                adminState.customTripRequests
                  .filter(r => r.status === 'Pending')
                  .map(req => (
                    <View key={req.id} style={[styles.listItemRow, { backgroundColor: colors.surface, borderColor: colors.line, flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ marginBottom: verticalScale(8) }}>
                        <Text style={[styles.cpName, { color: colors.textPrimary }]}>
                          Client: {req.touristName}
                        </Text>
                        <Text style={[styles.cpAddr, { color: colors.textMuted, marginTop: verticalScale(2) }]}>
                          Vehicle Selected: {req.vehicle === '5seater' ? '5 Seater Premium' : (req.vehicle === '7seater' ? '7 Seater Spacious' : (req.vehicle === '4x4jeep' ? '4*4 Jeep Offroader' : 'Eco Auto'))}
                        </Text>
                        <Text style={[styles.cpCoords, { color: colors.amber, marginTop: verticalScale(4), fontWeight: '700' }]}>
                          Route Waypoints:
                        </Text>
                        {req.checkpoints.map((pt, idx) => (
                          <Text key={idx} style={{ fontSize: moderateFontScale(11), color: colors.textPrimary, marginLeft: scale(8), marginTop: verticalScale(2) }}>
                            ➔ {pt.name}
                          </Text>
                        ))}
                      </View>

                      <View style={{ height: 1, backgroundColor: colors.line, marginVertical: verticalScale(6) }} />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                        <TextInput
                          style={[styles.inputField, { flex: 1, height: verticalScale(34), color: colors.textPrimary, borderColor: colors.line, marginBottom: 0 }]}
                          placeholder="Quote Price (₹)"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={quoteInputs[req.id] || ''}
                          onChangeText={(text) => setQuoteInputs(prev => ({ ...prev, [req.id]: text }))}
                        />
                        <TouchableOpacity
                          style={[styles.primaryBtn, { backgroundColor: colors.amber, paddingVertical: 0, paddingHorizontal: scale(14), marginTop: 0, height: verticalScale(34), justifyContent: 'center' }]}
                          onPress={() => handleSendQuote(req.id)}
                        >
                          <Text style={[styles.primaryBtnText, { fontSize: moderateFontScale(11) }]}>Send Quote</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
              )}
            </View>
          </View>
        )}

        {/* 3. VOUCHER TAB */}
        {activeTab === 'voucher' && (
          <View>
            <Text style={[styles.tabHeading, { color: colors.amber }]}>
              {editingVoucherId ? 'Edit Voucher' : 'Create Promotion Voucher'}
            </Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <TextInput
                style={[styles.inputField, { color: colors.textPrimary, borderColor: colors.line, textTransform: 'uppercase' }]}
                placeholder="Voucher Code (e.g. SAVE20)"
                placeholderTextColor={colors.textMuted}
                value={newVoucherCode}
                onChangeText={setNewVoucherCode}
              />
              <TextInput
                style={[styles.inputField, { color: colors.textPrimary, borderColor: colors.line }]}
                placeholder="Promo Description"
                placeholderTextColor={colors.textMuted}
                value={newVoucherDesc}
                onChangeText={setNewVoucherDesc}
              />

              <View style={styles.voucherTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeSelector,
                    { borderColor: colors.line },
                    newVoucherType === 'percent' && { backgroundColor: 'rgba(245,197,24,0.12)', borderColor: colors.amber }
                  ]}
                  onPress={() => setNewVoucherType('percent')}
                >
                  <Text style={[styles.typeText, { color: colors.textPrimary }]}>Percentage (%)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelector,
                    { borderColor: colors.line },
                    newVoucherType === 'flat' && { backgroundColor: 'rgba(245,197,24,0.12)', borderColor: colors.amber }
                  ]}
                  onPress={() => setNewVoucherType('flat')}
                >
                  <Text style={[styles.typeText, { color: colors.textPrimary }]}>Flat Discount (₹)</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.inputField, { color: colors.textPrimary, borderColor: colors.line }]}
                placeholder={newVoucherType === 'percent' ? 'Discount Percentage (e.g. 15)' : 'Flat Discount Value (e.g. 100)'}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newVoucherVal}
                onChangeText={setNewVoucherVal}
              />

              <View style={styles.voucherActionRow}>
                {editingVoucherId && (
                  <TouchableOpacity 
                    style={[styles.cancelEditBtn, { borderColor: colors.line }]} 
                    onPress={() => {
                      setEditingVoucherId(null);
                      setNewVoucherCode('');
                      setNewVoucherDesc('');
                      setNewVoucherType('percent');
                      setNewVoucherVal('');
                    }}
                  >
                    <Text style={[styles.cancelEditText, { color: colors.textPrimary }]}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.amber, flex: 1 }]} onPress={handleSaveVoucher}>
                  <Text style={styles.primaryBtnText}>
                    {editingVoucherId ? 'Update Voucher' : 'Save Voucher'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.listHeader, { color: colors.textMuted }]}>ACTIVE PROMOTION VOUCHERS</Text>

            {vouchers.map(v => (
              <View key={v.id} style={[styles.listItemRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.voucherHeader}>
                    <Text style={[styles.voucherCodeText, { color: colors.textPrimary }]}>{v.code}</Text>
                    <View style={[styles.voucherBadge, { backgroundColor: 'rgba(245,197,24,0.1)' }]}>
                      <Text style={[styles.voucherBadgeText, { color: colors.amber }]}>
                        {v.type === 'percent' ? `${v.val}% OFF` : `₹${v.val} OFF`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.voucherDescText, { color: colors.textMuted }]}>{v.desc}</Text>
                </View>
                
                <View style={styles.listActionButtons}>
                  <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleEditVoucherClick(v)}>
                    <MaterialIcons name="edit" size={scale(18)} color={colors.amber} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleDeleteVoucher(v.id)}>
                    <MaterialIcons name="delete" size={scale(18)} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 4. DRIVER TAB */}
        {activeTab === 'driver' && (
          <View>
            <Text style={[styles.tabHeading, { color: colors.amber }]}>Drivers KYC & Active Controls</Text>

            {drivers.map(d => {
              const pendingKyc = d.status === 'Pending KYC';
              const isDeclined = d.status === 'KYC Declined';
              const isActive = d.status === 'Active';

              return (
                <View key={d.id} style={[styles.listItemRowPartner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={styles.partnerInfo}>
                    <View style={styles.partnerHeader}>
                      <Text style={[styles.partnerName, { color: colors.textPrimary }]}>{d.name}</Text>
                      <View style={[
                        styles.statusBadge,
                        { 
                          backgroundColor: isActive 
                            ? 'rgba(16,185,129,0.1)' 
                            : pendingKyc 
                            ? 'rgba(245,197,24,0.1)' 
                            : 'rgba(239,68,68,0.1)' 
                        }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          { 
                            color: isActive 
                              ? colors.success 
                              : pendingKyc 
                              ? colors.amber 
                              : colors.danger 
                          }
                        ]}>
                          {d.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.partnerSubtext, { color: colors.textMuted }]}>Phone: {d.phone}</Text>
                    <Text style={[styles.partnerSubtext, { color: colors.textMuted }]}>Vehicle: {d.vehicle}</Text>
                  </View>

                  {/* actions */}
                  <View style={styles.partnerActions}>
                    {pendingKyc ? (
                      <View style={styles.kycControls}>
                        <TouchableOpacity 
                          style={[styles.kycBtn, { backgroundColor: colors.success }]} 
                          onPress={() => handleDriverKyc(d.id, 'Accept')}
                        >
                          <Text style={styles.kycBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.kycBtn, { backgroundColor: colors.danger }]} 
                          onPress={() => handleDriverKyc(d.id, 'Decline')}
                        >
                          <Text style={styles.kycBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[
                          styles.statusToggleBtn, 
                          { borderColor: isActive ? colors.danger : colors.success }
                        ]}
                        onPress={() => handleToggleDriverStatus(d.id)}
                        disabled={isDeclined}
                      >
                        <Text style={[
                          styles.statusToggleText, 
                          { color: isActive ? colors.danger : colors.success }
                        ]}>
                          {isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 5. GUIDE TAB */}
        {activeTab === 'guide' && (
          <View>
            <Text style={[styles.tabHeading, { color: colors.amber }]}>Guides KYC & Active Controls</Text>

            {guides.map(g => {
              const pendingKyc = g.status === 'Pending KYC';
              const isDeclined = g.status === 'KYC Declined';
              const isActive = g.status === 'Active';

              return (
                <View key={g.id} style={[styles.listItemRowPartner, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                  <View style={styles.partnerInfo}>
                    <View style={styles.partnerHeader}>
                      <Text style={[styles.partnerName, { color: colors.textPrimary }]}>{g.name}</Text>
                      <View style={[
                        styles.statusBadge,
                        { 
                          backgroundColor: isActive 
                            ? 'rgba(16,185,129,0.1)' 
                            : pendingKyc 
                            ? 'rgba(245,197,24,0.1)' 
                            : 'rgba(239,68,68,0.1)' 
                        }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          { 
                            color: isActive 
                              ? colors.success 
                              : pendingKyc 
                              ? colors.amber 
                              : colors.danger 
                          }
                        ]}>
                          {g.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.partnerSubtext, { color: colors.textMuted }]}>Phone: {g.phone}</Text>
                    <Text style={[styles.partnerSubtext, { color: colors.textMuted }]}>Expertise: {g.expertise}</Text>
                  </View>

                  {/* actions */}
                  <View style={styles.partnerActions}>
                    {pendingKyc ? (
                      <View style={styles.kycControls}>
                        <TouchableOpacity 
                          style={[styles.kycBtn, { backgroundColor: colors.success }]} 
                          onPress={() => handleGuideKyc(g.id, 'Accept')}
                        >
                          <Text style={styles.kycBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.kycBtn, { backgroundColor: colors.danger }]} 
                          onPress={() => handleGuideKyc(g.id, 'Decline')}
                        >
                          <Text style={styles.kycBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[
                          styles.statusToggleBtn, 
                          { borderColor: isActive ? colors.danger : colors.success }
                        ]}
                        onPress={() => handleToggleGuideStatus(g.id)}
                        disabled={isDeclined}
                      >
                        <Text style={[
                          styles.statusToggleText, 
                          { color: isActive ? colors.danger : colors.success }
                        ]}>
                          {isActive ? 'Deactivate' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: verticalScale(100) }} />
      </ScrollView>

      {/* Admin Sticky Bottom Tab Bar */}
      <View style={[styles.tabBarContainer, { backgroundColor: isDark ? 'rgba(26,26,32,0.95)' : 'rgba(255,255,255,0.95)', borderColor: colors.line }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('plan')}>
          <MaterialIcons name="map" size={scale(20)} color={activeTab === 'plan' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: activeTab === 'plan' ? colors.amber : colors.textMuted }]}>Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('voucher')}>
          <FontAwesome5 name="ticket-alt" size={scale(18)} color={activeTab === 'voucher' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: activeTab === 'voucher' ? colors.amber : colors.textMuted }]}>Voucher</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('driver')}>
          <MaterialIcons name="local-taxi" size={scale(20)} color={activeTab === 'driver' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: activeTab === 'driver' ? colors.amber : colors.textMuted }]}>Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('guide')}>
          <MaterialIcons name="directions-walk" size={scale(20)} color={activeTab === 'guide' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: activeTab === 'guide' ? colors.amber : colors.textMuted }]}>Guide</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('dashboard')}>
          <MaterialIcons name="analytics" size={scale(20)} color={activeTab === 'dashboard' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabLabel, { color: activeTab === 'dashboard' ? colors.amber : colors.textMuted }]}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    height: verticalScale(50),
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.2,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  logoutBtn: {
    padding: scale(6),
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
  },
  tabHeading: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginVertical: verticalScale(12),
  },
  statsCard: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(18),
    marginBottom: verticalScale(16),
  },
  cardSectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    letterSpacing: 1,
  },
  revenueTitle: {
    fontSize: moderateFontScale(30),
    fontWeight: '800',
    marginVertical: verticalScale(4),
  },
  revenueSubtext: {
    fontSize: moderateFontScale(11),
    lineHeight: verticalScale(14),
  },
  divider: {
    height: 1.2,
    marginVertical: verticalScale(16),
  },
  revenueSplitRow: {
    flexDirection: 'row',
  },
  splitBox: {
    flex: 1,
    alignItems: 'center',
  },
  splitLabel: {
    fontSize: moderateFontScale(8),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  splitVal: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
    marginVertical: verticalScale(2),
  },
  splitFee: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1.2,
    alignSelf: 'stretch',
  },
  countsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  countCard: {
    flex: 1,
    borderRadius: scale(18),
    borderWidth: 1.2,
    padding: scale(14),
    alignItems: 'center',
  },
  countNumber: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    marginTop: verticalScale(6),
  },
  countLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginVertical: verticalScale(2),
  },
  countBadgeRow: {
    flexDirection: 'row',
    gap: scale(4),
    marginTop: verticalScale(4),
  },
  tinyBadge: {
    fontSize: moderateFontScale(8),
    fontWeight: '700',
    borderRadius: scale(4),
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(1),
  },
  infoBox: {
    flexDirection: 'row',
    borderWidth: 1.2,
    borderRadius: scale(12),
    padding: scale(10),
    alignItems: 'center',
    marginBottom: verticalScale(20),
    backgroundColor: 'rgba(245,197,24,0.04)',
  },
  infoText: {
    fontSize: moderateFontScale(11),
    flex: 1,
    lineHeight: verticalScale(14),
  },
  card: {
    borderRadius: scale(18),
    borderWidth: 1.2,
    padding: scale(16),
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginBottom: verticalScale(12),
  },
  priceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  priceLabel: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  priceInput: {
    width: scale(64),
    height: verticalScale(28),
    borderWidth: 1,
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    fontSize: moderateFontScale(12),
    fontWeight: '800',
    textAlign: 'center',
  },
  inputField: {
    height: verticalScale(38),
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(10),
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  coordInput: {
    flex: 1,
    height: verticalScale(38),
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  primaryBtn: {
    height: verticalScale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  checkpointsListContainer: {
    marginTop: scale(4),
  },
  listHeader: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: verticalScale(8),
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(10),
  },
  listItemRowPartner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.2,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(10),
  },
  cpName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  cpAddr: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(1),
  },
  cpCoords: {
    fontSize: moderateFontScale(9),
    marginTop: verticalScale(2),
  },
  deleteAction: {
    padding: scale(6),
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  voucherCodeText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  voucherBadge: {
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
  },
  voucherBadgeText: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
  },
  voucherDescText: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(4),
  },
  voucherTypeRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(10),
  },
  typeSelector: {
    flex: 1,
    height: verticalScale(34),
    borderWidth: 1.2,
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  voucherActionRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  cancelEditBtn: {
    height: verticalScale(36),
    borderRadius: scale(10),
    borderWidth: 1.2,
    paddingHorizontal: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  listActionButtons: {
    flexDirection: 'row',
    gap: scale(4),
  },
  actionBtnIcon: {
    padding: scale(6),
  },
  partnerInfo: {
    flex: 1.2,
    marginRight: scale(10),
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(4),
  },
  partnerName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
  },
  statusBadgeText: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
  },
  partnerSubtext: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(1),
  },
  partnerActions: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  kycControls: {
    flexDirection: 'row',
    gap: scale(4),
  },
  kycBtn: {
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
  },
  kycBtnText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  statusToggleBtn: {
    borderWidth: 1.2,
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
  },
  statusToggleText: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: scale(14),
    left: scale(14),
    right: scale(14),
    borderWidth: 1,
    borderRadius: scale(22),
    height: verticalScale(56),
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
});

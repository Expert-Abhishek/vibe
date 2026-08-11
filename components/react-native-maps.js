import React, { Component, forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Circle, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';

class MapErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[MapView ErrorBoundary] Native map rendering exception caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.fallbackContainer, this.props.style]}>
          <Text style={styles.fallbackTitle}>📍 Map View</Text>
          <Text style={styles.fallbackSub}>Interactive location map</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const SafeMapView = forwardRef((props, ref) => {
  return (
    <MapErrorBoundary style={props.style}>
      <MapView ref={ref} {...props} />
    </MapErrorBoundary>
  );
});

SafeMapView.displayName = 'SafeMapView';

const styles = StyleSheet.create({
  fallbackContainer: {
    backgroundColor: '#1C1C22',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    minHeight: 180,
  },
  fallbackTitle: {
    color: '#F5C518',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  fallbackSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
});

export { Marker, Polyline, Circle, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT };
export default SafeMapView;

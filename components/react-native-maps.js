import React, { Component, forwardRef, useRef, useImperativeHandle } from 'react';
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
  const innerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coordinates, options) => {
      setTimeout(() => {
        try {
          if (innerRef.current && typeof innerRef.current.fitToCoordinates === 'function') {
            innerRef.current.fitToCoordinates(coordinates, options);
          }
        } catch (e) {
          console.warn('[SafeMapView] fitToCoordinates bypassed safely:', e);
        }
      }, 400);
    },
    animateToRegion: (region, duration) => {
      setTimeout(() => {
        try {
          if (innerRef.current && typeof innerRef.current.animateToRegion === 'function') {
            innerRef.current.animateToRegion(region, duration);
          }
        } catch (e) {
          console.warn('[SafeMapView] animateToRegion bypassed safely:', e);
        }
      }, 400);
    },
    fitToElements: (animated) => {
      setTimeout(() => {
        try {
          if (innerRef.current && typeof innerRef.current.fitToElements === 'function') {
            innerRef.current.fitToElements(animated);
          }
        } catch (e) {
          console.warn('[SafeMapView] fitToElements bypassed safely:', e);
        }
      }, 400);
    },
    fitToSuppliedMarkers: (markers, options) => {
      setTimeout(() => {
        try {
          if (innerRef.current && typeof innerRef.current.fitToSuppliedMarkers === 'function') {
            innerRef.current.fitToSuppliedMarkers(markers, options);
          }
        } catch (e) {
          console.warn('[SafeMapView] fitToSuppliedMarkers bypassed safely:', e);
        }
      }, 400);
    },
    animateCamera: (camera, options) => {
      setTimeout(() => {
        try {
          if (innerRef.current && typeof innerRef.current.animateCamera === 'function') {
            innerRef.current.animateCamera(camera, options);
          }
        } catch (e) {
          console.warn('[SafeMapView] animateCamera bypassed safely:', e);
        }
      }, 400);
    },
    setCamera: (camera) => {
      setTimeout(() => {
        try {
          if (innerRef.current && typeof innerRef.current.setCamera === 'function') {
            innerRef.current.setCamera(camera);
          }
        } catch (e) {
          console.warn('[SafeMapView] setCamera bypassed safely:', e);
        }
      }, 400);
    },
  }));

  const { provider, ...restProps } = props;

  return (
    <MapErrorBoundary style={props.style}>
      <MapView
        ref={innerRef}
        provider={provider || PROVIDER_DEFAULT}
        {...restProps}
      />
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

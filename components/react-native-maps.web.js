import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletLoadedPromise = null;

function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.L) return Promise.resolve(window.L);

  if (!leafletLoadedPromise) {
    leafletLoadedPromise = new Promise((resolve) => {
      // 1. Inject CSS
      if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS_URL;
        document.head.appendChild(link);
      }

      // 2. Inject JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = LEAFLET_JS_URL;
        script.async = true;
        script.onload = () => {
          resolve(window.L);
        };
        script.onerror = () => {
          resolve(null);
        };
        document.head.appendChild(script);
      } else {
        resolve(window.L);
      }
    });
  }
  return leafletLoadedPromise;
}

// Marker and Polyline Context for Web
const MapContext = createContext(null);

const MapView = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [leafletState, setLeafletState] = useState(null);

  const initialLat = props.initialRegion?.latitude || props.region?.latitude || 12.9716;
  const initialLng = props.initialRegion?.longitude || props.region?.longitude || 77.5946;

  useEffect(() => {
    let isMounted = true;
    loadLeaflet().then((L) => {
      if (!isMounted || !L || !containerRef.current) return;
      setLeafletState(L);

      if (!mapInstanceRef.current) {
        try {
          const map = L.map(containerRef.current, {
            center: [initialLat, initialLng],
            zoom: 14,
            zoomControl: true,
            attributionControl: false,
          });

          // High-quality OpenStreetMap Voyager Carto tile layer
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
          }).addTo(map);

          mapInstanceRef.current = map;
        } catch (e) {
          console.warn('[Leaflet Web] Map initialization warning:', e);
        }
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {}
      }
    };
  }, []);

  // Update center when props.region or props.initialRegion changes
  useEffect(() => {
    if (mapInstanceRef.current && props.region && props.region.latitude && props.region.longitude) {
      try {
        mapInstanceRef.current.setView([props.region.latitude, props.region.longitude], mapInstanceRef.current.getZoom() || 14);
      } catch (e) {}
    }
  }, [props.region?.latitude, props.region?.longitude]);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coordinates, options) => {
      if (!mapInstanceRef.current || !leafletState || !coordinates || coordinates.length === 0) return;
      try {
        const bounds = leafletState.latLngBounds(
          coordinates.map((c) => [c.latitude, c.longitude])
        );
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [options?.edgePadding?.top || 50, options?.edgePadding?.right || 50],
          animate: options?.animated !== false,
        });
      } catch (e) {}
    },
    animateToRegion: (region, duration) => {
      if (!mapInstanceRef.current || !region) return;
      try {
        mapInstanceRef.current.flyTo([region.latitude, region.longitude], mapInstanceRef.current.getZoom() || 15, {
          duration: (duration || 800) / 1000,
        });
      } catch (e) {}
    },
    animateCamera: (camera) => {
      if (!mapInstanceRef.current || !camera?.center) return;
      try {
        mapInstanceRef.current.flyTo([camera.center.latitude, camera.center.longitude], camera.zoom || 15, {
          duration: (camera.duration || 800) / 1000,
        });
      } catch (e) {}
    },
    fitToElements: () => {},
    fitToSuppliedMarkers: () => {},
    setCamera: () => {},
  }));

  return (
    <View style={[styles.container, props.style]}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {mapInstanceRef.current && leafletState && (
        <MapContext.Provider value={{ map: mapInstanceRef.current, L: leafletState }}>
          {props.children}
        </MapContext.Provider>
      )}
    </View>
  );
});

MapView.displayName = 'MapViewWeb';

export const Marker = (props) => {
  const ctx = useContext(MapContext);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!ctx || !ctx.map || !ctx.L || !props.coordinate) return;
    const { map, L } = ctx;
    const { latitude, longitude } = props.coordinate;
    if (isNaN(latitude) || isNaN(longitude)) return;

    const color = props.pinColor || '#F5C518';
    const isCar = props.isCar ||
      String(props.title || '').toLowerCase().includes('driver') ||
      String(props.title || '').toLowerCase().includes('captain') ||
      String(props.title || '').toLowerCase().includes('car') ||
      String(props.title || '').toLowerCase().includes('vehicle');

    const heading = props.rotation || props.heading || 0;

    const iconHtml = isCar
      ? `<div style="
          transform: rotate(${heading}deg);
          transition: transform 0.3s ease;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.6));
        ">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="#F5C518" stroke="#101014" stroke-width="1.2">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/>
            <circle cx="7.5" cy="14.5" r="1.5" fill="#FFFFFF"/>
            <circle cx="16.5" cy="14.5" r="1.5" fill="#FFFFFF"/>
          </svg>
        </div>`
      : `<div style="
          background-color: ${color};
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000000;
          font-weight: 800;
          font-size: 11px;
        ">📍</div>`;

    const customIcon = L.divIcon({
      className: 'vibe-custom-pin',
      html: iconHtml,
      iconSize: isCar ? [42, 42] : [26, 26],
      iconAnchor: isCar ? [21, 21] : [13, 13],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      markerRef.current.setIcon(customIcon);
    } else {
      const m = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      if (props.title || props.description) {
        m.bindPopup(`<b>${props.title || ''}</b><br/>${props.description || ''}`);
      }
      markerRef.current = m;
    }
  }, [ctx, props.coordinate?.latitude, props.coordinate?.longitude, props.pinColor, props.rotation, props.heading, props.isCar, props.title, props.description]);

  useEffect(() => {
    return () => {
      if (markerRef.current && ctx?.map) {
        try {
          ctx.map.removeLayer(markerRef.current);
          markerRef.current = null;
        } catch (e) {}
      }
    };
  }, []);

  return null;
};

export const Polyline = (props) => {
  const ctx = useContext(MapContext);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!ctx || !ctx.map || !ctx.L || !props.coordinates || props.coordinates.length < 2) return;
    const { map, L } = ctx;

    const latLngs = props.coordinates
      .filter((c) => c && !isNaN(c.latitude) && !isNaN(c.longitude))
      .map((c) => [c.latitude, c.longitude]);

    if (latLngs.length < 2) return;

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
      polylineRef.current.setStyle({
        color: props.strokeColor || '#F5C518',
        weight: props.strokeWidth || 4,
      });
    } else {
      const poly = L.polyline(latLngs, {
        color: props.strokeColor || '#F5C518',
        weight: props.strokeWidth || 4,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);

      polylineRef.current = poly;
    }
  }, [ctx, props.coordinates, props.strokeColor, props.strokeWidth]);

  useEffect(() => {
    return () => {
      if (polylineRef.current && ctx?.map) {
        try {
          ctx.map.removeLayer(polylineRef.current);
          polylineRef.current = null;
        } catch (e) {}
      }
    };
  }, []);

  return null;
};

export const Circle = () => null;
export const Callout = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C22',
    overflow: 'hidden',
    position: 'relative',
  },
});

export default MapView;

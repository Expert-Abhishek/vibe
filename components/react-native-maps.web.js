import React from 'react';
import { View } from 'react-native';

const MapView = (props) => {
  return (
    <View style={[{ backgroundColor: '#1C1C22', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, props.style]}>
      {props.children}
    </View>
  );
};

export const Marker = () => null;
export const Polyline = () => null;
export const Callout = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export default MapView;

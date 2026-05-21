// Bespoke Google Maps styles — Midnight & Sunset aesthetic
// Both light and dark variants follow the brand. Applied via the
// customMapStyle prop on react-native-maps' MapView.

export const MidnightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#FAF7F2' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#1E1B4B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FAF7F2' }, { weight: 2 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#C7C2B6' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#6B6B7B' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DCE7DF' }, { visibility: 'on' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#EFEDE7' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E7E5E0' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B6B7B' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#D6D3CC' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#C7C2B6' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#E7E5E0' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#A7B5D8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1E1B4B' }] },
];

// Dark variant — deep midnight land, indigo roads, golden labels
export const MidnightMapStyleDark = [
  { elementType: 'geometry', stylers: [{ color: '#0A0717' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#FCD34D' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0717' }, { weight: 2 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2D2A5C' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#A5B4FC' }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#14112E' }, { visibility: 'on' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1740' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2D2A5C' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#A5B4FC' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2D2A5C' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#4338CA' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1A1740' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050211' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#818CF8' }] },
];

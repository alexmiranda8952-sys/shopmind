const METERS_PER_MILE = 1609.344;

export function formatDistance(meters: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    const miles = meters / METERS_PER_MILE;
    return miles < 1
      ? `${(miles * 10 % 1 === 0 ? miles.toFixed(1) : miles.toFixed(2)).replace(/\.?0+$/, '')} mi`
      : `${parseFloat(miles.toFixed(1))} mi`;
  }
  return meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
}

export function formatRadiusLabel(meters: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    const miles = meters / METERS_PER_MILE;
    if (miles < 0.2) return '¼ mi';
    if (miles < 0.4) return '⅓ mi';
    if (miles < 0.7) return '½ mi';
    if (miles < 1.5) return '1 mi';
    return `${Math.round(miles)} mi`;
  }
  return meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;
}

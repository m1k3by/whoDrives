import { View } from 'react-native';

import { useColors } from './theme';

// Simple outline icons drawn with Views: no icon font, no new native dependency.

/** Magnifying glass outline */
export function SearchIcon({ color, size = 26 }: { color?: string; size?: number }) {
  const c = useColors();
  const stroke = Math.max(2, size * 0.1);
  const ring = size * 0.66;
  const tint = color ?? c.icon;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: stroke,
          borderColor: tint,
        }}
      />
      <View
        style={{
          position: 'absolute',
          transform: [{ rotate: '-45deg' }],
          width: stroke,
          height: size * 0.38,
          backgroundColor: tint,
          borderRadius: stroke / 2,
          left: ring * 0.92,
          top: ring * 0.72,
        }}
      />
    </View>
  );
}

/** Three lines */
export function MenuIcon({ color, size = 26 }: { color?: string; size?: number }) {
  const c = useColors();
  const stroke = Math.max(2, size * 0.1);
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-evenly' }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{ height: stroke, borderRadius: stroke / 2, backgroundColor: color ?? c.icon }}
        />
      ))}
    </View>
  );
}

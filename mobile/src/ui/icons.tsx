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

/** Microphone: capsule, holder arc, stand */
export function MicIcon({ color, size = 26 }: { color?: string; size?: number }) {
  const c = useColors();
  const tint = color ?? c.icon;
  const stroke = Math.max(2, size * 0.08);
  const capsuleW = size * 0.36;
  const arcW = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: capsuleW,
          height: size * 0.56,
          borderRadius: capsuleW / 2,
          backgroundColor: tint,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.26,
          width: arcW,
          height: size * 0.46,
          borderWidth: stroke,
          borderTopWidth: 0,
          borderColor: tint,
          borderBottomLeftRadius: arcW / 2,
          borderBottomRightRadius: arcW / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.72,
          width: stroke,
          height: size * 0.16,
          backgroundColor: tint,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.88,
          width: size * 0.36,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: tint,
        }}
      />
    </View>
  );
}

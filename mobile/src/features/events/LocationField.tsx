import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field } from '@/ui/components';
import { makeStyles } from '@/ui/theme';

import { searchPlaces } from './places';

const MAX_LENGTH = 100; // events.location check constraint

/**
 * Free text field for the place, with address suggestions while typing.
 * Without internet there are simply no suggestions; the typed text still counts.
 */
export function LocationField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useStyles();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // only suggest while the user types, not after a suggestion was chosen
  const [typing, setTyping] = useState(false);

  const searching = typing && value.trim().length >= 3;

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(value.trim(), controller.signal)
        .then(setSuggestions)
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, searching]);

  return (
    <View style={styles.wrap}>
      <Field
        label={label}
        placeholder={placeholder}
        value={value}
        maxLength={MAX_LENGTH}
        onChangeText={(text) => {
          setTyping(true);
          onChange(text);
        }}
      />
      {(searching ? suggestions : []).map((place) => (
        <Pressable
          key={place}
          accessibilityRole="button"
          onPress={() => {
            setTyping(false);
            onChange(place.slice(0, MAX_LENGTH));
          }}
          style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
        >
          <Text style={styles.suggestionText}>{place}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { gap: 6 },
  suggestion: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
  },
  suggestionText: { fontSize: 18, color: c.text },
  pressed: { opacity: 0.7 },
}));

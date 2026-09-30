import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { makeStyles } from '@/ui/theme';

/**
 * Looks like a text field, but opens a popup to choose the value (date, time).
 * `text` is the chosen value, or null to show `placeholder`.
 */
export function PickerField({
  label,
  text,
  placeholder,
  open,
  onOpen,
  onClose,
  children,
  footer,
}: {
  label: string;
  text: string | null;
  placeholder: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Content of the popup */
  children: ReactNode;
  /** Shown below the field, e.g. a "remove" button */
  footer?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text ?? placeholder}`}
        onPress={onOpen}
        style={styles.input}
      >
        <Text style={[styles.value, !text && styles.placeholder]}>{text ?? placeholder}</Text>
      </Pressable>
      {footer}

      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.label}>{label}</Text>
            {children}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  field: { gap: 8 },
  label: { fontSize: 20, fontWeight: '600', color: c.text },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  value: { fontSize: 22, color: c.text },
  placeholder: { color: c.muted },
  backdrop: {
    flex: 1,
    backgroundColor: c.backdrop,
    justifyContent: 'center',
    padding: 12,
  },
  sheet: { backgroundColor: c.surface, borderRadius: 20, padding: 16, gap: 12 },
}));

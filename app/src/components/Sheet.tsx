import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: space(5) },
  sheet: {
    backgroundColor: colors.bgElevated, borderRadius: radius.xl, padding: space(6), gap: space(4),
    borderWidth: 1, borderColor: colors.border, width: '100%', maxWidth: 440, alignSelf: 'center',
  },
});

export const SheetSpacer = () => <View style={{ height: space(1) }} />;

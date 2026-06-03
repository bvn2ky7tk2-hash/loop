import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Portal, Modal, Text, IconButton } from 'react-native-paper';
import { useThemePalette } from '../../hooks/useThemePalette';

interface CenteredModalProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Mirror <CenteredModal> web — thay thế cả Modal lẫn Drawer (KHÔNG dùng side-drawer).
 * Trên mobile: bottom-sheet căn giữa, full-width, có header + body scroll + footer.
 */
export function CenteredModal({ visible, onDismiss, title, footer, children }: CenteredModalProps) {
  const { bgContainer, borderColor, textPrimary } = useThemePalette();
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: bgContainer, borderColor }]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {title ? (
            <View style={[styles.header, { borderBottomColor: borderColor }]}>
              <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>{title}</Text>
              <IconButton icon="close" size={20} onPress={onDismiss} />
            </View>
          ) : null}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={[styles.footer, { borderTopColor: borderColor }]}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, maxHeight: '85%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 4, paddingVertical: 8, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '700', flex: 1 },
  body: { maxHeight: 520 },
  bodyContent: { padding: 16 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
});

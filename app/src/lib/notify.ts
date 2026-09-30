import { Alert, Platform } from 'react-native';

export function notify(message: string, title = 'Lumi') {
  if (Platform.OS === 'web') window.alert(message);
  else Alert.alert(title, message);
}

/** Cross-platform confirmation dialog. */
export function confirm(message: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert('Lumi', message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

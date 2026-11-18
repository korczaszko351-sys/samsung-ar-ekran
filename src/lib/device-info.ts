import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type DeviceSummary = {
  model: string;
  manufacturer: string;
  os: string;
  isSamsung: boolean;
};

/**
 * Only descriptive facts reported by the system. The app deliberately does not ask
 * Google Play Services for AR whether ARCore is installed: the whole point is that it
 * works when that service is unavailable or blocked.
 */
export function deviceSummary(): DeviceSummary {
  const manufacturer = Device.manufacturer ?? (Platform.OS === 'android' ? 'Android' : 'Apple');
  const model =
    Device.modelName ?? Device.deviceName ?? (Platform.OS === 'web' ? 'Przeglądarka' : 'Nieznany model');
  const os = `${Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Web'}` +
    (Device.osVersion ? ` ${Device.osVersion}` : '');
  return {
    model,
    manufacturer,
    os,
    isSamsung: (Device.manufacturer ?? '').toLowerCase().includes('samsung'),
  };
}

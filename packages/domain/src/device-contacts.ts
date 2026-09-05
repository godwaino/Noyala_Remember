import type { PersonImportCandidate } from "./contact-import";

/**
 * Contract for pulling contacts directly from the user's device, satisfying
 * Master Build Prompt §10's "native-device contact adapter contract and
 * test implementation." A concrete browser implementation
 * (apps/web/src/components/browser-contact-picker.ts) uses the W3C Contact
 * Picker API; a future Expo/React Native implementation (Stage 7) would
 * satisfy this same contract using the device's native contacts API,
 * without the import wizard needing to change.
 */
export interface DeviceContactProvider {
  /** Whether this device/browser can actually offer device-contact import
   * right now — callers should hide the entry point entirely when false,
   * rather than showing a button that always fails. */
  isAvailable(): boolean;
  /** Opens the platform's own contact picker UI and returns exactly the
   * contacts the user explicitly selected there — nothing is read without
   * that picker's own permission prompt. */
  pickContacts(): Promise<PersonImportCandidate[]>;
}

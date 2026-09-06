import * as Contacts from "expo-contacts";
import type { DeviceContactProvider, ImportBirthday, PersonImportCandidate } from "@noyala/domain";

/**
 * Expo/React Native implementation of @noyala/domain's DeviceContactProvider
 * contract — the Stage 7 continuation docs/roadmap.md pointed at
 * ("a future Expo/React Native implementation ... satisfy this same
 * contract using the device's native contacts API, without the import
 * wizard needing to change"). Mirrors
 * apps/web/src/components/browser-contact-picker.ts's shape, backed by
 * expo-contacts instead of the W3C Contact Picker API.
 *
 * expo-contacts' `presentContactPickerAsync` opens the OS's own contact
 * picker but returns one contact per call (no native multi-select on this
 * API) — so "opening the picker" here happens once per person the user
 * adds, not once for a whole batch. The import screen calls `pickOne()`
 * in a loop, closest to the design's "opens the phone's own picker" intent
 * that the actual API allows for. Not verified against a real device or
 * simulator in this environment — see docs/roadmap.md's existing
 * "Device-contact picker not verified on a real device" note, which
 * applies here too.
 */
export const expoDeviceContactProvider: DeviceContactProvider = {
  isAvailable() {
    return true;
  },
  async pickContacts() {
    const contact = await pickOne();
    return contact ? [contact] : [];
  },
};

export async function pickOne(): Promise<PersonImportCandidate | null> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") return null;

  const contact = await Contacts.presentContactPickerAsync();
  if (!contact) return null;

  const phone = contact.phoneNumbers?.[0]?.number ?? null;
  const email = contact.emails?.[0]?.email ?? null;
  const birthday = toBirthday(contact.birthday);

  return {
    sourceRowIndex: 0,
    firstName: contact.firstName || contact.name || "",
    lastName: contact.lastName || null,
    nickname: contact.nickname || null,
    relationshipType: "other",
    phone,
    email,
    pronouns: null,
    notes: null,
    birthday,
  };
}

function toBirthday(
  value: { day?: number; month?: number; year?: number } | undefined,
): ImportBirthday | null {
  if (!value || value.day === undefined || value.month === undefined) return null;
  // expo-contacts' DateComponents.month is 0-indexed (like JS Date), while
  // @noyala/domain (and the important_dates table) use 1-12.
  return { day: value.day, month: value.month + 1, year: value.year ?? null };
}

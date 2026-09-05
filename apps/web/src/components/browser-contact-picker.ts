import type { DeviceContactProvider, PersonImportCandidate } from "@noyala/domain";

interface ContactPickerResult {
  name?: string[];
  email?: string[];
  tel?: string[];
}

interface ContactsManager {
  select(properties: string[], options?: { multiple?: boolean }): Promise<ContactPickerResult[]>;
}

function getContactsManager(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  return nav.contacts ?? null;
}

/**
 * Implemented against the W3C Contact Picker API
 * (https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API),
 * supported on Chrome for Android as of writing — not available on desktop
 * browsers or iOS Safari, which is why `isAvailable()` must be checked
 * before showing this as an option. Not verified against a real device in
 * this environment (no mobile Chrome browser available here) — see
 * docs/integrations.md.
 */
export function createBrowserContactPicker(): DeviceContactProvider {
  return {
    isAvailable() {
      return getContactsManager() !== null;
    },
    async pickContacts(): Promise<PersonImportCandidate[]> {
      const manager = getContactsManager();
      if (!manager) return [];

      const results = await manager.select(["name", "email", "tel"], { multiple: true });
      return results.map((contact, sourceRowIndex) => {
        const fullName = (contact.name?.[0] ?? "").trim();
        const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
        return {
          sourceRowIndex,
          firstName: firstName || fullName,
          lastName: rest.length > 0 ? rest.join(" ") : null,
          nickname: null,
          relationshipType: "other",
          phone: contact.tel?.[0] ?? null,
          email: contact.email?.[0] ?? null,
          pronouns: null,
          notes: null,
          birthday: null,
        };
      });
    },
  };
}

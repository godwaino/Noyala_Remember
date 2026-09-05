import { describe, expect, it } from "vitest";
import { toVCard, toVCardCollection } from "../vcard";

describe("toVCard", () => {
  it("renders the minimal required fields", () => {
    const card = toVCard({ firstName: "Amara" });
    expect(card).toContain("BEGIN:VCARD");
    expect(card).toContain("VERSION:3.0");
    expect(card).toContain("FN:Amara");
    expect(card).toContain("N:;Amara;;;");
    expect(card).toContain("END:VCARD");
  });

  it("includes optional fields only when present", () => {
    const card = toVCard({
      firstName: "Amara",
      lastName: "Okafor",
      phone: "+441234567890",
      email: "amara@example.com",
      notes: "Loves pottery",
    });
    expect(card).toContain("FN:Amara Okafor");
    expect(card).toContain("N:Okafor;Amara;;;");
    expect(card).toContain("TEL:+441234567890");
    expect(card).toContain("EMAIL:amara@example.com");
    expect(card).toContain("NOTE:Loves pottery");
  });

  it("escapes commas, semicolons and newlines in free text", () => {
    const card = toVCard({ firstName: "Amara", notes: "Line one\nSemi;colon,comma" });
    expect(card).toContain("NOTE:Line one\\nSemi\\;colon\\,comma");
  });
});

describe("toVCardCollection", () => {
  it("concatenates multiple cards", () => {
    const collection = toVCardCollection([{ firstName: "Amara" }, { firstName: "Priya" }]);
    expect(collection.match(/BEGIN:VCARD/g)).toHaveLength(2);
    expect(collection.match(/END:VCARD/g)).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import {
  canManageCircle,
  canManageInvitations,
  canPlanGifts,
  canRemoveMember,
  canShareOwnPerson,
} from "../circles";

describe("canManageCircle", () => {
  it("is owner-only", () => {
    expect(canManageCircle("owner")).toBe(true);
    expect(canManageCircle("organiser")).toBe(false);
    expect(canManageCircle("viewer")).toBe(false);
  });
});

describe("canManageInvitations", () => {
  it("allows owner and organiser, not viewer", () => {
    expect(canManageInvitations("owner")).toBe(true);
    expect(canManageInvitations("organiser")).toBe(true);
    expect(canManageInvitations("viewer")).toBe(false);
  });
});

describe("canShareOwnPerson", () => {
  it("allows owner and organiser, not viewer", () => {
    expect(canShareOwnPerson("owner")).toBe(true);
    expect(canShareOwnPerson("organiser")).toBe(true);
    expect(canShareOwnPerson("viewer")).toBe(false);
  });
});

describe("canPlanGifts", () => {
  it("is open to every role", () => {
    expect(canPlanGifts("owner")).toBe(true);
    expect(canPlanGifts("organiser")).toBe(true);
    expect(canPlanGifts("viewer")).toBe(true);
  });
});

describe("canRemoveMember", () => {
  it("always allows leaving (removing yourself)", () => {
    expect(canRemoveMember("viewer", true)).toBe(true);
    expect(canRemoveMember("organiser", true)).toBe(true);
  });

  it("only allows removing someone else if you're the owner", () => {
    expect(canRemoveMember("owner", false)).toBe(true);
    expect(canRemoveMember("organiser", false)).toBe(false);
    expect(canRemoveMember("viewer", false)).toBe(false);
  });
});

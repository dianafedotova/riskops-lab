import { describe, expect, it } from "vitest";
import {
  canAccessAdminRoute,
  canCreatePrivateNotes,
  canDeactivateOwnAccount,
  canReplyAsQA,
  canSeeAdminPanel,
  canSeeAdminNavLink,
  canSeeStaffActionControls,
  canSeeTraineeWorkspace,
  canViewPrivateNotes,
  canWriteTraineeDiscussion,
} from "@/lib/permissions/checks";

const MATRIX = {
  trainee: {
    canAccessAdminRoute: false,
    canSeeAdminNavLink: false,
    canSeeAdminPanel: false,
    canSeeStaffActionControls: false,
    canSeeTraineeWorkspace: true,
    canDeactivateOwnAccount: true,
    canReplyAsQA: false,
    canViewPrivateNotes: false,
    canCreatePrivateNotes: false,
    canWriteTraineeDiscussion: true,
  },
  reviewer: {
    canAccessAdminRoute: true,
    canSeeAdminNavLink: true,
    canSeeAdminPanel: true,
    canSeeStaffActionControls: true,
    canSeeTraineeWorkspace: false,
    canDeactivateOwnAccount: false,
    canReplyAsQA: true,
    canViewPrivateNotes: true,
    canCreatePrivateNotes: true,
    canWriteTraineeDiscussion: false,
  },
  ops_admin: {
    canAccessAdminRoute: true,
    canSeeAdminNavLink: true,
    canSeeAdminPanel: true,
    canSeeStaffActionControls: true,
    canSeeTraineeWorkspace: false,
    canDeactivateOwnAccount: false,
    canReplyAsQA: true,
    canViewPrivateNotes: true,
    canCreatePrivateNotes: true,
    canWriteTraineeDiscussion: false,
  },
  super_admin: {
    canAccessAdminRoute: true,
    canSeeAdminNavLink: true,
    canSeeAdminPanel: true,
    canSeeStaffActionControls: true,
    canSeeTraineeWorkspace: false,
    canDeactivateOwnAccount: false,
    canReplyAsQA: true,
    canViewPrivateNotes: true,
    canCreatePrivateNotes: true,
    canWriteTraineeDiscussion: false,
  },
} as const;

describe("permission matrix", () => {
  for (const [role, expected] of Object.entries(MATRIX)) {
    it(`matches canonical access rules for ${role}`, () => {
      expect(canAccessAdminRoute(role)).toBe(expected.canAccessAdminRoute);
      expect(canSeeAdminNavLink(role)).toBe(expected.canSeeAdminNavLink);
      expect(canSeeAdminPanel(role)).toBe(expected.canSeeAdminPanel);
      expect(canSeeStaffActionControls(role)).toBe(expected.canSeeStaffActionControls);
      expect(canSeeTraineeWorkspace(role)).toBe(expected.canSeeTraineeWorkspace);
      expect(canDeactivateOwnAccount(role)).toBe(expected.canDeactivateOwnAccount);
      expect(canReplyAsQA(role)).toBe(expected.canReplyAsQA);
      expect(canViewPrivateNotes(role)).toBe(expected.canViewPrivateNotes);
      expect(canCreatePrivateNotes(role)).toBe(expected.canCreatePrivateNotes);
      expect(canWriteTraineeDiscussion(role)).toBe(expected.canWriteTraineeDiscussion);
    });
  }

  it("denies access for missing actor context", () => {
    expect(canAccessAdminRoute(null)).toBe(false);
    expect(canReplyAsQA(undefined)).toBe(false);
    expect(canViewPrivateNotes(null)).toBe(false);
    expect(canWriteTraineeDiscussion(undefined)).toBe(false);
  });
});

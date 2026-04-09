import { describe, expect, it } from "vitest";
import type { ReviewSubmissionRow } from "@/lib/types";
import {
  caseMatchesWorkspacePhase,
  countKpiByPhase,
  deriveCasePhase,
  filterActiveCases,
  filterTraineeCasesForWorkspace,
  pickLatestSubmissionByThread,
  type TraineeCaseRow,
} from "@/lib/trainee-cases";

function mockSubmission(
  partial: Partial<ReviewSubmissionRow> &
    Pick<ReviewSubmissionRow, "thread_id" | "submission_version" | "review_state">
): ReviewSubmissionRow {
  return {
    id: partial.id ?? "sub-id",
    thread_id: partial.thread_id,
    organization_id: partial.organization_id ?? "org",
    app_user_id: partial.app_user_id ?? "user",
    alert_id: partial.alert_id ?? null,
    user_id: partial.user_id ?? null,
    submission_version: partial.submission_version,
    submitted_root_comment_id: partial.submitted_root_comment_id ?? null,
    submitted_at: partial.submitted_at ?? "2024-01-01T00:00:00Z",
    decision_snapshot: partial.decision_snapshot ?? null,
    proposed_alert_status: partial.proposed_alert_status ?? null,
    user_status_snapshot: partial.user_status_snapshot ?? null,
    alert_status_snapshot: partial.alert_status_snapshot ?? null,
    rationale_snapshot: partial.rationale_snapshot ?? null,
    review_state: partial.review_state,
    evaluation: partial.evaluation ?? null,
    feedback: partial.feedback ?? null,
    review_target_type: partial.review_target_type ?? "human",
    reviewed_by_app_user_id: partial.reviewed_by_app_user_id ?? null,
    reviewed_at: partial.reviewed_at ?? null,
    created_at: partial.created_at ?? "2024-01-01T00:00:00Z",
    updated_at: partial.updated_at ?? "2024-01-01T00:00:00Z",
  };
}

function mockCase(
  partial: Partial<TraineeCaseRow> & Pick<TraineeCaseRow, "threadId" | "casePhase">
): TraineeCaseRow {
  return {
    alertPublicId: null,
    profileUserId: null,
    targetHref: "/",
    targetLabel: "X",
    lastSnippet: "—",
    updatedAt: "2024-01-01T00:00:00Z",
    latestSubmission: null,
    alertStatus: null,
    simulatorUserStatus: null,
    profileSearchText: "",
    ...partial,
  };
}

describe("pickLatestSubmissionByThread", () => {
  it("keeps the row with the greatest submission_version per thread", () => {
    const rows = [
      mockSubmission({ thread_id: "t1", submission_version: 1, review_state: "submitted" }),
      mockSubmission({ thread_id: "t1", submission_version: 3, review_state: "in_review" }),
      mockSubmission({ thread_id: "t1", submission_version: 2, review_state: "changes_requested" }),
      mockSubmission({ thread_id: "t2", submission_version: 1, review_state: "approved" }),
    ];
    const map = pickLatestSubmissionByThread(rows);
    expect(map.get("t1")?.review_state).toBe("in_review");
    expect(map.get("t1")?.submission_version).toBe(3);
    expect(map.get("t2")?.review_state).toBe("approved");
  });
});

describe("deriveCasePhase", () => {
  it("returns draft when there is no submission", () => {
    expect(deriveCasePhase(null)).toBe("draft");
  });

  it("returns review_state of the latest row", () => {
    expect(deriveCasePhase(mockSubmission({ thread_id: "t", submission_version: 1, review_state: "closed" }))).toBe(
      "closed"
    );
  });
});

describe("countKpiByPhase", () => {
  it("counts only KPI buckets and excludes draft", () => {
    const cases = [
      mockCase({ threadId: "1", casePhase: "draft" }),
      mockCase({ threadId: "2", casePhase: "submitted" }),
      mockCase({ threadId: "3", casePhase: "submitted" }),
      mockCase({ threadId: "4", casePhase: "in_review" }),
      mockCase({ threadId: "5", casePhase: "changes_requested" }),
      mockCase({ threadId: "6", casePhase: "approved" }),
      mockCase({ threadId: "7", casePhase: "closed" }),
    ];
    expect(countKpiByPhase(cases)).toEqual({
      initiated: 2,
      underReview: 1,
      needsAttention: 1,
      done: 2,
    });
  });
});

describe("filterActiveCases", () => {
  it("excludes draft, approved, and closed", () => {
    const cases = [
      mockCase({ threadId: "a", casePhase: "draft" }),
      mockCase({ threadId: "b", casePhase: "submitted" }),
      mockCase({ threadId: "c", casePhase: "in_review" }),
      mockCase({ threadId: "d", casePhase: "approved" }),
      mockCase({ threadId: "e", casePhase: "closed" }),
    ];
    const ids = filterActiveCases(cases).map((c) => c.threadId).sort();
    expect(ids).toEqual(["b", "c"]);
  });
});

describe("caseMatchesWorkspacePhase", () => {
  it("maps done to approved or closed", () => {
    expect(caseMatchesWorkspacePhase(mockCase({ threadId: "1", casePhase: "approved" }), "done")).toBe(true);
    expect(caseMatchesWorkspacePhase(mockCase({ threadId: "2", casePhase: "closed" }), "done")).toBe(true);
    expect(caseMatchesWorkspacePhase(mockCase({ threadId: "3", casePhase: "submitted" }), "done")).toBe(false);
  });

  it("excludes draft when phase is all", () => {
    expect(caseMatchesWorkspacePhase(mockCase({ threadId: "d", casePhase: "draft" }), "all")).toBe(false);
    expect(caseMatchesWorkspacePhase(mockCase({ threadId: "s", casePhase: "submitted" }), "all")).toBe(true);
  });
});

describe("filterTraineeCasesForWorkspace", () => {
  it("filters by alert and user status and search text", () => {
    const cases: TraineeCaseRow[] = [
      mockCase({
        threadId: "1",
        casePhase: "submitted",
        alertPublicId: "ALT-1",
        alertStatus: "Open",
        profileSearchText: "alt-1 jane@x.com",
        targetLabel: "Alert ALT-1",
      }),
      mockCase({
        threadId: "2",
        casePhase: "submitted",
        profileUserId: "u1",
        simulatorUserStatus: "active",
        profileSearchText: "u1 john@y.com",
        targetLabel: "User John",
      }),
    ];
    const openOnly = filterTraineeCasesForWorkspace(cases, {
      phase: "all",
      caseType: "all",
      alertStatus: "Open",
      userStatus: "all",
      searchQuery: "",
    });
    expect(openOnly.map((c) => c.threadId)).toEqual(["1"]);

    const activeUser = filterTraineeCasesForWorkspace(cases, {
      phase: "all",
      caseType: "all",
      alertStatus: "all",
      userStatus: "active",
      searchQuery: "",
    });
    expect(activeUser.map((c) => c.threadId)).toEqual(["2"]);

    const byEmail = filterTraineeCasesForWorkspace(cases, {
      phase: "all",
      caseType: "all",
      alertStatus: "all",
      userStatus: "all",
      searchQuery: "john@y",
    });
    expect(byEmail.map((c) => c.threadId)).toEqual(["2"]);

    const alertsOnly = filterTraineeCasesForWorkspace(cases, {
      phase: "all",
      caseType: "alert",
      alertStatus: "all",
      userStatus: "all",
      searchQuery: "",
    });
    expect(alertsOnly.map((c) => c.threadId)).toEqual(["1"]);

    const usersOnly = filterTraineeCasesForWorkspace(cases, {
      phase: "all",
      caseType: "user",
      alertStatus: "all",
      userStatus: "all",
      searchQuery: "",
    });
    expect(usersOnly.map((c) => c.threadId)).toEqual(["2"]);

    const withDraft = [
      ...cases,
      mockCase({
        threadId: "3",
        casePhase: "draft",
        alertPublicId: "ALT-D",
        alertStatus: "Open",
        profileSearchText: "",
        targetLabel: "Alert ALT-D",
      }),
    ];
    const allPhaseHidesDraft = filterTraineeCasesForWorkspace(withDraft, {
      phase: "all",
      caseType: "all",
      alertStatus: "all",
      userStatus: "all",
      searchQuery: "",
    });
    expect(allPhaseHidesDraft.map((c) => c.threadId).sort()).toEqual(["1", "2"]);

    const draftOnly = filterTraineeCasesForWorkspace(withDraft, {
      phase: "draft",
      caseType: "all",
      alertStatus: "all",
      userStatus: "all",
      searchQuery: "",
    });
    expect(draftOnly.map((c) => c.threadId)).toEqual(["3"]);
  });
});

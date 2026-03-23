/** Human-readable labels for ops_events.action_type. Keeps UI flexible, DB clean. */
export const opsEventLabels: Record<string, string> = {
  account_restricted: "Account restricted",
  account_blocked: "Account blocked",
  account_unblocked: "Account unblocked",
  account_closed: "Account closed",
  poa_approved: "POA approved",
  poi_approved: "POI approved",
  sof_approved: "SOF approved",
  risk_updated: "Risk updated",
  block_applied: "Block applied",
  sof_complete: "SOF complete",
};

export function getOpsEventLabel(actionType: string | null): string {
  if (!actionType) return "—";
  return opsEventLabels[actionType] ?? actionType;
}

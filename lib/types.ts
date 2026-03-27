import type { AppUserRole } from "./app-user-role";

export type AlertPublicId = string;
export type AlertInternalId = string;
export type ReviewThreadContextType = "alert" | "profile";
/**
 * Persisted workflow marker in legacy table columns such as
 * `simulator_comments.author_role` / `admin_private_notes.author_role`.
 * This is NOT the canonical app role model from `public.app_users.role`.
 */
export type PersistedWorkflowAuthorRole = "admin" | "trainee";
export type SimulatorCommentType = "user_comment" | "admin_qa" | "admin_private";
export type TraineeDecisionValue =
  | "false_positive"
  | "true_positive"
  | "info_requested"
  | "escalated";

/** Rows from `public.users` / `public.alerts` (snake_case = Postgres columns). */
export type UserRow = {
  id: string;
  email: string;
  country_code: string | null;
  /** Full country name from users.country_name */
  country_name: string | null;
  tier: string | null;
  status: string | null;
  risk_level: string | null;
  full_name: string | null;
  registration_date: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  address_text: string | null;
  proof_of_identity: string | null;
  proof_of_address: string | null;
  source_of_funds_docs: string | null;
  current_balance_usd: number | null;
  total_turnover_usd: number | null;
  is_high_tier: boolean | null;
  /** SOF questionnaire (Tier 2 & 3) */
  occupation?: string | null;
  employment_status?: string | null;
  annual_income_min_usd?: number | null;
  annual_income_max_usd?: number | null;
  primary_source_of_funds?: string | null;
  /** Path in Supabase storage bucket `selfie` */
  selfie_path?: string | null;
};

export type AlertRow = {
  /** Canonical UI / display alert identifier. */
  id: AlertPublicId;
  /** Canonical technical alert identifier for joins / workflow refs. */
  internal_id?: AlertInternalId | null;
  user_id: string | null;
  /** Some DBs use alert_type instead of type */
  alert_type?: string | null;
  /** Legacy column; omit in queries when the DB only has `alert_type` */
  type?: string | null;
  severity: string | null;
  status: string | null;
  description: string | null;
  created_at: string;
};

export type UserFinancialsRow = {
  user_id: string;
  current_balance: number | null;
  total_turnover: number | null;
};

export type PaymentMethodRow = {
  id: string;
  user_id: string | null;
  type: string | null;
  masked_number: string | null;
  card_network: string | null;
  status: string | null;
  bank_type: string | null;
  account_number: string | null;
  wallet_type: string | null;
  wallet_address: string | null;
};

export type TransactionRow = {
  id: string;
  user_id: string | null;
  transaction_date: string | null;
  direction: string | null;
  type: string | null;
  channel: string | null;
  counterparty_name: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
};

export type UserEventRow = {
  id: string;
  user_id: string;
  event_time: string;
  event_type: string;
  device_id: string | null;
  ip_address: string | null;
  country_code: string | null;
  device_name: string | null;
  created_at: string;
};

export type OpsEventRow = {
  id: string;
  user_id: string;
  event_time: string;
  action_type: string;
  performed_by: string | null;
};

/** Real app user (trainee or staff), linked to auth.users */
export type AppUserRow = {
  id: string;
  auth_user_id: string;
  role: AppUserRole;
  email: string | null;
  created_at: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  country_code: string | null;
  country_name: string | null;
  avatar_url: string | null;
  provider: string | null;
  status: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
  updated_at: string | null;
};

/** Training / simulation comments only */
export type SimulatorCommentRow = {
  id: string;
  thread_id?: string | null;
  decision_id?: string | null;
  user_id: string | null;
  alert_id: AlertPublicId | null;
  author_app_user_id: string;
  /** Legacy persisted DB marker; not the canonical app role union. */
  author_role: PersistedWorkflowAuthorRole;
  comment_type: SimulatorCommentType;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
  updated_at?: string | null;
};

export type ReviewDiscussionCommentRow = SimulatorCommentRow & {
  comment_type: "user_comment" | "admin_qa";
};

export type PrivateNoteCommentRow = SimulatorCommentRow & {
  thread_id: null;
  comment_type: "admin_private";
  parent_comment_id: null;
};

export type AppUserProfileRow = {
  app_user_id: string;
  first_name: string | null;
  last_name: string | null;
  country_code: string | null;
  updated_at: string;
};

export type ReviewThreadRow = {
  id: string;
  app_user_id: string;
  /** Alert target (public.alerts.id) when context_type = "alert" */
  alert_id: AlertPublicId | null;
  /** Profile target (public.users.id) when context_type = "profile" */
  user_id: string | null;
  context_type: ReviewThreadContextType | null;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type TraineeDecisionRow = {
  id: string;
  thread_id: string;
  /** Alert target uses the canonical public alert id. */
  alert_id: AlertPublicId | null;
  user_id: string | null;
  app_user_id: string;
  decision: TraineeDecisionValue;
  proposed_alert_status: string | null;
  rationale: string | null;
  review_state: string | null;
  created_at: string;
};

export type InternalNoteRow = {
  id: string;
  user_id: string;
  note_text: string;
  created_at: string;
  created_by: string | null;
};

export type PredefinedAlertNoteRow = {
  id: string;
  alert_id: AlertPublicId;
  note_text: string;
  created_at: string;
  created_by: string | null;
};

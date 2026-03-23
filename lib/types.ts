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
  id: string;
  user_id: string | null;
  /** Some DBs use alert_type instead of type */
  alert_type?: string | null;
  type: string | null;
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

export type UserNoteRow = {
  id: string;
  user_id: string;
  /** Primary column in Supabase `internal_notes` */
  note_text: string;
  created_at: string;
  created_by: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  /** Optional; omit if not in DB */
  note_type?: "system" | "analyst" | "admin" | string | null;
};

export type AlertNoteRow = {
  id: string;
  alert_id: string;
  note_text: string;
  created_at: string;
  created_by: string | null;
};

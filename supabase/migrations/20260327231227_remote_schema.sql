drop extension if exists "pg_net";

create sequence "public"."alerts_seq";

drop policy "Allow public read alerts" on "public"."alerts";

drop policy "Allow public insert alerts_note" on "public"."alerts_note";

drop policy "Allow public read alerts_note" on "public"."alerts_note";

drop policy "app_user_activity_own" on "public"."app_user_activity";

drop policy "app_user_profiles_select_own" on "public"."app_user_profiles";

drop policy "app_user_profiles_update_own" on "public"."app_user_profiles";

drop policy "app_user_profiles_upsert_own" on "public"."app_user_profiles";

drop policy "app_users_select_own" on "public"."app_users";

drop policy "app_users_update_own" on "public"."app_users";

drop policy "Allow public read internal_notes" on "public"."internal_notes";

drop policy "Allow public read ops_events" on "public"."ops_events";

drop policy "review_threads_insert_trainee" on "public"."review_threads";

drop policy "sim_comments_insert_admin_private" on "public"."simulator_comments";

drop policy "sim_comments_insert_admin_qa" on "public"."simulator_comments";

drop policy "sim_comments_insert_user" on "public"."simulator_comments";

drop policy "sim_comments_select_author" on "public"."simulator_comments";

drop policy "sim_comments_select_qa_reply" on "public"."simulator_comments";

drop policy "sim_comments_update_user_trainee_root" on "public"."simulator_comments";

drop policy "trainee_assign_write" on "public"."trainee_alert_assignments";

drop policy "trainee_watch_write" on "public"."trainee_user_watchlist";

drop policy "Allow public read transactions" on "public"."transactions";

drop policy "Allow public read user_events" on "public"."user_events";

drop policy "Allow public read user_financials" on "public"."user_financials";

drop policy "Allow public read user_payment_methods" on "public"."user_payment_methods";

drop policy "Allow public read users" on "public"."users";

drop policy "trainee_decisions_insert" on "public"."trainee_decisions";

revoke delete on table "public"."admin_private_notes" from "anon";

revoke insert on table "public"."admin_private_notes" from "anon";

revoke references on table "public"."admin_private_notes" from "anon";

revoke select on table "public"."admin_private_notes" from "anon";

revoke trigger on table "public"."admin_private_notes" from "anon";

revoke truncate on table "public"."admin_private_notes" from "anon";

revoke update on table "public"."admin_private_notes" from "anon";

revoke delete on table "public"."alerts" from "anon";

revoke insert on table "public"."alerts" from "anon";

revoke references on table "public"."alerts" from "anon";

revoke select on table "public"."alerts" from "anon";

revoke trigger on table "public"."alerts" from "anon";

revoke truncate on table "public"."alerts" from "anon";

revoke update on table "public"."alerts" from "anon";

revoke delete on table "public"."alerts" from "authenticated";

revoke insert on table "public"."alerts" from "authenticated";

revoke references on table "public"."alerts" from "authenticated";

revoke trigger on table "public"."alerts" from "authenticated";

revoke truncate on table "public"."alerts" from "authenticated";

revoke update on table "public"."alerts" from "authenticated";

revoke delete on table "public"."alerts_note" from "anon";

revoke insert on table "public"."alerts_note" from "anon";

revoke references on table "public"."alerts_note" from "anon";

revoke select on table "public"."alerts_note" from "anon";

revoke trigger on table "public"."alerts_note" from "anon";

revoke truncate on table "public"."alerts_note" from "anon";

revoke update on table "public"."alerts_note" from "anon";

revoke delete on table "public"."alerts_note" from "authenticated";

revoke insert on table "public"."alerts_note" from "authenticated";

revoke references on table "public"."alerts_note" from "authenticated";

revoke select on table "public"."alerts_note" from "authenticated";

revoke trigger on table "public"."alerts_note" from "authenticated";

revoke truncate on table "public"."alerts_note" from "authenticated";

revoke update on table "public"."alerts_note" from "authenticated";

revoke delete on table "public"."alerts_note" from "service_role";

revoke insert on table "public"."alerts_note" from "service_role";

revoke references on table "public"."alerts_note" from "service_role";

revoke select on table "public"."alerts_note" from "service_role";

revoke trigger on table "public"."alerts_note" from "service_role";

revoke truncate on table "public"."alerts_note" from "service_role";

revoke update on table "public"."alerts_note" from "service_role";

revoke delete on table "public"."internal_notes" from "anon";

revoke insert on table "public"."internal_notes" from "anon";

revoke references on table "public"."internal_notes" from "anon";

revoke select on table "public"."internal_notes" from "anon";

revoke trigger on table "public"."internal_notes" from "anon";

revoke truncate on table "public"."internal_notes" from "anon";

revoke update on table "public"."internal_notes" from "anon";

revoke delete on table "public"."internal_notes" from "authenticated";

revoke references on table "public"."internal_notes" from "authenticated";

revoke trigger on table "public"."internal_notes" from "authenticated";

revoke truncate on table "public"."internal_notes" from "authenticated";

revoke update on table "public"."internal_notes" from "authenticated";

revoke delete on table "public"."ops_events" from "anon";

revoke insert on table "public"."ops_events" from "anon";

revoke references on table "public"."ops_events" from "anon";

revoke select on table "public"."ops_events" from "anon";

revoke trigger on table "public"."ops_events" from "anon";

revoke truncate on table "public"."ops_events" from "anon";

revoke update on table "public"."ops_events" from "anon";

revoke delete on table "public"."ops_events" from "authenticated";

revoke insert on table "public"."ops_events" from "authenticated";

revoke references on table "public"."ops_events" from "authenticated";

revoke trigger on table "public"."ops_events" from "authenticated";

revoke truncate on table "public"."ops_events" from "authenticated";

revoke update on table "public"."ops_events" from "authenticated";

revoke delete on table "public"."review_threads" from "anon";

revoke insert on table "public"."review_threads" from "anon";

revoke references on table "public"."review_threads" from "anon";

revoke select on table "public"."review_threads" from "anon";

revoke trigger on table "public"."review_threads" from "anon";

revoke truncate on table "public"."review_threads" from "anon";

revoke update on table "public"."review_threads" from "anon";

revoke delete on table "public"."simulator_comments" from "anon";

revoke insert on table "public"."simulator_comments" from "anon";

revoke references on table "public"."simulator_comments" from "anon";

revoke select on table "public"."simulator_comments" from "anon";

revoke trigger on table "public"."simulator_comments" from "anon";

revoke truncate on table "public"."simulator_comments" from "anon";

revoke update on table "public"."simulator_comments" from "anon";

revoke delete on table "public"."trainee_decisions" from "anon";

revoke insert on table "public"."trainee_decisions" from "anon";

revoke references on table "public"."trainee_decisions" from "anon";

revoke select on table "public"."trainee_decisions" from "anon";

revoke trigger on table "public"."trainee_decisions" from "anon";

revoke truncate on table "public"."trainee_decisions" from "anon";

revoke update on table "public"."trainee_decisions" from "anon";

revoke delete on table "public"."transactions" from "anon";

revoke insert on table "public"."transactions" from "anon";

revoke references on table "public"."transactions" from "anon";

revoke select on table "public"."transactions" from "anon";

revoke trigger on table "public"."transactions" from "anon";

revoke truncate on table "public"."transactions" from "anon";

revoke update on table "public"."transactions" from "anon";

revoke delete on table "public"."user_financials" from "anon";

revoke insert on table "public"."user_financials" from "anon";

revoke references on table "public"."user_financials" from "anon";

revoke select on table "public"."user_financials" from "anon";

revoke trigger on table "public"."user_financials" from "anon";

revoke truncate on table "public"."user_financials" from "anon";

revoke update on table "public"."user_financials" from "anon";

revoke delete on table "public"."user_financials" from "authenticated";

revoke insert on table "public"."user_financials" from "authenticated";

revoke references on table "public"."user_financials" from "authenticated";

revoke select on table "public"."user_financials" from "authenticated";

revoke trigger on table "public"."user_financials" from "authenticated";

revoke truncate on table "public"."user_financials" from "authenticated";

revoke update on table "public"."user_financials" from "authenticated";

revoke delete on table "public"."user_financials" from "service_role";

revoke insert on table "public"."user_financials" from "service_role";

revoke references on table "public"."user_financials" from "service_role";

revoke select on table "public"."user_financials" from "service_role";

revoke trigger on table "public"."user_financials" from "service_role";

revoke truncate on table "public"."user_financials" from "service_role";

revoke update on table "public"."user_financials" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

alter table "public"."admin_private_notes" drop constraint "admin_private_notes_target_check";

alter table "public"."alerts_note" drop constraint "alerts_note_alert_id_fkey";

alter table "public"."app_users" drop constraint "app_users_auth_user_id_fkey";

alter table "public"."internal_notes" drop constraint "internal_notes_note_type_check";

alter table "public"."review_threads" drop constraint "review_threads_alert_internal_id_fkey";

alter table "public"."review_threads" drop constraint "review_threads_target_check";

alter table "public"."simulator_comments" drop constraint "simulator_comment_target_check_v2";

alter table "public"."trainee_alert_assignments" drop constraint "trainee_alert_assignments_alert_internal_id_fkey";

alter table "public"."trainee_alert_assignments" drop constraint "trainee_alert_assignments_app_user_id_alert_internal_id_key";

alter table "public"."trainee_user_watchlist" drop constraint "trainee_user_watchlist_app_user_id_simulator_user_id_key";

alter table "public"."trainee_user_watchlist" drop constraint "trainee_user_watchlist_simulator_user_id_fkey";

alter table "public"."user_financials" drop constraint "user_financials_user_id_fkey";

alter table "public"."user_payment_methods" drop constraint "user_payment_methods_user_id_fkey";

alter table "public"."admin_private_notes" drop constraint "admin_private_notes_author_role_check";

alter table "public"."admin_private_notes" drop constraint "admin_private_notes_parent_note_id_fkey";

alter table "public"."simulator_comments" drop constraint "simulator_comments_author_app_user_id_fkey";

alter table "public"."simulator_comments" drop constraint "simulator_comments_author_role_check";

alter table "public"."simulator_comments" drop constraint "simulator_comments_comment_type_check";

alter table "public"."simulator_comments" drop constraint "simulator_comments_decision_id_fkey";

alter table "public"."simulator_comments" drop constraint "simulator_comments_parent_comment_id_fkey";

alter table "public"."trainee_decisions" drop constraint "trainee_decisions_alert_id_fkey";

alter table "public"."trainee_decisions" drop constraint "trainee_decisions_user_id_fkey";

drop view if exists "public"."alert_notes";

drop function if exists "public"."trainee_top_comment_still_editable"(p_id uuid);

alter table "public"."alerts_note" drop constraint "alerts_note_pkey";

alter table "public"."user_financials" drop constraint "user_financials_pkey";

drop index if exists "public"."admin_private_notes_alert_idx";

drop index if exists "public"."admin_private_notes_user_idx";

drop index if exists "public"."alerts_created_at_idx";

drop index if exists "public"."alerts_internal_id_uidx";

drop index if exists "public"."alerts_note_pkey";

drop index if exists "public"."review_threads_trainee_alert_uidx";

drop index if exists "public"."review_threads_trainee_user_uidx";

drop index if exists "public"."simulator_comments_alert_idx";

drop index if exists "public"."simulator_comments_user_idx";

drop index if exists "public"."trainee_alert_assignments_app_user_id_alert_internal_id_key";

drop index if exists "public"."trainee_decisions_thread_idx";

drop index if exists "public"."trainee_user_watchlist_app_user_id_simulator_user_id_key";

drop index if exists "public"."user_financials_pkey";

drop index if exists "public"."simulator_comments_thread_idx";

drop index if exists "public"."transactions_pkey";

drop index if exists "public"."users_pkey";

drop table "public"."alerts_note";

drop table "public"."user_financials";


  create table "public"."_backup_alerts_20260326" (
    "id" text,
    "user_id" uuid,
    "alert_type" text,
    "description" text,
    "status" text,
    "decision" text,
    "created_at" timestamp without time zone,
    "updated_at" timestamp without time zone,
    "rule_code" text,
    "rule_name" text,
    "alert_date" timestamp without time zone,
    "severity" text,
    "internal_id" uuid,
    "organization_id" uuid
      );



  create table "public"."_backup_app_users_20260326" (
    "id" uuid,
    "auth_user_id" uuid,
    "email" text,
    "full_name" text,
    "role" text,
    "is_active" boolean,
    "created_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "first_name" text,
    "last_name" text,
    "country_code" text,
    "country_name" text,
    "avatar_url" text,
    "provider" text,
    "status" text,
    "updated_at" timestamp with time zone,
    "organization_id" uuid
      );



  create table "public"."_backup_transactions_20260326" (
    "id" uuid,
    "external_id" text,
    "user_id" uuid,
    "transaction_date" timestamp with time zone,
    "type" text,
    "rail" text,
    "direction" text,
    "status" text,
    "amount" numeric(18,2),
    "currency" text,
    "counterparty_name" text,
    "merchant_name" text,
    "display_name" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "channel" text,
    "amount_usd" numeric(18,2),
    "organization_id" uuid
      );



  create table "public"."_backup_users_20260326" (
    "id" uuid,
    "external_user_id" text,
    "full_name" text,
    "first_name" text,
    "last_name" text,
    "email" text,
    "phone" text,
    "date_of_birth" date,
    "registration_date" date,
    "address_text" text,
    "country_code" text,
    "country_name" text,
    "status" text,
    "tier" text,
    "risk_level" text,
    "occupation" text,
    "employment_status" text,
    "primary_source_of_funds" text,
    "proof_of_identity" text,
    "proof_of_address" text,
    "source_of_funds_docs" text,
    "current_balance_usd" numeric(18,2),
    "total_turnover_usd" numeric(18,2),
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "nationality" text,
    "annual_income_min_usd" numeric,
    "annual_income_max_usd" numeric,
    "selfie_path" text,
    "organization_id" uuid
      );



  create table "public"."backup_app_users" (
    "id" uuid,
    "auth_user_id" uuid,
    "email" text,
    "full_name" text,
    "role" text,
    "is_active" boolean,
    "created_at" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "first_name" text,
    "last_name" text,
    "country_code" text,
    "country_name" text,
    "avatar_url" text,
    "provider" text,
    "status" text,
    "updated_at" timestamp with time zone
      );



  create table "public"."backup_comments" (
    "id" uuid,
    "author_app_user_id" uuid,
    "author_role" text,
    "comment_type" text,
    "parent_comment_id" uuid,
    "body" text,
    "is_edited" boolean,
    "is_deleted" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "user_id" uuid,
    "alert_id" uuid,
    "thread_id" uuid,
    "decision_id" uuid
      );



  create table "public"."organizations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "org_type" text not null,
    "status" text not null default 'active'::text,
    "country_code" text,
    "billing_email" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
      );


alter table "public"."organizations" enable row level security;

alter table "public"."admin_private_notes" add column "organization_id" uuid not null;

alter table "public"."admin_private_notes" alter column "author_role" set default 'ops_admin'::text;

alter table "public"."admin_private_notes" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."alerts" drop column "type";

alter table "public"."alerts" add column "alert_date" timestamp without time zone;

alter table "public"."alerts" add column "decision" text;

alter table "public"."alerts" add column "organization_id" uuid not null;

alter table "public"."alerts" add column "updated_at" timestamp without time zone default now();

alter table "public"."alerts" alter column "alert_type" set not null;

alter table "public"."alerts" alter column "created_at" drop not null;

alter table "public"."alerts" alter column "created_at" set data type timestamp without time zone using "created_at"::timestamp without time zone;

alter table "public"."alerts" alter column "severity" set default 'medium'::text;

alter table "public"."alerts" alter column "status" set default 'open'::text;

alter table "public"."alerts" alter column "status" set not null;

alter table "public"."alerts" alter column "user_id" set not null;

alter table "public"."alerts" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."app_user_activity" drop column "meta";

alter table "public"."app_user_activity" add column "entity_id" text;

alter table "public"."app_user_activity" add column "entity_type" text;

alter table "public"."app_user_activity" add column "metadata" jsonb not null default '{}'::jsonb;

alter table "public"."app_user_profiles" add column "created_at" timestamp with time zone not null default now();

alter table "public"."app_users" add column "organization_id" uuid not null;

alter table "public"."app_users" alter column "created_at" drop not null;

alter table "public"."app_users" alter column "email" set not null;

alter table "public"."app_users" alter column "is_active" drop not null;

alter table "public"."app_users" alter column "role" set default 'trainee'::text;

alter table "public"."app_users" alter column "role" drop not null;

alter table "public"."app_users" alter column "updated_at" set default now();

alter table "public"."internal_notes" drop column "note_type";

alter table "public"."internal_notes" drop column "text";

alter table "public"."internal_notes" add column "updated_at" timestamp with time zone;

alter table "public"."internal_notes" add column "updated_by" text;

alter table "public"."internal_notes" alter column "created_by" set not null;

alter table "public"."internal_notes" alter column "note_text" set not null;

alter table "public"."internal_notes" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."ops_events" add column "app_user_id" uuid;

alter table "public"."ops_events" add column "created_at" timestamp with time zone not null default now();

alter table "public"."ops_events" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."review_threads" drop column "alert_internal_id";

alter table "public"."review_threads" add column "alert_id" text;

alter table "public"."review_threads" add column "context_type" text not null;

alter table "public"."review_threads" add column "organization_id" uuid not null;

alter table "public"."review_threads" add column "status" text not null default 'open'::text;

alter table "public"."review_threads" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."review_threads" alter column "user_id" set not null;

alter table "public"."review_threads" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."simulator_comments" add column "is_deleted" boolean not null default false;

alter table "public"."simulator_comments" add column "is_edited" boolean not null default false;

alter table "public"."simulator_comments" add column "organization_id" uuid not null;

alter table "public"."simulator_comments" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."trainee_alert_assignments" drop column "alert_internal_id";

alter table "public"."trainee_alert_assignments" add column "alert_id" text not null;

alter table "public"."trainee_decisions" add column "organization_id" uuid not null;

alter table "public"."trainee_decisions" add column "review_window_until" timestamp with time zone;

alter table "public"."trainee_decisions" add column "submitted_at" timestamp with time zone;

alter table "public"."trainee_decisions" add column "supersedes_decision_id" uuid;

alter table "public"."trainee_decisions" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."trainee_decisions" add column "version_no" integer not null;

alter table "public"."trainee_decisions" alter column "alert_id" set not null;

alter table "public"."trainee_decisions" alter column "proposed_alert_status" set not null;

alter table "public"."trainee_decisions" alter column "review_state" set default 'draft'::text;

alter table "public"."trainee_decisions" alter column "review_state" set not null;

alter table "public"."trainee_decisions" alter column "user_id" set not null;

alter table "public"."trainee_decisions" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."trainee_user_watchlist" drop column "simulator_user_id";

alter table "public"."trainee_user_watchlist" add column "user_id" uuid not null;

alter table "public"."transactions" add column "created_at" timestamp with time zone not null default now();

alter table "public"."transactions" add column "display_name" text;

alter table "public"."transactions" add column "external_id" text not null;

alter table "public"."transactions" add column "merchant_name" text;

alter table "public"."transactions" add column "organization_id" uuid not null;

alter table "public"."transactions" add column "rail" text not null;

alter table "public"."transactions" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."transactions" alter column "amount" set not null;

alter table "public"."transactions" alter column "amount" set data type numeric(18,2) using "amount"::numeric(18,2);

alter table "public"."transactions" alter column "amount_usd" set data type numeric(18,2) using "amount_usd"::numeric(18,2);

alter table "public"."transactions" alter column "currency" set not null;

alter table "public"."transactions" alter column "direction" set not null;

alter table "public"."transactions" alter column "id" set default gen_random_uuid();

alter table "public"."transactions" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."transactions" alter column "status" set not null;

alter table "public"."transactions" alter column "transaction_date" set not null;

alter table "public"."transactions" alter column "transaction_date" set data type timestamp with time zone using "transaction_date"::timestamp with time zone;

alter table "public"."transactions" alter column "type" set not null;

alter table "public"."transactions" alter column "user_id" set not null;

alter table "public"."transactions" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."user_events" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."user_payment_methods" add column "created_at" timestamp without time zone default now();

alter table "public"."user_payment_methods" alter column "type" set not null;

alter table "public"."user_payment_methods" alter column "user_id" set not null;

alter table "public"."user_payment_methods" alter column "user_id" set data type uuid using "user_id"::uuid;

alter table "public"."users" drop column "address_line";

alter table "public"."users" drop column "balance_usd";

alter table "public"."users" drop column "country";

alter table "public"."users" drop column "display_name";

alter table "public"."users" drop column "dob";

alter table "public"."users" drop column "is_high_tier";

alter table "public"."users" drop column "turnover_usd";

alter table "public"."users" drop column "user_status";

alter table "public"."users" add column "created_at" timestamp with time zone not null default now();

alter table "public"."users" add column "external_user_id" text not null;

alter table "public"."users" add column "first_name" text;

alter table "public"."users" add column "last_name" text;

alter table "public"."users" add column "organization_id" uuid not null;

alter table "public"."users" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."users" alter column "current_balance_usd" set default 0;

alter table "public"."users" alter column "current_balance_usd" set data type numeric(18,2) using "current_balance_usd"::numeric(18,2);

alter table "public"."users" alter column "email" drop not null;

alter table "public"."users" alter column "full_name" set not null;

alter table "public"."users" alter column "id" set default gen_random_uuid();

alter table "public"."users" alter column "id" set data type uuid using "id"::uuid;

alter table "public"."users" alter column "registration_date" set not null;

alter table "public"."users" alter column "risk_level" set not null;

alter table "public"."users" alter column "status" set not null;

alter table "public"."users" alter column "total_turnover_usd" set default 0;

alter table "public"."users" alter column "total_turnover_usd" set data type numeric(18,2) using "total_turnover_usd"::numeric(18,2);

CREATE INDEX admin_private_notes_org_id_idx ON public.admin_private_notes USING btree (organization_id);

CREATE UNIQUE INDEX alerts_internal_id_key ON public.alerts USING btree (internal_id);

CREATE INDEX alerts_org_id_idx ON public.alerts USING btree (organization_id);

CREATE INDEX app_users_auth_user_id_idx ON public.app_users USING btree (auth_user_id);

CREATE INDEX app_users_country_code_idx ON public.app_users USING btree (country_code);

CREATE INDEX app_users_country_name_idx ON public.app_users USING btree (country_name);

CREATE UNIQUE INDEX app_users_email_key ON public.app_users USING btree (email);

CREATE INDEX app_users_org_id_idx ON public.app_users USING btree (organization_id);

CREATE INDEX app_users_role_idx ON public.app_users USING btree (role);

CREATE INDEX app_users_status_idx ON public.app_users USING btree (status);

CREATE INDEX idx_admin_private_notes_alert_id ON public.admin_private_notes USING btree (alert_id);

CREATE INDEX idx_admin_private_notes_author_app_user_id ON public.admin_private_notes USING btree (author_app_user_id);

CREATE INDEX idx_admin_private_notes_created_at ON public.admin_private_notes USING btree (created_at DESC);

CREATE INDEX idx_admin_private_notes_parent_note_id ON public.admin_private_notes USING btree (parent_note_id);

CREATE INDEX idx_admin_private_notes_user_id ON public.admin_private_notes USING btree (user_id);

CREATE INDEX idx_app_user_activity_app_user_id ON public.app_user_activity USING btree (app_user_id);

CREATE INDEX idx_app_user_activity_created_at ON public.app_user_activity USING btree (created_at DESC);

CREATE INDEX idx_app_users_auth_user_id ON public.app_users USING btree (auth_user_id);

CREATE INDEX idx_app_users_is_active ON public.app_users USING btree (is_active);

CREATE INDEX idx_app_users_role ON public.app_users USING btree (role);

CREATE INDEX idx_ops_events_app_user_id ON public.ops_events USING btree (app_user_id);

CREATE INDEX idx_ops_events_event_time ON public.ops_events USING btree (event_time DESC);

CREATE INDEX idx_ops_events_user_id ON public.ops_events USING btree (user_id);

CREATE INDEX idx_review_threads_alert_id ON public.review_threads USING btree (alert_id);

CREATE INDEX idx_review_threads_app_user_id ON public.review_threads USING btree (app_user_id);

CREATE INDEX idx_review_threads_user_id ON public.review_threads USING btree (user_id);

CREATE INDEX idx_simulator_comments_author_app_user_id ON public.simulator_comments USING btree (author_app_user_id);

CREATE INDEX idx_simulator_comments_created_at ON public.simulator_comments USING btree (created_at DESC);

CREATE INDEX idx_simulator_comments_decision_id ON public.simulator_comments USING btree (decision_id);

CREATE INDEX idx_simulator_comments_parent_comment_id ON public.simulator_comments USING btree (parent_comment_id);

CREATE INDEX idx_simulator_comments_thread_id ON public.simulator_comments USING btree (thread_id);

CREATE INDEX idx_trainee_alert_assignments_alert_id ON public.trainee_alert_assignments USING btree (alert_id);

CREATE INDEX idx_trainee_alert_assignments_app_user_id ON public.trainee_alert_assignments USING btree (app_user_id);

CREATE INDEX idx_trainee_decisions_alert_id ON public.trainee_decisions USING btree (alert_id);

CREATE INDEX idx_trainee_decisions_app_user_id ON public.trainee_decisions USING btree (app_user_id);

CREATE INDEX idx_trainee_decisions_thread_id ON public.trainee_decisions USING btree (thread_id);

CREATE INDEX idx_trainee_user_watchlist_app_user_id ON public.trainee_user_watchlist USING btree (app_user_id);

CREATE INDEX idx_trainee_user_watchlist_user_id ON public.trainee_user_watchlist USING btree (user_id);

CREATE INDEX idx_users_country_code ON public.users USING btree (country_code);

CREATE INDEX idx_users_external_user_id ON public.users USING btree (external_user_id);

CREATE INDEX idx_users_risk_level ON public.users USING btree (risk_level);

CREATE INDEX idx_users_status ON public.users USING btree (status);

CREATE INDEX idx_users_tier ON public.users USING btree (tier);

CREATE INDEX organizations_org_type_idx ON public.organizations USING btree (org_type);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);

CREATE INDEX organizations_status_idx ON public.organizations USING btree (status);

CREATE UNIQUE INDEX review_threads_alert_id_app_user_id_key ON public.review_threads USING btree (alert_id, app_user_id);

CREATE INDEX review_threads_alert_idx ON public.review_threads USING btree (alert_id) WHERE (alert_id IS NOT NULL);

CREATE UNIQUE INDEX review_threads_alert_unique_idx ON public.review_threads USING btree (app_user_id, alert_id) WHERE (context_type = 'alert'::text);

CREATE INDEX review_threads_app_user_idx ON public.review_threads USING btree (app_user_id);

CREATE INDEX review_threads_org_id_idx ON public.review_threads USING btree (organization_id);

CREATE UNIQUE INDEX review_threads_profile_unique_idx ON public.review_threads USING btree (app_user_id, user_id) WHERE (context_type = 'profile'::text);

CREATE INDEX review_threads_user_idx ON public.review_threads USING btree (user_id);

CREATE INDEX sim_comments_org_id_idx ON public.simulator_comments USING btree (organization_id);

CREATE INDEX trainee_alert_assignments_alert_id_idx ON public.trainee_alert_assignments USING btree (alert_id);

CREATE UNIQUE INDEX trainee_alert_assignments_app_user_id_alert_id_key ON public.trainee_alert_assignments USING btree (app_user_id, alert_id);

CREATE INDEX trainee_alert_assignments_app_user_id_idx ON public.trainee_alert_assignments USING btree (app_user_id);

CREATE INDEX trainee_decisions_org_id_idx ON public.trainee_decisions USING btree (organization_id);

CREATE UNIQUE INDEX trainee_decisions_thread_id_version_no_key ON public.trainee_decisions USING btree (thread_id, version_no);

CREATE UNIQUE INDEX trainee_user_watchlist_app_user_id_user_id_key ON public.trainee_user_watchlist USING btree (app_user_id, user_id);

CREATE UNIQUE INDEX transactions_external_id_key ON public.transactions USING btree (external_id);

CREATE INDEX tx_org_id_idx ON public.transactions USING btree (organization_id);

CREATE UNIQUE INDEX users_external_user_id_key ON public.users USING btree (external_user_id);

CREATE INDEX users_org_id_idx ON public.users USING btree (organization_id);

CREATE INDEX simulator_comments_thread_idx ON public.simulator_comments USING btree (thread_id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."admin_private_notes" add constraint "admin_private_notes_has_target_chk" CHECK (((user_id IS NOT NULL) OR (alert_id IS NOT NULL))) not valid;

alter table "public"."admin_private_notes" validate constraint "admin_private_notes_has_target_chk";

alter table "public"."admin_private_notes" add constraint "admin_private_notes_one_target_check" CHECK ((((user_id IS NOT NULL) AND (alert_id IS NULL)) OR ((user_id IS NULL) AND (alert_id IS NOT NULL)))) not valid;

alter table "public"."admin_private_notes" validate constraint "admin_private_notes_one_target_check";

alter table "public"."admin_private_notes" add constraint "admin_private_notes_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."admin_private_notes" validate constraint "admin_private_notes_organization_id_fkey";

alter table "public"."alerts" add constraint "alerts_alert_type_check" CHECK ((alert_type = ANY (ARRAY['aml'::text, 'fraud'::text]))) not valid;

alter table "public"."alerts" validate constraint "alerts_alert_type_check";

alter table "public"."alerts" add constraint "alerts_decision_check" CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text, 'escalated'::text, 'blocked'::text, 'no_action'::text]))) not valid;

alter table "public"."alerts" validate constraint "alerts_decision_check";

alter table "public"."alerts" add constraint "alerts_internal_id_key" UNIQUE using index "alerts_internal_id_key";

alter table "public"."alerts" add constraint "alerts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."alerts" validate constraint "alerts_organization_id_fkey";

alter table "public"."alerts" add constraint "alerts_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."alerts" validate constraint "alerts_severity_check";

alter table "public"."alerts" add constraint "alerts_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'closed'::text]))) not valid;

alter table "public"."alerts" validate constraint "alerts_status_check";

alter table "public"."app_users" add constraint "app_users_auth_user_id_fkey_auth_users" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."app_users" validate constraint "app_users_auth_user_id_fkey_auth_users";

alter table "public"."app_users" add constraint "app_users_email_key" UNIQUE using index "app_users_email_key";

alter table "public"."app_users" add constraint "app_users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."app_users" validate constraint "app_users_organization_id_fkey";

alter table "public"."app_users" add constraint "app_users_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'blocked'::text]))) not valid;

alter table "public"."app_users" validate constraint "app_users_status_check";

alter table "public"."ops_events" add constraint "ops_events_app_user_id_fkey" FOREIGN KEY (app_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL not valid;

alter table "public"."ops_events" validate constraint "ops_events_app_user_id_fkey";

alter table "public"."ops_events" add constraint "ops_events_type_check" CHECK ((action_type = ANY (ARRAY['account_restricted'::text, 'account_blocked'::text, 'account_unblocked'::text, 'poa_approved'::text, 'sof_approved'::text, 'account_closed'::text]))) not valid;

alter table "public"."ops_events" validate constraint "ops_events_type_check";

alter table "public"."organizations" add constraint "organizations_org_type_check" CHECK ((org_type = ANY (ARRAY['internal'::text, 'b2c'::text, 'b2b'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_org_type_check";

alter table "public"."organizations" add constraint "organizations_slug_key" UNIQUE using index "organizations_slug_key";

alter table "public"."organizations" add constraint "organizations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'disabled'::text]))) not valid;

alter table "public"."organizations" validate constraint "organizations_status_check";

alter table "public"."review_threads" add constraint "review_threads_alert_id_app_user_id_key" UNIQUE using index "review_threads_alert_id_app_user_id_key";

alter table "public"."review_threads" add constraint "review_threads_alert_id_fkey" FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE not valid;

alter table "public"."review_threads" validate constraint "review_threads_alert_id_fkey";

alter table "public"."review_threads" add constraint "review_threads_context_alert_consistency" CHECK ((((context_type = 'profile'::text) AND (alert_id IS NULL)) OR ((context_type = 'alert'::text) AND (alert_id IS NOT NULL)))) not valid;

alter table "public"."review_threads" validate constraint "review_threads_context_alert_consistency";

alter table "public"."review_threads" add constraint "review_threads_context_type_check" CHECK ((context_type = ANY (ARRAY['profile'::text, 'alert'::text]))) not valid;

alter table "public"."review_threads" validate constraint "review_threads_context_type_check";

alter table "public"."review_threads" add constraint "review_threads_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."review_threads" validate constraint "review_threads_organization_id_fkey";

alter table "public"."review_threads" add constraint "review_threads_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'qa_replied'::text, 'closed'::text]))) not valid;

alter table "public"."review_threads" validate constraint "review_threads_status_check";

alter table "public"."simulator_comments" add constraint "simulator_comments_alert_internal_id_fkey" FOREIGN KEY (alert_id) REFERENCES public.alerts(internal_id) ON DELETE CASCADE not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_alert_internal_id_fkey";

alter table "public"."simulator_comments" add constraint "simulator_comments_one_target_check" CHECK (((thread_id IS NOT NULL) AND (user_id IS NULL) AND (alert_id IS NULL))) not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_one_target_check";

alter table "public"."simulator_comments" add constraint "simulator_comments_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_organization_id_fkey";

alter table "public"."trainee_alert_assignments" add constraint "trainee_alert_assignments_alert_id_fkey" FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE not valid;

alter table "public"."trainee_alert_assignments" validate constraint "trainee_alert_assignments_alert_id_fkey";

alter table "public"."trainee_alert_assignments" add constraint "trainee_alert_assignments_app_user_id_alert_id_key" UNIQUE using index "trainee_alert_assignments_app_user_id_alert_id_key";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_decision_check" CHECK ((decision = ANY (ARRAY['info_requested'::text, 'escalated'::text, 'false_positive'::text, 'true_positive'::text]))) not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_decision_check";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_organization_id_fkey";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_proposed_alert_status_check" CHECK ((proposed_alert_status = ANY (ARRAY['in_review'::text, 'resolved'::text]))) not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_proposed_alert_status_check";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_review_state_check" CHECK ((review_state = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_review'::text, 'qa_replied'::text, 'closed'::text]))) not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_review_state_check";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_supersedes_decision_id_fkey" FOREIGN KEY (supersedes_decision_id) REFERENCES public.trainee_decisions(id) ON DELETE SET NULL not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_supersedes_decision_id_fkey";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_thread_id_version_no_key" UNIQUE using index "trainee_decisions_thread_id_version_no_key";

alter table "public"."trainee_user_watchlist" add constraint "trainee_user_watchlist_app_user_id_user_id_key" UNIQUE using index "trainee_user_watchlist_app_user_id_user_id_key";

alter table "public"."trainee_user_watchlist" add constraint "trainee_user_watchlist_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."trainee_user_watchlist" validate constraint "trainee_user_watchlist_user_id_fkey";

alter table "public"."transactions" add constraint "fk_transactions_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."transactions" validate constraint "fk_transactions_user";

alter table "public"."transactions" add constraint "transactions_amount_check" CHECK ((amount >= (0)::numeric)) not valid;

alter table "public"."transactions" validate constraint "transactions_amount_check";

alter table "public"."transactions" add constraint "transactions_channel_check" CHECK (((channel IS NULL) OR (channel = ANY (ARRAY['POS'::text, 'ePOS'::text, 'MOTO'::text, 'ATM'::text, 'Card to Card'::text, 'SEPA'::text, 'SWIFT'::text, 'FPS'::text, 'ACH'::text, 'Wire'::text, 'Local Bank Transfer'::text, 'Open Banking'::text, 'Blockchain'::text, 'Internal Wallet Transfer'::text, 'Internal Transfer'::text, 'P2P'::text, 'Cash'::text, 'Fee'::text, 'Adjustment'::text, 'Refund'::text])))) not valid;

alter table "public"."transactions" validate constraint "transactions_channel_check";

alter table "public"."transactions" add constraint "transactions_external_id_key" UNIQUE using index "transactions_external_id_key";

alter table "public"."transactions" add constraint "transactions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."transactions" validate constraint "transactions_organization_id_fkey";

alter table "public"."user_events" add constraint "user_events_type_check" CHECK ((event_type = ANY (ARRAY['sign_up'::text, 'sign_in'::text, 'open_app'::text, 'logout'::text, 'password_reset'::text, 'added_sof'::text, 'added_poa'::text, 'added_poi'::text, 'changed_phone'::text, 'changed_email'::text, 'changed_address'::text, 'changed_password'::text, 'changed_device'::text]))) not valid;

alter table "public"."user_events" validate constraint "user_events_type_check";

alter table "public"."user_payment_methods" add constraint "card_status_check" CHECK (((status IS NULL) OR (status = ANY (ARRAY['active'::text, 'frozen'::text, 'blocked'::text, 'closed'::text])))) not valid;

alter table "public"."user_payment_methods" validate constraint "card_status_check";

alter table "public"."user_payment_methods" add constraint "fk_payment_methods_user" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_payment_methods" validate constraint "fk_payment_methods_user";

alter table "public"."user_payment_methods" add constraint "user_payment_methods_type_check" CHECK ((type = ANY (ARRAY['card'::text, 'bank'::text, 'crypto'::text]))) not valid;

alter table "public"."user_payment_methods" validate constraint "user_payment_methods_type_check";

alter table "public"."users" add constraint "users_external_user_id_key" UNIQUE using index "users_external_user_id_key";

alter table "public"."users" add constraint "users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) not valid;

alter table "public"."users" validate constraint "users_organization_id_fkey";

alter table "public"."users" add constraint "users_risk_level_check" CHECK ((risk_level = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text]))) not valid;

alter table "public"."users" validate constraint "users_risk_level_check";

alter table "public"."users" add constraint "users_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'not_active'::text, 'restricted'::text, 'blocked'::text, 'closed'::text]))) not valid;

alter table "public"."users" validate constraint "users_status_check";

alter table "public"."users" add constraint "users_tier_check" CHECK ((tier = ANY (ARRAY['Tier 1'::text, 'Tier 2'::text, 'Tier 3'::text]))) not valid;

alter table "public"."users" validate constraint "users_tier_check";

alter table "public"."admin_private_notes" add constraint "admin_private_notes_author_role_check" CHECK ((author_role = ANY (ARRAY['admin'::text, 'super_admin'::text, 'ops_admin'::text, 'reviewer'::text]))) not valid;

alter table "public"."admin_private_notes" validate constraint "admin_private_notes_author_role_check";

alter table "public"."admin_private_notes" add constraint "admin_private_notes_parent_note_id_fkey" FOREIGN KEY (parent_note_id) REFERENCES public.admin_private_notes(id) ON DELETE CASCADE not valid;

alter table "public"."admin_private_notes" validate constraint "admin_private_notes_parent_note_id_fkey";

alter table "public"."simulator_comments" add constraint "simulator_comments_author_app_user_id_fkey" FOREIGN KEY (author_app_user_id) REFERENCES public.app_users(id) not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_author_app_user_id_fkey";

alter table "public"."simulator_comments" add constraint "simulator_comments_author_role_check" CHECK ((author_role = ANY (ARRAY['trainee'::text, 'reviewer'::text, 'ops_admin'::text, 'super_admin'::text]))) not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_author_role_check";

alter table "public"."simulator_comments" add constraint "simulator_comments_comment_type_check" CHECK ((comment_type = ANY (ARRAY['user_comment'::text, 'admin_qa'::text]))) not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_comment_type_check";

alter table "public"."simulator_comments" add constraint "simulator_comments_decision_id_fkey" FOREIGN KEY (decision_id) REFERENCES public.trainee_decisions(id) ON DELETE CASCADE not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_decision_id_fkey";

alter table "public"."simulator_comments" add constraint "simulator_comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.simulator_comments(id) not valid;

alter table "public"."simulator_comments" validate constraint "simulator_comments_parent_comment_id_fkey";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_alert_id_fkey" FOREIGN KEY (alert_id) REFERENCES public.alerts(id) ON DELETE CASCADE not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_alert_id_fkey";

alter table "public"."trainee_decisions" add constraint "trainee_decisions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."trainee_decisions" validate constraint "trainee_decisions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.after_insert_admin_qa_comment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_latest_decision_id uuid;
begin
  if new.comment_type = 'admin_qa' and new.thread_id is not null then
    select td.id
      into v_latest_decision_id
    from public.trainee_decisions td
    where td.thread_id = new.thread_id
    order by td.version_no desc
    limit 1;

    if v_latest_decision_id is not null then
      update public.trainee_decisions
         set review_state = 'qa_replied',
             review_window_until = now() + interval '24 hours',
             updated_at = now()
       where id = v_latest_decision_id;
    end if;

    update public.review_threads
       set status = 'qa_replied',
           updated_at = now()
     where id = new.thread_id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.after_insert_trainee_decision()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  update public.review_threads
     set status = case
       when new.review_state = 'submitted' then 'in_review'
       else status
     end,
         updated_at = now()
   where id = new.thread_id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.app_user_matches_jwt(app_user_auth_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select app_user_auth_user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.before_insert_trainee_decision()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_next_version integer;
begin
  if not public.is_valid_decision_status_pair(new.decision, new.proposed_alert_status) then
    raise exception 'Invalid decision/proposed_alert_status pair';
  end if;

  if new.version_no is null or new.version_no <= 0 then
    select coalesce(max(td.version_no), 0) + 1
      into v_next_version
    from public.trainee_decisions td
    where td.thread_id = new.thread_id;

    new.version_no := v_next_version;
  end if;

  if new.review_state is null then
    new.review_state := 'draft';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.before_update_simulator_comment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if old.author_app_user_id = public.current_app_user_id_v2()
     and old.comment_type = 'user_comment'
     and not public.is_admin() then

    if not public.can_edit_own_comment(
      old.author_app_user_id,
      old.comment_type,
      old.created_at,
      old.thread_id
    ) then
      raise exception 'Comment can no longer be edited';
    end if;
  end if;

  if old.comment_type <> new.comment_type then
    raise exception 'comment_type cannot be changed';
  end if;

  if old.author_app_user_id <> new.author_app_user_id then
    raise exception 'author_app_user_id cannot be changed';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.before_update_trainee_decision()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if not public.is_valid_decision_status_pair(new.decision, new.proposed_alert_status) then
    raise exception 'Invalid decision/proposed_alert_status pair';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_edit_own_comment(p_comment_author uuid, p_comment_type text, p_created_at timestamp with time zone, p_thread_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select
    p_comment_author = auth.uid()
    and p_comment_type = 'user_comment'
    and now() <= p_created_at + interval '5 minutes'
    and not public.thread_has_admin_reply(p_thread_id)
$function$
;

CREATE OR REPLACE FUNCTION public.current_app_user_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select public.current_app_user_active_v2();
$function$
;

CREATE OR REPLACE FUNCTION public.current_app_user_active_v2()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select coalesce((
    select au.is_active
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  ), false);
$function$
;

CREATE OR REPLACE FUNCTION public.current_app_user_id_v2()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select (
    select au.id
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  );
$function$
;

CREATE OR REPLACE FUNCTION public.current_app_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select au.role
  from public.app_users au
  where au.auth_user_id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.current_org_id_v2()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select (
    select au.organization_id
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  );
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_my_review_thread(p_user_id uuid DEFAULT NULL::uuid, p_alert_internal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select public.ensure_review_thread(
    public.current_app_user_id(),
    p_user_id,
    p_alert_internal_id
  )
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_review_thread(p_app_user_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_alert_internal_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_thread_id uuid;
  v_alert_id_text text;
  v_target_user_id uuid;
begin
  if p_app_user_id is null then
    raise exception 'ensure_review_thread: p_app_user_id is required';
  end if;

  if p_alert_internal_id is not null then
    select a.id, a.user_id
      into v_alert_id_text, v_target_user_id
    from public.alerts a
    where a.internal_id = p_alert_internal_id;

    if not found then
      raise exception 'ensure_review_thread: alert with internal_id % not found', p_alert_internal_id;
    end if;

    if p_user_id is not null and p_user_id <> v_target_user_id then
      raise exception
        'ensure_review_thread: user_id % does not match alert owner % for alert %',
        p_user_id, v_target_user_id, p_alert_internal_id;
    end if;

    select rt.id
      into v_thread_id
    from public.review_threads rt
    where rt.context_type = 'alert'
      and rt.app_user_id = p_app_user_id
      and rt.alert_id = v_alert_id_text
    limit 1;

    if v_thread_id is not null then
      return v_thread_id;
    end if;

    begin
      insert into public.review_threads (
        alert_id,
        user_id,
        app_user_id,
        context_type,
        status
      )
      values (
        v_alert_id_text,
        v_target_user_id,
        p_app_user_id,
        'alert',
        'open'
      )
      returning id into v_thread_id;
    exception
      when unique_violation then
        select rt.id
          into v_thread_id
        from public.review_threads rt
        where rt.context_type = 'alert'
          and rt.app_user_id = p_app_user_id
          and rt.alert_id = v_alert_id_text
        limit 1;
    end;

    return v_thread_id;
  end if;

  if p_user_id is null then
    raise exception 'ensure_review_thread: either p_user_id or p_alert_internal_id is required';
  end if;

  select rt.id
    into v_thread_id
  from public.review_threads rt
  where rt.context_type = 'profile'
    and rt.app_user_id = p_app_user_id
    and rt.user_id = p_user_id
  limit 1;

  if v_thread_id is not null then
    return v_thread_id;
  end if;

  begin
    insert into public.review_threads (
      alert_id,
      user_id,
      app_user_id,
      context_type,
      status
    )
    values (
      null,
      p_user_id,
      p_app_user_id,
      'profile',
      'open'
    )
    returning id into v_thread_id;
  exception
    when unique_violation then
      select rt.id
        into v_thread_id
      from public.review_threads rt
      where rt.context_type = 'profile'
        and rt.app_user_id = p_app_user_id
        and rt.user_id = p_user_id
      limit 1;
  end;

  return v_thread_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_alert_id()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN 'ALRT-' || LPAD(nextval('alerts_seq')::TEXT, 4, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_app_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_first_name text;
  v_last_name text;
  v_full_name text;
  v_avatar_url text;
  v_provider text;
  v_country_code text;
  v_country_name text;
  v_direct_org_id uuid;
begin
  select o.id
    into v_direct_org_id
  from public.organizations o
  where o.slug = 'direct-trainees'
  limit 1;

  if v_direct_org_id is null then
    raise exception 'Organization direct-trainees not found';
  end if;

  v_first_name := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last_name := nullif(new.raw_user_meta_data ->> 'last_name', '');

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(trim(concat_ws(' ', v_first_name, v_last_name)), '')
  );

  if v_first_name is null and v_full_name is not null then
    v_first_name := split_part(v_full_name, ' ', 1);
  end if;

  if v_last_name is null and v_full_name is not null then
    v_last_name := nullif(trim(replace(v_full_name, split_part(v_full_name, ' ', 1), '')), '');
  end if;

  v_avatar_url := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  v_provider := coalesce(
    nullif(new.raw_app_meta_data ->> 'provider', ''),
    'email'
  );

  v_country_code := upper(nullif(new.raw_user_meta_data ->> 'country_code', ''));
  v_country_name := nullif(new.raw_user_meta_data ->> 'country_name', '');

  insert into public.app_users (
    auth_user_id,
    email,
    first_name,
    last_name,
    full_name,
    country_code,
    country_name,
    avatar_url,
    provider,
    role,
    organization_id,
    status,
    is_active,
    created_at,
    updated_at,
    last_login_at
  )
  values (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_full_name,
    v_country_code,
    v_country_name,
    v_avatar_url,
    v_provider,
    'trainee',
    v_direct_org_id,
    'active',
    true,
    now(),
    now(),
    now()
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    first_name = coalesce(public.app_users.first_name, excluded.first_name),
    last_name = coalesce(public.app_users.last_name, excluded.last_name),
    full_name = coalesce(public.app_users.full_name, excluded.full_name),
    country_code = coalesce(public.app_users.country_code, excluded.country_code),
    country_name = coalesce(public.app_users.country_name, excluded.country_name),
    avatar_url = coalesce(public.app_users.avatar_url, excluded.avatar_url),
    provider = coalesce(public.app_users.provider, excluded.provider),
    role = coalesce(public.app_users.role, excluded.role),
    organization_id = coalesce(public.app_users.organization_id, excluded.organization_id),
    updated_at = now(),
    last_login_at = now();

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_to_app_users_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_catalog'
AS $function$
declare
  v_b2c_org_id uuid;
begin
  select id into v_b2c_org_id
  from public.organizations
  where slug = 'direct-trainees'
  limit 1;

  if v_b2c_org_id is null then
    raise exception 'Direct Trainees org not found (slug=direct-trainees)';
  end if;

  insert into public.app_users(auth_user_id, email, role, is_active, organization_id, created_at)
  values (new.id, new.email, 'trainee', true, v_b2c_org_id, now())
  on conflict (auth_user_id) do update
    set email = excluded.email;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select public.is_super_admin()
      or public.is_ops_admin()
      or public.is_reviewer();
$function$
;

CREATE OR REPLACE FUNCTION public.is_ops_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select coalesce((
    select au.role = 'ops_admin'
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  ), false);
$function$
;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select public.is_super_admin() or public.is_ops_admin();
$function$
;

CREATE OR REPLACE FUNCTION public.is_reviewer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select coalesce((
    select au.role = 'reviewer'
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  ), false);
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select coalesce((
    select au.role = 'super_admin'
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  ), false);
$function$
;

CREATE OR REPLACE FUNCTION public.is_trainee()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select coalesce((
    select au.role = 'trainee'
    from public.app_users au
    where au.auth_user_id = auth.uid()
    limit 1
  ), false);
$function$
;

CREATE OR REPLACE FUNCTION public.is_valid_decision_status_pair(p_decision text, p_status text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_decision = 'info_requested' then p_status = 'in_review'
    when p_decision = 'escalated' then p_status = 'in_review'
    when p_decision = 'false_positive' then p_status = 'resolved'
    when p_decision = 'true_positive' then p_status = 'resolved'
    else false
  end
$function$
;

CREATE OR REPLACE FUNCTION public.set_app_user_role(p_target_user_id uuid, p_new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  -- только super_admin
  if not exists (
    select 1
    from public.app_users au
    where au.id = auth.uid()
      and au.role = 'super_admin'
      and coalesce(au.is_active, true) = true
  ) then
    raise exception 'Only super_admin can change roles';
  end if;

  -- валидация роли
  if p_new_role not in ('trainee', 'reviewer', 'ops_admin', 'super_admin') then
    raise exception 'Invalid role: %', p_new_role;
  end if;

  update public.app_users
  set role = p_new_role
  where id = p_target_user_id;

  if not found then
    raise exception 'Target user not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_app_users_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.simulator_comments_resolve_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_thread_id uuid;
begin
  if new.author_app_user_id is null then
    raise exception 'simulator_comments: author_app_user_id is required';
  end if;

  if new.thread_id is null and new.decision_id is not null then
    select td.thread_id
      into v_thread_id
    from public.trainee_decisions td
    where td.id = new.decision_id;

    if v_thread_id is null then
      raise exception 'simulator_comments: decision % has no thread_id', new.decision_id;
    end if;

    new.thread_id := v_thread_id;
  end if;

  if new.thread_id is null then
    new.thread_id := public.ensure_review_thread(
      new.author_app_user_id,
      new.user_id,
      new.alert_id
    );
  end if;

  new.user_id := null;
  new.alert_id := null;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_author_role_from_app_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_table_name = 'simulator_comments' then
    new.author_role :=
      (select au.role from public.app_users au where au.id = new.author_app_user_id);
  elsif tg_table_name = 'admin_private_notes' then
    new.author_role :=
      (select au.role from public.app_users au where au.id = new.author_app_user_id);
  end if;

  if new.author_role is null then
    raise exception 'author_role cannot be resolved for author_app_user_id %', new.author_app_user_id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_org_from_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  if tg_table_name = 'review_threads' then
    new.organization_id := (select organization_id from public.app_users where id = new.app_user_id);
  elsif tg_table_name = 'simulator_comments' then
    new.organization_id := (select organization_id from public.review_threads where id = new.thread_id);
  elsif tg_table_name = 'trainee_decisions' then
    new.organization_id := (select organization_id from public.review_threads where id = new.thread_id);
  end if;

  if new.organization_id is null then
    raise exception 'organization_id cannot be resolved for %', tg_table_name;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.thread_has_admin_reply(p_thread_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
    from public.simulator_comments sc
    where sc.thread_id = p_thread_id
      and sc.comment_type = 'admin_qa'
      and coalesce(sc.is_deleted, false) = false
  )
$function$
;

create or replace view "public"."user_financials" as  SELECT user_id,
    COALESCE(sum(
        CASE
            WHEN ((lower(direction) = 'inbound'::text) AND (lower(status) = 'completed'::text)) THEN amount
            WHEN ((lower(direction) = 'outbound'::text) AND (lower(status) = 'completed'::text)) THEN (- amount)
            ELSE (0)::numeric
        END), (0)::numeric) AS current_balance,
    COALESCE(sum(
        CASE
            WHEN ((lower(direction) = 'inbound'::text) AND (lower(status) = 'completed'::text)) THEN amount
            ELSE (0)::numeric
        END), (0)::numeric) AS total_turnover
   FROM public.transactions
  GROUP BY user_id;


CREATE OR REPLACE FUNCTION public.app_user_matches_jwt(p_auth_user_id uuid, p_email text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select coalesce(p_auth_user_id = auth.uid(), false)
$function$
;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select au.id
  from public.app_users au
  where au.auth_user_id = auth.uid()
    and coalesce(au.is_active, true) = true
  limit 1
$function$
;

grant references on table "public"."_backup_alerts_20260326" to "anon";

grant trigger on table "public"."_backup_alerts_20260326" to "anon";

grant truncate on table "public"."_backup_alerts_20260326" to "anon";

grant references on table "public"."_backup_alerts_20260326" to "authenticated";

grant trigger on table "public"."_backup_alerts_20260326" to "authenticated";

grant truncate on table "public"."_backup_alerts_20260326" to "authenticated";

grant references on table "public"."_backup_alerts_20260326" to "service_role";

grant trigger on table "public"."_backup_alerts_20260326" to "service_role";

grant truncate on table "public"."_backup_alerts_20260326" to "service_role";

grant references on table "public"."_backup_app_users_20260326" to "anon";

grant trigger on table "public"."_backup_app_users_20260326" to "anon";

grant truncate on table "public"."_backup_app_users_20260326" to "anon";

grant references on table "public"."_backup_app_users_20260326" to "authenticated";

grant trigger on table "public"."_backup_app_users_20260326" to "authenticated";

grant truncate on table "public"."_backup_app_users_20260326" to "authenticated";

grant references on table "public"."_backup_app_users_20260326" to "service_role";

grant trigger on table "public"."_backup_app_users_20260326" to "service_role";

grant truncate on table "public"."_backup_app_users_20260326" to "service_role";

grant references on table "public"."_backup_transactions_20260326" to "anon";

grant trigger on table "public"."_backup_transactions_20260326" to "anon";

grant truncate on table "public"."_backup_transactions_20260326" to "anon";

grant references on table "public"."_backup_transactions_20260326" to "authenticated";

grant trigger on table "public"."_backup_transactions_20260326" to "authenticated";

grant truncate on table "public"."_backup_transactions_20260326" to "authenticated";

grant references on table "public"."_backup_transactions_20260326" to "service_role";

grant trigger on table "public"."_backup_transactions_20260326" to "service_role";

grant truncate on table "public"."_backup_transactions_20260326" to "service_role";

grant references on table "public"."_backup_users_20260326" to "anon";

grant trigger on table "public"."_backup_users_20260326" to "anon";

grant truncate on table "public"."_backup_users_20260326" to "anon";

grant references on table "public"."_backup_users_20260326" to "authenticated";

grant trigger on table "public"."_backup_users_20260326" to "authenticated";

grant truncate on table "public"."_backup_users_20260326" to "authenticated";

grant references on table "public"."_backup_users_20260326" to "service_role";

grant trigger on table "public"."_backup_users_20260326" to "service_role";

grant truncate on table "public"."_backup_users_20260326" to "service_role";

grant delete on table "public"."backup_app_users" to "anon";

grant insert on table "public"."backup_app_users" to "anon";

grant references on table "public"."backup_app_users" to "anon";

grant select on table "public"."backup_app_users" to "anon";

grant trigger on table "public"."backup_app_users" to "anon";

grant truncate on table "public"."backup_app_users" to "anon";

grant update on table "public"."backup_app_users" to "anon";

grant delete on table "public"."backup_app_users" to "authenticated";

grant insert on table "public"."backup_app_users" to "authenticated";

grant references on table "public"."backup_app_users" to "authenticated";

grant select on table "public"."backup_app_users" to "authenticated";

grant trigger on table "public"."backup_app_users" to "authenticated";

grant truncate on table "public"."backup_app_users" to "authenticated";

grant update on table "public"."backup_app_users" to "authenticated";

grant delete on table "public"."backup_app_users" to "service_role";

grant insert on table "public"."backup_app_users" to "service_role";

grant references on table "public"."backup_app_users" to "service_role";

grant select on table "public"."backup_app_users" to "service_role";

grant trigger on table "public"."backup_app_users" to "service_role";

grant truncate on table "public"."backup_app_users" to "service_role";

grant update on table "public"."backup_app_users" to "service_role";

grant delete on table "public"."backup_comments" to "anon";

grant insert on table "public"."backup_comments" to "anon";

grant references on table "public"."backup_comments" to "anon";

grant select on table "public"."backup_comments" to "anon";

grant trigger on table "public"."backup_comments" to "anon";

grant truncate on table "public"."backup_comments" to "anon";

grant update on table "public"."backup_comments" to "anon";

grant delete on table "public"."backup_comments" to "authenticated";

grant insert on table "public"."backup_comments" to "authenticated";

grant references on table "public"."backup_comments" to "authenticated";

grant select on table "public"."backup_comments" to "authenticated";

grant trigger on table "public"."backup_comments" to "authenticated";

grant truncate on table "public"."backup_comments" to "authenticated";

grant update on table "public"."backup_comments" to "authenticated";

grant delete on table "public"."backup_comments" to "service_role";

grant insert on table "public"."backup_comments" to "service_role";

grant references on table "public"."backup_comments" to "service_role";

grant select on table "public"."backup_comments" to "service_role";

grant trigger on table "public"."backup_comments" to "service_role";

grant truncate on table "public"."backup_comments" to "service_role";

grant update on table "public"."backup_comments" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";


  create policy "admin_private_notes_delete"
  on "public"."admin_private_notes"
  as permissive
  for delete
  to authenticated
using (((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer()) AND (author_app_user_id = public.current_app_user_id_v2())));



  create policy "admin_private_notes_insert"
  on "public"."admin_private_notes"
  as permissive
  for insert
  to authenticated
with check (((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer()) AND (author_app_user_id = public.current_app_user_id_v2()) AND (organization_id = public.current_org_id_v2())));



  create policy "admin_private_notes_select"
  on "public"."admin_private_notes"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR ((public.is_ops_admin() OR public.is_reviewer()) AND (author_app_user_id = public.current_app_user_id_v2()))));



  create policy "admin_private_notes_update"
  on "public"."admin_private_notes"
  as permissive
  for update
  to authenticated
using (((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer()) AND (author_app_user_id = public.current_app_user_id_v2())))
with check (((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer()) AND (author_app_user_id = public.current_app_user_id_v2()) AND (organization_id = public.current_org_id_v2())));



  create policy "alerts_select"
  on "public"."alerts"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = alerts.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR public.is_trainee()));



  create policy "alerts_staff_write"
  on "public"."alerts"
  as permissive
  for all
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = alerts.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))))
with check ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = alerts.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))));



  create policy "app_user_activity_insert"
  on "public"."app_user_activity"
  as permissive
  for insert
  to authenticated
with check ((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer() OR (app_user_id = public.current_app_user_id_v2())));



  create policy "app_user_activity_select"
  on "public"."app_user_activity"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer() OR (app_user_id = public.current_app_user_id_v2())));



  create policy "app_user_profiles_insert"
  on "public"."app_user_profiles"
  as permissive
  for insert
  to authenticated
with check ((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer() OR (app_user_id = public.current_app_user_id_v2())));



  create policy "app_user_profiles_select"
  on "public"."app_user_profiles"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer() OR (app_user_id = public.current_app_user_id_v2())));



  create policy "app_user_profiles_update"
  on "public"."app_user_profiles"
  as permissive
  for update
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer() OR (app_user_id = public.current_app_user_id_v2())))
with check ((public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer() OR (app_user_id = public.current_app_user_id_v2())));



  create policy "app_users_insert_self"
  on "public"."app_users"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = auth_user_id) AND (role = 'trainee'::text) AND (COALESCE(is_active, true) = true)));



  create policy "app_users_select"
  on "public"."app_users"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = app_users.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (auth_user_id = auth.uid())));



  create policy "internal_notes_select"
  on "public"."internal_notes"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ops_events_select"
  on "public"."ops_events"
  as permissive
  for select
  to authenticated
using (true);



  create policy "review_threads_delete"
  on "public"."review_threads"
  as permissive
  for delete
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))));



  create policy "review_threads_insert"
  on "public"."review_threads"
  as permissive
  for insert
  to authenticated
with check ((public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()) AND (organization_id = public.current_org_id_v2())));



  create policy "review_threads_select"
  on "public"."review_threads"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = review_threads.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()))));



  create policy "review_threads_update"
  on "public"."review_threads"
  as permissive
  for update
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()))))
with check ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()))));



  create policy "sim_comments_insert_staff_qa"
  on "public"."simulator_comments"
  as permissive
  for insert
  to authenticated
with check (((comment_type = 'admin_qa'::text) AND (parent_comment_id IS NOT NULL) AND (author_role = ANY (ARRAY['reviewer'::text, 'ops_admin'::text, 'super_admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.app_users me
  WHERE ((me.id = simulator_comments.author_app_user_id) AND public.app_user_matches_jwt(me.auth_user_id, me.email) AND (me.role = simulator_comments.author_role) AND (me.role = ANY (ARRAY['reviewer'::text, 'ops_admin'::text, 'super_admin'::text])) AND (COALESCE(me.is_active, true) = true))))));



  create policy "sim_comments_insert_trainee"
  on "public"."simulator_comments"
  as permissive
  for insert
  to authenticated
with check (((comment_type = 'user_comment'::text) AND (author_role = 'trainee'::text) AND (EXISTS ( SELECT 1
   FROM public.app_users me
  WHERE ((me.id = simulator_comments.author_app_user_id) AND public.app_user_matches_jwt(me.auth_user_id, me.email) AND (me.role = 'trainee'::text) AND (COALESCE(me.is_active, true) = true))))));



  create policy "simulator_comments_delete"
  on "public"."simulator_comments"
  as permissive
  for delete
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (author_app_user_id = public.current_app_user_id_v2()) AND (comment_type = 'user_comment'::text))));



  create policy "simulator_comments_select"
  on "public"."simulator_comments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.review_threads rt
  WHERE ((rt.id = simulator_comments.thread_id) AND (public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
           FROM public.organizations o
          WHERE ((o.id = rt.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (rt.organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (rt.app_user_id = public.current_app_user_id_v2())))))));



  create policy "trainee_alert_assignments_delete"
  on "public"."trainee_alert_assignments"
  as permissive
  for delete
  to authenticated
using (((app_user_id = public.current_app_user_id_v2()) OR public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer()));



  create policy "trainee_alert_assignments_insert"
  on "public"."trainee_alert_assignments"
  as permissive
  for insert
  to authenticated
with check (((public.is_trainee() AND (app_user_id = public.current_app_user_id_v2())) OR public.is_super_admin() OR public.is_ops_admin() OR public.is_reviewer()));



  create policy "trainee_alert_assignments_select"
  on "public"."trainee_alert_assignments"
  as permissive
  for select
  to authenticated
using ((app_user_id = public.current_app_user_id_v2()));



  create policy "trainee_decisions_delete"
  on "public"."trainee_decisions"
  as permissive
  for delete
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))));



  create policy "trainee_decisions_update"
  on "public"."trainee_decisions"
  as permissive
  for update
  to authenticated
using ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()))))
with check ((public.is_super_admin() OR public.is_ops_admin() OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR (public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()) AND (organization_id = public.current_org_id_v2()))));



  create policy "trainee_user_watchlist_delete"
  on "public"."trainee_user_watchlist"
  as permissive
  for delete
  to authenticated
using ((app_user_id = public.current_app_user_id_v2()));



  create policy "trainee_user_watchlist_insert"
  on "public"."trainee_user_watchlist"
  as permissive
  for insert
  to authenticated
with check ((app_user_id = public.current_app_user_id_v2()));



  create policy "trainee_user_watchlist_select"
  on "public"."trainee_user_watchlist"
  as permissive
  for select
  to authenticated
using ((app_user_id = public.current_app_user_id_v2()));



  create policy "transactions_select"
  on "public"."transactions"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = transactions.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR public.is_trainee()));



  create policy "transactions_staff_write"
  on "public"."transactions"
  as permissive
  for all
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = transactions.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))))
with check ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = transactions.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))));



  create policy "user_events_select_active_users"
  on "public"."user_events"
  as permissive
  for select
  to authenticated
using (public.current_app_user_active());



  create policy "user_payment_methods_select_active_users"
  on "public"."user_payment_methods"
  as permissive
  for select
  to authenticated
using (public.current_app_user_active());



  create policy "users_select"
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = users.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2())) OR public.is_trainee()));



  create policy "users_staff_write"
  on "public"."users"
  as permissive
  for all
  to authenticated
using ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = users.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))))
with check ((public.is_super_admin() OR (public.is_ops_admin() AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = users.organization_id) AND (o.org_type = ANY (ARRAY['internal'::text, 'b2c'::text])))))) OR (public.is_reviewer() AND (organization_id = public.current_org_id_v2()))));



  create policy "trainee_decisions_insert"
  on "public"."trainee_decisions"
  as permissive
  for insert
  to authenticated
with check ((public.is_trainee() AND (app_user_id = public.current_app_user_id_v2()) AND (organization_id = public.current_org_id_v2())));


CREATE TRIGGER trg_admin_private_notes_set_author_role BEFORE INSERT OR UPDATE ON public.admin_private_notes FOR EACH ROW EXECUTE FUNCTION public.tg_set_author_role_from_app_user();

CREATE TRIGGER trg_admin_private_notes_set_updated_at BEFORE UPDATE ON public.admin_private_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_admin_private_notes BEFORE UPDATE ON public.admin_private_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_set_updated_at_app_user_profiles BEFORE UPDATE ON public.app_user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_app_users_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.set_app_users_updated_at();

CREATE TRIGGER trg_review_threads_set_org BEFORE INSERT OR UPDATE ON public.review_threads FOR EACH ROW EXECUTE FUNCTION public.tg_set_org_from_context();

CREATE TRIGGER trg_set_updated_at_review_threads BEFORE UPDATE ON public.review_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_after_insert_admin_qa_comment AFTER INSERT ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.after_insert_admin_qa_comment();

CREATE TRIGGER trg_before_update_simulator_comment BEFORE UPDATE ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.before_update_simulator_comment();

CREATE TRIGGER trg_set_updated_at_simulator_comments BEFORE UPDATE ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_simulator_comments_resolve_thread BEFORE INSERT OR UPDATE ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.simulator_comments_resolve_thread();

CREATE TRIGGER trg_simulator_comments_set_author_role BEFORE INSERT OR UPDATE ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.tg_set_author_role_from_app_user();

CREATE TRIGGER trg_simulator_comments_set_org BEFORE INSERT OR UPDATE ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.tg_set_org_from_context();

CREATE TRIGGER trg_simulator_comments_set_updated_at BEFORE UPDATE ON public.simulator_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_after_insert_trainee_decision AFTER INSERT ON public.trainee_decisions FOR EACH ROW EXECUTE FUNCTION public.after_insert_trainee_decision();

CREATE TRIGGER trg_before_insert_trainee_decision BEFORE INSERT ON public.trainee_decisions FOR EACH ROW EXECUTE FUNCTION public.before_insert_trainee_decision();

CREATE TRIGGER trg_before_update_trainee_decision BEFORE UPDATE ON public.trainee_decisions FOR EACH ROW EXECUTE FUNCTION public.before_update_trainee_decision();

CREATE TRIGGER trg_set_updated_at_trainee_decisions BEFORE UPDATE ON public.trainee_decisions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_trainee_decisions_set_org BEFORE INSERT OR UPDATE ON public.trainee_decisions FOR EACH ROW EXECUTE FUNCTION public.tg_set_org_from_context();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_app_users_v2();

CREATE TRIGGER on_auth_user_created_to_app_users AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user_to_app_users();


  create policy "Authenticated read access to selfie bucket"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'selfie'::text));



  create policy "avatars_delete_own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "avatars_insert_own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "avatars_select_own"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "avatars_update_own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])))
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));




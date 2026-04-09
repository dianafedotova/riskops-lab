-- Allow simulator channel values used for Crypto transfer and Card transfer (C2C).
alter table public.transactions drop constraint if exists transactions_channel_check;

alter table public.transactions add constraint transactions_channel_check check (
  channel is null
  or channel = any (
    array[
      'POS',
      'ePOS',
      'MOTO',
      'ATM',
      'Card to Card',
      'SEPA',
      'SWIFT',
      'FPS',
      'ACH',
      'Wire',
      'Local Bank Transfer',
      'Open Banking',
      'Blockchain',
      'Internal Wallet Transfer',
      'Internal Transfer',
      'P2P',
      'Cash',
      'Fee',
      'Adjustment',
      'Refund',
      'CRYPTO',
      'C2C'
    ]::text[]
  )
);

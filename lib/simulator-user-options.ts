export const SIMULATOR_USER_TIER_VALUES = ["Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4"] as const;

export type SimulatorUserTier = (typeof SIMULATOR_USER_TIER_VALUES)[number];

export function isSimulatorUserTier(value: string | null | undefined): value is SimulatorUserTier {
  return (SIMULATOR_USER_TIER_VALUES as readonly string[]).includes((value ?? "").trim());
}

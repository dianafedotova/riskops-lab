"use client";

import { useCurrentUser } from "@/components/current-user-provider";
import { loadAmplitudeOrganizationMeta, syncAmplitudeUser, trackTraineeSessionStarted } from "@/lib/amplitude";
import { createClient } from "@/lib/supabase";
import { useEffect } from "react";

export function AmplitudeUserSync() {
  const { appUser } = useCurrentUser();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!appUser) {
        syncAmplitudeUser(null);
        return;
      }

      const organizationMeta = await loadAmplitudeOrganizationMeta(createClient(), appUser.organization_id);
      if (cancelled) return;
      syncAmplitudeUser(appUser, organizationMeta);
      trackTraineeSessionStarted(appUser.role);
    })();

    return () => {
      cancelled = true;
    };
  }, [appUser]);

  return null;
}

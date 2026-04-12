"use client";

import type { PublicDataLayerEventProps } from "@/lib/public-data-layer";
import { pushPublicDataLayerEvent } from "@/lib/public-data-layer";
import Link, { type LinkProps } from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

type PublicTrackedLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  eventName?: string;
  eventProps?: PublicDataLayerEventProps;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function PublicTrackedLink({
  children,
  eventName,
  eventProps,
  onClick,
  ...props
}: PublicTrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (eventName) {
          pushPublicDataLayerEvent(eventName, eventProps);
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}

/** Classic app nav (teal #6f9fb0) — links + sign-in CTA */

export const navBarLinkBase =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-150 ease-out hover:bg-[#6f9fb0]/18 hover:text-slate-900 sm:min-h-0 sm:py-2";

export const navBarLinkActive =
  "border border-[#b4c8d3] bg-[linear-gradient(180deg,rgba(198,214,223,0.96)_0%,rgba(184,202,213,0.95)_100%)] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_10px_rgba(25,52,68,0.12)]";

export function navBarLinkClassName(active: boolean) {
  return active ? `${navBarLinkBase} ${navBarLinkActive}` : navBarLinkBase;
}

export const navBarScrollRowClass =
  "-mx-1 flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0";

export const navBarOuterClass =
  "flex max-w-full flex-nowrap items-center gap-1";

export const navBarSignInClass =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#5e8d9c] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-[#4f7e8d] sm:min-h-0 sm:py-2";

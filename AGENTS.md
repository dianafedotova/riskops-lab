<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Brand logo — do not change without asking

The product logo is implemented in **`components/brand-mark.tsx`** and is **locked**.

- **Title:** `RiskOps Lab` + typographic period styled **`text-[#E15747]`** (orange dot character, not a separate square block unless the user explicitly requests it).
- **Subtitle (default):** `Fraud & AML Investigation Simulator` — weights/sizes as in that file.
- **Rule:** Do **not** edit this component, replace the mark-up, swap colors, or change logo-related copy/layout **unless the user explicitly asks**. If a task might affect the logo or anything that displays it (e.g. headers, auth card, `BrandMark` props), **stop and ask the user first**.

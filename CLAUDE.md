# PactPay App — Claude Code Rules

## Project Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite + `@tailwindcss/vite` (Tailwind v4, no `tailwind.config.js`)
- **Styling:** Tailwind CSS utility classes — inline, no CSS Modules or styled-components
- **UI library:** shadcn/ui components in `src/components/ui/`
- **Icons:** `@tabler/icons-react` (member/settings pages), `lucide-react` (org/admin pages)
- **Routing:** react-router-dom v6 (`useNavigate`, `useLocation`)
- **State:** Zustand stores in `src/stores/`
- **HTTP:** Axios via custom API class instances in `src/apis/`
- **Path alias:** `@/` → `src/`

---

## Figma MCP Integration Rules

### Required Flow (do not skip)

1. Call `get_design_context` with the exact `fileKey` and `nodeId` from the Figma URL.
2. If the response is truncated, call `get_metadata` to get the node map, then re-fetch specific child nodes.
3. Call `get_screenshot` for the same node as the visual source of truth.
4. Download any assets (images, SVGs) returned as `localhost` URLs — use them directly, do not modify.
5. Implement using the project's conventions (see below), not the raw React + Tailwind from the MCP output.
6. Validate the result against the screenshot before marking complete.

### IMPORTANT: Size Scaling Rule

**The implemented UI should be slightly smaller overall than the Figma design.**
Figma designs are authored at a slightly larger scale than the target screen size. When translating:
- Reduce font sizes by approximately one step (e.g. Figma `18px` → use `16px`, Figma `16px` → use `14px`)
- Reduce padding/gap values by ~20% (e.g. Figma `24px` gap → use `20px`, Figma `16px` padding → use `12px–14px`)
- Reduce icon sizes slightly (e.g. Figma `24px` → use `20px`, Figma `32px` → use `26px–28px`)
- Border radii can generally be kept as-is
- Apply judgement — the goal is a compact, dense feel that fits a browser viewport comfortably

---

## Component Organization

- **shadcn/ui primitives:** `src/components/ui/` — Button, Input, Table, Dialog, Drawer, Badge, etc.
- **App shell / layout:** `src/components/app/` — sidebar, header, layout wrappers
- **Page views:** `src/views/` — organized by role (`member/`, `orgs/`, `admin/`)
- **Page-scoped components:** `src/views/<section>/components/`

Prefer extending or composing existing components over creating new ones.

---

## Styling Rules

- Use **Tailwind utility classes directly** on JSX elements — no `@apply`, no CSS Modules.
- Colors are hardcoded hex values matching the Figma palette (no CSS variable tokens for brand colors):
  - Primary text: `#1c1c26`
  - Secondary text: `#606067`
  - Placeholder / muted: `#8d8d93`
  - Brand blue: `#5e85ee`
  - Background grey: `#f5f5f5`
  - Border: `rgba(0,0,0,0.12)`
  - Success green: `#5ddd22` / `rgba(93,221,34,0.12)`
  - Warning amber: `#ffa800` / `rgba(255,168,0,0.12)`
  - Error red: `#d92b2b`
- Border radii: cards `rounded-[24px]` or `rounded-[32px]`, buttons `rounded-[12px]`, badges `rounded-[8px]`, inputs `rounded-[12px]`
- **IMPORTANT: Do not hardcode colors that differ from the palette above.**

---

## Icon Rules

- **IMPORTANT: Do not install new icon packages.**
- Member/settings/account views → use `@tabler/icons-react` (e.g. `IconCheck`, `IconPencil`, `IconX`)
- Org/admin/members views → use `lucide-react` (e.g. `Check`, `ChevronDown`, `Plus`, `X`)
- Match which library is already imported in the file being edited.
- If the Figma MCP server returns a `localhost` SVG asset, use that source directly.

---

## Asset Rules

- Static assets in `public/` or `src/assets/`
- **IMPORTANT:** If the Figma MCP server returns a `localhost` URL for an image or SVG, use it directly — do not create placeholders.

---

## Table Component

- Always use `src/components/ui/table.tsx` (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`) for tabular data — never build div-based flex tables.
- The Table component renders a plain `<table>` element with no overflow wrapper — wrap the Table in an `overflow-x-auto` div at the page level if horizontal scroll is needed.

---

## Project-Specific Patterns

- Inter-page data: pass via `navigate('/path', { state: { ... } })` and read with `useLocation().state`.
- API calls: use `apis.<domain>.<method>()` from `src/apis/index.ts`; handle errors with toast.
- API response types: update the interface in `src/apis/*.ts` to match the backend response, and derive display-only fields from that typed object at render/helper time. Do not introduce duplicate row/view types that mirror response payloads such as `allTransactions`.
- Loading / error states: always show a loading indicator and a descriptive error toast on failure.
- Pagination: server-side; `page` + `pageSize` params. Fetch on `currentPage` change via `useEffect`.
- Permissions: use `hasPermission(currentUserRole, Permission.X)` from `src/utils/permissions.ts`.

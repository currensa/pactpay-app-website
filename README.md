# PactPay Organization Frontend

Vite frontend for Organization workspaces, payroll, and direct GravArc privacy
operations. StealthPay is not part of the current product. Project scope and
task status are recorded in [`full-privacy/docs/delivery`](../full-privacy/docs/delivery/).

## Local start

Use Node.js `24.21.0`. Start the Organization backend on
`http://localhost:3000`, then run:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. The Vite proxy sends `/api` requests to the
local backend. Networks, tokens, contracts, protocols, and circuit URLs come
from that backend; do not configure them separately in the frontend.

## Recovery

The submitting browser keeps encrypted pending deposit, confirmation, and DeFi
delivery data in `localStorage`. Keep the same browser origin and do not clear
site data while an operation is pending. Retry delivery from saved data rather
than broadcasting a second deposit. A local service restart does not remove
browser recovery data or the backend's PostgreSQL scanner state.

Run `npm test` and `npm run build` for local checks. Developer-run wallet
validation is recorded separately in the task document.

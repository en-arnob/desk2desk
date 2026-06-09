# Statistics — what each number means

A plain-language guide to the metrics on the **Statistics** and **Workload**
pages. Every figure here is computed from the same request data, so once you
understand the building blocks the rest follows.

## First, the building blocks

Every Request moves through a lifecycle, and the app stamps a timestamp at each
step. Almost all metrics are just counts or time-differences between these
stamps.

| Stamp | Set when… |
|-------|-----------|
| `createdAt` | the requester submits the request |
| `claimedAt` ("Started") | a provider claims it (goes straight to **In progress**) |
| `resolvedAt` | the provider marks it **Resolved** |
| `closedAt` | the requester confirms and **Closes** it |

The statuses a request can be in:

- **Open** — submitted, nobody working it yet.
- **In progress** — a provider claimed it and is working.
- **Resolved** — the provider says it's done, waiting for the requester to confirm.
- **Closed** — the requester confirmed; finished.
- **Reopened** — the requester wasn't satisfied; back to being worked.
- **Cancelled** — withdrawn before completion.

> "This week" everywhere means **the last 7 days** (rolling), not the calendar
> week. "Today" means since midnight.

---

## Statistics page — headline numbers

- **Total requests** — every request ever created, all statuses included.

- **Open backlog** — requests still waiting for work: **Open + Reopened**.
  This is your "what's outstanding right now" number.

- **… unassigned** (the small text under backlog) — of that backlog, how many
  have **no provider yet**. A high number here means work is piling up with
  nobody picking it up.

- **Resolved + Closed** — requests that have been finished (resolved by a
  provider and/or closed by the requester). Your "done" total.

- **Avg response** — average time from **created → claimed**. In other words,
  *how long requests wait before a provider picks them up*. Only requests that
  have actually been claimed count toward this. Lower is better.

- **Avg resolution** — average time from **claimed → resolved**. That is, *how
  long a provider takes to finish once they start*. Only requests that reached
  resolution count. Lower is better.

- **Active providers** — number of provider accounts that are switched on
  (`isProvider` and active). This is a headcount of who *can* take work, not how
  busy they are.

- **Created today / Created this week** — how many new requests came in since
  midnight, and over the last 7 days. Good for spotting demand spikes.

- **In progress / Open** — quick counts of those two statuses (also visible in
  the bar chart below).

### The two bar charts

- **Requests by status** — the count in each status (Open, In progress,
  Resolved, Closed, Reopened, Cancelled). Shows where everything currently sits.

- **Requests by category** — how many requests fall under each support category
  (Printer/Hardware, DB Report, etc.). Shows where demand is concentrated.

---

## Workload page — per-provider activity

This page breaks the work down by provider, with a **date range** and
**category** filter. Important: the columns mix two kinds of measurement —

- **Handled** — requests this provider **resolved or closed within the selected
  date range** (dated by `resolvedAt`). Change the date range and this number
  changes. This is the main "how much did they get done" measure.

- **Active now** — requests **currently** assigned to them and still being
  worked (In progress / Reopened). This is a *right-now snapshot* and ignores
  the date range — it's their present workload, not history.

- **Avg resolution** — that provider's average **claimed → resolved** time, over
  the requests they handled in the range. Their personal version of the
  org-wide "Avg resolution".

A provider shows up in the table if they handled something in the range **or**
have active work now. The summary line above the table totals these:
`N providers · X handled · Y active now`.

### Filters

- **Date range / presets** — scope the *Handled* and *Avg resolution* columns.
  (Active now is unaffected, by design.)
- **Category** — only count requests in that category.
- **Search** — find a provider by name or employee ID.
- **Sort** — order by Handled, Active now, Avg resolution, or Name.

---

## Provider's own dashboard (for context)

A provider also sees personal numbers on their **Support Dashboard**:

- **Available** — open, unassigned requests in their service categories that
  they *could* claim.
- **Active** — requests they've claimed and are working.
- **Resolved (total / this week)** — what they've finished overall and in the
  last 7 days.

---

## Quick "is this good or bad?" cheat sheet

| If this is high… | …it usually means |
|------------------|-------------------|
| Open backlog / unassigned | work is arriving faster than it's being claimed |
| Avg response | requests sit too long before someone starts |
| Avg resolution | requests take long to finish once started |
| Created today/week | demand is spiking |
| A provider's Active now | that person is overloaded right now |
| A provider's Handled | that person cleared a lot in the period (good) |

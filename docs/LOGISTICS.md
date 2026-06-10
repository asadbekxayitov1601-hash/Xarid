# Xarid Logistics — In-House Delivery Operation Design

Decision: Xarid delivers everything itself. "Consolidated delivery before
lunch prep" is the core promise; outsourcing it means outsourcing the product.
This document designs the operation; the software side is Phase 2 of
`docs/PLAN.md`.

## The morning cycle

| Time | What happens | Who |
|---|---|---|
| 22:00 | Order cutoff; baskets split into per-supplier POs | system |
| 23:30 | All POs confirmed/adjusted by suppliers | suppliers via bot |
| 23:45 | Routes built: orders grouped by zone, capped by van capacity | system + ops |
| 05:30–07:00 | Pickup loop: van visits suppliers, checks weights against POs | driver |
| 07:00–10:00 | Delivery loop: drops per route sheet; weights/cash/photo at each door | driver |
| 10:30 | Cash + signed sheets handed in; reconciliation | ops |

Two loop models — start with **A**, move to **B** at ~25+ orders/morning:

- **A. Milk-run (Phase 1–2):** one van does pickup loop then delivery loop.
  Works while suppliers are clustered (one bazaar/wholesale node) and
  ≤ ~12–15 stops.
- **B. Hub cross-dock (Phase 2+):** suppliers deliver to a rented cross-dock
  point (or a corner of an anchor supplier's warehouse) by 06:00; goods are
  re-sorted per buyer; vans run delivery-only routes. Cheaper per stop, needs
  volume to justify.

## Fleet plan

| Stage | Fleet | Cost model |
|---|---|---|
| Phase 1 | Rented Damas/Labo per morning (drivers with own van are easy to find) | ~150–250k UZS per morning, zero commitment |
| Phase 2 | 1–2 vans on monthly rental/lease + hired drivers | predictable cost, branded, controllable |
| Phase 4 | Owned fleet incl. 1 refrigerated van (meat/dairy at scale) | from investment |

Capacity rule of thumb: Damas ≈ 450–550 kg usable; average HoReCa morning
order 60–120 kg → **8–12 stops per van**, which matches the unit-economics
requirement of ≥10 stops/van.

Cold chain: in Phases 1–2, meat/dairy travel in insulated boxes with ice
packs, loaded last/dropped first. A refrigerated van is a scale decision, not
a launch requirement — but write meat-handling rules down from day one
(sealed bags, max 2h from supplier chiller to buyer).

## Zones & density

- Launch in **1–2 adjacent districts** with the highest venue density
  (count venues per district on 2GIS before choosing). Density is the whole
  economics: 12 stops in one district beats 12 stops across Tashkent by 2–3×.
- A zone = a set of districts one van serves in one morning. Open a new zone
  only when an existing zone exceeds ~20 orders/morning (i.e., supports a
  second van by itself).

## People

| Role | When | Notes |
|---|---|---|
| Founder = dispatcher + quality control | Phase 1 | rides along; learns every failure mode personally |
| Driver-couriers | Phase 2 | hire for reliability at 5 a.m., pay base + per-stop bonus |
| Ops lead (dispatcher) | first revenue allows | owns the 05:00–11:00 window so the founder can sleep and code |

Driver compensation: base + per-completed-stop bonus + zero-cash-discrepancy
bonus. The bonus structure is the anti-leakage system.

## Cash discipline (until Phase 3 payments)

1. Driver bot records cash taken at each stop (vs `cashDue`).
2. Driver hands in cash + route sheet by 10:30 daily; ops reconciles same day.
3. Any discrepancy is resolved the same day or deducted from the driver bonus.
4. Supplier payouts weekly, calculated from confirmed `qtyActual`, never from
   supplier claims.

## Quality & disputes at the door

- Driver verifies weight/count at supplier pickup against the PO — disputes
  with suppliers are settled **at pickup**, not after delivery.
- At drop-off, the buyer checks goods; driver enters actual accepted
  quantities and photographs the delivery. Rejected items go back on the van
  and to the supplier's account, not Xarid's.
- Instant-credit policy for legitimate quality complaints (within 2 hours of
  delivery) — trust in month 1–6 is worth more than any single invoice.

## Legal structure

- Phase 1–2: logistics is an internal function (drivers as contracted
  self-employed / GPH agreements is common practice — confirm current rules
  with an accountant).
- Phase 3: register the LLC (МЧЖ); check food transport sanitary requirements
  for vans before scaling the fleet.
- Spinning logistics out as a **separate delivery company** serving third
  parties is a real Phase 4+ option (the user's stated ambition): by then you
  have routes, drivers, and morning capacity that sits idle after 10:00 —
  selling that capacity (B2B parcel, dark-store replenishment) is found money.
  Do not split legal entities before there is a second customer for the
  capacity; it only adds accounting overhead.

## Numbers to measure from week 1 (these decide everything)

- Stops per van per morning (target ≥ 10)
- Cost per stop (all-in van+driver+fuel ÷ stops; target < take revenue/stop)
- On-time rate (delivered before promised window; target ≥ 95%)
- Shortage/dispute rate per 100 order lines
- Cash discrepancy per driver per week (target: 0)

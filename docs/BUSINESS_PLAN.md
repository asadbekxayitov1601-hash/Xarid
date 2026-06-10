# Xarid — Personal Business Plan (Founder's Working Document)

> **What this is.** A business plan *for yourself*, in the spirit Pavel
> Annenkov describes in «Ошибки на миллион долларов» ("Million-Dollar
> Mistakes"): an honest working document you re-read and update monthly to
> steer the business — not a sales document. The investor version will be
> written separately, after Phase 3, from the real numbers this document
> accumulates.
>
> Note: the author's site is **pavelannenkov.ru** (not .com). It was not
> reachable from this environment to pull his exact template, so the structure
> below follows the book's logic: honest goals → model → numbers → risks →
> control points. When you can access the site, compare and merge anything
> his template adds.
>
> Items marked `[FILL]` are yours to complete — nobody can fill them for you,
> and guessing them defeats the purpose of the document.

---

## 1. Why I am doing this (founder's goals)

Annenkov's first rule: a business plan for yourself starts with *your* goals,
because the business must serve the founder's life, not the other way around.

- Personal income target by month 12: `[FILL: e.g., $X/month]`
- What I want this business to be in 3 years: `[FILL: lifestyle business in
  Tashkent / VC-scale Central Asia company / acquisition target for a bank or
  Uzum-type ecosystem]`
- What I am NOT willing to sacrifice: `[FILL]`
- My personal runway (months I can work without salary): `[FILL]`
- My unfair advantage in this market: `[FILL: e.g., family in the restaurant
  business, supplier relationships, languages, tech skills]`

## 2. The problem and the customer

- **Buyer:** restaurants, cafes, chaikhanas in Tashkent doing their own daily
  procurement. The person is the owner, manager, or chef who today spends
  06:00–08:00 calling suppliers or going to the bazaar.
- **Pain ranked:** (1) time and chaos of multi-supplier ordering, (2) opaque
  and shifting prices, (3) unreliable delivery timing, (4) quality disputes
  with no recourse.
- **Supplier:** wholesale traders and farmers who today take orders by phone
  all evening, have no demand visibility, and chase cash payments.

**Validation evidence (update as collected):**

| Date | Who I talked to | What they spend now | Would they switch? | Notes |
|---|---|---|---|---|
| `[FILL]` | | | | |

## 3. The model

One basket across vetted suppliers → consolidated morning delivery by our own
fleet → we earn the spread.

**Revenue streams, in order of activation:**

1. Take rate built into prices: target **7%** (range 5–10% by category —
   higher on dry goods, lower on meat where margins are thin).
2. Delivery fee: free above minimum order (e.g., 1.5M UZS), flat fee below.
3. Supplier subscription (Phase 3): 0% commission alternative for high-volume
   suppliers, 500k–1.5M UZS/month.
4. Financing on receivables (Phase 4, via licensed partner): 1.5–3% per
   advance.

**Why suppliers join:** demand aggregation (one consolidated PO instead of 30
evening phone calls), guaranteed weekly payout, demand data. We are a sales
channel, not a tax.

## 4. Market (fill with your own count — do not copy internet numbers)

Annenkov's point: for a personal plan, a bottom-up count you did yourself
beats any "TAM" from a report.

- Restaurants/cafes/chaikhanas in my starting zones (count them on
  Yandex Maps / 2GIS, zone by zone): `[FILL: e.g., Chilanzar: N, Yunusabad: N]`
- Average daily procurement spend per venue (from interviews): `[FILL, typical
  range to verify: 1–5M UZS/day for a mid-size cafe]`
- Realistic share of a venue's basket we can capture in year 1: `[FILL: start
  assumption 30–50% — nobody moves 100% of procurement at once]`
- Bottom-up year-1 target: `venues × avg basket × share × 26 order-days/month`

## 5. Unit economics (the only table that matters)

Worked example with placeholder numbers — replace every cell with measured
reality from Phase 1, and recalculate monthly:

| Line | Assumption | Per order |
|---|---|---|
| Average order value (AOV) | `[FILL: assume 1,500,000 UZS]` | 1,500,000 |
| Take rate | 7% | **+105,000** |
| Delivery fee | free over minimum | +0 |
| Delivery cost per stop | van 400k UZS/morning ÷ 12 stops | **−33,000** |
| Payment/cash handling | ~0.5% blended | −7,500 |
| Packaging, shrinkage, disputes | ~1% of AOV | −15,000 |
| **Contribution per order** | | **≈ +49,500 UZS** |

Then: contribution × orders/day × 26 days vs fixed costs (below). The business
works when **stops per van per morning ≥ ~10** and **AOV ≥ ~1M UZS**. If
Phase 1 shows 5 stops/van and 600k AOV, fix density before scaling anything.

## 6. The logistics company (see docs/LOGISTICS.md for full design)

Decision: **we deliver everything ourselves** — delivery reliability IS the
product promise ("before lunch prep"), and the analog that owns logistics
(Jumbotail) defends margin better than pure-software ones.

- Phase 1: rented Damas/Labo van + founder riding along (~150–250k UZS/morning).
- Phase 2: 1–2 leased vans, hired drivers, zones and route sheets from the system.
- Structure it as an internal division first; spin out as a separate legal
  entity only if/when it serves third parties.

## 7. Go-to-market

- **Supply first, narrow first:** lock 8–12 suppliers covering the top 100
  SKUs at honest prices before recruiting buyers. An empty marketplace kills
  trust once.
- **One zone at a time:** start with 1–2 adjacent districts so route density
  works from week one. Density beats coverage.
- **Sales = founder's feet:** visit venues at 10:00–11:30 (after delivery
  chaos, before lunch rush). Offer: "tomorrow's order, one basket, delivered
  by 09:00, same or better prices — first delivery free."
- Referral: 100k UZS credit for a working referral (a venue that places 3+ orders).

## 8. Financial plan, months 1–12

Fixed monthly costs (pre-investment, fill real figures):

| Item | UZS/month |
|---|---|
| Founder living cost (be honest) | `[FILL]` |
| Van rent/lease + fuel | `[FILL: ~8–12M for one van]` |
| Driver salary (Phase 2+) | `[FILL: ~5–8M]` |
| Hosting/SMS/domain | ~200k (mostly free tiers) |
| LLC, accounting (Phase 3+) | `[FILL: ~2–3M]` |

Break-even orders/month = fixed costs ÷ contribution per order. With the
example numbers (~49.5k/order), every 10M UZS of fixed cost needs ~200
orders/month ≈ 8 orders/day. Write your number here: `[FILL]`.

## 9. Risks — and what I will actually do

| Risk | Reality check | Mitigation |
|---|---|---|
| Disintermediation (buyer & supplier cut us out) | Will happen with weak suppliers | Own the delivery + weekly payout + demand data; make the platform more valuable than the contact |
| Quality disputes (produce, meat) | Daily occurrence, not edge case | Driver records actual weights/photos at the door; instant credit policy |
| Supplier reliability at 5 a.m. | The hardest operational problem | 2+ suppliers per top SKU; reliability score; drop chronic failers |
| Cash leakage (COD) | Classic failure mode | Daily driver reconciliation (Phase 2), push to online payment (Phase 3) |
| Price war / incumbent reaction (Uzum, big wholesalers) | Possible once visible | Stay niche-deep in HoReCa morning logistics, where they have no ops |
| Founder burnout (6 a.m. ops + coding) | Near-certain by month 4 | Hire an ops person from first revenue; protect one full rest day |
| Regulatory (food transport, tax) | Survivable but real | LLC + accountant in Phase 3; food-transport norms for vans before scaling fleet |

## 10. Milestones & monthly control

Re-read and update this document **on the 1st of every month**. Kill criteria
are as important as goals.

| Checkpoint | Target | Kill/pivot signal |
|---|---|---|
| End Phase 0 | 30 buyers + 10 suppliers committed | < 10 buyers interested after 50 visits → problem isn't burning; re-segment |
| End Phase 1 | 15 active buyers, 50M UZS GMV/week | Retention < 50% week-over-week → product/price problem; stop building, fix offer |
| End Phase 2 | Delivery cost/stop < take revenue/stop | Cost/stop stuck above revenue at 10+ stops → model problem, not execution |
| End Phase 3 | Software-generated monthly P&L, ≥50% non-cash GMV | — |
| Investment readiness | All of: 3 months GMV growth, unit economics positive, P&L from ledger, churn < 10%/mo | Raising before this = raising on a story, weakest possible position |

## 11. Investment preparation (separate track, after Phase 3)

The investor business plan is a **different document** written later. What
this working document must produce as raw material for it:

- [ ] 6+ months of GMV/retention/AOV data exported from the system
- [ ] Measured unit economics (section 5 with real numbers, 3 months stable)
- [ ] P&L from the ledger, not from memory
- [ ] Supplier and buyer reference list (who will vouch for us)
- [ ] Clean legal entity, clean cap table, registered domain/trademark
- [ ] One-page use-of-funds: vans, ops hires, city #2 — tied to measured costs

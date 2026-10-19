# How the cost is calculated

The engine lives in [`src/lib/calculator/engine.ts`](../src/lib/calculator/engine.ts) and is covered by unit tests in [`engine.test.ts`](../src/lib/calculator/engine.test.ts). It is pure: the same inputs always give the same result.

## Jobs, pieces and orders

A calculation describes **one print job** (one plate). A job can produce several identical pieces (`piecesPerJob`), and an order asks for some number of pieces (`quantity`).

- Costs that belong to the job (filament, electricity, printer wear, preparation time) are divided between the pieces on the plate.
- Costs that belong to each piece (extras like keyrings, post-processing time) are counted per piece.
- Order totals are the per-piece numbers times `quantity`. The number of jobs is `ceil(quantity / piecesPerJob)`.

## Cost of one piece

| Part | Formula |
| --- | --- |
| Filament | Σ grams × (1 + waste %) × spool price ÷ spool weight |
| Electricity | power (kW) × print hours × price per kWh |
| Depreciation | (printer price − resale value) ÷ lifetime hours × print hours |
| Maintenance | maintenance per hour × print hours |
| Failures | (filament + electricity + depreciation + maintenance) × f ÷ (1 − f) |
| Labor | hourly rate × (prep minutes ÷ pieces + post-processing minutes) ÷ 60 |
| Extras | Σ unit price × quantity per piece |
| Overhead | sum of all of the above × overhead % |

**Why `f ÷ (1 − f)` for failures?** If a fraction `f` of jobs fail, you need on average `1 ÷ (1 − f)` attempts per good job. The extra attempts waste filament, electricity and machine time, but not extras or post-processing, which only happen on prints that succeeded. At a 10 % failure rate this adds about 11 % to the machine work.

## Printer wear

Depreciation is straight-line **by usage**, not by calendar time: a printer that runs 20 hours a day wears out faster than one used on weekends. You enter what you paid, what you expect to sell it for at the end (0 if you'll run it into the ground), and how many print hours you expect from it. Maintenance (nozzles, build plates, belts, lubricant) is a separate cost per print hour.

## Price

1. **Net price** (what you keep):
   - markup: `cost × (1 + p)` — 30 % markup on 10 is 13
   - margin: `cost ÷ (1 − p)` — 30 % margin on 10 is 14.29
2. **Price the buyer pays**: `net ÷ (1 ÷ (1 + VAT) − fee)`.
   VAT is added to the price, and the marketplace fee is a share of the full price the buyer pays. This formula makes sure that after paying both, exactly the net price is left.

## Precision

The engine works in full floating-point precision and rounds results to 4 decimals, so tiny costs such as a few cents of electricity aren't lost. The interface rounds to 2 decimals for display.

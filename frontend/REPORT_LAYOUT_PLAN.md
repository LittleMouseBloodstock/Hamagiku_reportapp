# Report Layout Follow-up Plan

Date: 2026-05-31

## Goal

Improve the monthly report print layout for HF headed paper without changing the departure report layout.

Requested direction:

- Keep the top no-logo print margin at the April layout level so the printed header logo is not overlapped.
- Move the lower safe area for the comment box down by about 1cm, while still avoiding the pre-printed footer logo.
- Use the recovered vertical space to make the weight chart and x-axis date labels larger and more readable.
- Rebalance the monthly report layout so the comment text stays inside the border and the footer logo area remains clear.

## Current Constraints

- HF headed paper has a pre-printed logo/header at the top and a pre-printed logo/footer at the bottom.
- Monthly report no-logo print currently depends on `ReportTemplate.tsx` print CSS and matching batch print overrides in `app/dashboard/clients/[id]/reports/page.tsx`.
- Departure report layout is acceptable and should not be changed.
- Report creation preview and print layout have different requirements:
  - Preview should allow owner/trainer metadata to wrap.
  - Print should stay compact and predictable.

## Proposed Implementation

1. Preserve the April top margin:
   - Keep monthly no-logo print `padding-top` at `20mm`.
   - Do not reduce top spacing to recover vertical room.

2. Reclaim room from the lower layout:
   - Move the comment box lower boundary down by approximately `10mm`.
   - Verify this against the actual HF paper overlay, not only the browser print preview.
   - Keep app-generated footer text hidden for no-logo print.

3. Increase the weight chart:
   - Increase the no-logo `.weight-chart` height after confirming safe bottom space.
   - Increase x-axis date label font size only after widening or abbreviating labels enough to prevent overlap.
   - Keep Japanese labels short, for example `26/5`.
   - Keep English labels short, for example `May 26`.

4. Rebalance adjacent sections:
   - If more chart height is needed, reduce photo height slightly before reducing header safety margin.
   - Keep training/condition/current weight boxes one-line where possible with `white-space: nowrap` and compact letter spacing.
   - Keep comment text clipped inside the box, but ensure the visible lines do not collide with the border.

## Verification Checklist

- Monthly no-logo print preview does not overlap the HF top logo.
- Monthly no-logo print preview does not overlap the HF bottom logo/footer.
- Comment text stays inside the border with visible bottom padding.
- Weight chart is larger than the current deployed version.
- X-axis date labels are readable and do not overlap.
- Training/condition/current weight boxes do not wrap into awkward two-line layouts.
- Batch print and single report print match.
- Departure report remains visually unchanged.

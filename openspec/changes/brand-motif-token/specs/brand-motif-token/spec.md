# Spec: Brand motif in the brand stripe

## ADDED Requirements

### Requirement: The stripe draws a theme's motif
`CnBrandStripe` SHALL draw `--cn-brand-stripe-image` in its own box, at its own height, when a
theme names it, and SHALL draw its three bands from `--cn-brand-stripe-color-1/2/3` and
`--cn-brand-stripe-ratio-1/2/3` when it does not. The component SHALL read no theme token.

#### Scenario: A motif image
@e2e exclude Style contract: jsdom loads no stylesheet; tests/components/CnBrandStripe.spec.js asserts the source
- **GIVEN** a theme that sets `--cn-brand-stripe-image`
- **WHEN** the stripe renders
- **THEN** its background is that image and the bands draw nothing

#### Scenario: No motif
@e2e exclude Style contract: tests/components/CnBrandStripe.spec.js
- **GIVEN** no `--cn-brand-stripe-image`
- **WHEN** the stripe renders
- **THEN** it draws the three bands in their ratio, as before

### Requirement: The stripe has a variant for a dark band
`CnBrandStripe` SHALL accept `variant` `default` or `inverse`. The `inverse` variant SHALL draw
`--cn-brand-stripe-image-inverse`, else `--cn-brand-stripe-image`, else the bands.

#### Scenario: Over a footer
@e2e exclude Style contract and prop validator: tests/components/CnBrandStripe.spec.js
- **GIVEN** a stripe with `variant="inverse"` and a theme that sets `--cn-brand-stripe-image-inverse`
- **WHEN** it renders
- **THEN** it draws the inverse image

### Requirement: A portal can import the stripe
`CnBrandStripe` SHALL be exported from the public-safe entry (`src/public/index.js`), and that
entry SHALL still reach no `@nextcloud/*` module.

#### Scenario: Public-safe
@e2e exclude Import check: tests/components/CnBrandStripe.spec.js and npm run check:public-safe
- **GIVEN** the public entry
- **WHEN** a portal imports `CnBrandStripe` from it
- **THEN** it is the same component, and `check:public-safe` passes

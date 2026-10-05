## Why

`CnBrandStripe` draws at most three flat bands. Four demo schools in Zuiddrecht have a motif that
is not three bands: hanging twigs, a canal and its bank, a slanted cut, a temperature line. Their
theme (thematiq `brand-motif-on-portals`) already names the motif as an image in
`--nldesign-brand-stripe-image` and hands it to the library as `--cn-brand-stripe-image`, plus
`--cn-brand-stripe-image-inverse` for a dark band such as a footer. The component could not draw
either. A portal renderer could not import the component at all: it was not on the public-safe
entry.

## What Changes

- `CnBrandStripe` draws `--cn-brand-stripe-image` in its own box when a theme names one, and its
  three bands otherwise, exactly as before. The bands are now one gradient on the root (hard stops
  from the ratios), so the image can take their place through one `var()` fallback; the three band
  elements stay, empty.
- New prop `variant`: `default` or `inverse`. `inverse` draws `--cn-brand-stripe-image-inverse`,
  else the one image, else the bands.
- `CnBrandStripe` is exported from `src/public/index.js`. It imports nothing, so the public-safe
  check stays green.

## Impact

- Additive: a new optional prop and two new optional properties. A theme that names no image sees
  the same three bands. Minor version.
- Docs: `CnBrandStripe.md` shows a motif and the inverse variant.

# map-layer-toggles Delta: map-layer-toggles

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-layer-toggles](../../)

## ADDED Requirements

### Requirement: A map can offer layers to switch on and off

CnMapWidget SHALL take `layerToggles` (also as `content.layerToggles`): `[{ id, label, layer, on? }]`, `layer` in the `layers` shape. It SHALL draw a fieldset named `content.layerTogglesTitle` (default "Map layers") with a checkbox per toggle, its label through the host translate, checked by `on` (default true). A toggle that is on SHALL be mounted with the declared layers; switching it SHALL add or remove that layer.

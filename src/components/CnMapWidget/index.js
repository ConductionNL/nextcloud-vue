/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMapWidget — an OpenRegister-backed Leaflet map, placeable as a dashboard
 * widget under the `map` type.
 *
 * This module used to ALSO self-register that type, while
 * `CnWidgetGrid/registerDashboardWidgets.js` registered it inline with a
 * byte-identical entry (the inline call is deliberate: `sideEffects:
 * ["**\/*.css"]` lets a bundler legally drop a bare side-effect import, which
 * once shipped a dist with no object-list registration at all). Both paths run
 * in a consumer's build — `components/index.js` re-exports this module, so the
 * self-registration was never actually tree-shaken away — and the second call
 * warned "widget type "map" is already registered" in every consuming app's
 * console on boot.
 *
 * The aggregator is now the single registrar for this type. This module only
 * exports the component; import the aggregator (or the package root) if you
 * need the catalog populated.
 */

import CnMapWidget from './CnMapWidget.vue'

export default CnMapWidget
export { CnMapWidget }

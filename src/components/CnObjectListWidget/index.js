/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectListWidget — an abstract, OpenRegister-backed object list / table,
 * placeable as a dashboard widget under the legacy `object-list` type.
 *
 * This module used to ALSO self-register that type, and its entry DIVERGED from
 * the one `CnWidgetGrid/registerDashboardWidgets.js` registers inline: `limit:
 * 5` and no `surfaces`, against the aggregator's `limit: 25` and `surfaces:
 * ['legacy']`. Whichever ran last won, so a load-order change would silently
 * un-hide this legacy alias in every Add-widget picker — and the second call
 * warned "widget type "object-list" is already registered" in every consuming
 * app's console on boot.
 *
 * The aggregator is now the single registrar for this type, keeping the entry
 * that already won. This module only exports the component; import the
 * aggregator (or the package root) if you need the catalog populated.
 */

import CnObjectListWidget from './CnObjectListWidget.vue'

export { CnObjectListWidget }
export default CnObjectListWidget

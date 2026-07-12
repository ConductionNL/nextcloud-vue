/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import CnIconPicker from './CnIconPicker.vue'
import CnDashboardIcon from './CnDashboardIcon.vue'

export { CnIconPicker, CnDashboardIcon }
export { DASHBOARD_ICONS, DEFAULT_ICON, getIconComponent, isCustomIconUrl } from './dashboardIcons.js'
// NO `NL_DESIGN_ICONS` re-export here. `components/index.js` imports this file
// for CnIconPicker/CnDashboardIcon, so re-exporting the NL sets from it chained
// every consumer of the barrel to `icons/index.js` → `rvo.js` — ~1.9MB of data
// URIs on the eager path. Removing it from the top-level barrel alone was NOT
// enough; this was the surviving edge. Import the pack by subpath if you need it
// up front (see src/icons/index.js).
export { fromMdiJs, fromFontAwesome, fromOpenGemeenten, dedupeCatalogue } from './iconCatalogues.js'
export default CnIconPicker

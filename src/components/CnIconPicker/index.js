/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import CnIconPicker from './CnIconPicker.vue'
import CnDashboardIcon from './CnDashboardIcon.vue'

export { CnIconPicker, CnDashboardIcon }
export { DASHBOARD_ICONS, DEFAULT_ICON, getIconComponent, isCustomIconUrl } from './dashboardIcons.js'
export { NL_DESIGN_ICONS } from './nlDesignIcons.js'
export { fromMdiJs, fromFontAwesome, fromOpenGemeenten, dedupeCatalogue } from './iconCatalogues.js'
export default CnIconPicker

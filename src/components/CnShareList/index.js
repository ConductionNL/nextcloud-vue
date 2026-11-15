/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnShareList - self-registers the `share-list` widget type (the shares of a
 * record outside the organisation, with Copy link and Revoke) into the shared
 * dashboardWidgetRegistry at module load.
 */

import CnShareList from './CnShareList.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('share-list', {
	renderer: CnShareList,
	form: null,
	defaultContent: { url: '', revoke: { url: '' } },
	displayName: 'Shares',
	icon: 'ShareVariantOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { CnShareList }
export default CnShareList

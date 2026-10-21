/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMailTab — self-registers the `mail` widget type (drafts in Nextcloud Mail
 * from a template or empty, above the mail linked to the record) into the
 * shared dashboardWidgetRegistry at module load. Renderer only: the endpoints
 * and texts are declared in the manifest.
 */

import CnMailTab from './CnMailTab.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('mail', {
	renderer: CnMailTab,
	form: null,
	defaultContent: {
		templates: null,
		draft: null,
		linkedMail: true,
	},
	displayName: 'Mail',
	icon: 'EmailOutline',
	surfaces: ['detail-page'],
})

export { CnMailTab }
export default CnMailTab

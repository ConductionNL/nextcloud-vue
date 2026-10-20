/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkedWidget — self-registers the `linked` widget type (one card listing
 * what other apps hold for this record, from their integration leaves) into
 * the shared dashboardWidgetRegistry at module load. Renderer only: the leaves
 * are declared in the manifest.
 */

import CnLinkedWidget from './CnLinkedWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('linked', {
	renderer: CnLinkedWidget,
	form: null,
	defaultContent: {
		leaves: [],
	},
	displayName: 'Linked',
	icon: 'LinkVariant',
	surfaces: ['detail-page'],
})

export { CnLinkedWidget }
export default CnLinkedWidget

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMatrixWidget — self-registers the `matrix` widget type (a rows-by-columns
 * grid of objects, drawn and edited from configuration over CnDataMatrix) into
 * the shared dashboardWidgetRegistry at module load. Renderer only: declared
 * in the manifest.
 */

import CnMatrixWidget from './CnMatrixWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('matrix', {
	renderer: CnMatrixWidget,
	form: null,
	defaultContent: {
		rows: {},
		columns: {},
		readOnly: true,
	},
	displayName: 'Matrix',
	icon: 'Grid',
	surfaces: ['detail-page', 'dashboard'],
})

export { CnMatrixWidget }
export default CnMatrixWidget

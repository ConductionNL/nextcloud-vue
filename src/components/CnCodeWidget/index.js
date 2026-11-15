/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCodeWidget — self-registers the `code` widget type (a record as a QR,
 * Code 128 or EAN-13 code on a detail page).
 */

import CnCodeWidget from './CnCodeWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('code', {
	renderer: CnCodeWidget,
	defaultContent: { format: 'qr', source: 'address' },
	displayName: 'Code',
	icon: 'QrcodeScan',
})

export { CnCodeWidget }
export default CnCodeWidget

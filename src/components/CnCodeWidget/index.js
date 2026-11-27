/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCodeWidget — self-registers the `code` widget type (a record as a QR,
 * Code 128 or EAN-13 code on a detail page).
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnCodeWidget = lazyComponent(() => import('./CnCodeWidget.vue'), 'CnCodeWidget')

registerDashboardWidget('code', {
	placeholder: 'block',
	renderer: LazyCnCodeWidget,
	defaultContent: { format: 'qr', source: 'address' },
	displayName: 'Code',
	icon: 'QrcodeScan',
})

export { default as CnCodeWidget } from './CnCodeWidget.vue'
export { default } from './CnCodeWidget.vue'

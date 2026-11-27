/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `audit-trail` widget type (CnAuditTrailWidget) into the
 * shared dashboardWidgetRegistry. Like the `data` widget it is a
 * DETAIL-PAGE surface — the audited object comes from the page's object
 * context — so it declares `surfaces: ['detail-page']` and never appears
 * in the dashboard Add-widget picker. Side-effect module kept separate
 * from the component so importing it doesn't force the registration.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnAuditTrailWidgetForm = lazyComponent(() => import('../CnAuditTrailWidgetForm/CnAuditTrailWidgetForm.vue'), 'CnAuditTrailWidgetForm')
const LazyCnAuditTrailWidget = lazyComponent(() => import('./CnAuditTrailWidget.vue'), 'CnAuditTrailWidget')

registerDashboardWidget('audit-trail', {
	placeholder: 'rows',
	renderer: LazyCnAuditTrailWidget,
	form: LazyCnAuditTrailWidgetForm,
	defaultContent: {
		title: '',
		maxDisplay: 5,
	},
	displayName: 'Audit trail',
	icon: 'History',
	surfaces: ['detail-page'],
	// The sub-form has its own Title field, so the Add-widget modal hides its
	// generic "Custom title" chrome control (same as the `data` widget).
	ownsTitle: true,
})

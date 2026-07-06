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

import CnAuditTrailWidget from './CnAuditTrailWidget.vue'
import CnAuditTrailWidgetForm from '../CnAuditTrailWidgetForm/CnAuditTrailWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('audit-trail', {
	renderer: CnAuditTrailWidget,
	form: CnAuditTrailWidgetForm,
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

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `timeline` widget type (CnTimelineWidget) in the shared
 * dashboardWidgetRegistry. Like `audit-trail` it is a DETAIL-PAGE surface:
 * the object comes from the page's object context. It has no config form
 * yet, so it is placed from the manifest and never offered in the
 * Add-widget picker.
 *
 * @spec openspec/changes/timeline-widget/specs/timeline-widget/spec.md#requirement-a-timeline-widget-shows-an-objects-dated-events-in-order
 */

import CnTimelineWidget from './CnTimelineWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('timeline', {
	renderer: CnTimelineWidget,
	form: null,
	defaultContent: {
		title: '',
		fields: [],
		related: [],
		auditTrail: false,
		timeline: false,
		order: 'asc',
	},
	displayName: 'Timeline',
	icon: 'TimelineClockOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

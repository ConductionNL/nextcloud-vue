/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSpendAnalyticsWidget — self-registers the `spend-analytics` dashboard
 * widget type into the shared dashboardWidgetRegistry at module load.
 *
 * The `requires.graphql` hint is SOFT registry metadata only (the renderer
 * reads its data through a `dataSource` prop / `cnSpendAnalyticsSource`
 * injection); it must never become a `manifest.dependencies` entry.
 *
 * The matching `CnSpendAnalyticsWidgetForm` is not yet present in this tree, so
 * the entry registers with `form: null` (a renderer-only registration,
 * supported by the registry — such types are excluded from the
 * `CnAddWidgetModal` type picker via `listWidgetTypes()`). When the form lands,
 * wire it in here.
 */

import CnSpendAnalyticsWidget from './CnSpendAnalyticsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('spend-analytics', {
	renderer: CnSpendAnalyticsWidget,
	form: null,
	defaultContent: {
		period: 'quarter',
		viewMode: 'summary',
		filters: {},
		aiInsights: { enabled: false },
	},
	displayName: 'Spend analytics',
	icon: 'ChartBar',
	requires: { graphql: ['financeq', 'procest'] },
})

export { CnSpendAnalyticsWidget }
export default CnSpendAnalyticsWidget

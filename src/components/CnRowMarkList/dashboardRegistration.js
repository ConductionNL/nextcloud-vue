/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `row-mark-list` widget type (CnRowMarkList) in the shared
 * dashboardWidgetRegistry. The file name keeps it in the package's
 * `sideEffects` allowlist, so a bundler does not drop the registration.
 */

import CnRowMarkList from './CnRowMarkList.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('row-mark-list', {
	renderer: CnRowMarkList,
	form: null,
	defaultContent: {
		load: { url: '' },
		save: { url: '' },
		states: [],
		detailFields: [],
	},
	displayName: 'Row mark list',
	icon: 'FormatListChecks',
	surfaces: ['dashboard', 'detail-page'],
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `row-mark-list` widget type (CnRowMarkList) in the shared
 * dashboardWidgetRegistry. The file name keeps it in the package's
 * `sideEffects` allowlist, so a bundler does not drop the registration.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnRowMarkList = lazyComponent(() => import('./CnRowMarkList.vue'), 'CnRowMarkList')

registerDashboardWidget('row-mark-list', {
	placeholder: 'rows',
	renderer: LazyCnRowMarkList,
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

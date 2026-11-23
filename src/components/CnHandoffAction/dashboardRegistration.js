/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `handoff` widget type (CnHandoffAction) in the shared
 * dashboardWidgetRegistry. The file name keeps it in the package's
 * `sideEffects` allowlist, so a bundler does not drop the registration.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnHandoffAction = lazyComponent(() => import('./CnHandoffAction.vue'), 'CnHandoffAction')

registerDashboardWidget('handoff', {
	renderer: LazyCnHandoffAction,
	form: null,
	defaultContent: {},
	displayName: 'Handoff',
	icon: 'SendOutline',
	surfaces: ['detail-page'],
})

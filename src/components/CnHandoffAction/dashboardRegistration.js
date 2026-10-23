/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `handoff` widget type (CnHandoffAction) in the shared
 * dashboardWidgetRegistry. The file name keeps it in the package's
 * `sideEffects` allowlist, so a bundler does not drop the registration.
 */

import CnHandoffAction from './CnHandoffAction.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('handoff', {
	renderer: CnHandoffAction,
	form: null,
	defaultContent: {},
	displayName: 'Handoff',
	icon: 'SendOutline',
	surfaces: ['detail-page'],
})

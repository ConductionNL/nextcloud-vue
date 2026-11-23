/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDeviceFramesWidget — self-registers the `device-frames` widget type
 * (several small pages side by side, each in a phone frame) into the shared
 * dashboardWidgetRegistry at module load. A container: it renders other
 * widgets of the surface, so the host hands it their definitions.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnDeviceFramesWidget = lazyComponent(() => import('./CnDeviceFramesWidget.vue'), 'CnDeviceFramesWidget')

registerDashboardWidget('device-frames', {
	renderer: LazyCnDeviceFramesWidget,
	form: null,
	defaultContent: {
		frames: [],
		width: 350,
	},
	displayName: 'Device frames',
	icon: 'CellphoneText',
	container: true,
	ownsTitle: true,
	surfaces: ['app-dashboard', 'detail-page'],
})

export { default as CnDeviceFramesWidget } from './CnDeviceFramesWidget.vue'
export { default } from './CnDeviceFramesWidget.vue'

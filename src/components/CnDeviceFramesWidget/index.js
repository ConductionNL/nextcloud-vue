/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDeviceFramesWidget — self-registers the `device-frames` widget type
 * (several small pages side by side, each in a phone frame) into the shared
 * dashboardWidgetRegistry at module load. A container: it renders other
 * widgets of the surface, so the host hands it their definitions.
 */

import CnDeviceFramesWidget from './CnDeviceFramesWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('device-frames', {
	renderer: CnDeviceFramesWidget,
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

export { CnDeviceFramesWidget }
export default CnDeviceFramesWidget

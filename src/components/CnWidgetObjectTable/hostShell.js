/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Chrome-less pass-through shell used by CnWidgetObjectTable when its
 * `hideWrapper` prop is set: a host surface (CnDashboardPage's widget grid)
 * already renders the card chrome, so mounting the widget's own
 * CnWidgetWrapper would double-card it.
 *
 * Kept in its own module (not inline in the SFC script) to keep the SFC's
 * template render clean in tests.
 */

import { h } from 'vue'

export const CnWidgetHostShell = {
	name: 'CnWidgetHostShell',
	// Vue 3: functional components are plain render functions (no `functional: true`).
	render() {
		return h('div', { class: 'cn-widget-object-table__host' }, this.$slots.default ? this.$slots.default() : [])
	},
}

export default CnWidgetHostShell

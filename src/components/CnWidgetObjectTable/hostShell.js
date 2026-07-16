/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Chrome-less pass-through shell used by CnWidgetObjectTable when its
 * `hideWrapper` prop is set: a host surface (CnDashboardPage's widget grid)
 * already renders the card chrome, so mounting the widget's own
 * CnWidgetWrapper would double-card it.
 *
 * Kept in its own module (not inline in the SFC script) because
 * `@vue/vue2-jest` flags any SFC whose script contains a literal
 * `functional: true` as a functional component, which breaks the SFC's
 * template render in tests.
 */

export const CnWidgetHostShell = {
	name: 'CnWidgetHostShell',
	functional: true,
	render: (h, ctx) => h('div', { class: 'cn-widget-object-table__host' }, ctx.children),
}

export default CnWidgetHostShell

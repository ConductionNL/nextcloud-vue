/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `object-table` widget type (CnWidgetObjectTable) into the
 * shared dashboardWidgetRegistry so CnDashboardPage's `config.widgets[].type`
 * dispatch reaches the built-in v2 object-table (ConductionNL/nextcloud-vue#89).
 *
 * The registry branch in CnDashboardPage wraps every catalog widget in its
 * own CnWidgetWrapper — a naive registration of CnWidgetObjectTable would
 * therefore double-card (the widget renders its own CnWidgetWrapper for the
 * v2 grid). The registered renderer is a chrome-aware host adapter that
 * mounts the widget with `hideWrapper: true` (content-only) and normalises
 * the stored content blob onto the widget's declarative prop surface.
 *
 * Side-effect module kept separate from the component so importing
 * CnWidgetObjectTable (a public export) doesn't force the registration.
 */

import { h } from 'vue'
import CnObjectListWidgetForm from '../CnObjectListWidgetForm/CnObjectListWidgetForm.vue'
import CnWidgetObjectTable from './CnWidgetObjectTable.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

/**
 * Normalise a stored widget content blob onto CnWidgetObjectTable's props.
 *
 * Three content shapes are accepted:
 *
 * 1. v2-prop shape — content already carries a `source` object (plus
 *    `columns`, `actions`, `hideHeader`, …). Passed through as-is.
 * 2. Flat form shape — the shape CnObjectListWidgetForm assembles
 *    (`{ register, schema, filter, sort: {field, dir}, limit, columns }`).
 *    Folded into the widget's `source` (`sort` becomes an
 *    `order: { field: dir }` map), `limit` among it.
 * 3. Neither — no `source` and no register/schema, the shape an
 *    `endpointSource` table stores. There is nothing to fold into, so
 *    `limit` stays a top-level prop and the rest passes through.
 *
 * In all three, `limit` survives only as a positive finite number: the
 * widget's prop is `type: Number`, so a stored `'3'` is dropped.
 *
 * @param {object} content The stored widget `content` blob.
 * @return {object} A CnWidgetObjectTable props map (without `hideWrapper`).
 */
export function objectTableContentToProps(content) {
	const c = (content && typeof content === 'object') ? content : {}
	const { register, schema, filter, sort, limit, ...rest } = c
	// A stored blob can hold `limit: '3'`; the prop is `type: Number`, so an
	// unusable value has to be dropped rather than forwarded and warned about.
	const hasLimit = Number.isFinite(limit) && limit > 0
	if (c.source && typeof c.source === 'object') {
		const { limit: _limit, ...v2 } = c
		return hasLimit ? { ...v2, limit } : { ...v2 }
	}
	if (!register && !schema) {
		// No register/schema means no `source` to fold `limit` into, but it is
		// a real prop of its own. Dropping it disabled `viewAllRoute` on every
		// endpointSource table: uncapped, the footer's "total > shown"
		// condition never held, so the View-all link never appeared.
		return hasLimit ? { ...rest, limit } : { ...rest }
	}
	const order = {}
	if (sort && sort.field) {
		order[sort.field] = sort.dir === 'desc' ? 'desc' : 'asc'
	}
	const source = {
		register: register || '',
		schema: schema || '',
		filter: filter || {},
		order,
	}
	if (hasLimit) {
		source.limit = limit
	}
	return { ...rest, source }
}

/**
 * Chrome-aware host adapter: mounts CnWidgetObjectTable content-only
 * (`hideWrapper: true`) inside CnDashboardPage's own widget chrome, mapping
 * the stored `content` blob (bound by the dashboard's registry branch as the
 * `content` attr) onto the widget's props via {@link objectTableContentToProps}.
 */
const CnHostedObjectTable = {
	name: 'CnHostedObjectTable',
	// Vue 3: no `functional: true`; a render function on a normal component.
	// inheritAttrs:false so we forward $attrs explicitly (listeners are onXxx in
	// $attrs now, not a separate ctx.listeners) and don't double-apply to the root.
	inheritAttrs: false,
	render() {
		const attrs = this.$attrs || {}
		const content = (attrs.content && typeof attrs.content === 'object') ? attrs.content : attrs
		// Everything except `content` (mapped to props) passes through — this
		// carries parent listeners (onXxx) too. Vue 3: props/attrs/listeners are
		// one flat object; slots are the 3rd arg.
		const { content: _content, ...rest } = attrs
		return h(CnWidgetObjectTable, { ...rest, ...objectTableContentToProps(content), hideWrapper: true }, this.$slots)
	},
}

registerDashboardWidget('object-table', {
	renderer: CnHostedObjectTable,
	form: CnObjectListWidgetForm,
	defaultContent: {
		register: '',
		schema: '',
		filter: {},
		sort: { field: '', dir: 'asc' },
		limit: 10,
		columns: [],
	},
	displayName: 'Object table',
	icon: 'TableLarge',
})

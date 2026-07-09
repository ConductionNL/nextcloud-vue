/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Default body grid for a `type:"detail"` page: a full-width schema-driven Data
 * widget with the Related-objects widget beneath it. Shared by CnDetailPage
 * (which materialises it in-memory for an un-customised page) and the OpenBuild
 * edit button (which "ejects" it into `page.config.widgets`/`layout` on edit, so
 * resize / per-property config / added widgets persist on save). Keeping one
 * source of truth means the in-memory default and the ejected default are
 * byte-identical, so ejecting never visually changes the page.
 *
 * @module utils/defaultDetailGrid
 */

import { translate as t } from '@nextcloud/l10n'

/**
 * Build the default detail-page body grid.
 *
 * @param {object} [options] Options.
 * @param {string} [options.register] Register slug seeded onto the Data widget's
 *   content (so its per-property editor can resolve the schema).
 * @param {string} [options.schema] Schema slug, as above.
 * @param {boolean} [options.showRelated] Whether to include the Related widget
 *   (default true).
 * @return {{widgets: object[], layout: object[]}} The widget defs and their
 *   12-column grid placement (gridX/gridY/gridWidth/gridHeight).
 */
export function defaultDetailGrid(options = {}) {
	const { register = '', schema = '', showRelated = true } = options
	const widgets = [
		{
			id: 'data',
			widgetId: 'data',
			type: 'data',
			title: t('nextcloud-vue', 'Data'),
			content: { register, schema, columns: 3, overrides: {} },
		},
	]
	const layout = [
		{ id: 'data', widgetId: 'data', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 6, showTitle: false },
	]
	if (showRelated) {
		widgets.push({ id: 'related', widgetId: 'related', type: 'related', title: t('nextcloud-vue', 'Related'), content: { title: '', groups: [] } })
		layout.push({ id: 'related', widgetId: 'related', gridX: 0, gridY: 6, gridWidth: 12, gridHeight: 5, showTitle: false })
	}
	return { widgets, layout }
}

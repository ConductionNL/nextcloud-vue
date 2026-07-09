/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

'use strict'

/**
 * renameDataSourceKeys — data-binding spelling convergence.
 *
 * The canonical data-binding key on a widget ENTRY is `dataSource`. Two legacy
 * spellings exist at entry level:
 *   - a bare `source` sibling of `widgetKey`, and
 *   - `content: { source: … }`.
 *
 * This transform renames both to `dataSource` on every top-level `widgets[]`
 * entry of a page. When `content` is emptied by the rename it is removed;
 * otherwise the remaining `content` keys are preserved.
 *
 * SCOPE — entry level only. It deliberately does NOT descend into `props`: the
 * built-in `object-table` / `card-grid` widgets carry their query config as
 * `props.source` (ADR-049), which is a different contract from the widget-entry
 * `dataSource` binding and MUST be left untouched.
 *
 * Idempotence: an entry that already carries `dataSource` and no entry-level
 * `source` / `content.source` is left unchanged; a page with no renamable entry
 * is returned by reference (byte-identical no-op).
 *
 * @param {object} page A v2 page definition
 * @return {{ page: object, count: number }} Transformed page + count renamed
 */
function renameDataSourceKeys(page) {
	if (!page || typeof page !== 'object' || !Array.isArray(page.widgets)) {
		return { page, count: 0 }
	}

	let count = 0
	const widgets = page.widgets.map((w) => {
		if (!w || typeof w !== 'object') return w

		const hasBareSource = Object.prototype.hasOwnProperty.call(w, 'source')
		const hasContentSource = w.content && typeof w.content === 'object'
			&& !Array.isArray(w.content)
			&& Object.prototype.hasOwnProperty.call(w.content, 'source')

		if (!hasBareSource && !hasContentSource) return w

		count++
		const next = { ...w }

		// content.source wins over a bare source only if dataSource is unset for
		// both; process content first so an explicit bare source can still fill.
		if (hasContentSource) {
			const { source, ...restContent } = next.content
			if (next.dataSource === undefined) next.dataSource = source
			if (Object.keys(restContent).length > 0) {
				next.content = restContent
			} else {
				delete next.content
			}
		}

		if (hasBareSource) {
			if (next.dataSource === undefined) next.dataSource = next.source
			delete next.source
		}

		return next
	})

	if (count === 0) return { page, count: 0 }

	return { page: { ...page, widgets }, count }
}

module.exports = { renameDataSourceKeys }

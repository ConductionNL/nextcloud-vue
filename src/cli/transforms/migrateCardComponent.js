/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Migrate `config.cardComponent` to a `card-grid` widget entry prepended to
 * the page's top-level `widgets[]`. The `cardComponent` key is removed from
 * config.
 *
 * v1 shape:
 *   page.config.cardComponent = "<ComponentName>"
 *
 * v2 shape (prepended widget entry):
 *   { widgetKey: "card-grid", slot: "body", gridX: 0, gridY: 0,
 *     gridWidth: 12, gridHeight: 4, props: { component: "<ComponentName>" } }
 *
 * Existing widgets on the page are shifted down by 4 rows to make room for
 * the card-grid widget. If a page has `widgets[]` entries without gridY,
 * the shift is skipped for those entries (they likely have no layout data).
 *
 * @param {object} page A v1 page definition (any type)
 * @return {{ page: object, count: number }}
 */
function migrateCardComponent(page) {
	const cfg = page.config || {}
	const cardComponent = cfg.cardComponent

	if (!cardComponent || typeof cardComponent !== 'string') {
		return { page, count: 0 }
	}

	const cardGridWidget = {
		widgetKey: 'card-grid',
		slot: 'body',
		gridX: 0,
		gridY: 0,
		gridWidth: 12,
		gridHeight: 4,
		props: { component: cardComponent },
	}

	// Shift existing widgets down to make room for the card-grid row
	const existingWidgets = (page.widgets || []).map((w) => {
		if (w && typeof w.gridY === 'number') {
			return { ...w, gridY: w.gridY + 4 }
		}
		return w
	})

	// Remove cardComponent from config
	const { cardComponent: _removed, ...restConfig } = cfg

	const updatedPage = {
		...page,
		widgets: [cardGridWidget, ...existingWidgets],
		config: restConfig,
	}

	return { page: updatedPage, count: 1 }
}

module.exports = { migrateCardComponent }

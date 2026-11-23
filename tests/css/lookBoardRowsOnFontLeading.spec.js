/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Rows the case boards draw on the font's own leading: the Flows card's runs
 * (58 high, r32 67), and the calendar and Deck cards' rows (56 high, r32 72
 * and a boxed Deck card), each ruled only above.
 *
 * @spec openspec/changes/board-deck-calendar-rows/specs/integrations/spec.md
 */
const fs = require('fs')
const path = require('path')

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const detail = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8'))
const flows = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnFlowRunsWidget/CnFlowRunsWidget.vue'), 'utf8'))

function rule(css, selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('board rows on the font leading', () => {
	it('sets a flow run\'s name and meta on normal leading', () => {
		expect(rule(flows, '.cn-flow-runs-widget--pills .cn-flow-runs-widget__meta')).toContain('line-height: normal')
		expect(rule(flows, '.cn-flow-runs-widget--pills .cn-flow-runs-widget__name,\n.cn-flow-runs-widget--pills .cn-flow-runs-widget__row--terminal .cn-flow-runs-widget__name')).toContain('line-height: normal')
	})

	it('pads the calendar and Deck rows 10px, ruled only above, on normal leading', () => {
		expect(rule(detail, '.cn-look-board .cn-detail-page .cn-calendar-card__row,\n.cn-look-board .cn-detail-page .cn-deck-card__row')).toContain('padding: 10px 0')
		const sides = rule(detail, '.cn-look-board .cn-detail-page .cn-calendar-card__row:not(.cn-look-nextcloud *),\n.cn-look-board .cn-detail-page .cn-deck-card__row:not(.cn-look-nextcloud *)')
		expect(sides).toContain('border-bottom: 0')
		expect(sides).toContain('border-radius: 0')
		expect(rule(detail, '.cn-look-board .cn-detail-page .cn-calendar-card__title:not(.cn-look-nextcloud *),\n.cn-look-board .cn-detail-page .cn-deck-card__row-title:not(.cn-look-nextcloud *),\n.cn-look-board .cn-detail-page .cn-calendar-card__meta:not(.cn-look-nextcloud *),\n.cn-look-board .cn-detail-page .cn-deck-card__row-meta:not(.cn-look-nextcloud *)')).toContain('line-height: normal')
	})

	it('inks the Deck card\'s title link as the row title through the theme\'s link variables', () => {
		const body = rule(detail, '.cn-look-board .cn-detail-page a.cn-deck-card__row-title:not(.cn-look-nextcloud *)')
		expect(body).toContain('--nldesign-color-on-surface: var(--color-main-text)')
		expect(body).toContain('--nldesign-component-link-text-decoration: none')
	})
})

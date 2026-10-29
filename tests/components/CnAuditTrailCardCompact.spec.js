/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaaktype "Historie": `content.density: "compact"` marks the rows of a
 * stacked audit card compact (10px above and below in the board look, 56px
 * a row), where DqTaak keeps its 12px rows.
 *
 * @spec openspec/changes/audit-card-compact-stacked-rows/specs/audit-trail/spec.md#requirement-a-stacked-audit-card-can-draw-compact-rows
 */
jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: () => '' }))

const { mount, flushPromises } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default

function mountWidget(content) {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ results: [{ id: '1', action: 'update', actor: 'System', creationDateTime: '2026-10-02T09:05:00' }] }),
	})
	return mount(CnAuditTrailWidget, { props: { content: { register: 'r', schema: 's', objectId: 'o', ...content } } })
}

const strip = (file) => fs.readFileSync(path.join(__dirname, '../../src/css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule with exactly this selector.
 *
 * @param {string} css The stylesheet.
 * @param {string} selector The selector.
 * @return {string} The body, or '' when there is none.
 */
function rule(css, selector) {
	const at = css.indexOf('\n' + selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnAuditTrailCard compact stacked rows', () => {
	it('marks the rows compact when the widget asks for it', async () => {
		const w = mountWidget({ layout: 'stacked', density: 'compact' })
		await flushPromises()
		expect(w.find('.cn-audit-card__row--stacked').exists()).toBe(true)
		expect(w.find('.cn-audit-card__row--compact').exists()).toBe(true)
		w.unmount()
	})

	it('leaves the rows as they were without a density', async () => {
		const w = mountWidget({ layout: 'stacked' })
		await flushPromises()
		expect(w.find('.cn-audit-card__row--stacked').exists()).toBe(true)
		expect(w.find('.cn-audit-card__row--compact').exists()).toBe(false)
		w.unmount()
	})

	it('pads a compact stacked row 10px in the board look, and opens its card 10px under the title', () => {
		expect(rule(strip('look-board.css'), '.cn-look-board .cn-audit-card__row--stacked.cn-audit-card__row--compact:not(.cn-look-nextcloud *)')).toContain('padding: 10px 0;')
		expect(rule(strip('look-board-detail.css'), '.cn-look-board .cn-detail-card .cn-detail-card__content:has(> .cn-audit-card__list > .cn-audit-card__row--compact:first-child):not(.cn-look-nextcloud *)')).toContain('padding-top: 10px;')
	})
})

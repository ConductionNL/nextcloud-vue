/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqFilterBeheren draws the saved-views panel with the reader's own views
 * first, then Shared with me, and the read-only Default views last, and a
 * view's count as a grey pill at the end of its row rather than "(3)" after
 * its name. The Nextcloud look keeps its order and its "(3)".
 */
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
	translatePlural: (app, s, p, n) => (n === 1 ? s : p),
}))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default

const VIEWS = [
	{ id: 1, slug: 'mine', name: 'Termijn deze week', owner: 'alice' },
	{ id: 2, slug: 'shared', name: 'Woo-verzoeken team', owner: 'anouk', shares: [{ user: 'alice' }] },
	{ id: 3, slug: 'seed', name: 'Mijn zaken', owner: '__system__', seeded: true },
]

function mountPanel(look) {
	return mount(CnSavedViewsPanel, {
		props: { views: VIEWS, currentUserId: 'alice', counts: { 1: 3 } },
		global: { provide: { cnLook: look } },
	})
}

const sectionKeys = (w) => w.findAll('[data-testid^="cn-saved-views-section-"]').map((s) => s.attributes('data-testid').replace('cn-saved-views-section-', ''))

describe('the saved-views panel sections and counts', () => {
	it('lists My views first and Default views last in the board look', () => {
		const keys = sectionKeys(mountPanel('board'))
		expect(keys[0]).toBe('mine')
		expect(keys[keys.length - 1]).toBe('seeded')
	})

	it('keeps Default views first in the Nextcloud look', () => {
		expect(sectionKeys(mountPanel('nextcloud'))[0]).toBe('seeded')
	})

	it('draws the count as a pill at the end of the row in the board look', () => {
		const w = mountPanel('board')
		const row = w.findAll('[data-testid="cn-saved-views-item"]').find((b) => b.text().includes('Termijn deze week'))
		expect(row.find('.cn-saved-views-panel__name-text').text()).toBe('Termijn deze week')
		expect(w.find('[data-testid="cn-saved-views-count"]').text()).toBe('3')
	})

	it('keeps "(3)" after the name in the Nextcloud look', () => {
		const w = mountPanel('nextcloud')
		expect(w.text()).toContain('Termijn deze week (3)')
		expect(w.find('[data-testid="cn-saved-views-count"]').exists()).toBe(false)
	})

	it('styles the count pill as the board does', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		const at = css.indexOf('.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *) .cn-saved-views-panel__count {')
		expect(at).toBeGreaterThan(-1)
		const rule = css.slice(at, css.indexOf('}', at))
		expect(rule).toContain('min-width: 26px;')
		expect(rule).toContain('border-radius: 11px;')
		expect(rule).toContain('font-size: 12px;')
	})
})

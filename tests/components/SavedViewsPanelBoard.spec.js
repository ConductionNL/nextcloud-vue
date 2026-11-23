/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved-views panel in the board look, as DqFilterBeheren and
 * DqFilterInMenu draw it:
 * - "Save view" is the filled 40px primary across the panel;
 * - a row is padded 2px 4px 2px 10px with 8px between its parts, radius 8;
 * - the name sits 6px from the row's top and bottom at 14px/600;
 * - the row's manage menu is a 34px round button.
 * COMPDIFF r24 measured the save button 34px outlined, the manage button with
 * radius 8 and the rows without their inset. The Nextcloud look keeps its panel.
 *
 * @spec openspec/changes/board-saved-views-panel-rows/specs/board-saved-views-panel-rows/spec.md
 */
jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
	translatePlural: (app, s, p, n) => (n === 1 ? s : p),
}))

const { mount } = require('@vue/test-utils')
const fs = require('fs')
const path = require('path')
const CnSavedViewsPanel = require('../../src/components/CnSavedViewsPanel/CnSavedViewsPanel.vue').default

const VIEWS = [{ id: 1, slug: '1', name: 'Termijn deze week', owner: 'alice' }]
const save = (look) => mount(CnSavedViewsPanel, { props: { views: VIEWS, currentUserId: 'alice' }, global: { provide: { cnLook: look } } }).find('[data-testid="cn-saved-views-save"]')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? null : css.slice(at, css.indexOf('}', at))
}
const P = '.cn-look-board .cn-saved-views-panel:not(.cn-look-nextcloud *)'

describe('CnSavedViewsPanel in the board look', () => {
	it('draws Save view as the primary button, and the secondary one in the Nextcloud look', () => {
		expect(save('board').attributes('variant')).toBe('primary')
		expect(save('nextcloud').attributes('variant')).toBe('secondary')
	})

	it('makes the save button 40px', () => {
		expect(body(`${P} .cn-saved-views-panel__head .button-vue`)).toContain('--button-size: var(--cn-board-control-height);')
	})

	it('insets a row and spaces its parts as the board does', () => {
		const row = body(`${P} .cn-saved-views-panel__row`)
		expect(row).toContain('gap: 8px;')
		expect(row).toContain('padding: 2px 4px 2px 10px;')
		expect(row).toContain('border-radius: 8px;')
		const name = body(`${P} .cn-saved-views-panel__name`)
		expect(name).toContain('padding: 6px 0;')
		expect(name).toContain('gap: 2px;')
		const text = body(`${P} .cn-saved-views-panel__name-text`)
		expect(text).toContain('font-size: 14px;')
		expect(text).toContain('font-weight: 600;')
	})

	it('draws the manage menu as a 34px round button', () => {
		const tog = body(`${P} .cn-saved-views-panel__row .action-item__menutoggle`)
		expect(tog).toContain('--button-size: 34px;')
		expect(tog).toContain('border-radius: 50%;')
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the open record is the page's side column: a card beside
 * the chips, the toolbar and the list, from the toolbar's top (PqKassaAudit).
 *
 * @spec openspec/changes/board-split-pane-side-column/specs/board-split-pane-side-column/spec.md#requirement-the-open-record-is-the-board-pages-side-card
 */
import { shallowMount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
const board = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8'))
const base = strip(fs.readFileSync(path.join(__dirname, '../../src/css/index-page.css'), 'utf8'))

/**
 * Mount the page with a split view declared.
 *
 * @param {object} [props] Props to merge in.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	window.innerWidth = 1440
	return shallowMount(CnIndexPage, {
		props: {
			title: 'Audit',
			objects: [{ id: '1', title: 'One' }, { id: '2', title: 'Two' }],
			subscribe: false,
			splitView: { enabled: true, paneWidth: '360px' },
			look: 'board',
			...props,
		},
		global: {
			stubs: { teleport: true },
			mocks: {
				t: (_app, str) => str,
				$route: { name: 'audit', params: {}, query: {}, meta: { cnPageId: 'audit' } },
				$router: { push: jest.fn().mockResolvedValue(undefined), resolve: ({ name }) => ({ href: `#/${name}` }) },
			},
		},
	})
}

describe('CnIndexPage board split pane as the side column', () => {
	it('makes an open record the side column in the board look, at the declared width', () => {
		const w = mountPage({ splitId: '2' })
		const root = w.find('[data-testid="cn-index-page"]')

		expect(root.classes()).toContain('cn-index-page--split-side')
		expect(root.attributes('style')).toContain('--cn-index-split-pane-width: 360px')
		expect(w.find('[data-testid="cn-index-page-split-pane"]').attributes('style')).toBeUndefined()
	})

	it('keeps the pane in the body while no record is open', () => {
		const w = mountPage()

		expect(w.find('[data-testid="cn-index-page"]').classes()).not.toContain('cn-index-page--split-side')
	})

	it('keeps the pane in the body in the Nextcloud look', () => {
		const w = mountPage({ splitId: '2', look: 'nextcloud' })

		expect(w.find('[data-testid="cn-index-page"]').classes()).not.toContain('cn-index-page--split-side')
		expect(w.find('[data-testid="cn-index-page-split-pane"]').attributes('style')).toContain('width: 360px')
	})

	it('keeps the pane in the body beside a side panel', () => {
		const w = mountPage({ splitId: '2', sidePanel: [{ id: 'stats', type: 'text' }] })

		expect(w.find('[data-testid="cn-index-page"]').classes()).not.toContain('cn-index-page--split-side')
	})

	it('shares the side panel grid', () => {
		expect(base).toMatch(/:is\(\.cn-index-page--with-side-panel, \.cn-index-page--split-side\)\s*\{[^}]*display: grid;/)
		expect(board).toMatch(/:is\(\.cn-index-page--with-side-panel, \.cn-index-page--split-side\):not\(\.cn-look-nextcloud \*\)\s*\{[^}]*row-gap: 0;/)
	})

	it('places the list and the pane as the grid cells, the pane a card in the side column', () => {
		expect(board).toMatch(/\.cn-index-page--split-side:not\(\.cn-look-nextcloud \*\)\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) var\(--cn-index-split-pane-width, 360px\);/)
		expect(board).toMatch(/\.cn-index-page--split-side:not\(\.cn-look-nextcloud \*\) > \.cn-index-page__body\s*\{[^}]*display: contents;/)
		expect(board).toMatch(/> \.cn-index-page__body > \.cn-index-page__main\s*\{[^}]*grid-area: body;/)
		expect(board).toMatch(/> \.cn-index-page__body > \.cn-index-page__split-pane\s*\{[^}]*grid-area: side;[^}]*border: 1px solid var\(--color-border\);/)
	})

	it('draws the record inside the card as one sheet, its widgets unframed', () => {
		expect(board).toMatch(/\.cn-index-page__split-pane > \.cn-detail-page\s*\{\s*padding: 0;/)
		expect(board).toMatch(/\.cn-index-page__split-pane \.cn-widget-wrapper\s*\{[^}]*border: 0;[^}]*background: transparent;/)
	})
})

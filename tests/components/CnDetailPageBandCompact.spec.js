/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page's band can be compact (`config.bandDensity: "compact"`), as
 * boards PqKlant and PqOrganisatie draw their contact strip and six figures:
 * 12px between the tiles and 20px between rows, a tile as narrow as 120px, and
 * each figure a white tile padded 12px 14px with a 13px label over a 20px
 * value. Without it the band keeps its 20px gaps and 220px minimum.
 *
 * @spec openspec/changes/detail-band-compact/specs/detail-page/spec.md#requirement-a-detail-band-can-be-compact
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The bodies, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	let body = ''
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			body += m[2]
		}
	}
	return body
}

function mountPage(extra = {}) {
	return shallowMount(CnDetailPage, {
		props: {
			title: 'Client',
			register: 'pipelinq',
			schema: 'client',
			objectId: 'c-1',
			objectStore: {
				objects: { 'pipelinq-client': { 'c-1': { id: 'c-1' } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			widgets: [{ id: 'kpi', type: 'stat', title: 'Open matters' }],
			band: [{ widgetId: 'kpi', span: 2, chrome: 'bare' }],
			...extra,
		},
		global: {
			mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'client' }, $router: { push: jest.fn(), replace: jest.fn() } },
		},
	})
}

describe('CnDetailPage: a compact band', () => {
	it('marks the band compact when the page asks for it', async () => {
		const wrapper = mountPage({ bandDensity: 'compact' })
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-detail-page-band"]').classes()).toContain('cn-detail-page__band--compact')
	})

	it('keeps the default band without it', async () => {
		const wrapper = mountPage()
		await flushPromises()
		expect(wrapper.find('[data-testid="cn-detail-page-band"]').classes()).not.toContain('cn-detail-page__band--compact')
	})

	it('sets the board gaps and a 120px tile minimum', () => {
		const band = bodyOf('.cn-look-board .cn-detail-page__band--compact:not(.cn-look-nextcloud *)')
		expect(band).toContain('gap: 20px 12px;')
		expect(bodyOf('.cn-look-board .cn-detail-page__band--compact > .cn-detail-page__band-item:not(.cn-look-nextcloud *)')).toContain('min-width: min(120px, 100%);')
	})

	it('draws a figure as a white tile with a 13px label over a 20px value', () => {
		const tile = bodyOf('.cn-look-board .cn-detail-page__band--compact .cn-kpi-card--stacked:not(.cn-look-nextcloud *)')
		expect(tile).toContain('--cn-kpi-stacked-padding: 12px 14px;')
		expect(tile).toContain('--cn-kpi-stacked-gap: 2px;')
		expect(tile).toContain('--cn-kpi-stacked-title-size: 13px;')
		expect(tile).toContain('--cn-kpi-stacked-value-size: 20px;')
		expect(tile).toContain('border: 1px solid var(--color-border);')
		expect(tile).toContain('border-radius: 10px;')
		expect(tile).toContain('background: var(--color-main-background);')
	})
})

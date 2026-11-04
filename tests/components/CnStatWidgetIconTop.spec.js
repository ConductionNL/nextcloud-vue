/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * board-stat-tile-icon-top: the learniq Today tiles (LqTlVandaag, LqHrVandaag,
 * LqZoVandaag) draw the icon in a 42px tinted circle above the label. In the
 * board look `content.iconPlacement: "top"` draws it there; a tile without the
 * key keeps the glyph before the label (dossiq), and `"end"` keeps the
 * DqDashboard circle at the right of the label row.
 *
 * @spec openspec/changes/board-stat-tile-icon-top/specs/stat-tile-board-look/spec.md
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * @param {object} content tile content (merged over a linked tile with an icon)
 * @param {string} url unique endpoint url (responses are cached per url)
 * @param {boolean} isBoard board look on
 * @return {Promise<object>} wrapper
 */
async function tile(content, url, isBoard = true) {
	const w = mount(CnStatWidget, {
		propsData: {
			content: {
				label: 'Gem. betrokkenheidsscore',
				icon: 'ChartLine',
				link: '/apps/learniq/engagement',
				valueField: 'n',
				endpointSource: { url },
				...content,
			},
		},
		stubs: { NcLoadingIcon: { template: '<span />' } },
		global: { provide: { cnWorkspaceContext: {}, ...(isBoard ? { cnLook: 'board' } : {}) } },
	})
	await flush()
	await flush()
	await flush()
	return w
}

const TOP = '[data-testid="cn-stat-widget-icon-top"]'

describe('CnStatWidget: iconPlacement top (learniq Today tiles)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { n: 72 } })
	})

	it('draws the icon in a circle above the label, with no glyph and no end circle', async () => {
		const w = await tile({ iconPlacement: 'top' }, '/apps/learniq/api/top-1')
		const body = w.find('.cn-stat-widget__body')
		expect(body.element.children[0].getAttribute('data-testid')).toBe('cn-stat-widget-icon-top')
		expect(body.element.children[1].classList.contains('cn-stat-widget__label')).toBe(true)
		expect(w.find(TOP).classes()).toEqual(expect.arrayContaining(['cn-kpi-card__badge', 'cn-kpi-card__badge--top', 'cn-kpi-card__badge--primary']))
		expect(w.find(TOP).attributes('aria-hidden')).toBe('true')
		expect(w.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-stat-widget-icon-badge"]').exists()).toBe(false)
		expect(w.classes()).toContain('cn-kpi-card--icon-top')
	})

	it('tints the top circle by the tile state', async () => {
		const w = await tile({ iconPlacement: 'top', variant: 'warning' }, '/apps/learniq/api/top-2')
		expect(w.find(TOP).classes()).toContain('cn-kpi-card__badge--warning')
	})

	it('draws the top circle on a tile without a link too', async () => {
		const w = await tile({ iconPlacement: 'top', link: undefined }, '/apps/learniq/api/top-3')
		expect(w.find(TOP).exists()).toBe(true)
	})

	it('keeps the glyph before the label when the tile names no placement (dossiq)', async () => {
		const w = await tile({}, '/apps/learniq/api/top-4')
		expect(w.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(true)
		expect(w.find(TOP).exists()).toBe(false)
		expect(w.classes()).not.toContain('cn-kpi-card--icon-top')
	})

	it('keeps the end circle for iconPlacement end (DqDashboard)', async () => {
		const w = await tile({ iconPlacement: 'end' }, '/apps/learniq/api/top-5')
		expect(w.find('[data-testid="cn-stat-widget-icon-badge"]').exists()).toBe(true)
		expect(w.find(TOP).exists()).toBe(false)
	})

	it('has no effect without the board look', async () => {
		const w = await tile({ iconPlacement: 'top' }, '/apps/learniq/api/top-6', false)
		expect(w.find(TOP).exists()).toBe(false)
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(true)
	})

	it('draws no top circle without an icon', async () => {
		const w = await tile({ iconPlacement: 'top', icon: undefined }, '/apps/learniq/api/top-7')
		expect(w.find(TOP).exists()).toBe(false)
	})
})

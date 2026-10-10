/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-stat-tile-parity: the DqDashboard KPI tile. In the board look a
 * tile without a layout is stacked, `content.iconPlacement: "end"` puts the
 * icon in a tinted circle right of the label, and the value keeps its state
 * colour. Without the board look nothing changes.
 *
 * @spec openspec/changes/screens-stat-tile-parity/specs/dashboard-page/spec.md
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
				label: 'Open zaken',
				icon: 'FolderOutline',
				caption: '+3 vandaag',
				link: '/apps/dossiq/cases',
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

describe('CnStatWidget: the DqDashboard tile', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { n: 48 } })
	})

	it('stacks a tile without a layout in the board look, caption on its own line', async () => {
		const w = await tile({}, '/apps/dossiq/api/st-1')
		expect(w.classes()).toContain('cn-kpi-card--stacked')
		expect(w.find('.cn-kpi-card__caption-line').text()).toBe('+3 vandaag')
		expect(w.find('.cn-kpi-card__value-row [data-testid="cn-stat-widget-caption"]').exists()).toBe(false)
	})

	it('keeps an explicit horizontal layout in the board look', async () => {
		const w = await tile({ layout: 'horizontal' }, '/apps/dossiq/api/st-2')
		expect(w.classes()).toContain('cn-kpi-card--horizontal')
	})

	it('draws the icon in a circle after the label with iconPlacement end, and no glyph before it', async () => {
		const w = await tile({ iconPlacement: 'end' }, '/apps/dossiq/api/st-3')
		const title = w.find('.cn-stat-widget__label')
		expect(title.classes()).toContain('cn-kpi-card__title--badge-end')
		const children = title.element.children
		expect(children[0].textContent).toBe('Open zaken')
		expect(children[children.length - 1].getAttribute('data-testid')).toBe('cn-stat-widget-icon-badge')
		expect(w.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-stat-widget-icon-badge"]').classes()).toContain('cn-kpi-card__badge--primary')
	})

	it('draws the end circle on a tile without a link too', async () => {
		const w = await tile({ iconPlacement: 'end', link: undefined }, '/apps/dossiq/api/st-4')
		expect(w.find('[data-testid="cn-stat-widget-icon-badge"]').exists()).toBe(true)
	})

	it('tints the circle and colours the value by the tile state, success included', async () => {
		const error = await tile({ iconPlacement: 'end', variant: 'error' }, '/apps/dossiq/api/st-5')
		expect(error.find('[data-testid="cn-stat-widget-icon-badge"]').classes()).toContain('cn-kpi-card__badge--error')
		expect(error.find('.cn-stat-widget__value').attributes('style')).toContain('--color-text-error')
		const success = await tile({ iconPlacement: 'end', variant: 'success' }, '/apps/dossiq/api/st-6')
		expect(success.find('[data-testid="cn-stat-widget-icon-badge"]').classes()).toContain('cn-kpi-card__badge--success')
		expect(success.find('.cn-stat-widget__value').attributes('style')).toContain('--color-text-success')
		const rule = await tile({ iconPlacement: 'end', variantWhen: [{ op: 'gte', value: 10, variant: 'warning' }] }, '/apps/dossiq/api/st-7')
		expect(rule.find('[data-testid="cn-stat-widget-icon-badge"]').classes()).toContain('cn-kpi-card__badge--warning')
	})

	it('renders the whole tile as one link', async () => {
		const w = await tile({ iconPlacement: 'end' }, '/apps/dossiq/api/st-8')
		expect(w.element.tagName).toBe('A')
		expect(w.findAll('a')).toHaveLength(1)
		expect(w.classes()).toContain('cn-kpi-card--board')
	})

	it('renders as today without the board look: horizontal, icon circle before the body, no end badge', async () => {
		const w = await tile({ iconPlacement: 'end' }, '/apps/dossiq/api/st-9', false)
		expect(w.classes()).toContain('cn-kpi-card--horizontal')
		expect(w.classes()).not.toContain('cn-kpi-card--board')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stat-widget-icon-badge"]').exists()).toBe(false)
		expect(w.find('.cn-stat-widget__label').classes()).not.toContain('cn-kpi-card__title--badge-end')
	})

	it('keeps the glyph-before-label rule when iconPlacement is not end', async () => {
		const w = await tile({}, '/apps/dossiq/api/st-10')
		expect(w.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-stat-widget-icon-badge"]').exists()).toBe(false)
	})
})

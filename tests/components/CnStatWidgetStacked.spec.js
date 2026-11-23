/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `content.layout: "stacked"` is the board's KPI tile: a plain muted label,
 * the number at 34px in the text colour, the caption on a line of its own
 * and no icon circle (the sizes live in src/css/kpi-card.css). Without the
 * key the tile renders the canonical horizontal card as before.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-a-stat-tile-can-take-the-stacked-board-look
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = { NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' } }
const CAPTION = '[data-testid="cn-stat-widget-caption"]'

async function mountTile(content, url) {
	axios.get.mockResolvedValue({ data: { n: 14 } })
	const wrapper = mount(CnStatWidget, {
		propsData: { content: { label: 'My open cases', icon: 'FolderOutline', caption: '3 new this week', valueField: 'n', endpointSource: { url }, ...content } },
		stubs,
		provide: { cnWorkspaceContext: {} },
	})
	await flush()
	await flush()
	await flush()
	return wrapper
}

describe('CnStatWidget: stacked layout', () => {
	beforeEach(() => jest.clearAllMocks())

	it('renders the horizontal card with its icon and the caption beside the number by default', async () => {
		const w = await mountTile({}, '/apps/dossiq/api/kpi-stacked-a')
		expect(w.classes()).toContain('cn-kpi-card--horizontal')
		expect(w.classes()).not.toContain('cn-kpi-card--stacked')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(true)
		expect(w.find(`.cn-kpi-card__value-row ${CAPTION}`).text()).toBe('3 new this week')
	})

	it('drops the icon circle and puts the caption on its own line under the number', async () => {
		const w = await mountTile({ layout: 'stacked' }, '/apps/dossiq/api/kpi-stacked-b')
		expect(w.classes()).toContain('cn-kpi-card--stacked')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(false)
		expect(w.find(`.cn-kpi-card__value-row ${CAPTION}`).exists()).toBe(false)
		const caption = w.find(`.cn-kpi-card__body > ${CAPTION}`)
		expect(caption.text()).toBe('3 new this week')
		expect(caption.classes()).toContain('cn-kpi-card__caption-line')
		expect(w.find('.cn-kpi-card__value').text()).toBe('14')
		expect(w.find('.cn-kpi-card__title').text()).toBe('My open cases')
	})

	it('keeps a rule-coloured caption in the stacked layout', async () => {
		const w = await mountTile({ layout: 'stacked', captionVariant: 'error' }, '/apps/dossiq/api/kpi-stacked-c')
		expect(w.find(CAPTION).classes()).toContain('cn-kpi-card__label--error')
	})
})

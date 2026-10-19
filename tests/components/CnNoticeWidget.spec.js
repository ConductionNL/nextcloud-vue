/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNoticeWidget, widget type `notice` (DqSociaalDomein: "Bijzondere
 * persoonsgegevens: gezondheid. Elke inzage wordt gelogd met het doel."): a
 * toned box with an icon, a bold title and a line of text through the host
 * translate, which a detail page's side column renders by type and gates by
 * its `visibleWhen`.
 *
 * @spec openspec/changes/side-notice-card/specs/notice-widget/spec.md#requirement-a-notice-card-for-the-side-column
 */
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnNoticeWidget from '../../src/components/CnNoticeWidget/CnNoticeWidget.vue'
import { BUILT_IN_WIDGETS } from '../../src/components/CnWidgetGrid/builtInWidgets.js'
import { resolveRegistryRenderer } from '../../src/utils/widgetDispatch.js'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

const NL = {
	'Special category data: health.': 'Bijzondere persoonsgegevens: gezondheid.',
	'Every view is logged with its purpose.': 'Elke inzage wordt gelogd met het doel.',
}
const CONTENT = { variant: 'warning', title: 'Special category data: health.', text: 'Every view is logged with its purpose.' }

/**
 * Mount the notice.
 *
 * @param {object} content The content.
 * @return {import('@vue/test-utils').VueWrapper} The notice.
 */
function mountNotice(content) {
	return mount(CnNoticeWidget, {
		props: { content },
		global: { provide: { cnTranslate: (key) => NL[key] ?? key }, stubs: { CnIcon: { props: ['name'], template: '<i class="icon" :data-name="name" />' } } },
	})
}

describe('CnNoticeWidget', () => {
	it('draws the variant, its icon, the bold title and the text through the host translate', () => {
		const w = mountNotice(CONTENT)
		const box = w.find('[data-testid="cn-notice-widget"]')
		expect(box.classes()).toContain('cn-notice-widget--warning')
		expect(box.attributes('role')).toBe('note')
		expect(w.find('.icon').attributes('data-name')).toBe('AlertOutline')
		expect(w.find('[data-testid="cn-notice-widget-title"]').text()).toBe('Bijzondere persoonsgegevens: gezondheid.')
		expect(w.find('.cn-notice-widget__text').text()).toBe('Bijzondere persoonsgegevens: gezondheid. Elke inzage wordt gelogd met het doel.')
	})

	it('falls back to info for an unknown variant, takes a named icon, and draws nothing without text', () => {
		const w = mountNotice({ variant: 'loud', text: 'Note', icon: 'ShieldLock' })
		expect(w.find('.cn-notice-widget').classes()).toContain('cn-notice-widget--info')
		expect(w.find('.icon').attributes('data-name')).toBe('ShieldLock')
		expect(mountNotice({ variant: 'warning' }).find('.cn-notice-widget').exists()).toBe(false)
	})

	it('is the built-in widget type notice', () => {
		expect(BUILT_IN_WIDGETS.notice).toBe(CnNoticeWidget)
		expect(resolveRegistryRenderer({ type: 'notice' }, {})).toBe(CnNoticeWidget)
	})

	it('renders through the detail widget host the side column uses', () => {
		const w = mount(CnDetailWidgetHost, {
			props: { widget: { id: 'special', type: 'notice', content: CONTENT }, chrome: 'card', showCardTitle: true },
			global: { provide: { cnTranslate: (key) => NL[key] ?? key } },
		})
		expect(w.find('[data-testid="cn-notice-widget"]').text()).toContain('Elke inzage wordt gelogd met het doel.')
	})
})

describe('a notice in the detail page side column', () => {
	const CASE_TYPES = { 'ct-youth': { id: 'ct-youth', specialCategories: ['health'] }, 'ct-permit': { id: 'ct-permit', specialCategories: [] } }

	beforeEach(() => {
		mockFetchJson.mockReset()
		mockFetchJson.mockImplementation(async (url) => CASE_TYPES[url.split('/').pop()])
	})

	/**
	 * Mount a case page with the notice in its side column.
	 *
	 * @param {string} caseType The case type id.
	 * @return {import('@vue/test-utils').VueWrapper} The page.
	 */
	async function mountPage(caseType) {
		const w = shallowMount(CnDetailPage, {
			props: {
				title: 'Case',
				register: 'dossiq',
				schema: 'case',
				objectId: 'case-1',
				objectStore: {
					objects: { 'dossiq-case': { 'case-1': { id: 'case-1', caseType } } },
					schemas: {},
					objectTypeRegistry: {},
					registerObjectType: jest.fn(),
					fetchObject: jest.fn(async () => null),
					fetchSchema: jest.fn(async () => null),
				},
				widgets: [
					{ id: 'deadline', type: 'stat', title: 'Deadline' },
					{ id: 'special', type: 'notice', content: CONTENT, visibleWhen: { field: '@context.caseType.specialCategories', op: 'notEmpty' } },
				],
				layout: [{ id: '0', widgetId: 'deadline', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
				sideColumn: ['special', 'deadline'],
				visibilityContext: { caseType: { field: 'caseType', register: 'dossiq', schema: 'caseType' } },
			},
			global: { mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'case' }, $router: { push: jest.fn(), replace: jest.fn() } } },
		})
		await flushPromises()
		return w
	}

	// A full detail page mount; generous on a loaded machine.
	it('shows while its visibleWhen holds, and not otherwise', async () => {
		expect((await mountPage('ct-youth')).vm.sideColumnWidgets.map((widget) => widget.id)).toEqual(['special', 'deadline'])
		expect((await mountPage('ct-permit')).vm.sideColumnWidgets.map((widget) => widget.id)).toEqual(['deadline'])
	}, 30_000)
})

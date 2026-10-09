/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Labels an app writes in its manifest go through the host's label lookup
 * (`cnTranslate`): quick-filter chips, the attention card's copy, the stats
 * block's title and count label, the index page's footer note and bulk hint.
 * Without the lookup they render as written. The app lanes of round 6 each
 * translated these themselves (dossiq `translateLensLabels` and
 * `translateBannerCopy`, pipelinq `indexPageLabels.js`, portaliq literals).
 */
import { mount } from '@vue/test-utils'
import CnBannerWidget from '../../src/components/CnBannerWidget/CnBannerWidget.vue'
import CnQuickFilterBar from '../../src/components/CnQuickFilterBar/CnQuickFilterBar.vue'
import CnStatsBlock from '../../src/components/CnStatsBlock/CnStatsBlock.vue'

const NL = { Mine: 'Mijn zaken', 'First today': 'Vandaag eerst', 'Open the board': 'Open het bord', 'Active accounts': 'Actieve accounts', cases: 'zaken', 'Too late': 'Te laat' }
const cnTranslate = (key) => NL[key] ?? key
const provide = { cnTranslate }

const stubs = {
	NcPopover: { template: '<div><slot name="trigger" /><slot /></div>' },
	NcSelect: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
	DotsHorizontal: true,
}

describe('CnQuickFilterBar labels', () => {
	const tabs = [{ label: 'All', filter: {} }, { label: 'Mine', filter: { mine: true } }]

	it('draws the translated label', () => {
		const w = mount(CnQuickFilterBar, { props: { tabs, activeIndex: 0 }, global: { stubs, provide } })
		expect(w.findAll('.cn-quick-filter-bar__label').map((l) => l.text())).toEqual(['All', 'Mijn zaken'])
	})

	it('draws the label as written without a lookup', () => {
		const w = mount(CnQuickFilterBar, { props: { tabs, activeIndex: 0 }, global: { stubs } })
		expect(w.findAll('.cn-quick-filter-bar__label').map((l) => l.text())).toEqual(['All', 'Mine'])
	})

	it('names an active overflow lens in the user language', () => {
		const w = mount(CnQuickFilterBar, { props: { tabs, activeIndex: 1, maxVisible: 1 }, global: { stubs, provide } })
		expect(w.find('[data-testid="cn-quick-filter-more"]').text()).toContain('Mijn zaken')
	})
})

describe('CnBannerWidget attention copy', () => {
	const card = {
		layout: 'attention',
		variant: 'error',
		kicker: 'First today',
		title: 'Too late',
		reason: 'Active accounts',
		actions: [{ label: 'Open the board', id: 'open' }],
	}

	it('translates kicker, title, reason and the action labels', () => {
		const w = mount(CnBannerWidget, { props: { content: card }, global: { provide, mocks: { $router: { resolve: () => ({ href: '#' }) } } } })
		expect(w.find('.cn-banner-widget__kicker').text()).toBe('Vandaag eerst')
		expect(w.find('.cn-banner-widget__title').text()).toBe('Te laat')
		expect(w.find('.cn-banner-widget__reason').text()).toBe('Actieve accounts')
		expect(w.find('[data-testid="cn-banner-widget-action"]').text()).toBe('Open het bord')
	})

	it('keeps the words as written without a lookup', () => {
		const w = mount(CnBannerWidget, { props: { content: card }, global: { mocks: { $router: { resolve: () => ({ href: '#' }) } } } })
		expect(w.find('.cn-banner-widget__kicker').text()).toBe('First today')
	})
})

describe('CnStatsBlock title and count label', () => {
	it('translates both', () => {
		const w = mount(CnStatsBlock, { props: { title: 'Active accounts', count: 4, countLabel: 'cases' }, global: { provide } })
		expect(w.find('.cn-kpi-card__title').text()).toBe('Actieve accounts')
		expect(w.find('.cn-stats-block__count-label').text()).toBe('zaken')
	})

	it('keeps them as written without a lookup', () => {
		const w = mount(CnStatsBlock, { props: { title: 'Active accounts', count: 4, countLabel: 'cases' } })
		expect(w.find('.cn-kpi-card__title').text()).toBe('Active accounts')
	})
})

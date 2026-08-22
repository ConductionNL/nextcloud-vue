/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Manifest-authored page chrome is run through the host translate function.
 *
 * A consumer app puts ENGLISH SOURCE KEYS in its manifest (ADR-007) and passes
 * `translate` into CnAppRoot, which provides it to every descendant as
 * `cnTranslate`. Until now only CnAppNav's item labels and the data-table
 * column labels used it, so page titles, widget titles, captions and
 * empty-state copy rendered the raw English key in every locale.
 *
 * Each surface below is asserted twice:
 *  1. WITH a translate fn → renders the translation.
 *  2. WITHOUT one (the no-op control) → renders the raw key, byte-identical
 *     to what shipped before. A catalogue miss is exercised too, since a
 *     partially-translated catalogue is the common real-world case.
 */

import { mount, shallowMount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))
jest.mock('../../src/utils/fetchAggregate.js', () => ({
	fetchAggregateValue: jest.fn(),
}))

import CnPageHeader from '../../src/components/CnPageHeader/CnPageHeader.vue'
import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import CnTileWidget from '../../src/components/CnTileWidget/CnTileWidget.vue'
import CnDeltaWidget from '../../src/components/CnDeltaWidget/CnDeltaWidget.vue'
import CnGaugeWidget from '../../src/components/CnGaugeWidget/CnGaugeWidget.vue'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnObjectList from '../../src/components/CnObjectList/CnObjectList.vue'
import CnCardGrid from '../../src/components/CnCardGrid/CnCardGrid.vue'
import CnDataTable from '../../src/components/CnDataTable/CnDataTable.vue'

/** A partial catalogue: some keys land, "Not in the catalogue" deliberately does not. */
const dict = {
	Clients: 'Klanten',
	'Manage your clients': 'Beheer je klanten',
	'Open cases': 'Openstaande zaken',
	'this month': 'deze maand',
	Files: 'Bestanden',
	Welcome: 'Welkom',
	'Your workspace': 'Je werkruimte',
	'Get started': 'Aan de slag',
	'No items found': 'Geen resultaten',
}
const translate = (key) => dict[key] ?? key
/** Provide payload matching what CnAppRoot provides (`cnTranslate: this.translate`). */
const provideTranslate = { cnTranslate: translate }

const NcEmptyContentStub = {
	name: 'NcEmptyContent',
	props: ['name'],
	template: '<div class="empty-stub">{{ name }}</div>',
}
const listStubs = {
	NcEmptyContent: NcEmptyContentStub,
	NcLoadingIcon: { template: '<div />' },
}

describe('CnPageHeader — title + description', () => {
	const mountHeader = (provide) => mount(CnPageHeader, {
		propsData: { title: 'Clients', description: 'Manage your clients' },
		stubs: { CnIcon: true },
		...(provide ? { provide } : {}),
	})

	it('translates the title and description via the injected cnTranslate', () => {
		const w = mountHeader(provideTranslate)
		expect(w.find('[data-testid="cn-page-title"]').text()).toBe('Klanten')
		expect(w.find('[data-testid="cn-page-description"]').text()).toBe('Beheer je klanten')
	})

	it('prefers the explicit translate prop over the injected cnTranslate', () => {
		const w = mount(CnPageHeader, {
			propsData: { title: 'Clients', translate: () => 'FROM_PROP' },
			stubs: { CnIcon: true },
			provide: { cnTranslate: () => 'FROM_INJECT' },
		})
		expect(w.find('[data-testid="cn-page-title"]').text()).toBe('FROM_PROP')
	})

	it('renders the raw source strings with no translator (no-op control)', () => {
		const w = mountHeader(null)
		expect(w.find('[data-testid="cn-page-title"]').text()).toBe('Clients')
		expect(w.find('[data-testid="cn-page-description"]').text()).toBe('Manage your clients')
	})

	it('renders the raw source string when the catalogue lacks the key (no-op control)', () => {
		const w = mount(CnPageHeader, {
			propsData: { title: 'Not in the catalogue' },
			stubs: { CnIcon: true },
			provide: provideTranslate,
		})
		expect(w.find('[data-testid="cn-page-title"]').text()).toBe('Not in the catalogue')
	})
})

describe('CnWidgetWrapper — widget title', () => {
	const stubs = { CnActionsMenu: { template: '<div />' } }
	const mountWrapper = (provide) => mount(CnWidgetWrapper, {
		propsData: { title: 'Open cases', widgetId: 'cases' },
		stubs,
		...(provide ? { provide } : {}),
	})

	it('translates the card heading via the injected cnTranslate', () => {
		expect(mountWrapper(provideTranslate).find('.cn-widget-wrapper__title').text()).toBe('Openstaande zaken')
	})

	it('renders the raw source string with no translator (no-op control)', () => {
		expect(mountWrapper(null).find('.cn-widget-wrapper__title').text()).toBe('Open cases')
	})

	it('keeps the derived widget id locale-independent', () => {
		// The slug feeds DOM ids, the refresh channel and action payloads —
		// it must NOT change when a translation exists.
		const untranslated = mount(CnWidgetWrapper, { propsData: { title: 'Open cases' }, stubs })
		const translated = mount(CnWidgetWrapper, { propsData: { title: 'Open cases' }, stubs, provide: provideTranslate })
		expect(translated.vm.resolvedWidgetId).toBe(untranslated.vm.resolvedWidgetId)
		expect(translated.vm.resolvedWidgetId).toBe('open-cases')
	})
})

describe('CnTileWidget — tile title', () => {
	const tile = { title: 'Files', linkType: 'app', linkValue: 'files' }

	it('translates the tile caption via the injected cnTranslate', () => {
		const w = mount(CnTileWidget, { propsData: { tile }, provide: provideTranslate })
		expect(w.find('.cn-tile-widget__title').text()).toBe('Bestanden')
	})

	it('renders the raw source string with no translator (no-op control)', () => {
		const w = mount(CnTileWidget, { propsData: { tile } })
		expect(w.find('.cn-tile-widget__title').text()).toBe('Files')
	})
})

describe('CnDeltaWidget — label + caption', () => {
	const content = { label: 'Open cases', caption: 'this month' }

	it('translates the label and caption via the injected cnTranslate', async () => {
		const w = shallowMount(CnDeltaWidget, { propsData: { content }, provide: provideTranslate })
		w.setData({ current: 120, previous: 100 })
		await w.vm.$nextTick()
		expect(w.find('.cn-delta-widget__label').text()).toBe('Openstaande zaken')
		expect(w.find('.cn-delta-widget__caption').text()).toBe('deze maand')
	})

	it('renders the raw source strings with no translator (no-op control)', async () => {
		const w = shallowMount(CnDeltaWidget, { propsData: { content } })
		w.setData({ current: 120, previous: 100 })
		await w.vm.$nextTick()
		expect(w.find('.cn-delta-widget__label').text()).toBe('Open cases')
		expect(w.find('.cn-delta-widget__caption').text()).toBe('this month')
	})
})

describe('CnGaugeWidget — label', () => {
	const content = { label: 'Open cases' }

	it('translates the label via the injected cnTranslate', () => {
		const w = shallowMount(CnGaugeWidget, { propsData: { content }, provide: provideTranslate })
		expect(w.find('.cn-gauge-widget__label').text()).toBe('Openstaande zaken')
	})

	it('renders the raw source string with no translator (no-op control)', () => {
		const w = shallowMount(CnGaugeWidget, { propsData: { content } })
		expect(w.find('.cn-gauge-widget__label').text()).toBe('Open cases')
	})
})

describe('CnHeaderWidget — title, subtitle and CTA label', () => {
	const content = {
		title: 'Welcome',
		subtitle: 'Your workspace',
		cta: { label: 'Get started', url: 'https://x.test' },
	}

	it('translates the banner copy via the injected cnTranslate', () => {
		const w = mount(CnHeaderWidget, { propsData: { content }, provide: provideTranslate })
		expect(w.find('.cn-header-widget__title').text()).toBe('Welkom')
		expect(w.find('.cn-header-widget__subtitle').text()).toBe('Je werkruimte')
		expect(w.find('.cn-header-widget__cta').text()).toBe('Aan de slag')
	})

	it('renders the raw source strings with no translator (no-op control)', () => {
		const w = mount(CnHeaderWidget, { propsData: { content } })
		expect(w.find('.cn-header-widget__title').text()).toBe('Welcome')
		expect(w.find('.cn-header-widget__subtitle').text()).toBe('Your workspace')
		expect(w.find('.cn-header-widget__cta').text()).toBe('Get started')
	})
})

describe('empty-state copy', () => {
	it('CnObjectList translates emptyText via the injected cnTranslate', () => {
		const w = shallowMount(CnObjectList, {
			propsData: { objects: [], emptyText: 'No items found' },
			stubs: listStubs,
			provide: provideTranslate,
		})
		expect(w.find('.empty-stub').text()).toBe('Geen resultaten')
	})

	it('CnObjectList renders the raw emptyText with no translator (no-op control)', () => {
		const w = shallowMount(CnObjectList, {
			propsData: { objects: [], emptyText: 'No items found' },
			stubs: listStubs,
		})
		expect(w.find('.empty-stub').text()).toBe('No items found')
	})

	it('CnCardGrid translates emptyText via the injected cnTranslate', () => {
		const w = shallowMount(CnCardGrid, {
			propsData: { objects: [], emptyText: 'No items found' },
			stubs: listStubs,
			provide: provideTranslate,
		})
		expect(w.find('.empty-stub').text()).toBe('Geen resultaten')
	})

	it('CnCardGrid renders the raw emptyText with no translator (no-op control)', () => {
		const w = shallowMount(CnCardGrid, {
			propsData: { objects: [], emptyText: 'No items found' },
			stubs: listStubs,
		})
		expect(w.find('.empty-stub').text()).toBe('No items found')
	})

	it('CnDataTable translates emptyText via the injected cnTranslate', () => {
		const w = mount(CnDataTable, {
			propsData: { rows: [], columns: [{ key: 'id' }], emptyText: 'No items found' },
			provide: provideTranslate,
		})
		expect(w.find('[data-testid="cn-object-list-empty"]').text()).toBe('Geen resultaten')
	})

	it('CnDataTable renders the raw emptyText with no translator (no-op control)', () => {
		const w = mount(CnDataTable, {
			propsData: { rows: [], columns: [{ key: 'id' }], emptyText: 'No items found' },
		})
		expect(w.find('[data-testid="cn-object-list-empty"]').text()).toBe('No items found')
	})
})

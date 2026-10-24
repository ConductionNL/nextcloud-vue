/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail card can carry a subtitle under its title, and the widget host
 * hands an integration card the widget's own subtitle (DqZaakTaken
 * "Afspraken: Uit de agenda, gekoppeld aan deze zaak", "Kaarten: Coördinatie
 * in Deck, ..."; r25b drew them without).
 *
 * @spec openspec/changes/integration-card-subtitle/specs/detail-card/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnDetailCard from '../../src/components/CnDetailCard/CnDetailCard.vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnDeckCard from '../../src/integrations/builtin/deck/CnDeckCard.vue'

describe('CnDetailCard subtitle', () => {
	it('draws the subtitle under the title', () => {
		const w = mount(CnDetailCard, { props: { title: 'Afspraken', subtitle: 'Uit de agenda' } })
		expect(w.find('.cn-detail-card__title').text()).toBe('Afspraken')
		expect(w.find('.cn-detail-card__subtitle').text()).toBe('Uit de agenda')
	})

	it('draws no subtitle line without one', () => {
		const w = mount(CnDetailCard, { props: { title: 'Afspraken' } })
		expect(w.find('.cn-detail-card__subtitle').exists()).toBe(false)
	})
})

describe('CnDetailWidgetHost integration props', () => {
	it('hand the widget subtitle to the integration card, through the host translate', () => {
		const vm = { widget: { title: 'Appointments', subtitle: 'From the calendar' }, translateLabel: (s) => `nl:${s}`, surface: 'detail-page', leafTitleLabel: {}, usesBareWidget: false, derivedIntegrationContext: {}, resolvedWidgetProps: {} }
		const props = CnDetailWidgetHost.computed.integrationProps.call(vm)
		expect(props.subtitle).toBe('nl:From the calendar')
	})

	it('hand no subtitle when the widget has none', () => {
		const vm = { widget: { title: 'Appointments' }, translateLabel: (s) => s, surface: 'detail-page', leafTitleLabel: {}, usesBareWidget: false, derivedIntegrationContext: {}, resolvedWidgetProps: {} }
		expect('subtitle' in CnDetailWidgetHost.computed.integrationProps.call(vm)).toBe(false)
	})
})

describe('an integration card whose root is a detail card', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('passes the subtitle it is given on to its card', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ results: [] }) })
		const w = mount(CnDeckCard, { props: { register: 'reg', schema: 'case', objectId: 'c-1', surface: 'detail-page', title: 'Kaarten', subtitle: 'Coördinatie in Deck' } })
		await flushPromises()
		expect(w.find('.cn-detail-card__subtitle').text()).toBe('Coördinatie in Deck')
		w.unmount()
	})
})

/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqBezwaar's advice card: a status pill in the card header ("Advies
 * ontvangen", from the record) and a light note band inside the card under
 * the facts. The facts widget reports the pill through its `header` event and
 * the detail host draws it beside the title.
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default
const CnDetailWidgetHost = require('../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue').default

const ADVICE = { id: 'b-1', adviceState: 'received', committee: 'Bezwaaradviescommissie Zuiddrecht' }

/**
 * Mount the facts widget with the given content.
 *
 * @param {object} content Extra content.
 * @param {object} record The record.
 * @return {object} The wrapper.
 */
function mountFacts(content, record = ADVICE) {
	return mount(CnFactsWidget, {
		propsData: { objectData: record, content: { fields: [{ path: 'committee', label: 'Commissie' }], ...content } },
		provide: { cnTranslate: (s) => s.replace('Advice received', 'Advies ontvangen') },
		stubs: { NcLoadingIcon: true },
	})
}

function lastHeader(w) {
	const events = w.emitted('header')
	return events[events.length - 1][0]
}

describe('CnFactsWidget header pill', () => {
	const headerPill = { path: 'adviceState', map: { received: 'Advice received', pending: 'Awaiting advice' }, colorMap: { received: 'success', pending: 'warning' } }

	it('reports the pill, mapped, translated and coloured from the record', () => {
		expect(lastHeader(mountFacts({ headerPill })).pill).toEqual({ label: 'Advies ontvangen', variant: 'success' })
	})

	it('reports no pill while the value is empty, and a constant text with its variant', () => {
		expect(lastHeader(mountFacts({ headerPill }, { id: 'b-2' })).pill).toBeNull()
		expect(lastHeader(mountFacts({ headerPill: { text: 'Concept', variant: 'purple' } })).pill).toEqual({ label: 'Concept', variant: 'purple' })
	})

	it('falls back to the default tone for an unknown variant', () => {
		expect(lastHeader(mountFacts({ headerPill: { text: 'X', variant: 'magenta' } })).pill.variant).toBe('default')
	})
})

describe('CnFactsWidget notice band', () => {
	it('draws the translated text in a note card, info by default', () => {
		const w = mountFacts({ notice: { text: 'Wijkt de beslissing af van het advies, dan vraagt dossiq om de reden.' } })
		const note = w.find('[data-testid="cn-facts-notice"]')
		expect(note.exists()).toBe(true)
		expect(w.vm.notice.type).toBe('info')
		expect(note.text()).toContain('vraagt dossiq om de reden')
	})

	it('takes a known variant and draws nothing without text', () => {
		expect(mountFacts({ notice: { text: 'Let op', variant: 'warning' } }).vm.notice.type).toBe('warning')
		expect(mountFacts({ notice: { text: '' } }).find('[data-testid="cn-facts-notice"]').exists()).toBe(false)
	})
})

describe('CnDetailWidgetHost draws a reported pill in the card header', () => {
	it('keeps the pill a renderer reports', () => {
		const ctx = { rendererHeader: null }
		CnDetailWidgetHost.methods.onRendererHeader.call(ctx, { link: null, note: '', action: null, pill: { label: 'Advies ontvangen', variant: 'success' } })
		expect(ctx.rendererHeader.pill).toEqual({ label: 'Advies ontvangen', variant: 'success' })
		CnDetailWidgetHost.methods.onRendererHeader.call(ctx, { pill: { label: '' } })
		expect(ctx.rendererHeader.pill).toBeNull()
	})
})

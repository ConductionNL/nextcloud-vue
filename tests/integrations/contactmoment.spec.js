// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The `contactmoment` leaf reads pipelinq's per-entity activity aggregation.
//
// The failure mode that matters here is the quiet one: pipelinq absent, or the
// object not visible to this user. An empty list in that case reads as "no
// interactions" when the truth is "we could not ask", which is a different
// thing for someone deciding whether a citizen has already been called.

import { mount } from '@vue/test-utils'
import CnContactmomentCard from '../../src/integrations/builtin/contactmoment/CnContactmomentCard.vue'
import { contactmomentIntegration } from '../../src/integrations/builtin/contactmoment.js'

/**
 * Mount the card with fetch stubbed to a given outcome.
 *
 * @param {object} outcome `{ ok, body }` or `{ reject: true }`.
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountCard(outcome, props = {}) {
	global.fetch = jest.fn(() => outcome.reject
		? Promise.reject(new Error('network'))
		: Promise.resolve({ ok: outcome.ok !== false, json: () => Promise.resolve(outcome.body || {}) }))
	return mount(CnContactmomentCard, {
		propsData: { objectId: 'obj-1', entityType: 'dossiq:case', ...props },
	})
}

const ITEM = {
	type: 'interaction',
	id: 'cm-1',
	subject: 'Telefoongesprek over de aanvraag',
	channel: 'telefoon',
	agent: 'admin',
	timestamp: '2026-09-01T10:00:00+00:00',
	summary: 'Aanvrager gebeld over ontbrekende bijlage.',
}

describe('contactmoment integration', () => {
	it('declares both surfaces, which registration requires', () => {
		expect(contactmomentIntegration.tab).toBeTruthy()
		expect(contactmomentIntegration.widget).toBeTruthy()
		expect(contactmomentIntegration.id).toBe('contactmoment')
		expect(contactmomentIntegration.requiredApp).toBe('pipelinq')
	})

	it('declares bareWidget, since its card honours chromeless', () => {
		// Opting in without honouring `chromeless` is what put a card inside a
		// tab panel once already.
		expect(contactmomentIntegration.bareWidget).toBe(true)
		expect(CnContactmomentCard.props.chromeless).toBeTruthy()
	})

	it('asks pipelinq for this entity, filtered to contactmomenten', async () => {
		const w = mountCard({ body: { total: 1, results: [ITEM] } })
		await w.vm.$nextTick()
		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('/apps/pipelinq/api/activity/dossiq%3Acase/obj-1')
		expect(url).toContain('type=contactmomenten')
	})

	it('renders an interaction', async () => {
		const w = mountCard({ body: { total: 1, results: [ITEM] } })
		await new Promise((r) => setTimeout(r, 0))
		await w.vm.$nextTick()
		expect(w.text()).toContain('Telefoongesprek over de aanvraag')
		expect(w.text()).toContain('telefoon')
	})

	it('says it could not load, rather than showing an empty list', async () => {
		const w = mountCard({ reject: true })
		await new Promise((r) => setTimeout(r, 0))
		await w.vm.$nextTick()
		expect(w.vm.error).toBe(true)
		expect(w.find('.cn-contactmoment-card__state--error').exists()).toBe(true)
	})

	it('does not call pipelinq when it has no entity type to ask about', async () => {
		const w = mountCard({ body: {} }, { entityType: '', schema: '' })
		await w.vm.$nextTick()
		expect(global.fetch).not.toHaveBeenCalled()
		expect(w.vm.items).toEqual([])
	})

	it('draws no card of its own when chromeless', async () => {
		const w = mountCard({ body: { total: 0, results: [] } }, { chromeless: true })
		await w.vm.$nextTick()
		expect(w.findComponent({ name: 'CnDetailCard' }).exists()).toBe(false)
	})
})

// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A notes card rendered where the surface already owns the card must not draw
// a second one.
//
// This exists because the first version of the tabbed-notes fix shipped exactly
// that defect. The reasoning behind it was: grep `.cn-notes-card` for border /
// background / padding, find none, conclude the component is bare. That asked
// about a CSS CLASS when the chrome comes from a wrapping COMPONENT —
// CnNotesCard renders `<CnDetailCard>`, which draws the border and a title. So
// a tab panel got a titled card inside the tabs card, repeating the label the
// open tab already shows.
//
// The assertions below are about what is RENDERED, not about which class names
// carry which declarations, so the same mistake cannot pass again.

import { shallowMount, mount } from '@vue/test-utils'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'

/**
 * Mount with the network calls the component makes on create stubbed out.
 *
 * @param {object} props Component props.
 * @param {Function} mountFn The @vue/test-utils mount function to use.
 * @return {object} The wrapper.
 */
function mountCard(props = {}, mountFn = shallowMount) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) }))
	return mountFn(CnNotesCard, {
		propsData: { registerId: 'r', schemaId: 's', objectId: 'o', ...props },
	})
}

describe('CnNotesCard chromeless', () => {
	it('draws its own CnDetailCard by default', () => {
		const w = mountCard()
		expect(w.findComponent({ name: 'CnDetailCard' }).exists()).toBe(true)
	})

	it('draws no card CHROME when chromeless, so a tab panel gets no card-in-card', () => {
		// The card component is still the root. That is deliberate: an earlier
		// version swapped it for a dynamic `<component :is>` root, and Vue then
		// stopped applying the scope id to the subtree, silently disabling every
		// scoped rule in this file. What must be gone is the chrome, not the
		// component, so this asserts the rendered result rather than the tree.
		const w = mountCard({ chromeless: true }, mount)
		const card = w.find('.cn-detail-card')
		expect(card.exists()).toBe(true)
		expect(card.classes()).toContain('cn-detail-card--chromeless')
		expect(w.find('.cn-detail-card__header').exists()).toBe(false)
	})

	it('keeps a STATIC card root, which is what preserves its scope id', () => {
		// Not asserted directly: scope ids are applied by the SFC build, and
		// jest's transform does not add them, so a data-v assertion here would
		// pass or fail on the harness rather than on the component.
		//
		// What IS assertable is the cause. A dynamic `<component :is>` root
		// stopped Vue applying the scope id to the subtree, and every scoped
		// rule in this file then missed: Nextcloud's own
		// `textarea { width: 130px }` won, and the composer rendered 130px wide
		// inside a 992px panel. Measured on a running instance.
		//
		// So both modes must resolve to the same static root component.
		expect(mountCard({}, mount).find('.cn-detail-card').exists()).toBe(true)
		expect(mountCard({ chromeless: true }, mount).find('.cn-detail-card').exists()).toBe(true)
	})

	it('still renders the compose textarea when chromeless', () => {
		// The whole point of routing a tab at this component rather than the
		// sidebar one is the inline composer. Dropping the card must not drop it.
		const w = mountCard({ chromeless: true }, mount)
		expect(w.find('.cn-notes-card__textarea').exists()).toBe(true)
	})
})

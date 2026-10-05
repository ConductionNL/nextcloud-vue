/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for the case surfaces: `CnNextStepCard`,
 * `CnDocumentReviewList` and `CnConversationThread`.
 *
 * Axe runs against the REAL @nextcloud/vue here, so the buttons are real
 * buttons. The structural assertions beside each scan cover what axe cannot
 * see: a state said only with a colour, and a control reachable only with a
 * mouse.
 */

const { expectAccessible } = require('../../src/testing/a11y.js')
const { mountAttached } = require('./support/mountAttached.js')
const CnConversationThread = require('../../src/components/CnConversationThread/CnConversationThread.vue').default
const CnDocumentReviewList = require('../../src/components/CnDocumentReviewList/CnDocumentReviewList.vue').default
const CnNextStepCard = require('../../src/components/CnNextStepCard/CnNextStepCard.vue').default

describe('case surfaces: accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.unmount()
	})

	describe('CnNextStepCard', () => {
		const propsData = {
			title: 'What now? Step 2: handling',
			items: [{ label: 'Receipt confirmed', done: true }, { label: 'Review the documents', hint: '2 of 5 done' }],
			actionLabel: 'Continue reviewing',
			after: 'Then: step 3, decision',
		}

		it('has no WCAG 2.1 AA violations', async () => {
			wrapper = mountAttached(CnNextStepCard, { propsData })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations without a title or a button', async () => {
			wrapper = mountAttached(CnNextStepCard, { propsData: { items: propsData.items } })
			await expectAccessible(wrapper)
		})

		it('offers the action as a native button a keyboard can reach', () => {
			wrapper = mountAttached(CnNextStepCard, { propsData })
			const button = wrapper.element.querySelector('button')
			expect(button).not.toBeNull()
			expect(button.textContent).toContain('Continue reviewing')
			expect(button.getAttribute('tabindex')).not.toBe('-1')
		})

		it('says done and to do in text', () => {
			wrapper = mountAttached(CnNextStepCard, { propsData })
			const states = [...wrapper.element.querySelectorAll('.cn-next-step-card__state')].map((n) => n.textContent.trim())
			expect(states).toEqual(['Done', 'To do'])
		})
	})

	describe('CnDocumentReviewList', () => {
		const documents = [
			{ id: 1, name: 'Advice on street lighting', meta: 'PDF', reviewStatus: 'public', href: '/f/1' },
			{ id: 2, name: 'Budget note', meta: 'Word' },
		]

		it('has no WCAG 2.1 AA violations with rows', async () => {
			wrapper = mountAttached(CnDocumentReviewList, { propsData: { title: 'Review documents', documents } })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations when empty', async () => {
			wrapper = mountAttached(CnDocumentReviewList, { propsData: { documents: [] } })
			await expectAccessible(wrapper)
		})

		it('gives every row action its own name', () => {
			wrapper = mountAttached(CnDocumentReviewList, { propsData: { documents } })
			const names = [...wrapper.element.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
			expect(names).toEqual(['Review: Advice on street lighting', 'Review: Budget note'])
		})
	})

	describe('CnConversationThread', () => {
		const messages = [
			{ id: 1, author: 'Sanne de Vries', time: '2026-10-04T10:52:00', side: 'them', text: 'Thank you.' },
			{ id: 2, time: '2026-10-04T11:00:00', side: 'us', text: 'Construction starts in March.' },
		]

		it('has no WCAG 2.1 AA violations with messages and a reply box', async () => {
			wrapper = mountAttached(CnConversationThread, { propsData: { title: 'Contact', messages } })
			await expectAccessible(wrapper)
		})

		it('has no WCAG 2.1 AA violations when empty and read-only', async () => {
			wrapper = mountAttached(CnConversationThread, { propsData: { messages: [], allowReply: false } })
			await expectAccessible(wrapper)
		})

		it('labels the reply box and submits from a native submit button', () => {
			wrapper = mountAttached(CnConversationThread, { propsData: { messages } })
			const textarea = wrapper.element.querySelector('textarea')
			const label = wrapper.element.querySelector(`label[for="${textarea.id}"]`)
			expect(label.textContent.trim()).toBe('Reply')
			expect(wrapper.element.querySelector('form button[type="submit"]')).not.toBeNull()
		})
	})
})

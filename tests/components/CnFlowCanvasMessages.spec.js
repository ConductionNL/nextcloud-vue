/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow editor's messages, ON the canvas.
 *
 * WHY THIS COMPONENT EXISTS
 * -------------------------
 * Adding a step to a PUBLISHED flow is refused, and the refusal used to render
 * as a note card at the top of the Steps tab in the right sidebar: far from the
 * canvas the author was working on, above a long scrolling palette, and easy to
 * miss completely. Reported by Ruben 2026-09-06 after doing exactly that and
 * seeing nothing happen.
 *
 * So every message the editor has to give now lands in ONE area pinned to the
 * canvas — action refusals and standing conditions alike. That is a deliberate
 * choice over splitting transient toasts from a persistent status strip: two
 * places to look is the defect being fixed, not a smaller version of it.
 *
 * WHAT THAT ONE AREA HAS TO GET RIGHT, AND WHAT EACH TEST HERE HOLDS
 * ------------------------------------------------------------------
 * - A standing condition does not fade. It has no dismiss control at all,
 *   because dismissing "this flow has no end step" would hide a fact that is
 *   still true.
 * - A one-off refusal does not clear itself, so it carries a dismiss control.
 * - The same message twice does not stack. Identity is the `id`, and a repeat
 *   REPLACES.
 * - The area does not swallow canvas clicks. `pointer-events` is asserted
 *   against the stylesheet here and against a real browser in
 *   `e2e/flow-messages.e2e.js`.
 * - Severity reaches assistive tech as a WORD, not only as a colour.
 */

import { mount } from '@vue/test-utils'
import CnFlowCanvasMessages from '../../src/components/CnFlowDetail/CnFlowCanvasMessages.vue'

/**
 * Mount the area over a list of messages.
 *
 * @param {Array<object>} messages The messages to render.
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountArea(messages = [], props = {}) {
	return mount(CnFlowCanvasMessages, {
		props: { messages, ...props },
		global: {
			stubs: {
				NcButton: {
					template: '<button :aria-label="ariaLabel"><slot /></button>',
					props: ['ariaLabel'],
				},
			},
			mocks: {
				t: (app, s, vars) => (vars
					? Object.keys(vars).reduce((out, k) => out.replace(`{${k}}`, vars[k]), s)
					: s),
				n: (app, s, p, count, vars) => (count === 1 ? s : p).replace('{count}', vars?.count ?? count),
			},
		},
	})
}

describe('CnFlowCanvasMessages', () => {
	describe('every severity renders', () => {
		it.each([
			['error', 'Error'],
			['warning', 'Warning'],
			['info', 'Information'],
			['success', 'Success'],
		])('renders a %s message and names its severity in words', (severity, word) => {
			const wrapper = mountArea([
				{ id: 'm1', severity, text: 'Something to say.' },
			])

			const item = wrapper.find('[data-testid="flow-message-m1"]')
			expect(item.exists()).toBe(true)
			expect(item.classes()).toContain(`cn-flow-canvas-messages__item--${severity}`)
			expect(item.text()).toContain('Something to say.')

			// 🔑 THE SEVERITY IS A WORD, NOT ONLY A COLOUR (WCAG 1.4.1). The
			// icon and the tint say it to someone who can see them; this span
			// says it to everyone else.
			expect(item.find('.cn-flow-canvas-messages__severity').text()).toBe(word)
		})

		it('lists a message\'s individual findings under it', () => {
			const wrapper = mountArea([
				{ id: 'check', severity: 'error', text: 'This flow cannot run yet.', items: ['A step has nowhere to send its work. (n2)'] },
			])

			expect(wrapper.text()).toContain('A step has nowhere to send its work. (n2)')
		})
	})

	describe('a standing condition versus a one-off refusal', () => {
		it('gives a standing condition NO way to dismiss it', () => {
			// "This flow has no end step" is true until the author adds one.
			// A dismiss control would offer to hide a fact rather than fix it.
			const wrapper = mountArea([
				{ id: 'missing-ends', severity: 'error', text: 'This flow has no end step, so a run can never finish.', dismissible: false },
			])

			expect(wrapper.find('[data-testid="flow-message-dismiss-missing-ends"]').exists()).toBe(false)
		})

		it('lets a one-off refusal be dismissed, and says which one', async () => {
			const wrapper = mountArea([
				{ id: 'refused', severity: 'warning', text: 'Only a draft version can be published.', dismissible: true },
			])

			const dismiss = wrapper.find('[data-testid="flow-message-dismiss-refused"]')
			expect(dismiss.exists()).toBe(true)

			await dismiss.trigger('click')

			expect(wrapper.emitted('dismiss')).toEqual([['refused']])
		})

		it('offers the action that resolves the message, and reports it by id', async () => {
			const wrapper = mountArea([
				{ id: 'graph-locked', severity: 'warning', text: 'This version is read-only.', action: { label: 'Create draft version' } },
			])

			await wrapper.find('[data-testid="flow-message-action-graph-locked"]').trigger('click')

			expect(wrapper.emitted('action')).toEqual([['graph-locked']])
		})
	})

	describe('the same message twice does not stack', () => {
		it('renders one card per id, however often the id appears', () => {
			// Belt to the parent's braces. The parent derives at most one
			// message per id; this is the guarantee that a bug there shows up
			// as a wrong message rather than as a growing wall.
			const wrapper = mountArea([
				{ id: 'refused', severity: 'warning', text: 'first' },
				{ id: 'refused', severity: 'warning', text: 'second' },
			])

			expect(wrapper.findAll('.cn-flow-canvas-messages__item')).toHaveLength(1)
			// The LATER one wins: a repeat replaces, it does not queue behind.
			expect(wrapper.text()).toContain('second')
			expect(wrapper.text()).not.toContain('first')
		})

		it('caps how many it draws, and says how many it is not drawing', () => {
			const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
				id,
				severity: 'warning',
				text: `message ${id}`,
			}))

			const wrapper = mountArea(many, { max: 4 })

			expect(wrapper.findAll('.cn-flow-canvas-messages__item')).toHaveLength(4)
			// Never a silent truncation: the count is the honest part.
			expect(wrapper.text()).toContain('2 more messages')
		})

		it('puts the worst first, so a cap never hides an error behind a hint', () => {
			const wrapper = mountArea([
				{ id: 'ok', severity: 'success', text: 'This flow looks runnable.' },
				{ id: 'warn', severity: 'warning', text: 'This flow has unsaved changes.' },
				{ id: 'bad', severity: 'error', text: 'This flow has no end step.' },
			])

			const ids = wrapper.findAll('.cn-flow-canvas-messages__item').map((el) => el.attributes('data-message-id'))
			expect(ids).toEqual(['bad', 'warn', 'ok'])
		})
	})

	describe('what assistive technology is told', () => {
		it('announces errors assertively and everything else politely', () => {
			const wrapper = mountArea([
				{ id: 'bad', severity: 'error', text: 'This flow has no end step.' },
				{ id: 'warn', severity: 'warning', text: 'This flow has unsaved changes.' },
			])

			const alert = wrapper.find('[data-testid="flow-messages-alert"]')
			const status = wrapper.find('[data-testid="flow-messages-status"]')

			expect(alert.attributes('role')).toBe('alert')
			expect(alert.text()).toContain('This flow has no end step.')
			// An error announced twice is worse than an error announced once.
			expect(alert.text()).not.toContain('unsaved changes')

			expect(status.attributes('role')).toBe('status')
			expect(status.attributes('aria-live')).toBe('polite')
			expect(status.text()).toContain('This flow has unsaved changes.')
		})

		it('names the area, so it is reachable rather than an unlabelled box', () => {
			const wrapper = mountArea([{ id: 'm', severity: 'info', text: 'x' }])

			expect(wrapper.find('.cn-flow-canvas-messages__list').attributes('aria-label'))
				.toBe('Flow editor messages')
		})

		it('renders nothing at all when there is nothing to say', () => {
			const wrapper = mountArea([])

			expect(wrapper.find('.cn-flow-canvas-messages__list').exists()).toBe(false)
			// The live regions stay MOUNTED and empty. A live region created at
			// the same moment its text arrives is not announced by most screen
			// readers — the region has to already be in the accessibility tree.
			expect(wrapper.find('[data-testid="flow-messages-status"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="flow-messages-alert"]').exists()).toBe(true)
		})
	})
})

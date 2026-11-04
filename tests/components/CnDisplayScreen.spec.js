/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDisplayScreen: a full page read from a distance, and an overlay over the app.
 *
 * @spec openspec/changes/display-screen/specs/display-screen/spec.md
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDisplayScreen from '../../src/components/CnDisplayScreen/CnDisplayScreen.vue'

const stubs = {
	Teleport: false,
	NcThemeProvider: { props: ['dark'], template: '<div :data-dark="dark"><slot /></div>' },
}

/**
 * @param {object} [props] The props.
 * @param {object} [slots] The slots.
 * @return {object} The mounted screen.
 */
function mountScreen(props = {}, slots = {}) {
	return mount(CnDisplayScreen, { props: { title: 'Today', ...props }, slots, global: { stubs } })
}

/**
 * @param {string} testid The data-testid.
 * @return {Element|null} The element, wherever it was teleported to.
 */
const inBody = (testid) => document.body.querySelector(`[data-testid="${testid}"]`)

describe('CnDisplayScreen', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		jest.setSystemTime(new Date(2026, 9, 8, 10, 7, 30))
	})

	afterEach(() => {
		jest.useRealTimers()
	})

	it('is the main landmark, with one heading, the rows and the bottom line', () => {
		const w = mountScreen({ subtitle: 'Hall', footer: 'No names.' }, { default: '<ul class="rows" />' })
		expect(w.find('main').exists()).toBe(true)
		expect(w.find('h1').text()).toBe('Today')
		expect(w.find('[data-testid="cn-display-subtitle"]').text()).toBe('Hall')
		expect(w.find('.rows').exists()).toBe(true)
		expect(w.find('[data-testid="cn-display-footer"]').text()).toBe('No names.')
	})

	it('draws no clock, update line or footer unless asked', () => {
		const w = mountScreen()
		expect(w.find('[data-testid="cn-display-clock"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-display-updated"]').exists()).toBe(false)
		expect(w.find('footer').exists()).toBe(false)
	})

	it('keeps time, and stops when it goes away', async () => {
		const w = mountScreen({ clock: true })
		expect(w.find('[data-testid="cn-display-clock"]').text()).toBe('10:07')
		jest.advanceTimersByTime(60000)
		await nextTick()
		expect(w.find('[data-testid="cn-display-clock"]').text()).toBe('10:08')
		w.unmount()
		expect(jest.getTimerCount()).toBe(0)
	})

	it('says when the content was updated', () => {
		const at = new Date(2026, 9, 8, 10, 5).toISOString()
		expect(mountScreen({ updatedAt: at }).find('[data-testid="cn-display-updated"]').text()).toBe('updated at 10:05')
		expect(mountScreen({ updatedAt: at, updatedTemplate: 'bijgewerkt om {time}' }).find('[data-testid="cn-display-updated"]').text()).toBe('bijgewerkt om 10:05')
		expect(mountScreen({ updatedAt: 'not a date' }).find('[data-testid="cn-display-updated"]').exists()).toBe(false)
	})

	it('says the content is old, with the time when it knows it', () => {
		const at = new Date(2026, 9, 8, 10, 5).toISOString()
		const w = mountScreen({ stale: true, updatedAt: at })
		expect(w.find('[data-testid="cn-display-stale"]').attributes('role')).toBe('status')
		expect(w.find('[data-testid="cn-display-stale"]').text()).toContain('10:05')
		expect(mountScreen({ stale: true }).find('[data-testid="cn-display-stale"]').text()).toBe('Cannot reach the server. This may be out of date.')
	})

	it('passes dark on to the theme', () => {
		expect(mountScreen({ dark: true }).find('[data-testid="cn-display-screen"]').attributes('data-dark')).toBe('true')
	})

	it('takes a footer slot and actions', () => {
		const w = mountScreen({}, { footer: '<b class="own" />', actions: '<button class="closes" />' })
		expect(w.find('.own').exists()).toBe(true)
		expect(w.find('.closes').exists()).toBe(true)
	})

	describe('as an overlay', () => {
		let page
		let opener

		beforeEach(() => {
			page = document.createElement('div')
			opener = document.createElement('button')
			page.appendChild(opener)
			document.body.appendChild(page)
			opener.focus()
		})

		afterEach(() => {
			page.remove()
		})

		it('goes to the body as a modal dialog, makes the page inert and takes focus', async () => {
			const w = mountScreen({ overlay: true })
			await nextTick()
			const dialog = inBody('cn-display-screen').querySelector('[role="dialog"]')
			expect(dialog.getAttribute('aria-modal')).toBe('true')
			expect(dialog.getAttribute('aria-label')).toBe('Today')
			expect(page.inert).toBe(true)
			expect(inBody('cn-display-screen').inert).toBeFalsy()
			expect(document.activeElement).toBe(dialog)
			w.unmount()
		})

		it('gives the page and the focus back on unmount', async () => {
			const w = mountScreen({ overlay: true })
			await nextTick()
			w.unmount()
			expect(page.inert).toBe(false)
			expect(document.activeElement).toBe(opener)
			expect(inBody('cn-display-screen')).toBeNull()
		})

		it('leaves an element that was already inert alone', async () => {
			page.inert = true
			const w = mountScreen({ overlay: true })
			await nextTick()
			w.unmount()
			expect(page.inert).toBe(true)
		})

		it('emits close on Escape', async () => {
			const w = mountScreen({ overlay: true })
			await nextTick()
			inBody('cn-display-screen').querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
			expect(w.emitted('close')).toHaveLength(1)
			w.unmount()
		})
	})

	it('ignores Escape when it is a page', async () => {
		const w = mountScreen()
		await w.find('main').trigger('keydown', { key: 'Escape' })
		expect(w.emitted('close')).toBeUndefined()
	})
})

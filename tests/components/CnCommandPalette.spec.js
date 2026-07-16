/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { mount } from '@vue/test-utils'
import CnCommandPalette from '@/components/CnCommandPalette/CnCommandPalette.vue'
import { useCommandPalette } from '@/composables/useCommandPalette.js'
import { createCommandRegistry } from '@/commandPalette/registry.js'

const manifest = {
	menu: [
		{ id: 'home', label: 'Home', route: 'home', icon: 'Home' },
		{ id: 'settings', label: 'Settings', route: 'settings' },
		{ id: 'divider', label: 'Section', type: 'caption' },
		{
			id: 'reports',
			label: 'Reports',
			children: [
				{ id: 'reports-annual', label: 'Annual report', route: 'reports-annual' },
			],
		},
		{ id: 'external', label: 'Docs', href: 'https://example.test/docs' },
	],
}

/** Every wrapper `mountPalette` creates, so `afterEach` can tear them ALL
 * down — each mounted instance attaches its own `document`-level keydown
 * listener, so a leaked wrapper from a previous test would keep firing
 * `onGlobalKeydown` against the (shared) `isOpen` singleton and
 * cross-contaminate the next test's assertions.
 *
 * @type {object[]}
 */
let mountedWrappers = []

/**
 * Mount CnCommandPalette with an isolated command registry (so tests never
 * pollute the shared default singleton) and, by default, already open.
 *
 * @param {object} [propsData] Extra propsData to merge in.
 * @return {{wrapper: object, registry: object, cp: object}} The mounted wrapper + its isolated registry + palette API.
 */
function mountPalette(propsData = {}) {
	const registry = createCommandRegistry()
	const cp = useCommandPalette(registry)
	const wrapper = mount(CnCommandPalette, {
		propsData: { commandRegistry: registry, manifest, ...propsData },
		attachTo: document.body,
	})
	mountedWrappers.push(wrapper)
	return { wrapper, registry, cp }
}

describe('CnCommandPalette', () => {
	afterEach(() => {
		for (const wrapper of mountedWrappers) {
			wrapper.destroy()
		}
		mountedWrappers = []
		// `state.isOpen` is a module-level singleton independent of the
		// registry override — reset it so tests don't leak an "open"
		// palette into the next test file's shared state.
		useCommandPalette().state.isOpen = false
		document.body.innerHTML = ''
	})

	it('renders nothing when closed', () => {
		const { wrapper } = mountPalette()
		expect(wrapper.find('[data-testid="cn-command-palette-dialog"]').exists()).toBe(false)
	})

	it('opens via useCommandPalette().open() and shows the input', async () => {
		const { wrapper, cp } = mountPalette()
		cp.open()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-command-palette-dialog"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-command-palette-input"]').exists()).toBe(true)
	})

	it('opens on Ctrl+<shortcut> and toggles closed on a second press', async () => {
		const { wrapper } = mountPalette()
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isOpen).toBe(true)
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isOpen).toBe(false)
	})

	it('opens on Cmd+<shortcut> (metaKey, macOS)', async () => {
		const { wrapper } = mountPalette()
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isOpen).toBe(true)
	})

	it('does NOT open on the shortcut key alone (no modifier)', async () => {
		const { wrapper } = mountPalette()
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isOpen).toBe(false)
	})

	it('skips the global listener entirely when disableShortcut is set', async () => {
		const { wrapper } = mountPalette({ disableShortcut: true })
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.isOpen).toBe(false)
	})

	it('closes on Escape', async () => {
		const { wrapper, cp } = mountPalette()
		cp.open()
		await wrapper.vm.$nextTick()
		await wrapper.find('[data-testid="cn-command-palette-input"]').trigger('keydown', { key: 'Escape' })
		expect(wrapper.vm.isOpen).toBe(false)
	})

	it('builds navigation results from manifest.menu (flattened, captions excluded)', async () => {
		const { wrapper, cp } = mountPalette()
		cp.open()
		await wrapper.vm.$nextTick()
		const titles = wrapper.vm.navigationItems.map((i) => i.title)
		expect(titles).toEqual(expect.arrayContaining(['Home', 'Settings', 'Annual report', 'Docs']))
		expect(titles).not.toContain('Section') // caption entries are skipped
	})

	it('navigates via the router for a route entry, and window.open for an href entry', async () => {
		const push = jest.fn()
		const { wrapper, cp } = mountPalette({ router: { push } })
		cp.open()
		await wrapper.vm.$nextTick()

		const windowOpen = jest.spyOn(window, 'open').mockImplementation(() => {})

		wrapper.vm.navigateTo({ route: 'settings' })
		expect(push).toHaveBeenCalledWith({ name: 'settings' })

		wrapper.vm.navigateTo({ href: 'https://example.test/docs' })
		expect(windowOpen).toHaveBeenCalledWith('https://example.test/docs', '_blank', 'noopener')

		windowOpen.mockRestore()
	})

	it('surfaces registered action commands and ranks them alongside navigation', async () => {
		const { wrapper, cp } = mountPalette()
		const run = jest.fn()
		cp.register({ id: 'create-thing', title: 'Create thing', section: 'Actions', run })
		cp.open()
		await wrapper.vm.$nextTick()
		wrapper.vm.query = 'create'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.flatResults.map((r) => r.item.id)).toContain('create-thing')
	})

	it('keyboard flow: ArrowDown/ArrowUp move the active option, Enter activates it and closes', async () => {
		const { wrapper, cp } = mountPalette()
		const run = jest.fn()
		cp.register({ id: 'only-command', title: 'Only command', run })
		cp.open()
		await wrapper.vm.$nextTick()
		wrapper.vm.query = 'only'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.flatResults).toHaveLength(1)
		expect(wrapper.vm.activeId).toBe('only-command')

		const input = wrapper.find('[data-testid="cn-command-palette-input"]')
		await input.trigger('keydown', { key: 'ArrowDown' }) // clamped — stays on the only result
		expect(wrapper.vm.activeId).toBe('only-command')
		await input.trigger('keydown', { key: 'Enter' })
		expect(wrapper.vm.isOpen).toBe(false)
		await wrapper.vm.$nextTick()
		expect(run).toHaveBeenCalled()
	})

	it('moves between multiple results with ArrowDown/ArrowUp without wrapping', async () => {
		const { wrapper, cp } = mountPalette()
		cp.register({ id: 'zq-first', title: 'Zq First', run: () => {} })
		cp.register({ id: 'zq-second', title: 'Zq Second', run: () => {} })
		cp.open()
		await wrapper.vm.$nextTick()
		wrapper.vm.query = 'zq'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.flatResults.map((r) => r.item.id)).toEqual(['zq-first', 'zq-second'])
		expect(wrapper.vm.activeId).toBe('zq-first')

		const input = wrapper.find('[data-testid="cn-command-palette-input"]')
		await input.trigger('keydown', { key: 'ArrowDown' })
		expect(wrapper.vm.activeId).toBe('zq-second')
		await input.trigger('keydown', { key: 'ArrowDown' }) // clamps at the end
		expect(wrapper.vm.activeId).toBe('zq-second')
		await input.trigger('keydown', { key: 'ArrowUp' })
		expect(wrapper.vm.activeId).toBe('zq-first')
	})

	it('activating a result via click emits select and runs it', async () => {
		const { wrapper, cp } = mountPalette()
		const run = jest.fn()
		cp.register({ id: 'clickable', title: 'Clickable', run })
		cp.open()
		await wrapper.vm.$nextTick()
		wrapper.vm.query = 'click'
		await wrapper.vm.$nextTick()
		await wrapper.find('[data-testid="cn-command-palette-option"]').trigger('click')
		expect(wrapper.emitted('select')).toBeTruthy()
		expect(wrapper.emitted('select')[0][0].id).toBe('clickable')
		await wrapper.vm.$nextTick()
		expect(run).toHaveBeenCalled()
	})

	it('restores focus to the previously focused element on close', async () => {
		const trigger = document.createElement('button')
		document.body.appendChild(trigger)
		trigger.focus()
		expect(document.activeElement).toBe(trigger)

		const { wrapper, cp } = mountPalette()
		cp.open()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick() // input.focus() happens on a nested $nextTick
		expect(document.activeElement).toBe(wrapper.find('[data-testid="cn-command-palette-input"]').element)

		cp.close()
		await wrapper.vm.$nextTick()
		expect(document.activeElement).toBe(trigger)
		trigger.remove()
	})

	describe('objects source (objectSearch prop)', () => {
		beforeEach(() => {
			jest.useFakeTimers()
		})

		afterEach(() => {
			jest.useRealTimers()
		})

		it('debounces objectSearch and only calls it once after typing settles', async () => {
			const objectSearch = jest.fn().mockResolvedValue([])
			const { wrapper, cp } = mountPalette({ objectSearch, objectSearchDebounce: 200 })
			cp.open()
			await wrapper.vm.$nextTick()

			wrapper.vm.query = 'a'
			await wrapper.vm.$nextTick()
			jest.advanceTimersByTime(50)
			wrapper.vm.query = 'ab'
			await wrapper.vm.$nextTick()
			jest.advanceTimersByTime(50)
			wrapper.vm.query = 'abc'
			await wrapper.vm.$nextTick()

			expect(objectSearch).not.toHaveBeenCalled()
			jest.advanceTimersByTime(200)
			await Promise.resolve()

			expect(objectSearch).toHaveBeenCalledTimes(1)
			expect(objectSearch).toHaveBeenCalledWith('abc')
		})

		it('never blocks navigation/action results while an object search is in flight', async () => {
			let resolveSearch
			const objectSearch = jest.fn(() => new Promise((resolve) => { resolveSearch = resolve }))
			const { wrapper, cp } = mountPalette({ objectSearch })
			cp.register({ id: 'settings-action', title: 'Settings action', run: () => {} })
			cp.open()
			await wrapper.vm.$nextTick()

			wrapper.vm.query = 'settings'
			await wrapper.vm.$nextTick()
			jest.advanceTimersByTime(200)
			await Promise.resolve()

			// Navigation ("Settings" page) + the action are visible immediately,
			// even though the object search promise never resolved yet.
			const ids = wrapper.vm.flatResults.map((r) => r.item.id)
			expect(ids.some((id) => id.startsWith('nav:'))).toBe(true)
			expect(ids).toContain('settings-action')

			resolveSearch([])
		})

		it('discards object results that arrive for a stale (already-changed) query', async () => {
			let firstResolve
			const objectSearch = jest.fn()
				.mockImplementationOnce(() => new Promise((resolve) => { firstResolve = resolve }))
				.mockImplementationOnce(() => Promise.resolve([
					{ id: 'obj:2', title: 'Second query result', section: 'Objects', run: () => {} },
				]))
			const { wrapper, cp } = mountPalette({ objectSearch })
			cp.open()
			await wrapper.vm.$nextTick()

			wrapper.vm.query = 'first'
			await wrapper.vm.$nextTick()
			jest.advanceTimersByTime(200)
			await Promise.resolve()

			wrapper.vm.query = 'second'
			await wrapper.vm.$nextTick()
			jest.advanceTimersByTime(200)
			await Promise.resolve()
			await Promise.resolve()

			// The stale first search resolves AFTER the second one already won.
			firstResolve([{ id: 'obj:1', title: 'First query result (stale)', section: 'Objects', run: () => {} }])
			await Promise.resolve()
			await Promise.resolve()

			const ids = wrapper.vm.objectResults.map((r) => r.id)
			expect(ids).not.toContain('obj:1')
		})
	})
})

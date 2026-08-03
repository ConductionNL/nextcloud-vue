/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import CnTabs from '../../src/components/CnTabs/CnTabs.vue'
import CnTab from '../../src/components/CnTabs/CnTab.vue'
import { CN_TABS_INJECTION_KEY } from '../../src/components/CnTabs/tabsKey.js'

/**
 * Mount a strip of plain-titled tabs.
 *
 * Awaits a tick before returning: children register in `onMounted`, and the
 * resulting push onto the parent's reactive list schedules the nav strip's
 * re-render on the microtask queue. A synchronous read finds zero nav buttons —
 * and `findAll()` returning an empty list makes a `forEach`-shaped assertion
 * pass vacuously, so this is not a failure that announces itself.
 *
 * @param {Array<object>} tabs Per-tab props, e.g. `{ title, active, disabled }`.
 * @param {object} [stripProps] Props for the CnTabs strip itself.
 *
 * @return {Promise<object>} The mounted wrapper.
 */
async function mountStrip(tabs, stripProps = {}) {
	const wrapper = mount(defineComponent({
		components: { CnTabs, CnTab },
		setup() {
			return { tabs, stripProps }
		},
		render() {
			return h(CnTabs, this.stripProps, {
				default: () => this.tabs.map((t, i) => h(CnTab, { ...t, key: i }, {
					default: () => `panel ${i}`,
				})),
			})
		},
	}), { attachTo: document.body })
	await nextTick()
	return wrapper
}

/**
 * Read the nav buttons of a mounted strip.
 *
 * @param {object} wrapper Mounted wrapper.
 *
 * @return {Array<object>} Button wrappers.
 */
const navButtons = (wrapper) => wrapper.findAll('.cn-tabs__nav-item')

/**
 * Read the panels of a mounted strip.
 *
 * @param {object} wrapper Mounted wrapper.
 *
 * @return {Array<object>} Panel wrappers.
 */
const panels = (wrapper) => wrapper.findAll('[role="tabpanel"]')

describe('CnTabs / CnTab', () => {
	it('renders one nav button per child, in document order', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two' }, { title: 'Three' }])
		expect(navButtons(w)).toHaveLength(3)
		expect(navButtons(w).map((b) => b.text())).toEqual(['One', 'Two', 'Three'])
	})

	it('selects the first tab when none declares itself active', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
		expect(navButtons(w)[0].attributes('aria-selected')).toBe('true')
		expect(navButtons(w)[1].attributes('aria-selected')).toBe('false')
	})

	it('honours an `active` tab that is not the first', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two', active: true }])
		expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')
	})

	it('shows only the selected panel, but keeps the others mounted', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
		// Both panels exist in the DOM — a `v-if` implementation would destroy
		// the inactive one and refire its mounted() fetch on every switch.
		expect(panels(w)).toHaveLength(2)
		expect(panels(w)[1].attributes('hidden')).toBeDefined()

		await navButtons(w)[1].trigger('click')
		expect(panels(w)).toHaveLength(2)
		expect(panels(w)[0].attributes('hidden')).toBeDefined()
		expect(panels(w)[1].attributes('hidden')).toBeUndefined()
	})

	it('switches on click and emits the new index', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
		await navButtons(w)[1].trigger('click')
		expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')
		expect(w.findComponent(CnTabs).emitted('update:activeIndex')).toEqual([[1]])
	})

	it('re-emits nothing when the already-active tab is clicked', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
		await navButtons(w)[0].trigger('click')
		expect(w.findComponent(CnTabs).emitted('update:activeIndex')).toBeUndefined()
	})

	it('emits `click` on the tab the user activated', async () => {
		const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
		await navButtons(w)[1].trigger('click')
		expect(w.findAllComponents(CnTab)[1].emitted('click')).toHaveLength(1)
	})

	it('follows a later change to a tab\'s `active` prop', async () => {
		const selected = ref(0)
		const w = mount(defineComponent({
			components: { CnTabs, CnTab },
			setup() {
				return { selected }
			},
			render() {
				return h(CnTabs, null, {
					default: () => [0, 1, 2].map((i) => h(CnTab, {
						key: i,
						title: `T${i}`,
						active: this.selected === i,
					})),
				})
			},
		}))

		selected.value = 2
		await nextTick()
		expect(navButtons(w)[2].attributes('aria-selected')).toBe('true')
	})

	it('renders a #title slot inside the nav strip', async () => {
		const w = mount(defineComponent({
			components: { CnTabs, CnTab },
			render() {
				return h(CnTabs, null, {
					default: () => [
						h(CnTab, null, { title: () => h('span', { class: 'rich' }, 'Rich'), default: () => 'p' }),
					],
				})
			},
		}))
		await nextTick()
		expect(w.find('.cn-tabs__nav-item .rich').text()).toBe('Rich')
	})

	it('moves the selection to a neighbour when the active tab unmounts', async () => {
		const shown = ref([0, 1, 2])
		const w = mount(defineComponent({
			components: { CnTabs, CnTab },
			setup() {
				return { shown }
			},
			render() {
				return h(CnTabs, null, {
					default: () => this.shown.map((i) => h(CnTab, {
						key: i,
						title: `T${i}`,
						active: i === 1,
					})),
				})
			},
		}))
		await nextTick()
		expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')

		shown.value = [0, 2]
		await nextTick()

		// Exactly one tab must still be selected — a closable tab that leaves the
		// strip with nothing selected is the bug this guards.
		const selected = navButtons(w).filter((b) => b.attributes('aria-selected') === 'true')
		expect(selected).toHaveLength(1)
	})

	describe('accessibility (WAI-ARIA tabs pattern)', () => {
		it('wires role, aria-controls and aria-labelledby both ways', async () => {
			const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
			expect(w.find('[role="tablist"]').exists()).toBe(true)
			// Guard against the vacuous pass: forEach over an empty findAll()
			// asserts nothing.
			expect(navButtons(w)).toHaveLength(2)

			navButtons(w).forEach((button, i) => {
				const panel = panels(w)[i]
				expect(button.attributes('role')).toBe('tab')
				expect(button.attributes('aria-controls')).toBe(panel.attributes('id'))
				expect(panel.attributes('aria-labelledby')).toBe(button.attributes('id'))
			})
		})

		it('applies the aria-label to the tablist', async () => {
			const w = await mountStrip([{ title: 'One' }], { ariaLabel: 'Case details' })
			expect(w.find('[role="tablist"]').attributes('aria-label')).toBe('Case details')
		})

		it('keeps only the selected tab in the tab order (roving tabindex)', async () => {
			const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
			expect(navButtons(w).map((b) => b.attributes('tabindex'))).toEqual(['0', '-1'])

			await navButtons(w)[1].trigger('click')
			expect(navButtons(w).map((b) => b.attributes('tabindex'))).toEqual(['-1', '0'])
		})

		it('navigates with ArrowRight / ArrowLeft / Home / End', async () => {
			const w = await mountStrip([{ title: 'One' }, { title: 'Two' }, { title: 'Three' }])
			const list = w.find('[role="tablist"]')

			await list.trigger('keydown', { key: 'ArrowRight' })
			expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')

			await list.trigger('keydown', { key: 'End' })
			expect(navButtons(w)[2].attributes('aria-selected')).toBe('true')

			await list.trigger('keydown', { key: 'ArrowLeft' })
			expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')

			await list.trigger('keydown', { key: 'Home' })
			expect(navButtons(w)[0].attributes('aria-selected')).toBe('true')
		})

		it('wraps around at both ends', async () => {
			const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
			const list = w.find('[role="tablist"]')

			await list.trigger('keydown', { key: 'ArrowLeft' })
			expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')

			await list.trigger('keydown', { key: 'ArrowRight' })
			expect(navButtons(w)[0].attributes('aria-selected')).toBe('true')
		})

		it('leaves unrelated keys alone', async () => {
			const w = await mountStrip([{ title: 'One' }, { title: 'Two' }])
			await w.find('[role="tablist"]').trigger('keydown', { key: 'a' })
			expect(navButtons(w)[0].attributes('aria-selected')).toBe('true')
		})
	})

	describe('disabled tabs', () => {
		it('never takes the initial selection', async () => {
			const w = await mountStrip([{ title: 'One', disabled: true }, { title: 'Two' }])
			expect(navButtons(w)[1].attributes('aria-selected')).toBe('true')
		})

		it('is skipped by keyboard navigation', async () => {
			const w = await mountStrip([{ title: 'One' }, { title: 'Two', disabled: true }, { title: 'Three' }])
			await w.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
			expect(navButtons(w)[2].attributes('aria-selected')).toBe('true')
		})
	})

	describe('parentless CnTab', () => {
		it('shows its content instead of rendering blank', () => {
			// The realistic cause of a missed inject() is the package being loaded
			// twice (ADR-019). Vanishing silently is the worse failure, so a
			// parentless panel is visible.
			const w = mount(CnTab, { props: { title: 'Lonely' }, slots: { default: 'body' } })
			expect(w.attributes('hidden')).toBeUndefined()
			expect(w.text()).toContain('body')
		})
	})

	describe('injection key', () => {
		it('is registered globally so a duplicated package still resolves', () => {
			// Symbol.for, not Symbol: two copies of this module must agree, or
			// every CnTab silently decides it has no parent.
			expect(CN_TABS_INJECTION_KEY).toBe(Symbol.for('cn:tabs'))
		})
	})
})

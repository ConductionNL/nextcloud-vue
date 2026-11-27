/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/widget-placeholder-shape/tasks.md#task-6
 */
import { flushPromises, mount } from '@vue/test-utils'
import { widgetLoaded } from '../../src/mixins/widgetLoaded.js'

/**
 * A renderer that loads when told to.
 *
 * @param {object} options `initial` loading value and whether it starts a load on mount.
 * @return {object} The component.
 */
function renderer({ initial = false, fetchOnMount = true } = {}) {
	return {
		name: 'TestRenderer',
		mixins: [widgetLoaded],
		data: () => ({ loading: initial }),
		mounted() {
			if (fetchOnMount) {
				this.loading = true
			}
		},
		methods: {
			settle() {
				this.loading = false
			},
			refresh() {
				this.loading = true
			},
		},
		template: '<div />',
	}
}

describe('widgetLoaded', () => {
	it('emits loaded once, when the first load settles', async () => {
		const wrapper = mount(renderer())
		await flushPromises()
		expect(wrapper.emitted('loaded')).toBeUndefined()
		wrapper.vm.settle()
		await flushPromises()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('a later load stays silent', async () => {
		const wrapper = mount(renderer())
		await flushPromises()
		wrapper.vm.settle()
		await flushPromises()
		wrapper.vm.refresh()
		await flushPromises()
		wrapper.vm.settle()
		await flushPromises()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('a renderer loading from its first state counts that load', async () => {
		const wrapper = mount(renderer({ initial: true, fetchOnMount: false }))
		await flushPromises()
		expect(wrapper.emitted('loaded')).toBeUndefined()
		wrapper.vm.settle()
		await flushPromises()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})

	it('a renderer with nothing to fetch is loaded with its first render', async () => {
		const wrapper = mount(renderer({ fetchOnMount: false }))
		await flushPromises()
		expect(wrapper.emitted('loaded')).toHaveLength(1)
	})
})

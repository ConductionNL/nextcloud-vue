/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import { declaredPropNames, pickDeclaredProps } from '../../src/utils/declaredProps.js'
import { lazyComponent, loadLazyComponent, resolveLazyComponent } from '../../src/utils/lazyComponent.js'

const Target = defineComponent({
	name: 'Target',
	props: { label: { type: String, default: '' } },
	emits: ['ping'],
	setup(props, { slots, emit, expose }) {
		expose({ shout: () => `${props.label}!` })
		return () => h('button', { class: 'target', onClick: () => emit('ping', props.label) }, [props.label, slots.default ? slots.default() : null])
	},
})

describe('lazyComponent', () => {
	it('renders nothing until the module loads, then the component with attributes, listeners and slots', async () => {
		const Lazy = lazyComponent(() => Promise.resolve({ default: Target }), 'Target')
		const onPing = jest.fn()
		const w = mount(Lazy, { attrs: { label: 'Hi', class: 'extra', onPing }, slots: { default: () => ' there' } })
		expect(w.find('.target').exists()).toBe(false)
		await flushPromises()
		const button = w.find('.target')
		expect(button.text()).toBe('Hi there')
		expect(button.classes()).toContain('extra')
		await button.trigger('click')
		expect(onPing).toHaveBeenCalledWith('Hi')
	})

	it('is named after the component it loads', () => {
		expect(lazyComponent(() => Promise.resolve(Target), 'Target').name).toBe('LazyTarget')
	})

	it('loads once however often it is rendered or loaded', async () => {
		const loader = jest.fn(() => Promise.resolve(Target))
		const Lazy = lazyComponent(loader)
		mount(Lazy)
		mount(Lazy)
		await Promise.all([loadLazyComponent(Lazy), loadLazyComponent(Lazy)])
		expect(loader).toHaveBeenCalledTimes(1)
		expect(await loadLazyComponent(Lazy)).toBe(Target)
	})

	it('lets a template ref reach the loaded component', async () => {
		const Lazy = lazyComponent(() => Promise.resolve(Target))
		const Host = defineComponent({
			setup() {
				const child = ref(null)
				return { child }
			},
			render() {
				return h(Lazy, { ref: 'child', label: 'Hey' })
			},
		})
		const w = mount(Host)
		await flushPromises()
		expect('shout' in w.vm.$refs.child).toBe(true)
		expect(w.vm.$refs.child.shout()).toBe('Hey!')
	})

	it('makes a computed over the declared props follow the load', async () => {
		const Lazy = lazyComponent(() => Promise.resolve(Target))
		const declared = computed(() => declaredPropNames(Lazy))
		expect(declared.value).toBeNull()
		expect(pickDeclaredProps(Lazy, { label: 'a', other: 'b' }, 'x')).toEqual({ label: 'a', other: 'b' })
		await loadLazyComponent(Lazy)
		expect([...declared.value]).toEqual(['label'])
		expect(pickDeclaredProps(Lazy, { label: 'a', other: 'b' }, 'x')).toEqual({ label: 'a' })
	})

	it('resolves to the definition once loaded and passes any other component through', async () => {
		const Lazy = lazyComponent(() => Promise.resolve({ default: Target }))
		expect(resolveLazyComponent(Lazy)).toBeNull()
		await loadLazyComponent(Lazy)
		expect(resolveLazyComponent(Lazy)).toBe(Target)
		expect(resolveLazyComponent(Target)).toBe(Target)
		expect(resolveLazyComponent(null)).toBeNull()
		expect(await loadLazyComponent(Target)).toBe(Target)
	})

	it('reports a failed load and tries again on the next one', async () => {
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		const loader = jest.fn()
			.mockImplementationOnce(() => Promise.reject(new Error('offline')))
			.mockImplementation(() => Promise.resolve(Target))
		const Lazy = lazyComponent(loader, 'Target')
		expect(await loadLazyComponent(Lazy)).toBeNull()
		expect(error).toHaveBeenCalled()
		expect(await loadLazyComponent(Lazy)).toBe(Target)
		expect(loader).toHaveBeenCalledTimes(2)
		error.mockRestore()
	})
})

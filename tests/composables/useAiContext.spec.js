/**
 * Tests for useAiContext() composable.
 *
 * Covers:
 * - Default object returned when no CnAppRoot ancestor provides cnAiContext
 * - Injected reactive reference returned when a provider exists
 * - Reactive watcher fires when a field is overwritten
 */

const Vue = require('vue').default || require('vue')
const { useAiContext, defaultContext } = require('../../src/composables/useAiContext.js')

describe('useAiContext', () => {
	it('returns default object when called with null instance (no CnAppRoot ancestor)', () => {
		const ctx = useAiContext(null)
		expect(ctx).toBeDefined()
		expect(ctx.appId).toBe('unknown')
		expect(ctx.pageKind).toBe('custom')
		expect(ctx.route).toBeDefined()
		expect(ctx.route.path).toBe('')
	})

	it('does not throw when called with no argument', () => {
		expect(() => useAiContext()).not.toThrow()
		const ctx = useAiContext()
		expect(ctx).toBeDefined()
	})

	it('returns the injected cnAiContext when the instance has one', () => {
		const provided = Vue.observable({ appId: 'opencatalogi', pageKind: 'custom', route: { path: '/' } })
		// Simulate an instance that has the injected value
		const fakeInstance = { cnAiContext: provided }
		const ctx = useAiContext(fakeInstance)
		expect(ctx).toBe(provided)
		expect(ctx.appId).toBe('opencatalogi')
	})

	it('returns the live reactive reference (not a snapshot)', () => {
		const provided = Vue.observable({ appId: 'opencatalogi', pageKind: 'custom', route: { path: '/' } })
		const fakeInstance = { cnAiContext: provided }
		const ctx = useAiContext(fakeInstance)
		// Mutate the provided object
		provided.pageKind = 'detail'
		// ctx should reflect the mutation (same reference)
		expect(ctx.pageKind).toBe('detail')
	})

	it('reactive watcher fires when a field is overwritten', async () => {
		const provided = Vue.observable({ appId: 'test', pageKind: 'custom', route: { path: '' } })
		const fakeInstance = { cnAiContext: provided }
		const ctx = useAiContext(fakeInstance)

		const observed = []
		const vm = new Vue({
			data() { return { context: ctx } },
			watch: {
				'context.pageKind': function(val) {
					observed.push(val)
				},
			},
		})

		// Trigger the reactive mutation
		provided.pageKind = 'index'

		// Let Vue flush the watcher queue
		await Vue.nextTick()

		expect(observed).toContain('index')
		vm.$destroy()
	})

	it('returns stable module-level default object across multiple calls without instance', () => {
		const ctx1 = useAiContext(null)
		const ctx2 = useAiContext(null)
		expect(ctx1).toBe(ctx2)
	})
})

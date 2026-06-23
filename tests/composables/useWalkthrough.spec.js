/**
 * Tests for useWalkthrough — abstract product walkthrough engine (ADR-043).
 */

const {
	useWalkthrough,
	compareSemver,
	interpolateTokens,
	__resetWalkthroughCacheForTests,
} = require('../../src/composables/useWalkthrough.js')

function manifest(steps, opts = {}) {
	return {
		version: opts.version || '1.0.0',
		walkthrough: {
			enabled: true,
			version: 1,
			tours: [{
				id: 'getting-started',
				trigger: opts.trigger || 'first-visit',
				steps,
			}],
		},
	}
}

const baseSteps = [
	{ id: 'welcome', sinceVersion: '1.0.0', placement: 'center', target: { kind: 'page', ref: 'Products' }, advanceOn: { type: 'manual' } },
	{ id: 'make-product', sinceVersion: '1.0.0', body: 'Open {{productId}}', target: { kind: 'element', ref: 'add' }, advanceOn: { type: 'object-created', register: 'pipelinq', schema: 'product', capture: { productId: ':id' } } },
	{ id: 'open-lead', sinceVersion: '1.0.0', target: { kind: 'page', ref: 'LeadDetail' }, advanceOn: { type: 'route-match', route: 'LeadDetail', capture: { leadId: ':id' } } },
]

describe('useWalkthrough', () => {
	beforeEach(() => __resetWalkthroughCacheForTests())

	it('compareSemver orders versions', () => {
		expect(compareSemver('1.0.0', '1.1.0')).toBe(-1)
		expect(compareSemver('1.2.0', '1.1.9')).toBe(1)
		expect(compareSemver('1.0', '1.0.0')).toBe(0)
	})

	it('interpolateTokens replaces known keys and leaves unknown', () => {
		expect(interpolateTokens('Open {{id}}', { id: '42' })).toBe('Open 42')
		expect(interpolateTokens('Open {{missing}}', {})).toBe('Open {{missing}}')
	})

	it('a fresh user gets all steps <= app version', () => {
		const wt = useWalkthrough('pq', manifest(baseSteps))
		wt.start('getting-started')
		expect(wt.activeTour.value.steps.map((s) => s.id)).toEqual(['welcome', 'make-product', 'open-lead'])
	})

	it('an upgrade surfaces only newer steps (what is new)', () => {
		const steps = [
			{ id: 'old', sinceVersion: '1.0.0', target: { kind: 'page', ref: 'A' }, advanceOn: { type: 'manual' } },
			{ id: 'new', sinceVersion: '1.1.0', target: { kind: 'page', ref: 'B' }, advanceOn: { type: 'manual' } },
		]
		const wt = useWalkthrough('pq2', manifest(steps, { version: '1.1.0', trigger: 'version-bump' }), { seenVersion: '1.0.0' })
		expect(wt.autoStartTour.value).toBeTruthy()
		wt.start('getting-started')
		expect(wt.activeTour.value.steps.map((s) => s.id)).toEqual(['new'])
	})

	it('restart replays the FULL tour for a returning user (ignores seenVersion)', () => {
		// A returning user whose seenVersion already covers every step's
		// sinceVersion: a normal start() composes an empty step set, but the
		// "Restart tutorial" entry (restart()) must show the whole tour.
		const wt = useWalkthrough('pq-replay', manifest(baseSteps), { seenVersion: '1.0.0' })
		wt.start('getting-started')
		expect(wt.activeTour.value.steps).toEqual([]) // filtered out by seenVersion
		wt.restart('getting-started')
		expect(wt.running.value).toBe(true)
		expect(wt.replaying.value).toBe(true)
		expect(wt.activeTour.value.steps.map((s) => s.id)).toEqual(['welcome', 'make-product', 'open-lead'])
		// dismissing clears replay mode so the version filter applies again
		wt.dismiss()
		expect(wt.replaying.value).toBe(false)
	})

	it('does not auto-start a version-bump tour with an empty delta', () => {
		const steps = [{ id: 'old', sinceVersion: '1.0.0', target: { kind: 'page', ref: 'A' }, advanceOn: { type: 'manual' } }]
		const wt = useWalkthrough('pq3', manifest(steps, { version: '1.0.0', trigger: 'version-bump' }), { seenVersion: '1.0.0' })
		expect(wt.autoStartTour.value).toBeNull()
	})

	it('object-created advances and captures the id, interpolated into the next step', () => {
		const wt = useWalkthrough('pq4', manifest(baseSteps))
		wt.start('getting-started')
		wt.next() // welcome → make-product
		const advanced = wt.notify({ kind: 'object-created', object: { '@self': { register: 'pipelinq', schema: 'product', id: '42' } } })
		expect(advanced).toBe(true)
		expect(wt.context.value.productId).toBe('42')
		// the make-product body referenced {{productId}}; check interpolation helper output
		expect(wt.interpolate('Open {{productId}}')).toBe('Open 42')
	})

	it('route-match advances and captures the route param', () => {
		const wt = useWalkthrough('pq5', manifest(baseSteps))
		wt.start('getting-started', 2) // open-lead step
		const advanced = wt.notify({ kind: 'route', route: 'LeadDetail', params: { id: '7' } })
		expect(advanced).toBe(true)
		expect(wt.context.value.leadId).toBe('7')
	})

	it('a non-matching signal does not advance', () => {
		const wt = useWalkthrough('pq6', manifest(baseSteps))
		wt.start('getting-started', 2)
		expect(wt.notify({ kind: 'route', route: 'SomethingElse', params: {} })).toBe(false)
	})

	it('complete() invokes onComplete with the app version', () => {
		const onComplete = jest.fn()
		const wt = useWalkthrough('pq7', manifest(baseSteps), { onComplete })
		wt.start('getting-started', 2)
		wt.next() // last step → complete
		expect(onComplete).toHaveBeenCalledWith('1.0.0')
		expect(wt.running.value).toBe(false)
	})

	it('resume token starts at the given step', () => {
		const wt = useWalkthrough('pq8', manifest(baseSteps), { resume: { tourId: 'getting-started', stepId: 'open-lead' } })
		expect(wt.running.value).toBe(true)
		expect(wt.currentStep.value.id).toBe('open-lead')
	})
})

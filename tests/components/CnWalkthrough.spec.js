/**
 * Tests for CnWalkthrough — abstract product walkthrough overlay (ADR-043).
 */

const { mount } = require('@vue/test-utils')
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

function manifest(steps) {
	return {
		version: '1.0.0',
		walkthrough: { enabled: true, version: 1, tours: [{ id: 'getting-started', trigger: 'first-visit', steps }] },
	}
}

const steps = [
	{ id: 'welcome', sinceVersion: '1.0.0', placement: 'center', title: 'Welcome', body: 'Hi', target: { kind: 'page', ref: 'X' }, advanceOn: { type: 'manual' } },
	{ id: 'click-it', sinceVersion: '1.0.0', title: 'Do it', task: 'Press the button', target: { kind: 'element', ref: 'btn' }, advanceOn: { type: 'click-target' } },
	{ id: 'done', sinceVersion: '1.0.0', title: 'Done', target: { kind: 'page', ref: 'X' }, advanceOn: { type: 'manual' } },
]

function factory() {
	return mount(CnWalkthrough, { propsData: { appId: 'pq', manifest: manifest(steps) } })
}

describe('CnWalkthrough', () => {
	beforeEach(() => __resetWalkthroughCacheForTests())

	it('auto-starts the first-visit tour and renders the centered welcome coachmark', async () => {
		const w = factory()
		await w.vm.$nextTick()
		expect(w.vm.active).toBe(true)
		expect(w.vm.step.id).toBe('welcome')
		expect(w.find('.cn-walkthrough__dim--full').exists()).toBe(true) // centered → full dimmer, no cutout
		expect(w.text()).toContain('Welcome')
		expect(w.text()).toContain('1 / 3')
	})

	it('computes four framing strips around a target rect (cutout, not z-index)', () => {
		const w = factory()
		w.vm.wt.next() // → click-it (anchored)
		w.vm.rect = { top: 100, left: 100, width: 50, height: 20 }
		const s = w.vm.strip
		expect(s.top.height).toBe('94px') // 100 - 6 pad
		expect(s.left.width).toBe('94px')
		expect(s.right.left).toBe('156px') // 100 + 50 + 6
	})

	it('hides Next on an enforced action step (task + non-manual advance)', async () => {
		const w = factory()
		w.vm.wt.next() // → click-it: has task + click-target advance, no allowManualNext
		await w.vm.$nextTick()
		expect(w.vm.showNext).toBe(false)
		expect(w.text()).toContain('Press the button')
	})

	it('shows the manual Next escape hatch when allowManualNext is set', async () => {
		const custom = manifest([{ ...steps[1], allowManualNext: true }])
		const w = mount(CnWalkthrough, { propsData: { appId: 'pq-esc', manifest: custom } })
		await w.vm.$nextTick()
		expect(w.vm.showNext).toBe(true)
	})

	it('a click-target signal advances the tour', () => {
		const w = factory()
		w.vm.wt.next() // → click-it
		w.vm.wt.notify({ kind: 'click' })
		expect(w.vm.step.id).toBe('done')
	})

	it('emits dismiss + complete handler on backdrop/ESC', () => {
		const w = factory()
		w.vm.onBackdrop()
		expect(w.emitted('dismiss')).toBeTruthy()
		expect(w.vm.wt.running.value).toBe(false)
	})

	it('exposes an aria-live step announcement', async () => {
		const w = factory()
		await w.vm.$nextTick()
		expect(w.find('.cn-walkthrough__live').attributes('aria-live')).toBe('polite')
		expect(w.find('.cn-walkthrough__live').text()).toContain('Welcome')
	})

	it('falls back to a centered coachmark when the target is present but zero-size (collapsed nav)', () => {
		const w = factory()
		w.vm.wt.next() // → click-it (anchored)
		w.vm.targetEl = { getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }) }
		w.vm.computeRect()
		expect(w.vm.rect).toBeNull() // no point-sized cutout
		w.vm.targetEl = { getBoundingClientRect: () => ({ top: 50, left: 60, width: 120, height: 30 }) }
		w.vm.computeRect()
		expect(w.vm.rect).toEqual({ top: 50, left: 60, width: 120, height: 30 })
	})

	it('a handoff step shows "Continue in {app}" and navigates with a resume token', () => {
		const manifestH = {
			version: '1.0.0',
			walkthrough: { enabled: true, version: 1, tours: [{ id: 'pq:lead-to-bill', trigger: 'first-visit', steps: [
				{ id: 'bill', sinceVersion: '1.0.0', placement: 'center', title: 'Bill it', target: { kind: 'page', ref: 'X' }, advanceOn: { type: 'manual' }, handoff: { app: 'Shillinq', url: '/index.php/apps/shillinq/', tour: 'shillinq:bill' } },
			] }] },
		}
		const w = mount(CnWalkthrough, { propsData: { appId: 'pq', manifest: manifestH } })
		expect(w.vm.isHandoff).toBe(true)
		const built = []
		// stub navigation by spying on the emitted handoff payload (engine also sets window.location)
		w.vm.$on('handoff', (p) => built.push(p))
		w.vm.doHandoff()
		expect(built[0].app).toBe('Shillinq')
		expect(built[0].url).toContain('cn_resume_tour=shillinq%3Abill')
	})

	it('does not render when the manifest has no walkthrough', () => {
		const w = mount(CnWalkthrough, { propsData: { appId: 'empty', manifest: { version: '1.0.0' } } })
		expect(w.vm.active).toBe(false)
		expect(w.find('.cn-walkthrough').exists()).toBe(false)
	})
})

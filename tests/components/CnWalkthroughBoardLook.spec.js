/**
 * The walkthrough coachmark under the board look (board DqRondleiding).
 *
 * @spec openspec/changes/walkthrough-board-coachmark/specs/walkthrough-board-coachmark/spec.md
 */

const { mount } = require('@vue/test-utils')
const CnWalkthrough = require('../../src/components/CnWalkthrough/CnWalkthrough.vue').default
const { __resetWalkthroughCacheForTests } = require('../../src/composables/useWalkthrough.js')

const steps = [
	{ id: 'welcome', sinceVersion: '1.0.0', placement: 'center', title: 'Welcome', body: 'Hi', target: { kind: 'page', ref: 'X' }, advanceOn: { type: 'manual' } },
	{ id: 'second', sinceVersion: '1.0.0', title: 'Second', target: { kind: 'page', ref: 'Y' }, advanceOn: { type: 'manual' } },
]

function factory(look) {
	return mount(CnWalkthrough, {
		propsData: {
			appId: 'pq',
			look,
			manifest: { version: '1.0.0', walkthrough: { enabled: true, version: 1, tours: [{ id: 't', trigger: 'first-visit', steps }] } },
		},
	})
}

describe('CnWalkthrough board look', () => {
	beforeEach(() => __resetWalkthroughCacheForTests())

	it('names the step in words and draws one dot per step, the current one wide', async () => {
		const w = factory('board')
		await w.vm.$nextTick()
		expect(w.classes()).toContain('cn-walkthrough--board')
		expect(w.find('.cn-walkthrough__counter').text()).toBe('Step 1 of 2')
		expect(w.findAll('.cn-walkthrough__dot')).toHaveLength(2)
		expect(w.findAll('.cn-walkthrough__dot').at(0).classes()).toContain('cn-walkthrough__dot--current')
		expect(w.find('[data-testid="cn-walkthrough-dots"]').attributes('aria-hidden')).toBe('true')
	})

	it('opens a step without a target near the top, centred on the width', async () => {
		const w = factory('board')
		await w.vm.$nextTick()
		expect(w.vm.cardStyle).toEqual({ top: '88px', left: '50%', transform: 'translateX(-50%)' })
		expect(w.find('.cn-walkthrough__card').classes()).toContain('cn-walkthrough__card--centered')
	})

	it('keeps the Nextcloud coachmark without the look', async () => {
		const w = factory()
		await w.vm.$nextTick()
		expect(w.classes()).not.toContain('cn-walkthrough--board')
		expect(w.find('.cn-walkthrough__counter').text()).toBe('1 / 2')
		expect(w.find('[data-testid="cn-walkthrough-dots"]').exists()).toBe(false)
		expect(w.vm.cardStyle).toEqual({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
	})
})

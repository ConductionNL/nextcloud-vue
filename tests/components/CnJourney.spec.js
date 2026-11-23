/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/journey-runtime/tasks.md#task-1
 */
import { mount } from '@vue/test-utils'
import CnFormPage from '../../src/components/CnFormPage/CnFormPage.vue'
import CnJourney from '../../src/components/CnJourney/CnJourney.vue'
import { createJourneyRunStore } from '../../src/store/journeyRun.js'
import { currentTitle, fakeRunApi, fillAndNext, flush, journey, stubs } from '../support/journeyHarness.js'

jest.mock('../../src/utils/cnFetch.js', () => ({
	cnFetchJson: (...args) => global.__runApi(...args),
}))

let server

async function mountJourney(props = {}) {
	const w = mount(CnJourney, { props: { journey, ...props }, global: { stubs } })
	await flush()
	await flush()
	return w
}

beforeEach(() => {
	server = fakeRunApi()
	global.__runApi = server.api
})

describe('CnJourney steps', () => {
	it('mounts CnFormPage for a form step and advances on a valid submit', async () => {
		const w = await mountJourney()
		expect(currentTitle(w)).toBe('Who')
		expect(w.findComponent(CnFormPage).exists()).toBe(true)

		await fillAndNext(w, { name: 'Jan' })
		expect(currentTitle(w)).toBe('Kind')
		expect(server.calls[0]).toMatchObject({ method: 'POST', body: { answers: { who: { name: 'Jan' } }, position: 'kind' } })
	})

	it('shows the same message as CnFormPage and does not advance on invalid input', async () => {
		const w = await mountJourney()
		await fillAndNext(w, {})
		expect(currentTitle(w)).toBe('Who')
		const inJourney = w.findComponent(CnFormPage).vm.fieldErrors.name

		const standalone = mount(CnFormPage, { props: { fields: journey.steps[0].form.fields, submitHandler: 'x', customComponents: { x: () => {} } }, global: { stubs } })
		await standalone.find('form').trigger('submit')
		await flush()
		expect(inJourney).toBeTruthy()
		expect(standalone.vm.fieldErrors.name).toBe(inJourney)
		expect(server.calls).toHaveLength(0)
	})

	it('renders the same fields inside and outside the journey', async () => {
		const w = await mountJourney()
		const standalone = mount(CnFormPage, { props: { fields: journey.steps[0].form.fields }, global: { stubs } })
		const fieldHtml = (x) => x.findAll('.cn-form-page__field').map((f) => f.html())
		expect(fieldHtml(w)).toEqual(fieldHtml(standalone))
	})

	it('removes a false-condition step and numbers the rest contiguously', async () => {
		const w = await mountJourney()
		await fillAndNext(w, { name: 'Jan' })
		await fillAndNext(w, { kind: 'small' })
		expect(currentTitle(w)).toBe('Small')
		const labels = w.findAll('.denhaag-process-steps__label').map((l) => l.text())
		expect(labels).not.toContain('Extra')
		const markers = w.findAll('.denhaag-process-steps__marker').map((l) => l.text())
		expect(markers).toEqual(['✓', '✓', '3', '4'])
	})

	it('reports a third nesting level instead of rendering it', async () => {
		const deep = { id: 'd', steps: [{ id: 'g', title: 'G', steps: [{ id: 's', type: 'form', title: 'S', steps: [{ id: 'x', type: 'form' }] }] }] }
		const w = await mountJourney({ journey: deep })
		expect(w.find('[data-testid="cn-journey-shape-error"]').exists()).toBe(true)
		expect(w.findComponent(CnFormPage).exists()).toBe(false)
	})

	it('shows a group with sub-steps and leaves a non-navigable group unselectable', async () => {
		const grouped = {
			id: 'g',
			steps: [
				{ id: 'grp', title: 'Group', navigable: false, steps: [{ id: 'a', type: 'form', title: 'A', form: { fields: [] } }, { id: 'b', type: 'form', title: 'B', form: { fields: [] } }] },
			],
		}
		const w = await mountJourney({ journey: grouped })
		expect(w.findAll('.denhaag-process-steps__sub-step')).toHaveLength(2)
		expect(w.find('.denhaag-process-steps__step > .denhaag-process-steps__link').exists()).toBe(false)
	})
})

describe('CnJourney branching, review and resume', () => {
	it('branches to the matching step', async () => {
		const w = await mountJourney()
		await fillAndNext(w, { name: 'Jan' })
		await fillAndNext(w, { kind: 'big' })
		expect(currentTitle(w)).toBe('Extra')
	})

	it('falls through to the default step and reports an erroring rule', async () => {
		const failing = {
			...journey,
			steps: journey.steps.map((s) => s.id === 'kind' ? { ...s, branch: [{ when: { source: { register: 'r', schema: 's' }, field: 'x', value: 1 }, goto: 'extra' }] } : s),
		}
		const w = await mountJourney({ journey: failing })
		const failFetch = jest.fn().mockRejectedValue(new Error('down'))
		const original = global.fetch
		global.fetch = failFetch
		await fillAndNext(w, { name: 'Jan' })
		await fillAndNext(w, { kind: 'big' })
		global.fetch = original
		expect(currentTitle(w)).toBe('Small') // the default: next step in order
		expect(server.calls.some((c) => /failures$/.test(c.url))).toBe(true)
	})

	it('reviews answers grouped by step and Change returns with values intact', async () => {
		const w = await mountJourney()
		await fillAndNext(w, { name: 'Jan' })
		await fillAndNext(w, { kind: 'small' })
		await fillAndNext(w, { note: 'hi' })
		expect(currentTitle(w)).toBe('Check')
		const text = w.get('[data-testid="cn-journey-review"]').text()
		expect(text).toContain('Who')
		expect(text).toContain('Jan')
		expect(text).toContain('Kind')

		await w.get('[data-testid="cn-journey-change-who"]').trigger('click')
		await flush()
		expect(currentTitle(w)).toBe('Who')
		expect(w.findComponent(CnFormPage).vm.formData.name).toBe('Jan')
	})

	it('submits from the review step', async () => {
		const w = await mountJourney()
		await fillAndNext(w, { name: 'Jan' })
		await fillAndNext(w, { kind: 'small' })
		await fillAndNext(w, { note: 'hi' })
		await w.get('[data-testid="cn-journey-submit"]').trigger('click')
		await flush()
		expect(w.emitted('submitted')).toHaveLength(1)
		expect(w.find('[data-testid="cn-journey-done"]').exists()).toBe(true)
	})

	it('resumes a recorded run at its step with its answers', async () => {
		server.runs['run-9'] = { id: 'run-9', journey: 'permit', answers: { who: { name: 'Jan' } }, position: 'kind', status: 'active' }
		const w = await mountJourney({ runId: 'run-9' })
		expect(currentTitle(w)).toBe('Kind')
		await w.get('[data-testid="cn-journey-back"]').trigger('click')
		await flush()
		expect(w.findComponent(CnFormPage).vm.formData.name).toBe('Jan')
	})

	it('shares a store with another host', async () => {
		const store = createJourneyRunStore({ journeyId: 'permit' })
		const w = await mountJourney({ store })
		await fillAndNext(w, { name: 'Jan' })
		expect(store.state.answers.who).toEqual({ name: 'Jan' })
		expect(store.state.position).toBe('kind')
	})
})

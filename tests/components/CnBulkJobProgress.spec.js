/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnBulkJobProgress: what a bulk act did, row by row (dossiq's BulkJobProgress
 * and keepiq's BulkRunPanel, now one component).
 *
 * The skip list is the feature, so the skip list is what is asserted: the
 * tests open an outcome and read its rows rather than checking that a number
 * rendered. SKIPPED AND REFUSED STAY APART, in words and in what is fetched.
 *
 * @spec openspec/changes/dq-abstract-forms/specs/bulk-job-progress/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnBulkJobProgress from '../../src/components/CnBulkJobProgress/CnBulkJobProgress.vue'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}` }))

/** A finished job with twelve of four hundred not applied. */
const FINISHED = {
	id: 7,
	state: 'completed',
	total: 400,
	processed: 400,
	counts: { applied: 385, skipped: 12, refused: 3, failed: 0 },
}

/**
 * Mount the panel over one job.
 *
 * @param {object} job The job.
 * @param {object} [props] More props.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The wrapper.
 */
async function mountPanel(job, props = {}) {
	const wrapper = mount(CnBulkJobProgress, { props: { job, ...props } })
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	axios.get.mockResolvedValue({ data: { results: [], total: 0 } })
})

describe('CnBulkJobProgress over an OpenRegister job', () => {
	it('says nothing has been written yet while the job is only rehearsed', async () => {
		const wrapper = await mountPanel({ ...FINISHED, state: 'previewed', processed: 0 })

		expect(wrapper.get('[data-testid="bulk-job-state"]').text()).toBe('Nothing has been written yet. This is what would happen to 400 items.')
		expect(wrapper.get('[data-testid="bulk-job-commit"]').text()).toBe('Apply to 400 items')
	})

	it('names the rows that did not move, each with its reason', async () => {
		axios.get.mockResolvedValue({
			data: {
				results: [
					{ id: 1, objectUuid: 'case-a', reason: 'The term has not expired' },
					{ id: 2, objectUuid: 'case-b', reason: 'transition_not_available' },
				],
				total: 12,
			},
		})
		const wrapper = await mountPanel(FINISHED)
		await wrapper.get('[data-testid="bulk-job-count-skipped"]').trigger('click')
		await flushPromises()

		const rows = wrapper.get('[data-testid="bulk-job-rows"]').text()
		expect(rows).toContain('case-a')
		expect(rows).toContain('The term has not expired')
		expect(rows).toContain('case-b')
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/bulk-jobs/7/members', { params: { outcome: 'skipped', limit: 25, offset: 0 } })
	})

	it('a row with no reason says so rather than rendering an empty line', async () => {
		axios.get.mockResolvedValue({ data: { results: [{ id: 1, objectUuid: 'case-a', reason: '' }], total: 1 } })
		const wrapper = await mountPanel(FINISHED)
		await wrapper.get('[data-testid="bulk-job-count-skipped"]').trigger('click')
		await flushPromises()

		expect(wrapper.get('[data-testid="bulk-job-rows"]').text()).toContain('No reason recorded.')
	})

	it('keeps skipped and refused apart, in words and in what it fetches', async () => {
		const wrapper = await mountPanel(FINISHED)

		expect(wrapper.get('[data-testid="bulk-job-count-skipped"]').text()).toBe('12 skipped')
		expect(wrapper.get('[data-testid="bulk-job-count-refused"]').text()).toBe('3 you may not write')

		await wrapper.get('[data-testid="bulk-job-count-refused"]').trigger('click')
		await flushPromises()

		expect(axios.get).toHaveBeenLastCalledWith('/nc/apps/openregister/api/bulk-jobs/7/members', { params: { outcome: 'refused', limit: 25, offset: 0 } })
	})

	it('offers every outcome, including the ones at zero', async () => {
		const wrapper = await mountPanel({ ...FINISHED, counts: { applied: 400, skipped: 0, refused: 0, failed: 0 } })

		expect(wrapper.get('[data-testid="bulk-job-count-skipped"]').text()).toBe('0 skipped')
	})

	it('pages the open outcome 25 rows at a time', async () => {
		axios.get.mockResolvedValueOnce({ data: { results: [{ id: 1, objectUuid: 'a' }], total: 30 } })
		const wrapper = await mountPanel(FINISHED)
		await wrapper.get('[data-testid="bulk-job-count-skipped"]').trigger('click')
		await flushPromises()
		axios.get.mockResolvedValueOnce({ data: { results: [{ id: 2, objectUuid: 'b' }], total: 30 } })
		await wrapper.get('[data-testid="bulk-job-more"]').trigger('click')
		await flushPromises()

		expect(axios.get).toHaveBeenLastCalledWith('/nc/apps/openregister/api/bulk-jobs/7/members', { params: { outcome: 'skipped', limit: 25, offset: 1 } })
		expect(wrapper.get('[data-testid="bulk-job-rows"]').text()).toContain('b')
	})

	it('offers the report and the stop button only where each makes sense', async () => {
		const running = await mountPanel({ ...FINISHED, state: 'running', processed: 120 })

		expect(running.get('[data-testid="bulk-job-state"]').text()).toBe('Running. 120 of 400 items done.')
		expect(running.find('[data-testid="bulk-job-cancel"]').exists()).toBe(true)
		expect(running.find('[data-testid="bulk-job-commit"]').exists()).toBe(false)
		expect(running.get('[data-testid="bulk-job-download"]').attributes('href')).toBe('/nc/apps/openregister/api/bulk-jobs/7/download')

		const finished = await mountPanel(FINISHED)
		expect(finished.find('[data-testid="bulk-job-cancel"]').exists()).toBe(false)
	})

	it('offers running the rest only after a job stopped short', async () => {
		const cancelled = await mountPanel({ ...FINISHED, state: 'cancelled', processed: 120 })
		expect(cancelled.find('[data-testid="bulk-job-retry"]').exists()).toBe(true)

		const completed = await mountPanel(FINISHED)
		expect(completed.find('[data-testid="bulk-job-retry"]').exists()).toBe(false)
	})

	it('the commit is the only button that writes, and it hands the job up', async () => {
		axios.post.mockResolvedValue({ data: { ...FINISHED, state: 'running', processed: 0 } })
		const wrapper = await mountPanel({ ...FINISHED, state: 'previewed', processed: 0 })
		await wrapper.get('[data-testid="bulk-job-commit"]').trigger('click')
		await flushPromises()

		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/bulk-jobs/7/commit', {})
		expect(wrapper.emitted('update:job')[0][0].state).toBe('running')
	})

	it("says so when the act could not be started, in the server's own words", async () => {
		axios.post.mockRejectedValue({ response: { data: { error: 'This act takes at most 500 rows at a time' } } })
		const wrapper = await mountPanel({ ...FINISHED, state: 'previewed', processed: 0 })
		await wrapper.get('[data-testid="bulk-job-commit"]').trigger('click')
		await flushPromises()

		expect(wrapper.text()).toContain('This act takes at most 500 rows at a time')
	})

	it('a stopped job tells how far it got before it stopped', async () => {
		const wrapper = await mountPanel({ ...FINISHED, state: 'cancelled', processed: 120 })

		expect(wrapper.get('[data-testid="bulk-job-state"]').text()).toBe('Stopped. 120 of 400 items were done first.')
		expect(wrapper.get('[data-testid="bulk-job-bar"]').attributes('value')).toBe('30')
	})

	it('emits finished once the job has stopped, so the list re-reads', async () => {
		const wrapper = await mountPanel(FINISHED)

		expect(wrapper.emitted('finished')).toHaveLength(1)
	})

	it('re-reads a running job every two seconds and stops reading when it is unmounted', async () => {
		jest.useFakeTimers()
		try {
			axios.get.mockResolvedValue({ data: { ...FINISHED, state: 'running', processed: 200 } })
			const wrapper = mount(CnBulkJobProgress, { props: { job: { ...FINISHED, state: 'running', processed: 120 } } })
			jest.advanceTimersByTime(2000)
			await flushPromises()

			expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/bulk-jobs/7')
			expect(wrapper.emitted('update:job')[0][0].processed).toBe(200)

			wrapper.unmount()
			axios.get.mockClear()
			jest.advanceTimersByTime(4000)
			expect(axios.get).not.toHaveBeenCalled()
		} finally {
			jest.useRealTimers()
		}
	})

	it("speaks the host's words when it passes labels", async () => {
		const wrapper = await mountPanel({ ...FINISHED, state: 'running', processed: 120 }, {
			labels: { stateRunning: 'Bezig. {processed} van {total} zaken gedaan.' },
		})

		expect(wrapper.get('[data-testid="bulk-job-state"]').text()).toBe('Bezig. 120 van 400 zaken gedaan.')
	})
})

describe('CnBulkJobProgress over a run the host drives (keepiq)', () => {
	const RUN = { state: 'completed', total: 3, processed: 3, counts: { applied: 1, failed: 1, skipped: 1 } }
	const ROWS = [
		{ id: 's1', label: 'db-password', outcome: 'applied' },
		{ id: 's2', label: 'api-key', outcome: 'failed', reason: 'Locked by another user' },
		{ id: 's3', label: 'old-token', outcome: 'skipped', reason: 'Already archived' },
	]

	it('lists the rows of an outcome from the rows it was given, fetching nothing', async () => {
		const wrapper = await mountPanel(RUN, { source: 'local', rows: ROWS, outcomes: ['applied', 'failed', 'skipped'] })
		await wrapper.get('[data-testid="bulk-job-count-failed"]').trigger('click')
		await flushPromises()

		expect(wrapper.get('[data-testid="bulk-job-rows"]').text()).toContain('api-key')
		expect(wrapper.get('[data-testid="bulk-job-rows"]').text()).toContain('Locked by another user')
		expect(wrapper.find('[data-testid="bulk-job-count-refused"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="bulk-job-download"]').exists()).toBe(false)
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('offers to retry the failed rows and hands the retry to the host', async () => {
		const wrapper = await mountPanel(RUN, { source: 'local', rows: ROWS, labels: { retry: 'Retry {count} failed' } })

		expect(wrapper.get('[data-testid="bulk-job-retry"]').text()).toBe('Retry 1 failed')
		await wrapper.get('[data-testid="bulk-job-retry"]').trigger('click')
		expect(wrapper.emitted('retry')).toHaveLength(1)
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('hands the stop to the host while it runs, and does not poll', async () => {
		const wrapper = await mountPanel({ ...RUN, state: 'running', processed: 1 }, { source: 'local', rows: ROWS })
		await wrapper.get('[data-testid="bulk-job-cancel"]').trigger('click')

		expect(wrapper.emitted('cancel')).toHaveLength(1)
		expect(axios.get).not.toHaveBeenCalled()
	})
})

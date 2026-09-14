/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Is this flow all right, in one glyph.
 *
 * The health of a flow is the state of its LAST RUN, not of its document. A
 * flow can be perfectly authored and failing every night, and which one that is
 * is the question an author opening a list actually has.
 *
 * Two rules in here are worth more than the rest:
 *
 * 1. DISABLED WINS OVER EVERY RUN STATE. A red dot on a flow that cannot run
 *    sends somebody to fix a thing that is not happening.
 * 2. `stopped` IS A WARNING, NOT A SUCCESS. A run that stopped reached a
 *    terminal state without finishing the work it was asked to do, and calling
 *    that green is how a half-done nightly goes unnoticed for a week.
 */

import { mount } from '@vue/test-utils'
import CnFlowHealthDot from '../../src/components/CnFlowDetail/CnFlowHealthDot.vue'

/**
 * @param {object} props The props.
 * @return {object} The wrapper.
 */
function dot(props) {
	return mount(CnFlowHealthDot, {
		props,
		global: { mocks: { t: (app, s) => s } },
	})
}

describe('CnFlowHealthDot', () => {
	it.each([
		['failed', 'error'],
		['completed', 'success'],
		['stopped', 'warning'],
		['cancelled', 'warning'],
		['dead_letter', 'warning'],
	])('an enabled flow whose last run %s reads as %s', (lastRunStatus, expected) => {
		expect(dot({ enabled: true, lastRunStatus }).attributes('data-health')).toBe(expected)
	})

	it('an enabled flow that has never run is info, not success', () => {
		expect(dot({ enabled: true, lastRunStatus: null }).attributes('data-health')).toBe('info')
	})

	it('a run still in flight is info: queued is not a verdict', () => {
		for (const inflight of ['queued', 'running', 'suspended']) {
			expect(dot({ enabled: true, lastRunStatus: inflight }).attributes('data-health')).toBe('info')
		}
	})

	it('DISABLED WINS, even over a failure', () => {
		expect(dot({ enabled: false, lastRunStatus: 'failed' }).attributes('data-health')).toBe('disabled')
		expect(dot({ enabled: false, lastRunStatus: 'completed' }).attributes('data-health')).toBe('disabled')
	})

	it('never states the health by colour alone', () => {
		const glyphs = new Set()
		const names = new Set()

		for (const [enabled, lastRunStatus] of [[false, null], [true, 'failed'], [true, 'stopped'], [true, 'completed'], [true, null]]) {
			const w = dot({ enabled, lastRunStatus })
			glyphs.add(w.find('.cn-flow-health__glyph').text())
			names.add(w.attributes('aria-label'))
		}

		// Five states, five distinct shapes and five distinct accessible names.
		// error and success are exactly the pair a red-green deficiency cannot
		// separate, so the shape is not decoration.
		expect(glyphs.size).toBe(5)
		expect(names.size).toBe(5)
	})

	it('the glyph is hidden from assistive tech, so the state is read once', () => {
		const w = dot({ enabled: true, lastRunStatus: 'failed' })

		expect(w.find('.cn-flow-health__glyph').attributes('aria-hidden')).toBe('true')
		expect(w.attributes('role')).toBe('img')
		expect(w.attributes('aria-label')).toBeTruthy()
	})

	it('is case-insensitive about what the API reports', () => {
		expect(dot({ enabled: true, lastRunStatus: 'FAILED' }).attributes('data-health')).toBe('error')
	})
})

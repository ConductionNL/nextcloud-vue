/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A send step's run-log report, shown by name.
 *
 * A messaging step writes `report.messaging` onto its run-log entry: one
 * bucket per outcome (`delivered`, `optedOut`, `authorityUnavailable`, ...),
 * each `{count, sample}`. Nothing rendered it, so an author could not see
 * that a person was skipped because they opted out. These tests pin that each
 * non-empty bucket shows under a readable name with its count and sample.
 */
import { mount } from '@vue/test-utils'
import CnFlowStepOutcomes from '../../src/components/CnFlowStepOutcomes/CnFlowStepOutcomes.vue'

const REPORT = {
	channel: 'email',
	actor: 'admin',
	recipients: 4,
	delivered: { count: 1, sample: ['piet@example.nl'] },
	skippedByPreference: { count: 0, sample: [] },
	skippedByKillSwitch: { count: 0, sample: [] },
	rateLimited: { count: 0, sample: [] },
	failed: { count: 0, sample: [] },
	optedOut: { count: 1, sample: ['jan@example.nl'] },
	authorityUnavailable: { count: 1, sample: ['kees@example.nl'] },
	refusedRecipients: { count: 1, sample: [{ recipient: 'marie@example.nl', reason: 'not-on-item' }] },
	truncated: false,
}

/**
 * Mount the list over one report.
 *
 * @param {object} props The props.
 * @return {object} The wrapper.
 */
function mountOutcomes(props) {
	return mount(CnFlowStepOutcomes, { props, global: { mocks: { t: (app, s) => s } } })
}

describe('CnFlowStepOutcomes', () => {
	it('names every non-empty bucket, with its count and who is in it', () => {
		const wrapper = mountOutcomes({ report: REPORT })
		const rows = wrapper.findAll('[data-testid^="flow-step-outcome-"]')

		expect(rows.map((row) => row.attributes('data-testid'))).toEqual([
			'flow-step-outcome-delivered',
			'flow-step-outcome-optedOut',
			'flow-step-outcome-authorityUnavailable',
			'flow-step-outcome-refusedRecipients',
		])

		const optedOut = wrapper.find('[data-testid="flow-step-outcome-optedOut"]')
		expect(optedOut.find('dt').text()).toBe('Opted out')
		expect(optedOut.find('dd').text()).toContain('1')
		expect(optedOut.find('dd').text()).toContain('jan@example.nl')

		expect(wrapper.find('[data-testid="flow-step-outcome-authorityUnavailable"] dt').text())
			.toBe('Not sent, the opt-out check did not answer')
		expect(wrapper.find('[data-testid="flow-step-outcome-delivered"] dt').text()).toBe('Delivered')
	})

	it('hides the empty buckets', () => {
		const wrapper = mountOutcomes({ report: REPORT })

		expect(wrapper.find('[data-testid="flow-step-outcome-failed"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-step-outcome-rateLimited"]').exists()).toBe(false)
	})

	it('keeps a zero-count bucket when hideZero is false', () => {
		// A sync step's own tally (e.g. `report.sweep`): zero swept is the
		// answer, not a blank row — unlike messaging, where a long mostly-zero
		// outcome list would be noise.
		const report = { created: { count: 0 }, updated: { count: 3 } }

		const hidden = mountOutcomes({ report })
		expect(hidden.find('[data-testid="flow-step-outcome-created"]').exists()).toBe(false)

		const shown = mountOutcomes({ report, hideZero: false })
		expect(shown.find('[data-testid="flow-step-outcome-created"] dd').text()).toContain('0')
		expect(shown.find('[data-testid="flow-step-outcome-updated"] dd').text()).toContain('3')
	})

	it('says why an address was refused', () => {
		const wrapper = mountOutcomes({ report: REPORT })

		expect(wrapper.find('[data-testid="flow-step-outcome-refusedRecipients"] dd').text())
			.toContain('marie@example.nl (not on the item)')
	})

	it('names a bucket it does not know by its key, and lets the host rename any bucket', () => {
		const report = { recipients: 1, heldForReview: { count: 2, sample: ['a', 'b'] }, optedOut: { count: 1, sample: ['x'] } }
		const wrapper = mountOutcomes({ report, labels: { optedOut: 'Afgemeld' } })

		expect(wrapper.find('[data-testid="flow-step-outcome-heldForReview"] dt').text()).toBe('Held for review')
		expect(wrapper.find('[data-testid="flow-step-outcome-optedOut"] dt').text()).toBe('Afgemeld')
	})

	it('says when a list was cut short', () => {
		const wrapper = mountOutcomes({ report: { ...REPORT, truncated: true } })

		expect(wrapper.find('[data-testid="flow-step-outcomes-truncated"]').exists()).toBe(true)
		expect(mountOutcomes({ report: REPORT }).find('[data-testid="flow-step-outcomes-truncated"]').exists()).toBe(false)
	})

	it('renders nothing for a step without a messaging report', () => {
		expect(mountOutcomes({ report: null }).find('dl').exists()).toBe(false)
		expect(mountOutcomes({ report: { recipients: 0 } }).find('dl').exists()).toBe(false)
	})

	it('does not render NaN for a bucket missing count when hideZero is false', () => {
		// Before this fix: `Number(undefined) > 0` was false, so the bucket was
		// dropped. With hideZero false it passed the filter, and the count
		// itself rendered `Number(undefined)` → NaN.
		const wrapper = mountOutcomes({ report: { swept: {} }, hideZero: false })

		expect(wrapper.find('[data-testid="flow-step-outcome-swept"] dd').text()).toContain('0')
		expect(wrapper.find('[data-testid="flow-step-outcome-swept"] dd').text()).not.toContain('NaN')
	})

	it('names a sync step’s own buckets, invalid marked as a warning', () => {
		const report = {
			fetched: { count: 10 },
			created: { count: 2 },
			updated: { count: 3 },
			skipped: { count: 4 },
			invalid: { count: 1 },
			swept: { count: 0 },
		}
		const wrapper = mountOutcomes({ report, hideZero: false })

		expect(wrapper.find('[data-testid="flow-step-outcome-fetched"] dt').text()).toBe('Fetched')
		expect(wrapper.find('[data-testid="flow-step-outcome-created"] dt').text()).toBe('Created')
		expect(wrapper.find('[data-testid="flow-step-outcome-updated"] dt').text()).toBe('Updated')
		expect(wrapper.find('[data-testid="flow-step-outcome-skipped"] dt').text()).toBe('Skipped')
		expect(wrapper.find('[data-testid="flow-step-outcome-invalid"] dt').text()).toBe('Invalid')
		expect(wrapper.find('[data-testid="flow-step-outcome-swept"] dt').text()).toBe('Swept')
		expect(wrapper.find('[data-testid="flow-step-outcome-invalid"]').classes())
			.toContain('cn-flow-step-outcomes__row--warning')
	})
})

describe('CnFlowStepOutcomes label', () => {
	it('keeps the default accessible name and no caption when label is unset', () => {
		const wrapper = mountOutcomes({ report: REPORT })

		expect(wrapper.find('dl').attributes('aria-label')).toBe('Who this step reached')
		expect(wrapper.find('[data-testid="flow-step-outcomes-title"]').exists()).toBe(false)
	})

	it('uses label as both the visible caption and the accessible name', () => {
		// Every block sits in a dl with the same aria-label by default, so two
		// sibling blocks on one step (fetch + write) were indistinguishable —
		// to a screen reader, and visually, since the block key is not shown.
		const wrapper = mountOutcomes({ report: { created: { count: 1 } }, hideZero: false, label: 'Write' })

		expect(wrapper.find('[data-testid="flow-step-outcomes-title"]').text()).toBe('Write')
		expect(wrapper.find('dl').attributes('aria-label')).toBe('Write')
	})
})

describe('CnFlowStepOutcomes translations', () => {
	// Seen live: the labels were appended to the catalogue's `plurals` block,
	// which t() never reads, so a Dutch reader got every label in English.
	it('has every label in the en and nl `translations` block', () => {
		const labels = [
			'Who this step reached',
			'Each list shows its first entries only.',
			'Delivered',
			'Opted out',
			'Not sent, the opt-out check did not answer',
			'Skipped by their notification settings',
			'Skipped, sending is switched off',
			'Held back by the send limit',
			'Refused by the step’s address rule',
			'Not a known user or group',
			'Failed',
			'Fetched',
			'Created',
			'Updated',
			'Skipped',
			'Invalid',
			'Swept',
			'external recipients are off',
			'not on the item',
			'not a valid address',
		]
		for (const lang of ['en', 'nl']) {
			const catalogue = require(`../../l10n/${lang}.json`).translations
			for (const label of labels) {
				expect([lang, label, typeof catalogue[label]]).toEqual([lang, label, 'string'])
			}
		}
		expect(require('../../l10n/nl.json').translations['Opted out']).toBe('Afgemeld')
	})
})

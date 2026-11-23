/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The feature list of the Features and roadmap board look: statuses, the
 * reader's language and groups by category.
 *
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md
 */
import { countByStatus, featureStatus, featureText, groupFeatures } from '../../src/utils/featureCatalog.js'
import { issueStatus, sortByReactions } from '../../src/utils/roadmapIssues.js'

describe('featureCatalog', () => {
	it('maps status words onto four statuses, and no status to available', () => {
		expect(featureStatus('stable')).toBe('available')
		expect(featureStatus('done')).toBe('available')
		expect(featureStatus('Beta')).toBe('beta')
		expect(featureStatus('in-progress')).toBe('in_progress')
		expect(featureStatus('planned')).toBe('planned')
		expect(featureStatus('soon')).toBe('planned')
		expect(featureStatus(undefined)).toBe('available')
		expect(featureStatus('unheard of')).toBe('available')
	})

	it('reads the title in the reader\'s language when the feature has it', () => {
		const feature = { title: 'Dutch government interop', title_nl: 'Koppelen aan de overheid', summary: 'Connect.' }
		expect(featureText(feature, 'title', 'nl_NL')).toBe('Koppelen aan de overheid')
		expect(featureText(feature, 'title', 'de')).toBe('Dutch government interop')
		expect(featureText(feature, 'summary', 'nl')).toBe('Connect.')
	})

	it('groups by category in the declared order, uncategorised first', () => {
		const groups = groupFeatures([
			{ slug: 'a', title: 'A', category: 'infra' },
			{ slug: 'b', title: 'B', category: 'crm', status: 'beta' },
			{ slug: 'c', title: 'C' },
			{ slug: 'd', title: 'D', category: 'unknown' },
		], { crm: 'Basis-CRM', infra: 'Infrastructuur', empty: 'Nothing here' })
		expect(groups.map((group) => [group.key, group.label, group.features.map((f) => f.slug)])).toEqual([
			['', '', ['c', 'd']],
			['crm', 'Basis-CRM', ['b']],
			['infra', 'Infrastructuur', ['a']],
		])
		expect(groups[1].features[0].status).toBe('beta')
	})

	it('falls back to the slug when a feature has no title', () => {
		expect(groupFeatures([{ slug: 'activity-timeline' }])[0].features[0].title).toBe('activity-timeline')
	})

	it('counts features per status', () => {
		expect(countByStatus([{ status: 'available' }, { status: 'planned' }, { status: 'planned' }]))
			.toEqual({ all: 3, available: 1, beta: 0, in_progress: 0, planned: 2 })
	})
})

describe('roadmapIssues', () => {
	it('reads an issue status from the first mapped label', () => {
		const labels = { 'In progress': 'in_progress', planned: 'planned' }
		expect(issueStatus({ labels: [{ name: 'enhancement' }, { name: 'in progress' }] }, labels)).toBe('in_progress')
		expect(issueStatus({ labels: ['Planned'] }, labels)).toBe('planned')
		expect(issueStatus({ labels: [{ name: 'enhancement' }] }, labels)).toBe('')
		expect(issueStatus({ labels: [{ name: 'planned' }] }, null)).toBe('')
	})

	it('orders issues by reactions without touching the input', () => {
		const items = [{ number: 1, reactions: { total_count: 1 } }, { number: 2, reactions: { total_count: 5 } }, { number: 3 }]
		expect(sortByReactions(items).map((item) => item.number)).toEqual([2, 1, 3])
		expect(items[0].number).toBe(1)
	})
})

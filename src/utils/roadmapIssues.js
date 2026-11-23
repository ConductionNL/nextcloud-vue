/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * roadmapIssues: the forge issues a roadmap shows, fetched through
 * OpenRegister's `github-issue-proxy` with the curated label filter
 * (`enhancement,feature`, per openregister design D23), most-reacted first.
 *
 * @module utils/roadmapIssues
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-the-next-card-lists-the-most-requested-issues
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * Fetch the roadmap issues of a repository.
 *
 * `degraded` names why there are none: `pat_not_configured` (OpenRegister has
 * no GitHub token), `rate_limited` (HTTP 429), `error` (anything else), or
 * null when the fetch worked.
 *
 * @param {string} repo `<owner>/<repo>` on the forge.
 * @param {{state?: ('open'|'closed'|'all')}} [options] `state` asks for closed issues too; unset sends no state (the proxy reads open).
 * @return {Promise<{items: Array<object>, degraded: (string|null)}>} The issues, most-reacted first.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-the-next-card-lists-the-most-requested-issues
 */
export async function fetchRoadmapIssues(repo, { state } = {}) {
	try {
		const response = await axios.get(generateUrl('/apps/openregister/api/github/issues'), {
			params: { repo, labels: 'enhancement,feature', ...(state ? { state } : {}) },
		})
		const data = response.data || {}
		if (data.hint === 'github_pat_not_configured') {
			return { items: [], degraded: 'pat_not_configured' }
		}
		return { items: sortByReactions(Array.isArray(data.items) ? data.items : []), degraded: null }
	} catch (e) {
		const status = e?.response?.status
		const code = e?.response?.data?.error
		if (status === 429 || code === 'github_rate_limited' || code === 'rate_limited') {
			return { items: [], degraded: 'rate_limited' }
		}
		return { items: [], degraded: 'error' }
	}
}

/**
 * Issues ordered by their reaction count, most first.
 *
 * @param {Array<object>} items The issues.
 * @return {Array<object>} A sorted copy.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-the-next-card-lists-the-most-requested-issues
 */
export function sortByReactions(items) {
	return [...items].sort((a, b) => (b.reactions?.total_count || 0) - (a.reactions?.total_count || 0))
}

/**
 * The roadmap status of an issue from its labels: the first label that
 * `labelStatuses` maps (case-insensitive) decides, else ''.
 *
 * @param {object} issue The issue, with `labels: [{name}]` or `labels: ['name']`.
 * @param {object} labelStatuses Label name to status (`in_progress`, `planned`).
 * @return {string} The status, or '' for no badge.
 * @spec openspec/changes/screens-roadmap-board-look/specs/features-roadmap-board-look/spec.md#requirement-the-next-card-lists-the-most-requested-issues
 */
export function issueStatus(issue, labelStatuses) {
	if (!labelStatuses || typeof labelStatuses !== 'object') {
		return ''
	}
	const map = {}
	for (const [label, status] of Object.entries(labelStatuses)) {
		map[label.toLowerCase()] = status
	}
	for (const label of Array.isArray(issue?.labels) ? issue.labels : []) {
		const name = String(typeof label === 'string' ? label : label?.name || '').toLowerCase()
		if (map[name]) {
			return map[name]
		}
	}
	return ''
}

/** The labels that put an open issue in the In development column by default. */
export const ROADMAP_IN_PROGRESS_LABELS = Object.freeze(['in progress', 'in-progress', 'in development'])

/**
 * The roadmap issues in three columns: `planned` (open), `inProgress` (open
 * with one of the in-progress labels) and `available` (closed as completed).
 * A closed issue that was not completed is left out. Each column keeps the
 * given order.
 *
 * @param {Array<object>} items The issues, with `state`, `state_reason` and `labels`.
 * @param {string[]} [inProgressLabels] Labels that mean work has started (case-insensitive).
 * @return {{planned: Array<object>, inProgress: Array<object>, available: Array<object>}} The columns.
 * @spec openspec/changes/roadmap-tab-columns/specs/roadmap-tab-columns/spec.md#requirement-a-roadmap-can-be-drawn-as-three-columns
 */
export function roadmapColumns(items, inProgressLabels = ROADMAP_IN_PROGRESS_LABELS) {
	const started = new Set((Array.isArray(inProgressLabels) ? inProgressLabels : []).map((label) => String(label).toLowerCase()))
	const columns = { planned: [], inProgress: [], available: [] }
	for (const issue of Array.isArray(items) ? items : []) {
		if (!issue || typeof issue !== 'object') {
			continue
		}
		if (issue.state === 'closed') {
			if (issue.state_reason === 'completed') {
				columns.available.push(issue)
			}
			continue
		}
		const labels = (Array.isArray(issue.labels) ? issue.labels : []).map((label) => String(typeof label === 'string' ? label : label?.name || '').toLowerCase())
		if (labels.some((name) => started.has(name))) {
			columns.inProgress.push(issue)
		} else {
			columns.planned.push(issue)
		}
	}
	return columns
}

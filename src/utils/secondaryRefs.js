/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The records a table column's secondary line reads (`secondaryRefs`): each
 * alias names a row field holding a reference, and the register and schema it
 * points into. Every referenced record is read once, however many rows point
 * at it, and may carry counts of the records that point at it in turn
 * (`counts`, each an OpenRegister count aggregate whose `where` reads the
 * referenced record through `@self.<path>`).
 *
 * `{ segment: { field: 'segmentId', register: 'pipelinq', schema: 'segment' },
 *    list: { field: 'listId', register: 'pipelinq', schema: 'mailingList',
 *            counts: { subscribers: { register: 'pipelinq', schema: 'subscription',
 *                                     where: { listId: '@self.id' } } } } }`
 *
 * @spec openspec/changes/secondary-line-from-references/specs/data-table/spec.md
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { readPath } from './readPath.js'
import { fetchRowAggregate } from './rowAggregate.js'

/**
 * The reference a row holds for one alias, as a string; '' when it holds none.
 *
 * @param {object} row The row.
 * @param {object} spec The alias's declaration.
 * @param {Function} [readValue] How a path is read off the row.
 * @return {string} The id.
 */
export function refIdOf(row, spec, readValue = readPath) {
	const value = spec && typeof spec.field === 'string' ? readValue(row, spec.field) : undefined
	return value === null || value === undefined || typeof value === 'object' ? '' : String(value)
}

/**
 * Read one referenced record and its counts. Null when the record cannot be
 * read; a count that cannot be read is left out.
 *
 * @param {object} spec The alias's declaration.
 * @param {string} id The referenced id.
 * @return {Promise<object|null>} The record, with its counts as fields.
 */
async function readReferenced(spec, id) {
	let record
	try {
		const res = await axios.get(generateUrl(`/apps/openregister/api/objects/${spec.register}/${spec.schema}/${encodeURIComponent(id)}`))
		record = res && res.data && typeof res.data === 'object' ? { ...res.data } : null
	} catch {
		return null
	}
	if (record === null) {
		return null
	}
	const counts = spec.counts && typeof spec.counts === 'object' ? Object.entries(spec.counts) : []
	await Promise.all(counts.map(async ([as, agg]) => {
		try {
			record[as] = await fetchRowAggregate({ op: 'count', ...agg }, record)
		} catch {
			// The count stays absent, so a template that needs it is not drawn.
		}
	}))
	return record
}

/**
 * Read every record the rows reference through `refs`, once per id.
 *
 * @param {object} refs The column's `secondaryRefs`.
 * @param {Array<object>} rows The rows.
 * @param {Function} [readValue] How a path is read off a row.
 * @return {Promise<object>} `{ [alias]: { [id]: record } }`; an unreadable id is absent.
 */
export async function loadSecondaryRefs(refs, rows, readValue = readPath) {
	const out = {}
	const jobs = []
	for (const [alias, spec] of Object.entries(refs || {})) {
		out[alias] = {}
		if (!spec || !spec.register || !spec.schema || !spec.field) {
			continue
		}
		const ids = [...new Set((rows || []).map((row) => refIdOf(row, spec, readValue)).filter((id) => id !== ''))]
		for (const id of ids) {
			jobs.push(readReferenced(spec, id).then((record) => {
				if (record !== null) {
					out[alias][id] = record
				}
			}))
		}
	}
	await Promise.all(jobs)
	return out
}

/**
 * The row with its referenced records laid over it under their aliases, for
 * filling a secondary-line template.
 *
 * @param {object} row The row.
 * @param {object} refs The column's `secondaryRefs`.
 * @param {object} loaded What `loadSecondaryRefs` answered.
 * @param {Function} [readValue] How a path is read off the row.
 * @return {object} The row and its references.
 */
export function rowWithRefs(row, refs, loaded, readValue = readPath) {
	const out = { ...row }
	for (const [alias, spec] of Object.entries(refs || {})) {
		const id = refIdOf(row, spec, readValue)
		out[alias] = id !== '' && loaded && loaded[alias] ? loaded[alias][id] : undefined
	}
	return out
}

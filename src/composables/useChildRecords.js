/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useChildRecords — load, diff, validate and save the child records a parent
 * form edits as a table (`CnChildRecordsField`).
 *
 * Children are saved as their own objects AFTER the parent, in two requests:
 * one bulk save for every new and changed row, one bulk delete for every
 * removed row. They are never nested in the parent's payload.
 *
 * @spec openspec/changes/form-child-records-table/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'

/** Rows loaded at most; further children are edited on the list page. */
export const CHILD_PAGE_SIZE = 50

/**
 * The id of a child row, whichever key carries it.
 *
 * @param {object} row The row.
 * @return {string|number|undefined} The id, or undefined for a new row.
 */
export function childId(row) {
	return row?.id ?? row?.uuid
}

/**
 * The row without the table's own bookkeeping keys.
 *
 * @param {object} row The row.
 * @return {object} A clean copy.
 */
function clean(row) {
	return Object.fromEntries(Object.entries(row || {}).filter(([key]) => !key.startsWith('__')))
}

/**
 * Work out what a save must send.
 *
 * @param {object[]} original The rows as loaded.
 * @param {object[]} rows The rows as edited.
 * @return {{ toSave: object[], toDelete: Array<string|number> }} New and changed rows, and ids of removed ones.
 */
export function diffChildren(original, rows) {
	const before = new Map((original || []).filter((r) => childId(r) !== undefined).map((r) => [String(childId(r)), JSON.stringify(clean(r))]))
	const keptIds = new Set()
	const toSave = []
	for (const row of rows || []) {
		const id = childId(row)
		if (id === undefined) {
			toSave.push(clean(row))
			continue
		}
		keptIds.add(String(id))
		if (before.get(String(id)) !== JSON.stringify(clean(row))) {
			toSave.push(clean(row))
		}
	}
	const toDelete = [...before.keys()].filter((id) => !keptIds.has(id))
	return { toSave, toDelete }
}

/**
 * Check every row against the child schema's required properties.
 *
 * @param {object[]} rows The rows.
 * @param {object|null} schema The child schema (`{ properties, required }`).
 * @param {string} [parentField] The back-reference, filled in on save and so never required of the user.
 * @return {Array<{row: number, field: string, label: string}>} One entry per missing value, row numbers from 1.
 */
export function validateChildRows(rows, schema, parentField = '') {
	const required = Array.isArray(schema?.required) ? schema.required.filter((key) => key !== parentField) : []
	const problems = []
	;(rows || []).forEach((row, index) => {
		for (const key of required) {
			const value = row?.[key]
			if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
				problems.push({ row: index + 1, field: key, label: schema?.properties?.[key]?.title || key })
			}
		}
	})
	return problems
}

/**
 * The sentence for the first row problem.
 *
 * @param {Array<{row: number, label: string}>} problems The problems from {@link validateChildRows}.
 * @return {string} The message, or ''.
 */
export function describeRowProblem(problems) {
	if (!problems || problems.length === 0) {
		return ''
	}
	return t('nextcloud-vue', 'Row {row} needs a value for {field}.', { row: problems[0].row, field: problems[0].label })
}

/**
 * Build the child-records helper.
 *
 * @param {object} [options] Options.
 * @param {string} [options.apiBase] Base URL of the OpenRegister API.
 * @return {{ load: Function, save: Function }} The helper.
 */
export function useChildRecords({ apiBase = '/apps/openregister/api' } = {}) {
	/**
	 * Load the children whose parent field names the parent.
	 *
	 * @param {object} target The children to load.
	 * @param {string} target.register The register slug.
	 * @param {string} target.schema The child schema slug.
	 * @param {string} target.parentField The child property pointing at the parent.
	 * @param {string|number} target.parentId The parent id.
	 * @return {Promise<{ rows: object[], total: number }>} The first page of children and how many exist.
	 */
	async function load({ register, schema, parentField, parentId }) {
		const params = new URLSearchParams({ [parentField]: String(parentId), _limit: String(CHILD_PAGE_SIZE) })
		const response = await axios.get(generateUrl(`${apiBase}/objects/${register}/${schema}?${params.toString()}`))
		const rows = Array.isArray(response?.data?.results) ? response.data.results : []
		return { rows, total: Number(response?.data?.total) || rows.length }
	}

	/**
	 * Save the children after the parent: one bulk save, one bulk delete.
	 *
	 * @param {object} target What to save.
	 * @param {string} target.register The register slug.
	 * @param {string} target.schema The child schema slug.
	 * @param {string} target.parentField The child property pointing at the parent.
	 * @param {string|number} target.parentId The saved parent's id.
	 * @param {object[]} target.original The rows as loaded.
	 * @param {object[]} target.rows The rows as edited.
	 * @return {Promise<{ saved: number, deleted: number, failed: Array<{row: object|null, id: string|number|null, reason: string}> }>} The outcome; a refused child is named, never thrown.
	 */
	async function save({ register, schema, parentField, parentId, original, rows }) {
		const { toSave, toDelete } = diffChildren(original, rows)
		const failed = []
		let saved = 0
		let deleted = 0

		if (toSave.length > 0) {
			const objects = toSave.map((row) => ({ ...row, [parentField]: parentId }))
			try {
				const response = await axios.post(generateUrl(`${apiBase}/bulk/${register}/${schema}/save`), { objects })
				const refused = response?.data?.errors || response?.data?.failed || []
				for (const entry of Array.isArray(refused) ? refused : []) {
					const index = Number.isInteger(entry?.index) ? entry.index : null
					failed.push({
						row: index !== null ? toSave[index] : null,
						id: entry?.id ?? entry?.uuid ?? null,
						reason: entry?.error || entry?.reason || entry?.message || t('nextcloud-vue', 'The row was refused.'),
					})
				}
				saved = objects.length - (Array.isArray(refused) ? refused.length : 0)
			} catch (e) {
				const reason = e?.response?.status === 403
					? t('nextcloud-vue', 'You may not write these rows.')
					: (e?.response?.data?.error || t('nextcloud-vue', 'The rows could not be saved.'))
				for (const row of toSave) {
					failed.push({ row, id: childId(row) ?? null, reason })
				}
			}
		}

		if (toDelete.length > 0) {
			try {
				await axios.post(generateUrl(`${apiBase}/bulk/${register}/${schema}/delete`), { uuids: toDelete })
				deleted = toDelete.length
			} catch (e) {
				const reason = e?.response?.data?.error || t('nextcloud-vue', 'The rows could not be removed.')
				for (const id of toDelete) {
					failed.push({ row: null, id, reason })
				}
			}
		}

		return { saved, deleted, failed }
	}

	return { load, save }
}

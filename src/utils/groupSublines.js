/**
 * The line under a team in a picker: how many members it has and what it is
 * for ("6 leden · bezwaar, beroep en Woo-advies", board DqOverdragen).
 *
 * The count comes from Nextcloud's group details; that endpoint answers
 * administrators and group admins only, so for anyone else the count is left
 * out rather than guessed. Nextcloud keeps no description for a group, so the
 * text comes from an app's own records when the app names them (`describe`:
 * `{ register, schema, groupField?, textField? }`, by default the record's
 * `ncGroupId` and `description`).
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @module utils/groupSublines
 * @spec openspec/changes/assign-team-option-subline/specs/assign-dialog/spec.md
 */

import axios from '@nextcloud/axios'
import { translatePlural as n } from '@nextcloud/l10n'
import { generateOcsUrl } from '@nextcloud/router'
import { fetchReferenceObjects } from './boardReferenceColumns.js'

const descriptionCache = new Map()

/**
 * Member counts by group id for the groups a search finds. Fails soft to `{}`.
 *
 * @param {string} query The search term.
 * @return {Promise<Record<string, number>>} Counts by group id.
 * @spec openspec/changes/assign-team-option-subline/specs/assign-dialog/spec.md
 */
async function memberCounts(query) {
	try {
		const response = await axios.get(generateOcsUrl('cloud/groups/details'), {
			headers: { 'OCS-APIRequest': 'true', Accept: 'application/json' },
			params: { search: query || '', limit: 50 },
		})
		const data = response && response.data && response.data.ocs ? response.data.ocs.data : (response && response.data)
		const groups = data && Array.isArray(data.groups) ? data.groups : []
		const out = {}
		for (const group of groups) {
			const count = Number(group && group.usercount)
			if (group && group.id && Number.isFinite(count)) {
				out[String(group.id)] = count
			}
		}
		return out
	} catch {
		return {}
	}
}

/**
 * Descriptions by group id from the app's records. Read once per source.
 *
 * @param {{register?: string, schema?: string, groupField?: string, textField?: string}|null} describe The source.
 * @return {Promise<Record<string, string>>} Descriptions by group id.
 * @spec openspec/changes/assign-team-option-subline/specs/assign-dialog/spec.md
 */
async function descriptions(describe) {
	if (!describe || !describe.register || !describe.schema) {
		return {}
	}
	const groupField = describe.groupField || 'ncGroupId'
	const textField = describe.textField || 'description'
	const key = [describe.register, describe.schema, groupField, textField].join('/')
	if (!descriptionCache.has(key)) {
		descriptionCache.set(key, fetchReferenceObjects({ register: describe.register, schema: describe.schema, limit: 500 })
			.then((rows) => {
				const out = {}
				for (const row of rows) {
					const gid = row && row[groupField]
					const text = row && typeof row[textField] === 'string' ? row[textField].trim() : ''
					if (gid && text && out[String(gid)] === undefined) {
						out[String(gid)] = text
					}
				}
				return out
			})
			.catch(() => {
				descriptionCache.delete(key)
				return {}
			}))
	}
	return descriptionCache.get(key)
}

/**
 * The line under each group: its member count and its description, joined by
 * " · ", either left out when unknown.
 *
 * @param {string[]} ids The group ids to describe.
 * @param {string} query The search the groups came from.
 * @param {object|null} [describe] Where the app keeps a group's description.
 * @return {Promise<Record<string, string>>} The line by group id ('' when nothing is known).
 * @spec openspec/changes/assign-team-option-subline/specs/assign-dialog/spec.md
 */
export async function groupSublines(ids, query, describe = null) {
	if (!Array.isArray(ids) || ids.length === 0) {
		return {}
	}
	const [counts, texts] = await Promise.all([memberCounts(query), descriptions(describe)])
	const out = {}
	for (const id of ids) {
		const parts = []
		if (counts[id] !== undefined) {
			parts.push(n('nextcloud-vue', '{count} member', '{count} members', counts[id], { count: counts[id] }))
		}
		if (texts[id]) {
			parts.push(texts[id])
		}
		out[id] = parts.join(' · ')
	}
	return out
}

/**
 * Forget the cached descriptions (tests, or after the source changed).
 *
 * @return {void}
 */
export function clearGroupSublineCache() {
	descriptionCache.clear()
}

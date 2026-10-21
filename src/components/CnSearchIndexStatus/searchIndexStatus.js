/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/** The occ command that rebuilds, snapshots, restores and reports the indexes. */
export const SEARCH_INDEX_COMMAND = 'occ openregister:tables:search-index'

/** Where OpenRegister reports its search indexes. */
export const SEARCH_INDEX_STATUS_URL = '/apps/openregister/api/settings/search-index'

/**
 * When the last stored run finished, or started, or null when none ran.
 *
 * OpenRegister answers `lastRun` as the report of that run (`startedAt`,
 * `finishedAt`) and as `[]` when nothing ran.
 *
 * @param {object|Array|string|null|undefined} report What OpenRegister answered as `lastRun`.
 * @return {string|null} An ISO 8601 time, or null when no run is on record.
 */
export function lastRunTime(report) {
	if (typeof report === 'string') {
		return report === '' ? null : report
	}
	if (report === null || typeof report !== 'object' || Array.isArray(report)) {
		return null
	}
	const time = report.finishedAt || report.startedAt || ''
	return typeof time === 'string' && time !== '' ? time : null
}

/**
 * What OpenRegister says about the indexes behind object search. A failed
 * read throws: an outage and an instance with no indexes look the same from
 * the browser, and only one of them is somebody's problem.
 *
 * @param {string} [url] The app path to read.
 * @return {Promise<{concurrentRebuildSupported: boolean, tables: object, tableCount: number, indexCount: number, lastRun: (string|null)}>}
 * @throws {Error} When it cannot be read.
 */
export async function fetchSearchIndexStatus(url = SEARCH_INDEX_STATUS_URL) {
	const { data } = await axios.get(generateUrl(url))
	if (data === null || typeof data !== 'object' || data.error !== undefined) {
		throw new Error(String((data && data.error) ?? 'The search index status could not be read.'))
	}
	return {
		concurrentRebuildSupported: data.concurrentRebuildSupported === true,
		tables: data.tables && typeof data.tables === 'object' ? data.tables : {},
		tableCount: Number(data.tableCount ?? 0),
		indexCount: Number(data.indexCount ?? 0),
		lastRun: lastRunTime(data.lastRun),
	}
}

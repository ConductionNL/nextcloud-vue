/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * bulkJobApi — the read, commit, cancel, retry and report calls of an
 * OpenRegister bulk job (`/apps/openregister/api/bulk-jobs/{id}`).
 *
 * An app starts a bulk job on its own endpoint, which applies its policy and
 * hands the act to OpenRegister. Everything after that is OpenRegister's:
 * the position, the per-row outcome, the CSV report, the commit, the cancel
 * and the retry. No app proxies them, because a proxy would be a second job
 * model that can disagree with the first.
 *
 * Internal helper of CnBulkJobProgress.
 *
 * @module utils/bulkJobApi
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/** The job states that mean the job has stopped for good. */
export const BULK_JOB_FINAL_STATES = ['completed', 'failed', 'cancelled']

/**
 * The URL of one job, or of one of its sub-resources.
 *
 * @param {string|number} jobId The job id.
 * @param {string} [suffix] A sub-resource, such as `/members`.
 * @return {string} The URL.
 */
function jobUrl(jobId, suffix = '') {
	return generateUrl(`/apps/openregister/api/bulk-jobs/${encodeURIComponent(jobId)}${suffix}`)
}

/**
 * Read a job's current position.
 *
 * @param {string|number} jobId The job id.
 * @return {Promise<object>} The job, with `processed`, `total` and `counts`.
 */
export async function fetchBulkJob(jobId) {
	const { data } = await axios.get(jobUrl(jobId))
	return data
}

/**
 * Read a page of a job's rows, optionally only the rows with one outcome.
 *
 * @param {string|number} jobId The job id.
 * @param {object} [options] Paging and filtering.
 * @param {string} [options.outcome] applied, skipped, refused or failed.
 * @param {number} [options.limit] Page size.
 * @param {number} [options.offset] Page offset.
 * @return {Promise<{results: Array, total: number}>} The rows and how many there are.
 */
export async function fetchBulkJobMembers(jobId, { outcome, limit = 50, offset = 0 } = {}) {
	const params = { limit, offset }
	if (outcome) {
		params.outcome = outcome
	}
	const { data } = await axios.get(jobUrl(jobId, '/members'), { params })
	return {
		results: (data && data.results) || [],
		total: Number((data && data.total) || 0),
	}
}

/**
 * Commit a previewed job. This is the call that writes.
 *
 * @param {string|number} jobId The job id.
 * @param {string} [justification] A reason given at commit time.
 * @return {Promise<object>} The running job.
 */
export async function commitBulkJob(jobId, justification) {
	const { data } = await axios.post(jobUrl(jobId, '/commit'), justification ? { justification } : {})
	return data
}

/**
 * Stop a running job before the next row.
 *
 * @param {string|number} jobId The job id.
 * @return {Promise<object>} The job, cancelling or cancelled.
 */
export async function cancelBulkJob(jobId) {
	const { data } = await axios.post(jobUrl(jobId, '/cancel'))
	return data
}

/**
 * Run the rows a stopped job did not reach.
 *
 * @param {string|number} jobId The job id.
 * @return {Promise<object>} The running job.
 */
export async function retryBulkJob(jobId) {
	const { data } = await axios.post(jobUrl(jobId, '/retry'))
	return data
}

/**
 * Where the report of a job downloads from. A URL rather than a fetch: the
 * browser has to navigate to it for the file to land in the downloads folder.
 *
 * @param {string|number} jobId The job id.
 * @return {string} The download URL.
 */
export function bulkJobReportUrl(jobId) {
	return jobUrl(jobId, '/download')
}

/**
 * Whether a job has stopped for good.
 *
 * @param {object} job The job.
 * @return {boolean} True when nothing more will happen to it.
 */
export function isBulkJobFinished(job) {
	return BULK_JOB_FINAL_STATES.includes(String((job && job.state) || ''))
}

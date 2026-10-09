/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/ai-panel-approved-mark/tasks.md#task-1
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { isAppInstalled } from './appInstalled.js'

const MARK_PATH = '/apps/thematiq/api/assistant-mark'

/** Module-level promise: one request per page load, shared by every caller. */
let pending = null

/**
 * Validate the endpoint answer; anything but a complete enabled mark is null.
 *
 * @param {*} data Parsed response body.
 * @return {{enabled: boolean, label: string, organisation: string, logo: ?{url: string, alt: string}}|null} The mark or null.
 */
function normalizeMark(data) {
	if (!data || typeof data !== 'object' || data.enabled !== true) {
		return null
	}
	const label = typeof data.label === 'string' ? data.label.trim() : ''
	if (label === '') {
		return null
	}
	const logo = data.logo && typeof data.logo.url === 'string' && data.logo.url !== ''
		? { url: data.logo.url, alt: typeof data.logo.alt === 'string' ? data.logo.alt : '' }
		: null
	return {
		enabled: true,
		label,
		organisation: typeof data.organisation === 'string' ? data.organisation : '',
		logo,
	}
}

/**
 * Read the organisation's approved assistant mark from thematiq.
 *
 * Resolves to `{ enabled, label, organisation, logo }` when thematiq reports
 * the mark as on, and to `null` when thematiq is absent, the mark is off, or
 * anything fails. Requests thematiq at most once per page load.
 *
 * @return {Promise<{enabled: boolean, label: string, organisation: string, logo: ?{url: string, alt: string}}|null>} The mark or null.
 */
export function getAssistantMark() {
	if (pending) {
		return pending
	}
	if (!isAppInstalled('thematiq')) {
		return Promise.resolve(null)
	}
	pending = axios.get(generateUrl(MARK_PATH))
		.then((response) => normalizeMark(response && response.data))
		.catch(() => null)
	return pending
}

/**
 * Forget the cached read. Test helper; a page reload does this in production.
 *
 * @return {void}
 */
export function resetAssistantMark() {
	pending = null
}

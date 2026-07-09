/**
 * SPDX-FileCopyrightText: 2026 Conduction b.v.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tolerant replacement for @nextcloud/vue's internal systemtags fetch.
 *
 * Upstream NcSelectTags parses the `/systemtags/` PROPFIND multistatus by
 * walking `json['d:multistatus']['d:response']` with a `for…in` loop and then
 * reading `response['d:propstat']['d:status']`. When the collection contains a
 * single `<d:response>` (an instance with zero system tags returns only the
 * collection root, with a 404 propstat), the XML→JSON step yields an object
 * rather than an array, so the loop iterates the object's *keys* (`d:href`,
 * `d:propstat`) and dereferences `undefined['d:status']` — throwing
 * "Cannot read properties of undefined (reading 'd:status')", logged as
 * "Loading systemtags failed".
 *
 * This parser walks the DOM by namespace (immune to single-vs-array shape and
 * prefix differences) and skips any response whose propstat is not 200, so an
 * instance with no tags simply yields an empty list instead of an error.
 */

import axios from '@nextcloud/axios'
import { generateRemoteUrl } from '@nextcloud/router'

const DAV_NS = 'DAV:'
const OC_NS = 'http://owncloud.org/ns'

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
	<d:prop>
		<oc:id />
		<oc:display-name />
		<oc:user-visible />
		<oc:user-assignable />
		<oc:can-assign />
	</d:prop>
</d:propfind>`

/**
 * Parse a `/systemtags/` PROPFIND multistatus response body into tag objects.
 *
 * @param {string} xml The raw XML multistatus body.
 * @return {Array<{id: number, displayName: string, canAssign: boolean, userAssignable: boolean, userVisible: boolean}>} The parsed tags (empty when none).
 *
 * @tested Nextcloud 33 — the parsed multistatus shape (DAV/oc namespaces,
 *   per-propstat `d:status`) is server-version dependent; append versions
 *   here as the response shape is reverified.
 */
export function parseSystemTags(xml) {
	const result = []
	if (typeof xml !== 'string' || xml === '') {
		return result
	}

	const doc = new DOMParser().parseFromString(xml, 'text/xml')
	const responses = doc.getElementsByTagNameNS(DAV_NS, 'response')

	for (const response of Array.from(responses)) {
		for (const propstat of Array.from(response.getElementsByTagNameNS(DAV_NS, 'propstat'))) {
			const status = propstat.getElementsByTagNameNS(DAV_NS, 'status')[0]?.textContent ?? ''
			// Only 200 propstats carry real values; the collection root comes
			// back as 404 for these tag-specific props and must be skipped.
			if (status.indexOf(' 200 ') === -1) {
				continue
			}

			const prop = propstat.getElementsByTagNameNS(DAV_NS, 'prop')[0]
			if (prop === undefined) {
				continue
			}

			const read = (name) => prop.getElementsByTagNameNS(OC_NS, name)[0]?.textContent
			const id = read('id')
			if (id === undefined || id === '') {
				continue
			}

			result.push({
				id: parseInt(id, 10),
				displayName: read('display-name') ?? '',
				canAssign: read('can-assign') === 'true',
				userAssignable: read('user-assignable') === 'true',
				userVisible: read('user-visible') === 'true',
			})
		}
	}

	return result
}

/**
 * Fetch the instance's system tags via WebDAV PROPFIND.
 *
 * @return {Promise<Array<object>>} The parsed tags; an empty array when the
 *   instance has no system tags (instead of throwing, as upstream does).
 *
 * @tested Nextcloud 33 — the `/remote.php/dav/systemtags/` PROPFIND endpoint
 *   and its multistatus response are server-version dependent; append versions
 *   here as they are verified.
 */
export async function searchSystemTags() {
	const { data } = await axios({
		method: 'PROPFIND',
		url: generateRemoteUrl('dav') + '/systemtags/',
		data: PROPFIND_BODY,
	})
	return parseSystemTags(data)
}

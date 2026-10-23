/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stored reference URL read as words through a lookup endpoint: a
 * selectielijst class URL reads "6.1, Ingewilligd". Each URL is asked once per
 * page load; a failed lookup reads as the URL's last path segment.
 *
 * @spec openspec/changes/retention-expected-outcome/specs/retention-widget/spec.md#requirement-an-open-record-shows-the-outcome-its-type-expects
 */

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

const labels = new Map()

/**
 * The last path segment of a URL.
 *
 * @param {string} url The URL.
 * @return {string} The segment, or the URL when it has none.
 */
export function referenceTail(url) {
	const parts = String(url).split(/[?#]/)[0].split('/').filter(Boolean)
	return parts.length > 0 ? parts[parts.length - 1] : String(url)
}

/**
 * The words for a reference value.
 *
 * @param {string} value The stored value; a value that is not an http(s) URL is returned as it is.
 * @param {{url: string, param?: string, label?: string}|null} lookup The endpoint (under the Nextcloud root),
 *   the query parameter the value goes in (default `url`) and the label template over its answer (default `{code}, {name}`).
 * @return {Promise<string>} The label.
 */
export function referenceLabel(value, lookup) {
	const text = String(value ?? '')
	if (!/^https?:\/\//.test(text)) {
		return Promise.resolve(text)
	}
	if (!lookup || !lookup.url) {
		return Promise.resolve(referenceTail(text))
	}
	const key = `${lookup.url}|${text}`
	if (!labels.has(key)) {
		const template = lookup.label || '{code}, {name}'
		labels.set(key, axios.get(generateUrl(lookup.url), { params: { [lookup.param || 'url']: text } })
			.then(({ data }) => {
				const filled = template.replace(/\{([A-Za-z0-9_]+)\}/g, (_m, field) => String(data?.[field] ?? '')).replace(/^[\s,·]+|[\s,·]+$/g, '')
				return filled || referenceTail(text)
			})
			.catch(() => {
				labels.delete(key)
				return referenceTail(text)
			}))
	}
	return labels.get(key)
}

/**
 * Forget every label read (tests).
 *
 * @return {void}
 */
export function __resetReferenceLabels() {
	labels.clear()
}

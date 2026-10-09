/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useHeldFileUpload — files too big to travel inline in a form payload.
 *
 * A file field holds a `File` that is over the inline cap. The form leaves it
 * out of the saved payload (`splitHeldFiles`), and once the object exists
 * uploads it to the object's files (`uploadHeldFiles`) and writes the returned
 * file references onto the property. A failed upload leaves the object saved
 * and reports which file did not go, so the form can offer Retry.
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * @param {unknown} value A form value or list entry.
 * @return {boolean} True for a `File` held for upload.
 */
export function isHeldFile(value) {
	return typeof File !== 'undefined' && value instanceof File
}

/**
 * Take the held files out of a payload. A single file field loses its value
 * (`null`); a list keeps its inline entries and existing file objects.
 *
 * @param {object} data The form data.
 * @param {string[]} keys The keys of the file fields.
 * @return {{payload: object, held: Object<string, File[]>, kept: Object<string, Array>}} The payload without held files, the held files by key, and the entries each list property keeps (single-file properties have none).
 */
export function splitHeldFiles(data, keys) {
	const payload = { ...data }
	const held = {}
	const kept = {}
	for (const key of keys) {
		const value = payload[key]
		if (Array.isArray(value)) {
			const files = value.filter(isHeldFile)
			if (files.length > 0) {
				held[key] = files
				kept[key] = value.filter((entry) => !isHeldFile(entry))
				payload[key] = kept[key]
			}
		} else if (isHeldFile(value)) {
			held[key] = [value]
			payload[key] = null
		}
	}
	return { payload, held, kept }
}

/**
 * The file references in an upload response, whatever envelope it came in.
 *
 * @param {unknown} data The response body.
 * @return {object[]} The file objects.
 */
function referencesOf(data) {
	if (Array.isArray(data)) {
		return data
	}
	if (data && Array.isArray(data.files)) {
		return data.files
	}
	if (data && Array.isArray(data.results)) {
		return data.results
	}
	return data && typeof data === 'object' ? [data] : []
}

/**
 * Upload the held files of a saved object, then write their references onto
 * the properties.
 *
 * @param {object} options Options.
 * @param {string} options.register The register slug or id.
 * @param {string} options.schema The schema slug or id.
 * @param {string|number} options.objectId The saved object's id.
 * @param {Object<string, File[]>} options.held Files by property key.
 * @param {Object<string, Array>} [options.kept] Entries a list property keeps (inline files, existing file objects).
 * @param {(progress: {key: string, file: string, loaded: number, total: number}) => void} [options.onProgress] Called while a file uploads.
 * @param {string} [options.apiBase] Object API base.
 * @return {Promise<{uploaded: number, failed: Array<{key: string, file: File, reason: string}>, attached: Object<string, (Array|object)>}>} What went up, what did not, and the value each property now holds.
 */
export async function uploadHeldFiles({ register, schema, objectId, held, kept = {}, onProgress, apiBase = '/apps/openregister/api/objects' }) {
	const objectUrl = generateUrl(`${apiBase}/${encodeURIComponent(register)}/${encodeURIComponent(schema)}/${encodeURIComponent(objectId)}`)
	const failed = []
	const attached = {}
	let uploaded = 0
	for (const [key, files] of Object.entries(held)) {
		const refs = []
		for (const file of files) {
			try {
				const body = new FormData()
				body.append('files[]', file)
				const response = await axios.post(`${objectUrl}/filesMultipart`, body, {
					onUploadProgress: (event) => {
						if (typeof onProgress === 'function') {
							onProgress({ key, file: file.name, loaded: event.loaded, total: event.total })
						}
					},
				})
				refs.push(...referencesOf(response && response.data))
				uploaded += 1
			} catch (error) {
				failed.push({ key, file, reason: (error && error.message) || 'upload failed' })
			}
		}
		if (refs.length > 0) {
			// A list keeps its inline and existing entries; a single file property takes the one reference.
			const value = Array.isArray(kept[key]) ? [...kept[key], ...refs] : refs[0]
			try {
				await axios.patch(objectUrl, { [key]: value })
				attached[key] = value
			} catch (error) {
				for (const file of files) {
					failed.push({ key, file, reason: (error && error.message) || 'could not attach' })
				}
			}
		}
	}
	return { uploaded, failed, attached }
}

/**
 * Group failed uploads back into the `held` shape, for a retry.
 *
 * @param {Array<{key: string, file: File}>} failed The failures.
 * @return {Object<string, File[]>} Files by property key.
 */
export function heldFromFailures(failed) {
	const held = {}
	for (const { key, file } of failed) {
		held[key] = [...(held[key] || []), file]
	}
	return held
}

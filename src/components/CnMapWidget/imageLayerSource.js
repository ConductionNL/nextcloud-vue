/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The picture of an image map can come from the record the map sits on: a
 * detail page of a map object writes `{ type: 'image', url: '@object.image',
 * width: '@object.width', height: '@object.height' }`. `@objectId` and
 * `@object.<path>` resolve against the record; a file property (an object
 * with `downloadUrl`, `accessUrl` or `url`, or a list of them) gives its URL.
 * Until the record holds the values the layer is pending, so the map waits
 * instead of opening as a geographic map.
 *
 * @spec openspec/changes/map-image-from-record/specs/manifest-map-widget/spec.md#requirement-an-image-layer-can-take-its-picture-from-the-record
 */
import { readPath } from '../../utils/readPath.js'

/**
 * Resolve one layer value against the record.
 *
 * @param {unknown} value The value as written, such as `@object.width`.
 * @param {{objectId?: string, object?: object}} ctx The record context.
 * @return {unknown} The resolved value, or the token itself when the record does not hold it.
 */
export function layerValue(value, ctx) {
	if (typeof value !== 'string' || value.charAt(0) !== '@') {
		return value
	}
	if (value === '@objectId') {
		return ctx && ctx.objectId ? String(ctx.objectId) : value
	}
	if (value.startsWith('@object.')) {
		const found = readPath((ctx && ctx.object) || {}, value.slice('@object.'.length))
		return found === undefined || found === null || found === '' ? value : found
	}
	return value
}

/**
 * The URL of a picture value: a string as it is, a file object's
 * `downloadUrl`, `accessUrl` or `url`, or the first file of a list.
 *
 * @param {unknown} value The resolved url value.
 * @return {string} The URL, or '' when there is none.
 */
export function fileHref(value) {
	if (typeof value === 'string') {
		return value
	}
	if (Array.isArray(value)) {
		return value.length > 0 ? fileHref(value[0]) : ''
	}
	if (value && typeof value === 'object') {
		for (const key of ['downloadUrl', 'accessUrl', 'url']) {
			if (typeof value[key] === 'string' && value[key] !== '') {
				return value[key]
			}
		}
	}
	return ''
}

/**
 * Whether a resolved value is still an unresolved token.
 *
 * @param {unknown} value The resolved value.
 * @return {boolean} True while the record does not hold it.
 */
function unresolved(value) {
	return typeof value === 'string' && value.charAt(0) === '@'
}

/**
 * The image layer definition with its record tokens resolved.
 *
 * @param {object|null} def The `image` layer as written, or null.
 * @param {{objectId?: string, object?: object}} ctx The record context.
 * @return {{url: unknown, width: unknown, height: unknown, pending: boolean}|null}
 *   The resolved url (a string, possibly unsafe), width and height, and
 *   `pending` while a token has no value yet; null without a layer.
 */
export function resolveImageLayer(def, ctx) {
	if (!def || typeof def !== 'object') {
		return null
	}
	const raw = {
		url: layerValue(def.url, ctx),
		width: layerValue(def.width, ctx),
		height: layerValue(def.height, ctx),
	}
	const pending = unresolved(raw.url) || unresolved(raw.width) || unresolved(raw.height)
	return {
		url: pending ? '' : fileHref(raw.url),
		width: pending ? 0 : Number(raw.width),
		height: pending ? 0 : Number(raw.height),
		pending,
	}
}

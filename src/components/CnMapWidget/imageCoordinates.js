/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pixel helpers for an image map (`CnMapWidget` with an `image` layer).
 *
 * A picture's own coordinates run right (x) and down (y) from its top left;
 * Leaflet's flat CRS runs right (lng) and UP (lat). One pair of helpers maps
 * between the two so markers and clicks agree: pixel (x, y) is
 * `{ lat: -y, lng: x }`.
 *
 * @spec openspec/changes/map-image-layer/tasks.md#task-1
 */

/**
 * The picture's bounds in Leaflet's flat coordinates, `[[south, west], [north, east]]`.
 *
 * @param {number} width The picture's width in pixels.
 * @param {number} height The picture's height in pixels.
 * @return {number[][]} The bounds.
 */
export function imageBounds(width, height) {
	return [[-height, 0], [0, width]]
}

/**
 * The bounds padded on every side by a fraction of the picture, so a drag
 * cannot lose the picture.
 *
 * @param {number} width The picture's width in pixels.
 * @param {number} height The picture's height in pixels.
 * @param {number} [padding] The fraction to pad by (0.1 = 10 percent).
 * @return {number[][]} The padded bounds.
 */
export function paddedImageBounds(width, height, padding = 0.1) {
	const px = width * padding
	const py = height * padding
	return [[-height - py, -px], [py, width + px]]
}

/**
 * Pixel to Leaflet position.
 *
 * @param {number} x Pixels from the left.
 * @param {number} y Pixels from the top.
 * @return {{lat: number, lng: number}} The Leaflet position.
 */
export function toImagePoint(x, y) {
	return { lat: -y, lng: x }
}

/**
 * Leaflet position to pixel, rounded to whole pixels and clamped to the picture.
 *
 * @param {{lat: number, lng: number}} latlng The Leaflet position.
 * @param {{width: number, height: number}} size The picture's size in pixels.
 * @return {{x: number, y: number}} The pixel inside the picture.
 */
export function fromImagePoint(latlng, size) {
	const clamp = (value, max) => Math.min(Math.max(Math.round(value), 0), max)
	return { x: clamp(latlng.lng, size.width), y: clamp(-latlng.lat, size.height) }
}

/**
 * Whether a row can be placed: both fields hold finite numbers.
 *
 * @param {object} row The row.
 * @param {string} xField The property holding x.
 * @param {string} yField The property holding y.
 * @return {boolean} True when plottable.
 */
export function hasImagePosition(row, xField, yField) {
	return !!row && Number.isFinite(row[xField]) && Number.isFinite(row[yField])
}

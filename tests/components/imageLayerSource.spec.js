/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/map-image-from-record/tasks.md#task-1
 */
import { fileHref, layerValue, resolveImageLayer } from '@/components/CnMapWidget/imageLayerSource.js'

const CTX = { objectId: 'm1', object: { width: '2400', height: 1600, map: { file: { url: '/f.png' } }, empty: '' } }

describe('imageLayerSource', () => {
	it('resolves @objectId and @object.<path> against the record', () => {
		expect(layerValue('@objectId', CTX)).toBe('m1')
		expect(layerValue('@object.height', CTX)).toBe(1600)
		expect(layerValue('@object.map.file', CTX)).toEqual({ url: '/f.png' })
		expect(layerValue('@object.missing', CTX)).toBe('@object.missing')
		expect(layerValue('@object.empty', CTX)).toBe('@object.empty')
		expect(layerValue('@objectId', {})).toBe('@objectId')
		expect(layerValue('/img/a.png', CTX)).toBe('/img/a.png')
		expect(layerValue(800, CTX)).toBe(800)
	})

	it('takes a file\'s download, access or plain url, or the first of a list', () => {
		expect(fileHref('/a.png')).toBe('/a.png')
		expect(fileHref({ downloadUrl: '/d', accessUrl: '/a', url: '/u' })).toBe('/d')
		expect(fileHref({ accessUrl: '/a', url: '/u' })).toBe('/a')
		expect(fileHref({ url: '/u' })).toBe('/u')
		expect(fileHref([{ accessUrl: '/first' }, { accessUrl: '/second' }])).toBe('/first')
		expect(fileHref([])).toBe('')
		expect(fileHref({ title: 'no url' })).toBe('')
		expect(fileHref(null)).toBe('')
	})

	it('is pending while a token has no value, and numeric once it has', () => {
		expect(resolveImageLayer(null, CTX)).toBeNull()
		expect(resolveImageLayer({ type: 'image', url: '@object.image', width: 10, height: 10 }, CTX).pending).toBe(true)
		expect(resolveImageLayer({ type: 'image', url: '@object.map.file', width: '@object.width', height: '@object.height' }, CTX))
			.toEqual({ url: '/f.png', width: 2400, height: 1600, pending: false })
	})
})

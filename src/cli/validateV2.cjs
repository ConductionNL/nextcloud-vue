/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CJS-compatible wrapper around validateManifestV2.
 *
 * The main library uses ESM (import/export). The CLI is a Node.js CJS script
 * that runs outside the Babel transform applied by Jest. This wrapper
 * re-implements a minimal version of validateManifestV2 that can be called
 * from CJS context without ESM interop issues.
 *
 * It compiles the same v2 schema via Ajv directly — the source-of-truth
 * schema file is shared; only the module system differs.
 */

'use strict'

const Ajv = require('ajv/dist/2020.js')
const addFormats = require('ajv-formats')
const v2Schema = require('../../src/schemas/app-manifest-v2.schema.json')

const ajvV2 = new Ajv({ useDefaults: true, allErrors: true, strict: false })
addFormats(ajvV2)
const _validateV2Schema = ajvV2.compile(v2Schema)

/**
 * @param {import('ajv').ErrorObject} err
 * @return {string}
 */
function ajvErrorToString(err) {
	const p = err.instancePath || err.schemaPath || ''
	const bracketPath = p.replace(/^\//, '').replace(/\/(\d+)(\/|$)/g, '[$1]$2')
	const message = err.message || 'validation error'
	return bracketPath ? `${bracketPath}: ${message}` : message
}

/**
 * Validate a v2 manifest using the compiled v2 JSON Schema.
 *
 * Mirrors the post-schema checks in validateManifestV2 (ESM version):
 *  - pages[].id uniqueness
 *  - gridX + gridWidth <= 12
 *  - @resolve: sentinel rejection on registry-key paths
 *
 * @param {object} manifest
 * @return {{ valid: boolean, errors: string[] }}
 */
function validateManifestV2(manifest) {
	const clone = JSON.parse(JSON.stringify(manifest))
	const ajvValid = _validateV2Schema(clone)
	const errors = []

	if (!ajvValid && _validateV2Schema.errors) {
		for (const err of _validateV2Schema.errors) {
			errors.push(ajvErrorToString(err))
		}
	}

	// pages[].id uniqueness
	if (Array.isArray(clone.pages)) {
		const seenIds = new Set()
		clone.pages.forEach((page, index) => {
			if (page && typeof page.id === 'string') {
				if (seenIds.has(page.id)) {
					errors.push(`pages[${index}]/id: "${page.id}" must be unique within pages[]`)
				} else {
					seenIds.add(page.id)
				}
			}
		})
	}

	// gridX + gridWidth <= 12
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, pIndex) => {
			if (!page || !Array.isArray(page.widgets)) return
			page.widgets.forEach((widget, wIndex) => {
				if (!widget) return
				const gx = widget.gridX
				const gw = widget.gridWidth
				if (typeof gx === 'number' && typeof gw === 'number' && gx + gw > 12) {
					errors.push(
						`pages[${pIndex}]/widgets[${wIndex}]: Widget '${widget.widgetKey}' in slot '${widget.slot}': gridX (${gx}) + gridWidth (${gw}) exceeds 12`,
					)
				}
			})
		})
	}

	// @resolve: sentinel rejection on key paths
	const sentinelRe = /^@resolve:[a-z][a-z0-9_-]*$/
	const isSentinel = (v) => typeof v === 'string' && sentinelRe.test(v)

	if (isSentinel(clone.version)) {
		errors.push('/version must not be a @resolve: sentinel')
	}
	if (Array.isArray(clone.menu)) {
		clone.menu.forEach((item, i) => {
			if (!item) return
			if (isSentinel(item.id)) errors.push(`/menu/${i}/id must not be a @resolve: sentinel`)
			if (isSentinel(item.route)) errors.push(`/menu/${i}/route must not be a @resolve: sentinel`)
		})
	}
	if (Array.isArray(clone.pages)) {
		clone.pages.forEach((page, i) => {
			if (!page) return
			if (isSentinel(page.id)) errors.push(`/pages/${i}/id must not be a @resolve: sentinel`)
			if (isSentinel(page.route)) errors.push(`/pages/${i}/route must not be a @resolve: sentinel`)
			if (isSentinel(page.component)) errors.push(`/pages/${i}/component must not be a @resolve: sentinel`)
			if (isSentinel(page.headerComponent)) errors.push(`/pages/${i}/headerComponent must not be a @resolve: sentinel`)
			if (isSentinel(page.actionsComponent)) errors.push(`/pages/${i}/actionsComponent must not be a @resolve: sentinel`)
			if (page.slots && typeof page.slots === 'object') {
				for (const [slotName, slotValue] of Object.entries(page.slots)) {
					if (isSentinel(slotValue)) {
						errors.push(`/pages/${i}/slots/${slotName} must not be a @resolve: sentinel`)
					}
				}
			}
		})
	}

	return { valid: errors.length === 0, errors }
}

module.exports = { validateManifestV2 }

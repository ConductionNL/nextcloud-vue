/**
 * Tests for the seven $defs added by the manifest-config-defs change:
 * column, action, widgetDef, layoutItem, formField, sidebarSection,
 * sidebarTab.
 *
 * The library does not depend on Ajv; full JSON-Schema validation is
 * the BE / hydra CI's job. This suite asserts:
 *
 * 1. Every new $def is reachable by JSON-Pointer
 *    (`schema.$defs.<name>`), is an object, declares
 *    `additionalProperties: false`, and carries a top-level
 *    `description` string + per-property descriptions.
 * 2. Each known-good fixture passes a small structural check against
 *    the matching $def.
 * 3. Each known-bad fixture trips at least one of the structural
 *    checks (missing required, unknown additional, enum miss, or
 *    integer minimum).
 *
 * The structural check (`structuralValidate`) is intentionally
 * minimal — it covers `required`, `additionalProperties: false`,
 * `enum`, `minimum`, `type`, and `items` (one level). It is NOT a
 * full Ajv replacement. Adequate for catching the rejection paths
 * we care about for these flat $defs.
 */

import schema from '../../src/schemas/app-manifest.schema.json'

import columnValid from '../fixtures/def-column-valid.json'
import columnInvalid from '../fixtures/def-column-invalid.json'
import actionValid from '../fixtures/def-action-valid.json'
import actionInvalid from '../fixtures/def-action-invalid.json'
import widgetDefValid from '../fixtures/def-widgetDef-valid.json'
import widgetDefInvalid from '../fixtures/def-widgetDef-invalid.json'
import layoutItemValid from '../fixtures/def-layoutItem-valid.json'
import layoutItemInvalid from '../fixtures/def-layoutItem-invalid.json'
import formFieldValid from '../fixtures/def-formField-valid.json'
import formFieldInvalid from '../fixtures/def-formField-invalid.json'
import sidebarSectionValid from '../fixtures/def-sidebarSection-valid.json'
import sidebarSectionInvalid from '../fixtures/def-sidebarSection-invalid.json'
import sidebarTabValid from '../fixtures/def-sidebarTab-valid.json'
import sidebarTabInvalid from '../fixtures/def-sidebarTab-invalid.json'

import { validateManifest } from '../../src/utils/validateManifest.js'
import valid from '../fixtures/manifest-valid.json'

/**
 * Minimal structural validator for a single object against a JSON
 * Schema-style $def. Returns { valid: boolean, errors: string[] }.
 *
 * Supports: required, additionalProperties:false, type, enum,
 * minimum, items (one level), and recurses into nested object props
 * exactly one level deep (the current $defs are flat plus one inner
 * object on `sidebarSection.fields[]`).
 *
 * @param {object} def The $def schema fragment.
 * @param {*} value The value to validate.
 * @param {string} [path] Current pointer path for error messages.
 * @return {{valid: boolean, errors: string[]}}
 */
function structuralValidate(def, value, path = '$') {
	const errors = []
	if (def.type === 'object') {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			errors.push(`${path}: must be object`)
			return { valid: false, errors }
		}
		const required = Array.isArray(def.required) ? def.required : []
		for (const key of required) {
			if (!(key in value)) errors.push(`${path}.${key}: required`)
		}
		const props = def.properties || {}
		const allowExtra = def.additionalProperties === true
		for (const key of Object.keys(value)) {
			if (props[key]) {
				const sub = structuralValidate(props[key], value[key], `${path}.${key}`)
				errors.push(...sub.errors)
			} else if (!allowExtra) {
				errors.push(`${path}.${key}: unknown property`)
			}
		}
		return { valid: errors.length === 0, errors }
	}
	if (def.type === 'array') {
		if (!Array.isArray(value)) {
			errors.push(`${path}: must be array`)
			return { valid: false, errors }
		}
		if (def.items) {
			value.forEach((item, i) => {
				const sub = structuralValidate(def.items, item, `${path}[${i}]`)
				errors.push(...sub.errors)
			})
		}
		return { valid: errors.length === 0, errors }
	}
	if (def.type === 'integer') {
		if (typeof value !== 'number' || !Number.isInteger(value)) {
			errors.push(`${path}: must be integer`)
		} else if (typeof def.minimum === 'number' && value < def.minimum) {
			errors.push(`${path}: must be >= ${def.minimum}`)
		}
		return { valid: errors.length === 0, errors }
	}
	if (def.type === 'string') {
		if (typeof value !== 'string') {
			errors.push(`${path}: must be string`)
		} else if (Array.isArray(def.enum) && !def.enum.includes(value)) {
			errors.push(`${path}: must be one of ${def.enum.join(', ')}`)
		}
		return { valid: errors.length === 0, errors }
	}
	if (def.type === 'boolean') {
		if (typeof value !== 'boolean') errors.push(`${path}: must be boolean`)
		return { valid: errors.length === 0, errors }
	}
	// def.type undefined (e.g. formField.default — "any") — accept.
	return { valid: true, errors: [] }
}

const ALL_DEFS = ['column', 'action', 'widgetDef', 'layoutItem', 'formField', 'sidebarSection', 'sidebarTab']

describe('app-manifest.schema.json — config $defs reachability', () => {
	it.each(ALL_DEFS)('declares $defs.%s as a well-formed object schema', (name) => {
		const def = schema.$defs[name]
		expect(def).toBeDefined()
		expect(def.type).toBe('object')
		expect(def.additionalProperties).toBe(false)
		expect(typeof def.description).toBe('string')
		expect(def.description.length).toBeGreaterThan(0)
		expect(typeof def.properties).toBe('object')
		// every property carries its own description
		for (const [key, prop] of Object.entries(def.properties)) {
			expect(typeof prop.description).toBe('string')
			if (!prop.description.length) {
				throw new Error(`$defs.${name}.properties.${key} missing description`)
			}
		}
	})
})

describe('$defs.column', () => {
	it('accepts a known-good column', () => {
		const r = structuralValidate(schema.$defs.column, columnValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects a known-bad column', () => {
		const r = structuralValidate(schema.$defs.column, columnInvalid)
		expect(r.valid).toBe(false)
		// missing key
		expect(r.errors.some((e) => e.includes('key: required'))).toBe(true)
		// unknown extraField
		expect(r.errors.some((e) => e.includes('extraField: unknown property'))).toBe(true)
		// align "diagonal" not in enum
		expect(r.errors.some((e) => e.includes('align: must be one of'))).toBe(true)
	})
	it('declares align as a closed enum of left|center|right', () => {
		expect(schema.$defs.column.properties.align.enum).toEqual(['left', 'center', 'right'])
	})
})

describe('$defs.action', () => {
	it('accepts a known-good action', () => {
		const r = structuralValidate(schema.$defs.action, actionValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects an action missing label', () => {
		const r = structuralValidate(schema.$defs.action, actionInvalid)
		expect(r.valid).toBe(false)
		expect(r.errors.some((e) => e.includes('label: required'))).toBe(true)
	})
})

describe('$defs.widgetDef', () => {
	it('accepts a known-good widgetDef', () => {
		const r = structuralValidate(schema.$defs.widgetDef, widgetDefValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects a widgetDef missing type', () => {
		const r = structuralValidate(schema.$defs.widgetDef, widgetDefInvalid)
		expect(r.valid).toBe(false)
		expect(r.errors.some((e) => e.includes('type: required'))).toBe(true)
	})
})

describe('$defs.layoutItem', () => {
	it('accepts a known-good layoutItem', () => {
		const r = structuralValidate(schema.$defs.layoutItem, layoutItemValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects a layoutItem with gridWidth=0', () => {
		const r = structuralValidate(schema.$defs.layoutItem, layoutItemInvalid)
		expect(r.valid).toBe(false)
		expect(r.errors.some((e) => e.includes('gridWidth: must be >= 1'))).toBe(true)
	})
})

describe('$defs.formField', () => {
	it('accepts a known-good formField', () => {
		const r = structuralValidate(schema.$defs.formField, formFieldValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects a formField with type "datetime"', () => {
		const r = structuralValidate(schema.$defs.formField, formFieldInvalid)
		expect(r.valid).toBe(false)
		expect(r.errors.some((e) => e.includes('type: must be one of'))).toBe(true)
	})
	it('declares type as a closed enum of the six allowed values', () => {
		expect(schema.$defs.formField.properties.type.enum).toEqual(
			['boolean', 'number', 'string', 'enum', 'password', 'json'],
		)
	})
})

describe('$defs.sidebarSection', () => {
	it('accepts a known-good sidebarSection', () => {
		const r = structuralValidate(schema.$defs.sidebarSection, sidebarSectionValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects a sidebarSection missing id', () => {
		const r = structuralValidate(schema.$defs.sidebarSection, sidebarSectionInvalid)
		expect(r.valid).toBe(false)
		expect(r.errors.some((e) => e.includes('id: required'))).toBe(true)
	})
})

describe('$defs.sidebarTab', () => {
	it('accepts a known-good sidebarTab', () => {
		const r = structuralValidate(schema.$defs.sidebarTab, sidebarTabValid)
		expect(r).toEqual({ valid: true, errors: [] })
	})
	it('rejects a sidebarTab missing id', () => {
		const r = structuralValidate(schema.$defs.sidebarTab, sidebarTabInvalid)
		expect(r.valid).toBe(false)
		expect(r.errors.some((e) => e.includes('id: required'))).toBe(true)
	})
})

describe('manifest-config-defs additivity', () => {
	it('schema version reflects manifest-actions-dispatch follow-up bump (1.3.0)', () => {
		// The page-type-extensions and abstract-sidebar changes bumped the
		// schema version (to 1.1.0 in feature/manifest-v1). The follow-up
		// manifest-config-refs change wired up $refs and bumped to 1.2.0.
		// The manifest-actions-dispatch change adds `handler` + `route` to
		// the `action` $def and bumps to 1.3.0. This file's defs are still
		// present and reachable; the assertion just keeps in sync with
		// the latest base.
		expect(schema.version).toBe('1.3.0')
	})

	it('keeps pages[].config OUTER additionalProperties as true (per-app keys remain free-form)', () => {
		// manifest-config-refs adds typed $refs on the inner array items
		// (columns/actions/widgets/layout/sections.fields/sidebar.tabs/etc.)
		// but the outer config block intentionally stays open so that
		// per-type scalars (register, schema, source, folder, …) and
		// consumer-app extension keys keep validating.
		expect(schema.$defs.page.properties.config.additionalProperties).toBe(true)
	})

	it('preserves the existing menuItem, menuItemLeaf, page $defs', () => {
		expect(schema.$defs.menuItem).toBeDefined()
		expect(schema.$defs.menuItemLeaf).toBeDefined()
		expect(schema.$defs.page).toBeDefined()
	})

	it('keeps the existing valid manifest fixture validating cleanly', () => {
		const result = validateManifest(valid)
		expect(result).toEqual({ valid: true, errors: [] })
	})
})

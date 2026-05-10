/**
 * Tests for the $ref wiring added by the manifest-config-refs change.
 *
 * Asserts that the seven $defs (column, action, widgetDef, layoutItem,
 * formField, sidebarSection, sidebarTab) are now referenced from the
 * recurring `pages[].config` sub-properties they describe, that
 * known-good config fragments validate against the typed shapes, and
 * that fragments missing required $def fields are flagged.
 *
 * The library does not depend on Ajv; this suite uses a hand-rolled
 * structural validator (reusing the pattern from
 * app-manifest-defs.spec.js) extended with $ref / oneOf resolution.
 * The validator is intentionally minimal — it covers `required`,
 * `additionalProperties:false`, `type`, `enum`, `minimum`, `items`,
 * `$ref`, and `oneOf`. Sufficient for catching the rejection paths
 * relevant to the new $refs.
 */

import schema from '../../src/schemas/app-manifest.schema.json'
import { validateManifest } from '../../src/utils/validateManifest.js'

import valid from '../fixtures/manifest-valid.json'
import allTypes from '../fixtures/manifest-all-types.json'
import settingsRich from '../fixtures/manifest-settings-rich.json'
import sidebarShow from '../fixtures/manifest-sidebar-show.json'

/**
 * Resolve a JSON-Pointer fragment of the form "#/$defs/foo" against
 * the loaded schema.
 *
 * @param {string} ref The $ref string.
 * @return {object} The referenced schema fragment.
 */
function resolveRef(ref) {
	if (typeof ref !== 'string' || !ref.startsWith('#/')) {
		throw new Error(`Unsupported $ref: ${ref}`)
	}
	const parts = ref.slice(2).split('/')
	let target = schema
	for (const part of parts) {
		target = target[part]
		if (target === undefined) {
			throw new Error(`Unable to resolve $ref ${ref} at part ${part}`)
		}
	}
	return target
}

/**
 * Structural validator that follows $ref and oneOf.
 *
 * @param {object} def Schema fragment (may contain `$ref` or `oneOf`).
 * @param {*} value Value to validate.
 * @param {string} [path] Pointer-style path for error messages.
 * @return {{valid: boolean, errors: string[]}}
 */
function validateAgainst(def, value, path = '$') {
	if (def && def.$ref) {
		return validateAgainst(resolveRef(def.$ref), value, path)
	}
	if (def && Array.isArray(def.oneOf)) {
		const branchResults = def.oneOf.map((branch) => validateAgainst(branch, value, path))
		const passing = branchResults.filter((r) => r.valid)
		if (passing.length === 1) {
			return { valid: true, errors: [] }
		}
		if (passing.length === 0) {
			return {
				valid: false,
				errors: [`${path}: did not match any oneOf branch (${branchResults.map((r) => r.errors.join('; ')).join(' || ')})`],
			}
		}
		return { valid: false, errors: [`${path}: matched ${passing.length} oneOf branches (must match exactly one)`] }
	}
	const errors = []
	if (!def || def.type === undefined) {
		// Untyped fragment — accept anything (e.g. formField.default).
		return { valid: true, errors: [] }
	}
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
		const allowExtra = def.additionalProperties === true || isPlainObject(def.additionalProperties)
		for (const key of Object.keys(value)) {
			if (props[key]) {
				const sub = validateAgainst(props[key], value[key], `${path}.${key}`)
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
				const sub = validateAgainst(def.items, item, `${path}[${i}]`)
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
	return { valid: true, errors: [] }
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const configProps = schema.$defs.page.properties.config.properties

describe('app-manifest.schema.json — manifest-config-refs $ref wiring', () => {
	it('schema version is 1.3.0 (manifest-actions-dispatch)', () => {
		expect(schema.version).toBe('1.3.0')
	})

	it('keeps pages[].config OUTER additionalProperties true (per-app keys remain free-form)', () => {
		expect(schema.$defs.page.properties.config.additionalProperties).toBe(true)
	})

	it('declares typed properties on pages[].config for the recurring sub-shapes', () => {
		expect(configProps.columns).toBeDefined()
		expect(configProps.actions).toBeDefined()
		expect(configProps.widgets).toBeDefined()
		expect(configProps.layout).toBeDefined()
		expect(configProps.sections).toBeDefined()
		expect(configProps.sidebar).toBeDefined()
		expect(configProps.sidebarProps).toBeDefined()
	})
})

describe('config.columns[] — oneOf [string, $ref column]', () => {
	const def = configProps.columns

	it('items is a oneOf with string + $ref column', () => {
		expect(def.items.oneOf).toHaveLength(2)
		const refs = def.items.oneOf.map((b) => b.$ref || b.type)
		expect(refs).toEqual(expect.arrayContaining(['string', '#/$defs/column']))
	})

	it('accepts the legacy string-shorthand columns array', () => {
		const result = validateAgainst(def, ['title', 'status', 'deadline'], '$.columns')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('accepts a typed object columns array', () => {
		const result = validateAgainst(def, [{ key: 'title', label: 'Title' }], '$.columns')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects a typed column missing label', () => {
		const result = validateAgainst(def, [{ key: 'title' }], '$.columns')
		expect(result.valid).toBe(false)
		// oneOf failure surfaces both branch errors; check the typed branch
		// rejection is referenced.
		expect(result.errors.join('|')).toMatch(/label: required/)
	})

	it('rejects a typed column with align "diagonal"', () => {
		const result = validateAgainst(def, [{ key: 'title', label: 'Title', align: 'diagonal' }], '$.columns')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/align: must be one of/)
	})
})

describe('config.actions[] — $ref action', () => {
	const def = configProps.actions

	it('items refs $defs/action', () => {
		expect(def.items.$ref).toBe('#/$defs/action')
	})

	it('accepts a known-good actions array', () => {
		const result = validateAgainst(def, [{ id: 'edit', label: 'Edit', primary: true }], '$.actions')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects an action missing label', () => {
		const result = validateAgainst(def, [{ id: 'edit' }], '$.actions')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/label: required/)
	})

	it('FE validator surfaces the missing label with a JSON-pointer path', () => {
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{ id: 'i', route: '/', type: 'index', title: 't', config: { actions: [{ id: 'edit' }] } }],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/pages/0/config/actions/0/label'))).toBe(true)
	})

	// --- manifest-actions-dispatch (REQ-MAD-1, REQ-MAD-2) ---

	it('accepts an action with a registry-name handler', () => {
		const result = validateAgainst(
			def,
			[{ id: 'process', label: 'Process', handler: 'queueProcessHandler' }],
			'$.actions',
		)
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('accepts an action with handler:"navigate" + route', () => {
		const result = validateAgainst(
			def,
			[{ id: 'view', label: 'View', handler: 'navigate', route: 'QueueDetail' }],
			'$.actions',
		)
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('FE validator rejects handler:"navigate" missing route', () => {
		const result = validateManifest({
			version: '1.3.0',
			menu: [],
			pages: [{
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { actions: [{ id: 'view', label: 'View', handler: 'navigate' }] },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('route: required when handler is "navigate"'))).toBe(true)
	})

	it('FE validator rejects a handler containing a hyphen (pattern violation)', () => {
		const result = validateManifest({
			version: '1.3.0',
			menu: [],
			pages: [{
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { actions: [{ id: 'x', label: 'X', handler: 'with-dash' }] },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('handler:'))).toBe(true)
	})

	it('FE validator accepts each reserved keyword (navigate / emit / none)', () => {
		const result = validateManifest({
			version: '1.3.0',
			menu: [],
			pages: [{
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: {
					actions: [
						{ id: 'a', label: 'A', handler: 'navigate', route: 'X' },
						{ id: 'b', label: 'B', handler: 'emit' },
						{ id: 'c', label: 'C', handler: 'none' },
					],
				},
			}],
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('FE validator rejects a non-string handler', () => {
		const result = validateManifest({
			version: '1.3.0',
			menu: [],
			pages: [{
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { actions: [{ id: 'x', label: 'X', handler: 42 }] },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('handler: must be a string'))).toBe(true)
	})

	it('v1.2 manifest (no handler) keeps validating against v1.3 schema', () => {
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: { actions: [{ id: 'edit', label: 'Edit', primary: true }] },
			}],
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})

describe('config.widgets[] — $ref widgetDef', () => {
	const def = configProps.widgets

	it('items refs $defs/widgetDef', () => {
		expect(def.items.$ref).toBe('#/$defs/widgetDef')
	})

	it('accepts a known-good widgets array', () => {
		const result = validateAgainst(def, [{ id: 'kpis', title: 'KPIs', type: 'custom' }], '$.widgets')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects a widget missing required type', () => {
		const result = validateAgainst(def, [{ id: 'kpis', title: 'KPIs' }], '$.widgets')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/type: required/)
	})

	it('FE validator surfaces the missing type', () => {
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{
				id: 'overview',
				route: '/',
				type: 'dashboard',
				title: 't',
				config: { widgets: [{ id: 'kpis', title: 'KPIs' }], layout: [] },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/pages/0/config/widgets/0/type'))).toBe(true)
	})
})

describe('config.layout[] — $ref layoutItem', () => {
	const def = configProps.layout

	it('items refs $defs/layoutItem', () => {
		expect(def.items.$ref).toBe('#/$defs/layoutItem')
	})

	it('accepts a known-good layout array', () => {
		const result = validateAgainst(def, [{
			id: 'p1', widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 3,
		}], '$.layout')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects a layoutItem with gridWidth=0', () => {
		const result = validateAgainst(def, [{
			id: 'p1', widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 0, gridHeight: 3,
		}], '$.layout')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/gridWidth: must be >= 1/)
	})

	it('FE validator surfaces gridWidth=0 with a JSON-pointer path', () => {
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{
				id: 'overview',
				route: '/',
				type: 'dashboard',
				title: 't',
				config: {
					widgets: [{ id: 'kpis', title: 'K', type: 'custom' }],
					layout: [{ id: 'p1', widgetId: 'kpis', gridX: 0, gridY: 0, gridWidth: 0, gridHeight: 3 }],
				},
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/pages/0/config/layout/0/gridWidth'))).toBe(true)
	})
})

describe('config.sections[].fields[] — $ref formField', () => {
	const def = configProps.sections.items.properties.fields

	it('items refs $defs/formField', () => {
		expect(def.items.$ref).toBe('#/$defs/formField')
	})

	it('accepts a known-good fields array', () => {
		const result = validateAgainst(def, [
			{ key: 'flag', label: 'Flag', type: 'boolean', default: false },
		], '$.fields')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects a field with type "datetime"', () => {
		const result = validateAgainst(def, [{ key: 'k', label: 'L', type: 'datetime' }], '$.fields')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/type: must be one of/)
	})

	it('FE validator surfaces type "datetime" with a JSON-pointer path', () => {
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{
				id: 'app-settings',
				route: '/settings',
				type: 'settings',
				title: 't',
				config: { sections: [{ title: 'g', fields: [{ key: 'k', label: 'L', type: 'datetime' }] }] },
			}],
		})
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('/pages/0/config/sections/0/fields/0/type'))).toBe(true)
	})

	it('keeps section.widgets[] untyped (settings widgets use a thinner shape)', () => {
		// section.widgets[] is intentionally NOT $ref-ed — settings widgets
		// use `{ type, props? }`, NOT the full widgetDef shape.
		const def2 = configProps.sections.items.properties.widgets
		// May be undefined (no `properties.widgets` block) — that's fine,
		// because `additionalProperties:true` lets the section accept it.
		// What we care about: if it IS typed, it's NOT a widgetDef ref.
		if (def2) {
			expect(def2.items?.$ref).not.toBe('#/$defs/widgetDef')
		}
	})
})

describe('config.sidebar.columnGroups[] — $ref sidebarSection', () => {
	// sidebar is a oneOf [boolean, object]; columnGroups lives on the object branch.
	const sidebarDef = configProps.sidebar
	expect(sidebarDef.oneOf).toHaveLength(2)
	const objectBranch = sidebarDef.oneOf.find((b) => b.type === 'object')
	const cgDef = objectBranch.properties.columnGroups

	it('items refs $defs/sidebarSection', () => {
		expect(cgDef.items.$ref).toBe('#/$defs/sidebarSection')
	})

	it('accepts a known-good columnGroups array', () => {
		const result = validateAgainst(cgDef, [
			{ id: 'metadata', label: 'Metadata', fields: [{ key: 'owner', label: 'Owner' }] },
		], '$.columnGroups')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects a columnGroup missing id', () => {
		const result = validateAgainst(cgDef, [{ label: 'Metadata' }], '$.columnGroups')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/id: required/)
	})
})

describe('config.sidebar — oneOf [boolean, object with tabs[] $ref sidebarTab]', () => {
	const sidebarDef = configProps.sidebar

	it('declares oneOf [boolean, object]', () => {
		const branches = sidebarDef.oneOf.map((b) => b.type)
		expect(branches).toEqual(expect.arrayContaining(['boolean', 'object']))
	})

	it('accepts the legacy boolean form (true)', () => {
		const result = validateAgainst(sidebarDef, true, '$.sidebar')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('accepts the Object form with typed tabs[]', () => {
		const result = validateAgainst(sidebarDef, {
			register: 'r',
			schema: 's',
			tabs: [{ id: 't', label: 'Tab 1' }],
		}, '$.sidebar')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects an Object form with a tab missing id', () => {
		const result = validateAgainst(sidebarDef, {
			tabs: [{ label: 'Tab 1' }],
		}, '$.sidebar')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/id: required/)
	})

	it('keeps the Object branch additionalProperties true (register/schema/title/etc. stay open)', () => {
		const objectBranch = sidebarDef.oneOf.find((b) => b.type === 'object')
		expect(objectBranch.additionalProperties).toBe(true)
	})
})

describe('config.sidebarProps.tabs[] — $ref sidebarTab (legacy path)', () => {
	const def = configProps.sidebarProps.properties.tabs

	it('items refs $defs/sidebarTab', () => {
		expect(def.items.$ref).toBe('#/$defs/sidebarTab')
	})

	it('accepts a known-good tabs array', () => {
		const result = validateAgainst(def, [{ id: 'details', label: 'Details' }], '$.sidebarProps.tabs')
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('rejects a tab missing label', () => {
		const result = validateAgainst(def, [{ id: 'details' }], '$.sidebarProps.tabs')
		expect(result.valid).toBe(false)
		expect(result.errors.join('|')).toMatch(/label: required/)
	})
})

// ---------------------------------------------------------------------------
// Backwards-compatibility: every existing fixture stays valid.
// ---------------------------------------------------------------------------
describe('manifest-config-refs backwards compatibility', () => {
	const fixtures = [
		['manifest-valid', valid],
		['manifest-all-types', allTypes],
		['manifest-settings-rich', settingsRich],
		['manifest-sidebar-show', sidebarShow],
	]

	it.each(fixtures)('%s — passes validateManifest after schema bump', (_name, fixture) => {
		const result = validateManifest(fixture)
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('legacy string-shorthand columns: ["title","status","deadline"] still validates', () => {
		// The two big fixtures use this shorthand; cover it with an explicit
		// in-test assertion so the contract is visible here too.
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{
				id: 'i',
				route: '/',
				type: 'index',
				title: 't',
				config: {
					register: 'r',
					schema: 's',
					columns: ['title', 'status', 'deadline'],
				},
			}],
		})
		expect(result.valid).toBe(true)
	})

	it('legacy detail.config.sidebar: true (boolean) still validates', () => {
		const result = validateManifest({
			version: '1.2.0',
			menu: [],
			pages: [{
				id: 'd',
				route: '/d/:id',
				type: 'detail',
				title: 't',
				config: { register: 'r', schema: 's', sidebar: true },
			}],
		})
		expect(result.valid).toBe(true)
	})
})

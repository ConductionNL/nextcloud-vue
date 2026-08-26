/**
 * A built manifest must validate against the same schema its source does.
 *
 * `mergeMenuItems` used to copy `children` with a ternary whose else-branch
 * assigned `item.children` — `undefined`. Assigning undefined is not the same
 * as leaving a key off: `Object.keys()` and JSON-Schema's
 * `additionalProperties: false` both see a key that is present. So every leaf
 * menu entry came out of `buildManifest` carrying a `children` property, and
 * the built manifest failed validation against the schema its own source
 * passes.
 *
 * It stayed invisible because `JSON.stringify` drops undefined values — so
 * anything that logged, persisted or diffed the manifest showed nothing wrong.
 * Only a key-level check sees it.
 */

const { buildManifest, mergeMenuItems } = require('../../src/utils/buildManifest.js')
// The PUBLIC wrapper, not the raw compiled validator. The compiled one is
// built with Ajv `useDefaults: true`, so calling it directly MUTATES the object
// it validates — `menuItem.open` has `default: false`, so a validated manifest
// comes back with `open` stamped on every top-level entry. `validateManifestV2`
// clones first for exactly that reason. A test that skipped the wrapper would
// be measuring the mutation, not the code under test.
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
const validate = (m) => validateManifestV2(m).valid

const V2 = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

describe('mergeMenuItems — no undefined children key', () => {
	it('omits `children` entirely for a leaf', () => {
		const target = []
		mergeMenuItems(target, [{ id: 'a', label: 'A', route: 'A' }])
		expect(Object.prototype.hasOwnProperty.call(target[0], 'children')).toBe(false)
	})

	it('still copies a real children array', () => {
		const target = []
		mergeMenuItems(target, [{ id: 'g', label: 'G', children: [{ id: 'c', label: 'C' }] }])
		expect(target[0].children).toEqual([{ id: 'c', label: 'C' }])
	})

	it('copies the array rather than aliasing it', () => {
		const src = [{ id: 'c', label: 'C' }]
		const target = []
		mergeMenuItems(target, [{ id: 'g', label: 'G', children: src }])
		target[0].children.push({ id: 'x' })
		expect(src).toHaveLength(1)
	})

	it('keeps an explicitly empty children array', () => {
		const target = []
		mergeMenuItems(target, [{ id: 'g', label: 'G', children: [] }])
		expect(target[0].children).toEqual([])
	})
})

describe('the built manifest validates', () => {
	it('a manifest whose source validates still validates after buildManifest', () => {
		const base = {
			$schema: V2,
			version: '2.25.0',
			menu: [
				{ id: 'Home', label: 'Home', route: 'Home' },
				{ id: 'Group', label: 'Group', children: [{ id: 'Leaf', label: 'Leaf', route: 'Leaf' }] },
			],
			pages: [{ id: 'Home', route: '/', type: 'index', title: 'Home', config: { register: 'r', schema: 's' } }],
		}
		expect(validate(base)).toBe(true)

		const built = buildManifest(base, [], {})
		const ok = validate({ ...built, $schema: V2 })
		if (!ok) {
			// Name the offending keys rather than just failing — the whole point
			// of this test is that the difference is invisible in a JSON dump.
			throw new Error('built manifest invalid: ' + JSON.stringify(validateManifestV2({ ...built, $schema: V2 }).errors?.slice(0, 5)))
		}
		expect(ok).toBe(true)
	})

	it('survives fragments merging into an existing group', () => {
		const base = {
			$schema: V2,
			version: '2.25.0',
			menu: [{ id: 'Group', label: 'Group', children: [{ id: 'A', label: 'A', route: 'A' }] }],
			pages: [],
		}
		const fragment = { menu: [{ id: 'Group', children: [{ id: 'B', label: 'B', route: 'B' }] }] }
		const built = buildManifest(base, [fragment], {})
		expect(validate({ ...built, $schema: V2 })).toBe(true)
		expect(built.menu[0].children.map((c) => c.id)).toEqual(['A', 'B'])
	})
})

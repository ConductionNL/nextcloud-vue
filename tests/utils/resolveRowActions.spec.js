/**
 * Tests for resolveRowActions (row-action-builtin-placement): one ordered list of row actions from a page's declared entries and its enabled built-ins.
 */

import { BUILTIN_ROW_ACTION_IDS, isBuiltinPlaceholder, resolveRowActions } from '../../src/utils/resolveRowActions.js'

const VIEW = { id: 'view', builtin: true, label: 'View' }
const EDIT = { id: 'edit', builtin: true, label: 'Edit' }
const COPY = { id: 'copy', builtin: true, label: 'Copy' }
const DELETE = { id: 'delete', builtin: true, label: 'Delete' }
const ALL = [VIEW, EDIT, COPY, DELETE]

/**
 * @param {Array} actions Resolved actions.
 * @return {string[]} Their labels.
 */
const labels = (actions) => actions.map((a) => a.label)

/**
 * @param {Array} warnings Resolver warnings.
 * @return {string[]} Their codes.
 */
const codes = (warnings) => warnings.map((w) => w.code)

describe('isBuiltinPlaceholder', () => {
	it('accepts exactly the four placeholders', () => {
		expect(BUILTIN_ROW_ACTION_IDS.map((id) => isBuiltinPlaceholder(`builtin:${id}`))).toEqual([true, true, true, true])
		expect(isBuiltinPlaceholder('builtin:archive')).toBe(false)
		expect(isBuiltinPlaceholder('edit')).toBe(false)
		expect(isBuiltinPlaceholder({ id: 'builtin:edit' })).toBe(false)
	})
})

describe('resolveRowActions', () => {
	it('resolves the OpenCatalogi Publications example to Edit, Copy, File list, Delete', () => {
		const declared = ['builtin:edit', 'builtin:copy', { id: 'file-list', label: 'File list' }, 'builtin:delete']
		const { actions, warnings, deleteNotLast } = resolveRowActions(declared, [EDIT, COPY, DELETE])
		expect(labels(actions)).toEqual(['Edit', 'Copy', 'File list', 'Delete'])
		expect(warnings).toEqual([])
		expect(deleteNotLast).toBe(false)
	})

	it('appends the enabled built-ins it does not place, in default order', () => {
		const { actions } = resolveRowActions(['builtin:edit', { id: 'archive', label: 'Archive' }], ALL)
		expect(labels(actions)).toEqual(['Edit', 'Archive', 'View', 'Copy', 'Delete'])
	})

	it('renders a page without placeholders exactly as before: app actions, then built-ins', () => {
		const { actions, warnings } = resolveRowActions([{ id: 'archive', label: 'Archive' }], ALL)
		expect(labels(actions)).toEqual(['Archive', 'View', 'Edit', 'Copy', 'Delete'])
		expect(warnings).toEqual([])
	})

	it('renders nothing for a placeholder whose built-in is off, and says so', () => {
		const { actions, warnings } = resolveRowActions(['builtin:edit', 'builtin:copy'], [VIEW, EDIT, DELETE])
		expect(labels(actions)).toEqual(['Edit', 'View', 'Delete'])
		expect(codes(warnings)).toEqual(['disabled-placeholder'])
		expect(warnings[0].message).toContain('builtin:copy')
	})

	it('keeps the first position of a repeated placeholder, and says so', () => {
		const { actions, warnings } = resolveRowActions(['builtin:delete', { id: 'open', label: 'Open' }, 'builtin:delete'], [DELETE])
		expect(labels(actions)).toEqual(['Delete', 'Open'])
		expect(codes(warnings)).toEqual(['repeated-placeholder', 'delete-not-last'])
	})

	it('drops any other string with the invalid-entry warning', () => {
		const { actions, warnings } = resolveRowActions(['edit', 'builtin:archive', { id: 'a', label: 'A' }], [])
		expect(labels(actions)).toEqual(['A'])
		expect(codes(warnings)).toEqual(['invalid-entry', 'invalid-entry'])
		expect(warnings[0].message).toContain('"edit"')
		expect(warnings[0].message).toContain('showEditAction')
	})

	it('keeps an object with a reserved id an app action beside the built-in', () => {
		const openEditor = { id: 'edit', label: 'Open editor' }
		const { actions } = resolveRowActions([openEditor], [EDIT])
		expect(actions).toEqual([openEditor, EDIT])
	})

	it('ignores a builtin key on an object, so it cannot pass for a built-in', () => {
		const { actions, warnings } = resolveRowActions([{ id: 'edit', label: 'Fake', builtin: true }], [EDIT])
		expect(actions[0]).toEqual({ id: 'edit', label: 'Fake' })
		expect(actions[1]).toBe(EDIT)
		expect(codes(warnings)).toEqual(['builtin-key-ignored'])
	})

	it('runs every app action through prepare, and never a built-in', () => {
		const prepare = jest.fn((a) => ({ ...a, prepared: true }))
		const { actions } = resolveRowActions([{ id: 'a', label: 'A' }, 'builtin:edit'], [EDIT], { prepare })
		expect(prepare).toHaveBeenCalledTimes(1)
		expect(actions).toEqual([{ id: 'a', label: 'A', prepared: true }, EDIT])
	})

	it('reports Delete placed before other entries', () => {
		const { actions, warnings, deleteNotLast } = resolveRowActions(['builtin:delete', 'builtin:edit'], ALL)
		expect(labels(actions)).toEqual(['Delete', 'Edit', 'View', 'Copy'])
		expect(deleteNotLast).toBe(true)
		expect(codes(warnings)).toEqual(['delete-not-last'])
	})

	it('counts the appended built-ins when deciding whether Delete is last', () => {
		const { actions, deleteNotLast } = resolveRowActions([{ id: 'archive', label: 'Archive' }, 'builtin:delete'], [EDIT, DELETE])
		expect(labels(actions)).toEqual(['Archive', 'Delete', 'Edit'])
		expect(deleteNotLast).toBe(true)
	})

	it('does not report an appended Delete, nor a Delete that is off', () => {
		expect(resolveRowActions(['builtin:edit', { id: 'archive', label: 'Archive' }], ALL).deleteNotLast).toBe(false)
		expect(resolveRowActions(['builtin:delete', 'builtin:edit'], [EDIT]).deleteNotLast).toBe(false)
	})

	it('tolerates a missing declaration', () => {
		expect(labels(resolveRowActions(undefined, ALL).actions)).toEqual(['View', 'Edit', 'Copy', 'Delete'])
	})
})

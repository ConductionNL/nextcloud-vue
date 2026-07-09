/**
 * Unit tests for the normalizeSidebarShapes transform (audit items 11/25).
 */

import { normalizeSidebarShapes } from '../../../src/cli/transforms/normalizeSidebarShapes.js'

describe('normalizeSidebarShapes', () => {
	it('lifts sidebarTabs[].widgets[] to slot:"sidebar" entries with tabGroup', () => {
		const page = {
			id: 'p',
			type: 'detail',
			config: { sidebarTabs: [{ id: 't1', label: 'Info', widgets: [{ type: 'stat', title: 'Count' }] }] },
		}
		const { page: out, count } = normalizeSidebarShapes(page)
		expect(count).toBe(1)
		expect(out.config.sidebarTabs).toBeUndefined()
		expect(out.widgets[0]).toMatchObject({
			widgetKey: 'stat', slot: 'sidebar', tabGroup: 't1', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 1,
		})
		expect(out.widgets[0].props).toEqual({ title: 'Count' })
	})

	it('lifts from a sidebarProps.tabs source', () => {
		const page = {
			id: 'p',
			type: 'detail',
			config: { sidebarProps: { open: true, tabs: [{ id: 't1', widgets: [{ type: 'chart' }] }] } },
		}
		const { page: out, count } = normalizeSidebarShapes(page)
		expect(count).toBe(1)
		expect(out.widgets[0].slot).toBe('sidebar')
		expect(out.config.sidebarProps).toEqual({ open: true }) // tabs removed, other props kept
	})

	it('lifts from a sidebar object with tabs and preserves enabled/showMetadata', () => {
		const page = {
			id: 'p',
			type: 'detail',
			config: { sidebar: { enabled: true, showMetadata: true, tabs: [{ id: 't1', widgets: [{ type: 'stat' }] }] } },
		}
		const { page: out, count } = normalizeSidebarShapes(page)
		expect(count).toBe(1)
		expect(out.config.sidebar).toEqual({ enabled: true, showMetadata: true })
	})

	it('flags component-only tabs for manual review and retains them (never drops)', () => {
		const page = {
			id: 'p',
			type: 'detail',
			config: { sidebar: { enabled: true, tabs: [{ id: 'audit', label: 'History', component: 'CnAuditTrailTab' }] } },
		}
		const { page: out, count, unconverted } = normalizeSidebarShapes(page)
		expect(count).toBe(0)
		expect(unconverted).toEqual(['audit'])
		expect(out).toBe(page) // nothing liftable → same reference
		expect(out.config.sidebar.tabs).toHaveLength(1)
	})

	// --- Idempotence ---
	it('is a byte-identical no-op when there is no legacy sidebar shape (same reference)', () => {
		const page = { id: 'p', type: 'detail', config: { register: 'x' }, widgets: [{ widgetKey: 'stat', slot: 'sidebar', tabGroup: 't1', gridX: 0, gridY: 0, gridWidth: 1, gridHeight: 1 }] }
		const { page: out, count } = normalizeSidebarShapes(page)
		expect(out).toBe(page)
		expect(count).toBe(0)
	})

	it('re-run on lifted output is byte-identical', () => {
		const page = { id: 'p', type: 'detail', config: { sidebarTabs: [{ id: 't1', widgets: [{ type: 'stat' }] }] } }
		const first = normalizeSidebarShapes(page).page
		const second = normalizeSidebarShapes(first).page
		expect(JSON.stringify(second)).toBe(JSON.stringify(first))
	})
})

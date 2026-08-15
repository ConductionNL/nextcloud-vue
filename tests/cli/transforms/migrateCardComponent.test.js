/**
 * Unit tests for migrateCardComponent, addExplicitActionTypes, migrateCustomComponents.
 */

import { migrateCardComponent } from '../../../src/cli/transforms/migrateCardComponent.js'
import { addExplicitActionTypes } from '../../../src/cli/transforms/addExplicitActionTypes.js'
import { migrateCustomComponents } from '../../../src/cli/transforms/migrateCustomComponents.js'

// --- migrateCardComponent ---

describe('migrateCardComponent', () => {
	it('returns page unchanged when no cardComponent', () => {
		const page = { id: 'p', type: 'index', title: 'P', route: '/p', config: {} }
		const { page: result, count } = migrateCardComponent(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('prepends card-grid widget and removes cardComponent from config', () => {
		const page = {
			id: 'items',
			type: 'index',
			title: 'Items',
			route: '/items',
			config: {
				register: 'items',
				schema: 'item',
				cardComponent: 'ItemCard',
			},
		}

		const { page: result, count } = migrateCardComponent(page)
		expect(count).toBe(1)
		expect(result.config.cardComponent).toBeUndefined()
		expect(result.config.register).toBe('items')
		expect(result.widgets).toHaveLength(1)

		const card = result.widgets[0]
		expect(card.widgetKey).toBe('card-grid')
		expect(card.slot).toBe('body')
		expect(card.gridX).toBe(0)
		expect(card.gridY).toBe(0)
		expect(card.gridWidth).toBe(12)
		expect(card.gridHeight).toBe(4)
		expect(card.props.component).toBe('ItemCard')
	})

	it('shifts existing widgets down by 4 rows', () => {
		const page = {
			id: 'items',
			type: 'index',
			title: 'Items',
			route: '/items',
			widgets: [
				{ widgetKey: 'toolbar', slot: 'header-actions', gridX: 0, gridY: 0, gridWidth: 2, gridHeight: 1 },
			],
			config: { cardComponent: 'ItemCard' },
		}

		const { page: result } = migrateCardComponent(page)
		// card-grid is first
		expect(result.widgets[0].widgetKey).toBe('card-grid')
		// existing widget is shifted down by 4
		expect(result.widgets[1].gridY).toBe(4)
	})
})

// --- addExplicitActionTypes ---

describe('addExplicitActionTypes', () => {
	it('returns page unchanged when no actions', () => {
		const page = { id: 'p', type: 'index', title: 'P', route: '/p', config: {} }
		const { page: result, count } = addExplicitActionTypes(page)
		expect(result).toBe(page)
		expect(count).toBe(0)
	})

	it('adds type:"handler" to actions missing type in config.actions', () => {
		const page = {
			id: 'items',
			type: 'index',
			title: 'Items',
			route: '/items',
			config: {
				actions: [
					{ id: 'view', label: 'View', handler: 'navigate', route: 'ItemDetail' },
					{ id: 'edit', label: 'Edit', type: 'handler' }, // already has type
					{ id: 'delete', label: 'Delete', handler: 'deleteItem' },
				],
			},
		}

		const { page: result, count } = addExplicitActionTypes(page)
		expect(count).toBe(2) // view and delete were missing type
		expect(result.config.actions[0].type).toBe('handler')
		expect(result.config.actions[1].type).toBe('handler') // unchanged
		expect(result.config.actions[2].type).toBe('handler')
	})

	it('normalizes page-level actions[] as well', () => {
		const page = {
			id: 'items',
			type: 'index',
			title: 'Items',
			route: '/items',
			actions: [
				{ id: 'create', label: 'Create' },
			],
			config: {},
		}

		const { page: result, count } = addExplicitActionTypes(page)
		expect(count).toBe(1)
		expect(result.actions[0].type).toBe('handler')
	})
})

// --- migrateCustomComponents ---

describe('migrateCustomComponents', () => {
	it('returns manifest unchanged when no customComponents', () => {
		const manifest = { version: '1.0.0', menu: [], pages: [] }
		const { manifest: result, count } = migrateCustomComponents(manifest)
		expect(result).toBe(manifest)
		expect(count).toBe(0)
	})

	it('moves customComponents entries to registry with kind:"component"', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [],
			customComponents: {
				MyWidget: { component: 'MyWidgetImpl' },
				MyCard: { component: 'CardImpl' },
			},
		}

		const { manifest: result, count, registrySuggestions } = migrateCustomComponents(manifest)
		expect(count).toBe(2)
		expect(result.customComponents).toBeUndefined()
		expect(result.registry).toBeDefined()
		expect(result.registry.MyWidget).toEqual({ component: 'MyWidgetImpl', kind: 'component' })
		expect(result.registry.MyCard).toEqual({ component: 'CardImpl', kind: 'component' })
		expect(registrySuggestions).toEqual(expect.arrayContaining(['MyWidget', 'MyCard']))
	})

	it('merges with existing registry (existing entries win on collision)', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [],
			registry: {
				ExistingWidget: { kind: 'page', component: 'ExistingImpl' },
				MyWidget: { kind: 'page', component: 'ExistingVariant' }, // collision
			},
			customComponents: {
				MyWidget: { component: 'NewVariant' },
				NewWidget: { component: 'NewImpl' },
			},
		}

		const { manifest: result } = migrateCustomComponents(manifest)
		// Existing registry entry wins
		expect(result.registry.MyWidget.kind).toBe('page')
		expect(result.registry.MyWidget.component).toBe('ExistingVariant')
		// New entry added
		expect(result.registry.NewWidget.kind).toBe('component')
		expect(result.registry.ExistingWidget.kind).toBe('page')
	})
})

/**
 * Positive ("golden") validation cases for the v2 app-manifest JSON Schema.
 *
 * These tests exercise the schema directly via the Ajv-compiled validator
 * exported as validateManifestV2 — confirming that well-formed v2 manifests
 * pass validation. Negative cases (expected failures for invalid manifests)
 * are covered in validate-manifest.spec.js alongside the dispatch tests.
 *
 * Covers tasks.md §5.1 (REQ-MV2S-001 through REQ-MV2S-008).
 */

import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const V2_SCHEMA_URL = 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json'

/**
 * Minimal valid v2 manifest — empty menu/pages + $schema + version.
 */
const MINIMAL_V2 = {
	$schema: V2_SCHEMA_URL,
	version: '2.0.0',
	menu: [],
	pages: [],
}

describe('app-manifest-v2.schema.json — positive validation (REQ-MV2S-001)', () => {
	it('minimal valid v2 manifest passes (empty menu and pages)', () => {
		const result = validateManifestV2(MINIMAL_V2)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('manifest with version, menu, pages but no $schema fails (REQ-MV2S-002)', () => {
		const manifest = { version: '2.0.0', menu: [], pages: [] }
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('$schema'))).toBe(true)
	})

	it('manifest with correct $schema and valid required fields passes (REQ-MV2S-002)', () => {
		const result = validateManifestV2({ ...MINIMAL_V2 })
		expect(result.valid).toBe(true)
	})
})

describe('app-manifest-v2 — all 11 page types (REQ-MV2S-003)', () => {
	const PAGE_TYPES = ['index', 'detail', 'dashboard', 'logs', 'settings', 'chat', 'files', 'form', 'wiki', 'map', 'custom']

	it('all 11 page types pass validation when _note is provided for custom', () => {
		const pages = PAGE_TYPES.map((type, i) => {
			const page = {
				id: `page-${type}`,
				route: `/${type}`,
				type,
				title: `app.${type}.title`,
			}
			if (type === 'custom') {
				page._note = 'Uses bespoke GIS viewer not expressible via standard page types'
			}
			return page
		})

		const result = validateManifestV2({ ...MINIMAL_V2, pages })
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})

describe('app-manifest-v2 — unified widgetEntry shape (REQ-MV2S-004)', () => {
	it('widget entry with all required fields validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'dashboard',
				route: '/dashboard',
				type: 'dashboard',
				title: 'app.dashboard',
				widgets: [{
					widgetKey: 'StatsWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('widget entry on index page validates with same shape as dashboard (REQ-MV2S-004 scenario)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'decisions',
				route: '/decisions',
				type: 'index',
				title: 'app.decisions',
				widgets: [{
					widgetKey: 'FilterSummaryWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 12,
					gridHeight: 1,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('widget entry with optional fields (props, tabGroup, dataSource, _note) validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'detail',
				route: '/detail/:id',
				type: 'detail',
				title: 'app.detail',
				widgets: [{
					widgetKey: 'AuditWidget',
					slot: 'sidebar',
					gridX: 0,
					gridY: 0,
					gridWidth: 1,
					gridHeight: 3,
					props: { showHeader: true },
					tabGroup: 'audit',
					dataSource: {
						register: 'decisions',
						schema: 'decision',
						aggregate: 'count',
					},
					_note: 'Shows audit trail in the sidebar',
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})
})

describe('app-manifest-v2 — per-slot grid constraints (REQ-MV2S-005)', () => {
	it('widget in sidebar slot with gridWidth: 1 passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'index',
				title: 'app.test',
				widgets: [{
					widgetKey: 'SidebarWidget',
					slot: 'sidebar',
					gridX: 0,
					gridY: 0,
					gridWidth: 1,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('widget in sidebar slot with gridWidth: 3 fails (REQ-MV2S-005)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'index',
				title: 'app.test',
				widgets: [{
					widgetKey: 'SidebarWidget',
					slot: 'sidebar',
					gridX: 0,
					gridY: 0,
					gridWidth: 3,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('widget in header-actions slot with gridY: 0 passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'index',
				title: 'app.test',
				widgets: [{
					widgetKey: 'ActionButton',
					slot: 'header-actions',
					gridX: 0,
					gridY: 0,
					gridWidth: 2,
					gridHeight: 1,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('widget in header-actions slot with gridY: 2 fails (REQ-MV2S-005)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'index',
				title: 'app.test',
				widgets: [{
					widgetKey: 'ActionButton',
					slot: 'header-actions',
					gridX: 0,
					gridY: 2,
					gridWidth: 2,
					gridHeight: 1,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('widget in tab:main slot validates (pattern match)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'detail',
				title: 'app.test',
				widgets: [{
					widgetKey: 'TabWidget',
					slot: 'tab:main',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('widget in section:addresses slot validates (pattern match)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'detail',
				title: 'app.test',
				widgets: [{
					widgetKey: 'AddressWidget',
					slot: 'section:addresses',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 3,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('widget in body slot validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'dashboard',
				title: 'app.test',
				widgets: [{
					widgetKey: 'KpiWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 12,
					gridHeight: 2,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('widget in footer slot validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'detail',
				title: 'app.test',
				widgets: [{
					widgetKey: 'FooterWidget',
					slot: 'footer',
					gridX: 0,
					gridY: 0,
					gridWidth: 12,
					gridHeight: 1,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('widget in modal slot validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'test',
				route: '/test',
				type: 'index',
				title: 'app.test',
				widgets: [{
					widgetKey: 'ModalWidget',
					slot: 'modal',
					gridX: 0,
					gridY: 0,
					gridWidth: 8,
					gridHeight: 4,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})
})

describe('app-manifest-v2 — action type discriminator (REQ-MV2S-006)', () => {
	it('action without type field defaults to handler after Ajv useDefaults', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'decisions',
				route: '/decisions',
				type: 'index',
				title: 'app.decisions',
				actions: [{ id: 'delete', label: 'app.delete' }],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		// useDefaults: true fills in type:"handler" on the clone — no schema error
		expect(result.errors).toEqual([])
	})

	it('action with type: open-modal and target validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'decisions',
				route: '/decisions',
				type: 'index',
				title: 'app.decisions',
				actions: [{
					id: 'confirm',
					label: 'app.confirm',
					type: 'open-modal',
					target: 'confirm-dialog',
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('action with type: open-page validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'decisions',
				route: '/decisions',
				type: 'index',
				title: 'app.decisions',
				actions: [{
					id: 'view',
					label: 'app.view',
					type: 'open-page',
					target: 'decisions-detail',
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('action with type: navigate validates', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'decisions',
				route: '/decisions',
				type: 'index',
				title: 'app.decisions',
				actions: [{
					id: 'external',
					label: 'app.external',
					type: 'navigate',
					target: 'https://example.com/docs',
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('action with unknown type fails validation', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'decisions',
				route: '/decisions',
				type: 'index',
				title: 'app.decisions',
				actions: [{ id: 'x', label: 'x', type: 'custom-action' }],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})
})

describe('app-manifest-v2 — type: custom requires _note (REQ-MV2S-008)', () => {
	it('custom page with _note passes validation', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'gis-view',
				route: '/gis',
				type: 'custom',
				title: 'app.gis',
				_note: 'Uses bespoke GIS viewer',
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('custom page without _note fails validation (REQ-MV2S-008)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'gis-view',
				route: '/gis',
				type: 'custom',
				title: 'app.gis',
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('_note'))).toBe(true)
	})
})

describe('app-manifest-v2 — v1.3.0 feature carry-forward (REQ-MV2S-007)', () => {
	it('@resolve: sentinel in config value passes (allowed under pages[].config)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'index',
				route: '/',
				type: 'index',
				title: 'app.index',
				config: {
					register: '@resolve:listing_register',
					schema: '@resolve:listing_schema',
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with menu[].dynamicSource passes validation', () => {
		const manifest = {
			...MINIMAL_V2,
			menu: [{
				id: 'categories',
				label: 'app.categories',
				dynamicSource: {
					url: '/api/categories',
					method: 'GET',
					labelField: 'name',
					idField: 'slug',
					routeField: 'route',
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with pages[].config.cardComponent passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'index',
				route: '/',
				type: 'index',
				title: 'app.index',
				config: {
					register: 'my-register',
					schema: 'my-schema',
					cardComponent: 'DecisionCard',
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with pages[].config.sidebar.columnGroups passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'index',
				route: '/',
				type: 'index',
				title: 'app.index',
				config: {
					register: 'my-register',
					schema: 'my-schema',
					sidebar: {
						enabled: true,
						show: true,
						columnGroups: [{ id: 'general', label: 'app.general' }],
					},
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with top-level dependencies[] passes', () => {
		const manifest = {
			...MINIMAL_V2,
			dependencies: ['openregister', 'openconnector'],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with top-level runtime object passes', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: {
				user: { primaryRole: 'admin', isActive: true },
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with pages[].config.tabs[] (settings) passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'settings',
				route: '/settings',
				type: 'settings',
				title: 'app.settings',
				config: {
					tabs: [{
						id: 'general',
						label: 'app.settings.general',
						sections: [],
					}],
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with dataSource on widgetEntry passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'dashboard',
				route: '/dashboard',
				type: 'dashboard',
				title: 'app.dashboard',
				widgets: [{
					widgetKey: 'CountWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 3,
					gridHeight: 1,
					dataSource: {
						register: 'decisions',
						schema: 'decision',
						aggregate: 'count',
					},
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with visibleIf on menu item passes', () => {
		const manifest = {
			...MINIMAL_V2,
			menu: [{
				id: 'admin',
				label: 'app.admin',
				visibleIf: { appInstalled: 'openregister' },
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('manifest with pages[].sidebar.show boolean passes', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'full-screen',
				route: '/full',
				type: 'map',
				title: 'app.map',
				sidebar: { show: false },
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})
})

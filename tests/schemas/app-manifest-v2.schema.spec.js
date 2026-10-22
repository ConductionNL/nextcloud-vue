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

describe('app-manifest-v2 — observability-only profile (ADR-040 Tier-0 adopters)', () => {
	const OBSERVABILITY_ONLY = {
		$schema: V2_SCHEMA_URL,
		version: '0.1.0',
		observability: {
			health: {
				statusCodePolicy: 'adr006',
				checks: [{ id: 'database', type: 'database', severity: 'critical' }],
			},
		},
	}

	it('manifest with observability but no menu/pages passes (AppHost engine config only)', () => {
		const result = validateManifestV2(OBSERVABILITY_ONLY)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('manifest with neither pages nor observability fails', () => {
		const result = validateManifestV2({ $schema: V2_SCHEMA_URL, version: '0.1.0' })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('observability'))).toBe(true)
	})

	it('pages without menu still fails (UI-manifest coupling preserved)', () => {
		const result = validateManifestV2({ $schema: V2_SCHEMA_URL, version: '0.1.0', pages: [] })
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('menu'))).toBe(true)
	})

	it('health cors flag validates (ADR-040, used by decidesk)', () => {
		const manifest = {
			...OBSERVABILITY_ONLY,
			observability: {
				health: {
					...OBSERVABILITY_ONLY.observability.health,
					cors: true,
				},
			},
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})
})

describe('app-manifest-v2 — all 10 page types (REQ-MV2S-003)', () => {
	const PAGE_TYPES = ['index', 'detail', 'dashboard', 'logs', 'settings', 'chat', 'files', 'form', 'map', 'custom']

	it('all 11 page types pass validation when _note is provided for custom', () => {
		const pages = PAGE_TYPES.map((type) => {
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
	/**
	 * 🔴 THE SAME DECLARATION VALIDATED ON ONE PAGE AND WAS REJECTED ON ANOTHER.
	 * `roles` and `visibleWhen` were expressible in the legacy
	 * `config.widgets[]` array, whose items are `additionalProperties: true`,
	 * and refused by this shape, which is closed and listed neither. Measured
	 * on dossiq 2026-09-18: fourteen widgets declared their readers in the
	 * legacy array, and the one widget the app had moved to the uniform entry
	 * could not say the same thing at all.
	 *
	 * `visibleWhen` was the sharper half. CnDashboardPage already READS
	 * `def.visibleWhen` on a widget definition at runtime, so the uniform entry
	 * was refusing a key the component it feeds already honours.
	 */
	it('a widget entry declares who may see it, and when it is shown', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'reporting',
				route: '/reporting',
				type: 'dashboard',
				title: 'app.reporting',
				widgets: [{
					widgetKey: 'AnnualStatementWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
					id: 'annual-statement',
					roles: ['controllers', 'beheerders', 'admin'],
					visibleWhen: {
						endpoint: '/apps/example/api/widget-visibility',
						field: 'visible.annual-statement',
						op: 'eq',
						value: true,
					},
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('a widget entry without them still validates, so nothing existing has to change', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'reporting',
				route: '/reporting',
				type: 'dashboard',
				title: 'app.reporting',
				widgets: [{
					widgetKey: 'AnnualStatementWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
				}],
			}],
		}
		expect(validateManifestV2(manifest).valid).toBe(true)
	})

	it('roles is a list of strings, not a bare string', () => {
		// The shape somebody reaches for first, and the one that would make
		// `roles: "controllers"` iterate eleven single characters in whatever
		// reads it downstream.
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'reporting',
				route: '/reporting',
				type: 'dashboard',
				title: 'app.reporting',
				widgets: [{
					widgetKey: 'AnnualStatementWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
					roles: 'controllers',
				}],
			}],
		}
		expect(validateManifestV2(manifest).valid).toBe(false)
	})

	it('a key this shape does not know is still refused', () => {
		// The closed shape stays closed. Adding two properties is not the same
		// as opening it, and this is what says so.
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'reporting',
				route: '/reporting',
				type: 'dashboard',
				title: 'app.reporting',
				widgets: [{
					widgetKey: 'AnnualStatementWidget',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 6,
					gridHeight: 2,
					rolez: ['controllers'],
				}],
			}],
		}
		expect(validateManifestV2(manifest).valid).toBe(false)
	})

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

/**
 * Build a minimal v2 manifest with one type='form' page whose config is
 * merged from `config`.
 *
 * @param {object} config `pages[0].config` overrides.
 * @return {object} Complete v2 manifest.
 */
function manifestWithFormPage(config) {
	return {
		...MINIMAL_V2,
		pages: [{
			id: 'IntakeWizard',
			route: '/public/intake',
			type: 'form',
			title: 'app.intake',
			config,
		}],
	}
}

describe('app-manifest-v2 — form logic: config.steps[] (REQ-MFL-1, manifest-form-logic)', () => {
	it('form page with steps validates', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }, { key: 'b', label: 'B', type: 'string' }],
			steps: [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('step missing title rejected', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }],
			steps: [{ id: 's1', fields: ['a'] }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('step with unknown property rejected (closed shape)', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }],
			steps: [{ id: 's1', title: 'One', fields: ['a'], showIf: {} }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('existing stepless form manifests still validate (backward compatible)', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'name', label: 'Name', type: 'string' }],
			submitHandler: 'onSubmit',
		})
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('step referencing unknown field key rejected, naming the bad key', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }, { key: 'b', label: 'B', type: 'string' }],
			steps: [
				{ id: 's1', title: 'One', fields: ['a', 'zz'] },
				{ id: 's2', title: 'Two', fields: ['b'] },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('"zz"'))).toBe(true)
	})

	it('field assigned to no step rejected, naming the unassigned key', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }, { key: 'b', label: 'B', type: 'string' }],
			steps: [{ id: 's1', title: 'One', fields: ['a'] }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('"b"'))).toBe(true)
	})

	it('field assigned to two steps rejected', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }],
			steps: [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's2', title: 'Two', fields: ['a'] },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('duplicate step ids rejected', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'a', label: 'A', type: 'string' }, { key: 'b', label: 'B', type: 'string' }],
			steps: [
				{ id: 's1', title: 'One', fields: ['a'] },
				{ id: 's1', title: 'Two', fields: ['b'] },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})
})

describe('app-manifest-v2 — form logic: fields[].visibleWhen (REQ-MFL-2, manifest-form-logic)', () => {
	it('field-reference (LOCAL) condition validates', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{ key: 'kind', label: 'Kind', type: 'enum', enum: ['person', 'company'] },
				{ key: 'kvk', label: 'KvK', type: 'string', visibleWhen: { field: 'kind', op: 'eq', value: 'company' } },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('data-source condition validates', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{
					key: 'kvk',
					label: 'KvK',
					type: 'string',
					visibleWhen: { source: { register: 'r', schema: 's' }, field: '@total', op: 'gt', value: 0 },
				},
			],
		})
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('unknown operator rejected, naming the op enum', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{ key: 'kind', label: 'Kind', type: 'string' },
				{ key: 'kvk', label: 'KvK', type: 'string', visibleWhen: { field: 'kind', op: 'startsWith', value: 'x' } },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('op'))).toBe(true)
	})

	it('sentinel guard still fires through visibleWhen.value', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{ key: 'kind', label: 'Kind', type: 'string' },
				{ key: 'kvk', label: 'KvK', type: 'string', visibleWhen: { field: 'kind', op: 'eq', value: '@bogus.token' } },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('LOCAL condition referencing undeclared key rejected, naming the key', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{ key: 'kind', label: 'Kind', type: 'string' },
				{ key: 'kvk', label: 'KvK', type: 'string', visibleWhen: { field: 'knd', op: 'eq', value: 'x' } },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('"knd"'))).toBe(true)
	})
})

describe('app-manifest-v2 — form logic: fields[].validation (REQ-MFL-3, REQ-MFL-5, manifest-form-logic)', () => {
	it('full validation object accepted', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{
					key: 'name',
					label: 'Name',
					type: 'string',
					validation: { required: true, min: 2, max: 120, pattern: '^[a-z]+$', message: 'i18n.bad-name' },
				},
			],
		})
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('unknown rule key rejected (closed shape)', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'name', label: 'Name', type: 'string', validation: { required: true, minLength: 2 } }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('non-numeric min rejected', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'name', label: 'Name', type: 'string', validation: { min: '2' } }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('min greater than max rejected', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'amount', label: 'Amount', type: 'number', validation: { min: 10, max: 2 } }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('non-compiling pattern rejected, error includes the regex failure hint', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'name', label: 'Name', type: 'string', validation: { pattern: '([a-z' } }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => /does not compile/.test(e))).toBe(true)
	})

	it('pattern on a number field rejected (pattern applies to string/password only)', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'n', label: 'N', type: 'number', validation: { pattern: '^[0-9]+$' } }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('min/max on a boolean field rejected (bounds apply to string/password/number only)', () => {
		const manifest = manifestWithFormPage({
			fields: [{ key: 'agree', label: 'Agree', type: 'boolean', validation: { min: 1 } }],
		})
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})
})

describe('app-manifest-v2 — form logic: compiled validator regeneration (REQ-MFL-4, manifest-form-logic)', () => {
	it('runtime (compiled) validator accepts steps + visibleWhen + validation together', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{ key: 'kind', label: 'Kind', type: 'enum', enum: ['person', 'company'] },
				{
					key: 'kvk',
					label: 'KvK',
					type: 'string',
					visibleWhen: { field: 'kind', op: 'eq', value: 'company' },
					validation: { required: true, pattern: '^[0-9]{8}$', message: 'i18n.kvk-invalid' },
				},
			],
			steps: [
				{ id: 'who', title: 'Who', fields: ['kind', 'kvk'] },
			],
		})
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})
})

describe('app-manifest-v2 — runtime.theme (scoped-theme-applier, REQ-STA-4)', () => {
	it('a well-formed runtime.theme validates', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: {
				theme: {
					source: 'nldesign',
					tokenSet: 'gemeente-blauw',
					tokenSetName: 'Gemeente Blauw',
					preview: { primaryColor: '#154273', backgroundColor: '#FFFFFF' },
				},
			},
		}
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('an unknown source is rejected', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: { theme: { source: 'custom', tokenSet: 'x' } },
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('a non-kebab-case tokenSet is rejected', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: { theme: { source: 'nldesign', tokenSet: 'Gemeente_Blauw' } },
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('an unknown key on runtime.theme is rejected (additionalProperties: false)', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: { theme: { source: 'nldesign', tokenSet: 'x', extra: true } },
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('a manifest with no runtime.theme still validates unchanged (regression)', () => {
		const result = validateManifestV2({ ...MINIMAL_V2 })
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})

	it('a manifest with runtime.user but no theme still validates unchanged (regression)', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: { user: { isOwner: true } },
		}
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [], warnings: [] })
	})
})

describe('app-manifest-v2 — navCardEntry + nav-card-grid widget (ADR-044 §4 cards-collapse)', () => {
	const navCardGridPage = (entries) => ({
		id: 'progress',
		route: '/progress',
		type: 'dashboard',
		title: 'app.progress',
		config: { allowEdit: false },
		widgets: [{
			widgetKey: 'nav-card-grid',
			slot: 'body',
			gridX: 0,
			gridY: 0,
			gridWidth: 12,
			gridHeight: 6,
			props: { entries },
		}],
	})

	it('a nav-card-grid widget with valid entries validates (route, href, count auto, count integer, neither)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [navCardGridPage([
				{ id: 'levels', label: 'Levels', route: 'Levels', count: 'auto' },
				{ id: 'responses', label: 'Responses', route: 'Responses', count: 7 },
				{ id: 'docs', label: 'Documentation', href: 'https://example.org/docs' },
				{ id: 'warnings', label: 'Warnings', description: 'Flagged items needing review' },
			])],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('a navCardEntry with both route and href fails (mutually exclusive)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [navCardGridPage([
				{ id: 'levels', label: 'Levels', route: 'Levels', href: 'https://example.org' },
			])],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('a nav-card-grid widget missing props.entries fails', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [{
				id: 'progress',
				route: '/progress',
				type: 'dashboard',
				title: 'app.progress',
				widgets: [{
					widgetKey: 'nav-card-grid',
					slot: 'body',
					gridX: 0,
					gridY: 0,
					gridWidth: 12,
					gridHeight: 6,
				}],
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('a navCardEntry with an unrecognised count string fails', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [navCardGridPage([
				{ id: 'levels', label: 'Levels', count: 'sometimes' },
			])],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('a navCardEntry with an unknown property fails (additionalProperties: false)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [navCardGridPage([
				{ id: 'levels', label: 'Levels', badge: 'new' },
			])],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('sentinel guard reaches navCardEntry string leaves transitively via widgetEntry.allOf (no separate ref needed)', () => {
		const manifest = {
			...MINIMAL_V2,
			pages: [navCardGridPage([
				{ id: 'levels', label: '@bogus.token' },
			])],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(false)
	})

	it('accepts a choice step that renders as cards and sources its options live', () => {
		// The example-set step: the SERVER owns which sets it ships, so the
		// manifest names where to read them instead of restating them and
		// drifting from them.
		const result = validateManifestV2({
			...MINIMAL_V2,
			setup: {
				steps: [{
					id: 'example-set',
					type: 'choice',
					display: 'cards',
					optionsSource: 'profiles',
					configKey: 'example_profile',
					multiple: true,
					title: 'Which kind of organisation is this for?',
				}],
			},
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('rejects a display mode the wizard cannot render', () => {
		const result = validateManifestV2({
			...MINIMAL_V2,
			setup: { steps: [{ id: 'example-set', type: 'choice', display: 'carousel' }] },
		})
		expect(result.valid).toBe(false)
	})

	it('accepts `onDemand: true` on a run-action setup step', () => {
		// A destructive step the user runs only when they ask (learniq's
		// "Remove the example data"): never auto-run, ticked in the summary
		// only when it ran in this session.
		const result = validateManifestV2({
			...MINIMAL_V2,
			setup: { steps: [{ id: 'remove-example-set', type: 'run-action', action: 'remove-example-set', onDemand: true }] },
		})
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('accepts `loadAction` on a cards choice and `requires` on any step', () => {
		const result = validateManifestV2({
			...MINIMAL_V2,
			setup: {
				steps: [
					{ id: 'demo-data', type: 'choice', display: 'cards', optionsSource: 'datasets', configKey: 'demo_dataset', loadAction: 'load-demo-data' },
					{ id: 'invoices', type: 'run-action', action: 'link-invoices', requires: ['shillinq'] },
				],
			},
		})
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('rejects an empty `loadAction` and a non-array `requires`', () => {
		expect(validateManifestV2({
			...MINIMAL_V2,
			setup: { steps: [{ id: 'demo-data', type: 'choice', loadAction: '' }] },
		}).valid).toBe(false)
		expect(validateManifestV2({
			...MINIMAL_V2,
			setup: { steps: [{ id: 'invoices', type: 'run-action', requires: 'shillinq' }] },
		}).valid).toBe(false)
	})

	it('rejects a non-boolean `onDemand`', () => {
		const result = validateManifestV2({
			...MINIMAL_V2,
			setup: { steps: [{ id: 'remove-example-set', type: 'run-action', action: 'remove-example-set', onDemand: 'yes' }] },
		})
		expect(result.valid).toBe(false)
	})

	it('accepts a setup step note or footnote as a non-empty string', () => {
		const steps = (extra) => [{ id: 'kind', type: 'choice', options: [{ value: 'a', label: 'A' }], ...extra }]
		expect(validateManifestV2({ ...MINIMAL_V2, setup: { steps: steps({ note: 'Later.' }) } }).valid).toBe(true)
		expect(validateManifestV2({ ...MINIMAL_V2, setup: { steps: steps({ footnote: 'Later.' }) } }).valid).toBe(true)
		expect(validateManifestV2({ ...MINIMAL_V2, setup: { steps: steps({ note: '' }) } }).valid).toBe(false)
	})

	it('accepts setup.dismissAction as a slug and refuses anything else', () => {
		const steps = [{ id: 'demo', type: 'run-action', action: 'load-demo-data' }]
		expect(validateManifestV2({ ...MINIMAL_V2, setup: { dismissAction: 'dismiss-setup', steps } }).valid).toBe(true)
		expect(validateManifestV2({ ...MINIMAL_V2, setup: { dismissAction: '../config', steps } }).valid).toBe(false)
	})

	it('the manifest schema version reads 2.146.0', () => {
		// A consumer reads this to tell a manifest key it does not know from
		// one it got wrong, so a vocabulary change bumps it. 2.40.0 REMOVED
		// `savedViewPlaces`; 2.41.0 is the bump `ncDashboard` should have
		// carried when it was added, and which it went out without. The bump
		// is the only machine-readable signal a fleet app gets — the package
		// version is not one, it reads 2.0.5 at every release tag — so a
		// property that lands without one is invisible to the vendored-copy
		// ratchet every consumer runs against it. 2.42.0 adds the setup
		// step's `onDemand` flag. 2.43.0 is the bump the `links` page type
		// and the dashboard widget rules of 2.61.0 went out without; the
		// vendored copy in ConductionNL/.github could not see the schema had
		// moved. app-manifest-v2.schema-version.spec.js now fails when the
		// content changes and this number does not. 2.44.0 adds menu-entry
		// `params`. 2.45.0 adds the setup step's `loadAction` and `requires`.
		// 2.46.0 adds the Zuiddrecht pixel-gap keys: nav.card, nav.help,
		// nav.brand.emblem, primaryAction action/solid/permission/visibleIf,
		// the object form of menuItem.count, widgets[].headerLink and the
		// page config keys showHeader, showTitle, countSubtitle,
		// showTypeEyebrow and breadcrumb. 2.47.0 adds round two: nav.footer,
		// breadcrumb.icon, and the page config keys showWidgetActions,
		// headerCard and headerWidget. 2.48.0 adds page views: the page
		// config keys views, defaultView and viewsLabel. 2.48.1 only rewords
		// the setup step's `requires`: a skipped step is not applicable.
		// 2.49.0 describes nav.settingsLabel's new default, "Advanced".
		// 2.50.0 adds the `builtin:*` row action placeholders. 2.51.0 adds a
		// stats-block entry's `format`, `currency` and `currencyField`.
		// 2.52.0 adds Zuiddrecht round three: breadcrumb.currentField and
		// breadcrumb.separator, showWidgetActions on a detail page, the index
		// keys showTitleIcon, showCount and headerButtons, the dashboard key
		// gridFloat, a widget placement's showButtons, and `inset` on the
		// week-strip and stacked-bar content. 2.53.0 adds `setup.dismissAction`; 2.54.0 adds the index key `searchInFiles`; 2.55.0 adds the detail key `headerFields`.
		// 2.56.0 adds the detail keys favourite and follow and the index keys showFavouriteColumn and personalLenses.
		// 2.57.0 adds the detail key markRead and the personalLenses value unread.
		// 2.58.0 types visibleWhen on a tab entry of the tabs widget.
		// 2.59.0 types the detail key lifecycleActions and its inputs hints.
		// 2.60.0 types the form key smartPaste.
		// 2.61.0 types the index key calendar.
		// 2.62.0 types the map image layer and the xField and yField marker keys.
		// 2.63.0 types the form field keys assign, default and calculate, and the @answer token.
		// 2.64.0 types the index key personalColumns.
		// 2.65.0 types the index key copy and its include kinds.
		// 2.66.0 adds the top-level i18n block.
		// 2.67.0 adds the root look and the page config.look (board look).
		// 2.68.0 adds menu counterVariant and the settings page saveMode and autosave.
		// 2.69.0 adds the detail page keys headerMeta, tabsLabel and identifierField.
		// 2.71.0 adds the dashboard config.kpiRow and the board keys card, colorField, sumField, sumFormat and columnLimit.
		// 2.72.0 adds the index keys countText, footerNote, bulkHint and cardFields, and the header button action actions-menu (screens-index-list-parity, screens-card-parity).
		// 2.73.0 adds nav.brand.placement (screens-brand-block-top-bar).
		// 2.74.0 adds the @myGroups filter token (nextcloud-group-surfaces).
		// 2.75.0 adds showFollowColumn and deprecates favourite, showFavouriteColumn and the favourite lens (one-follow-control).
		// 2.76.0 adds the pill tones purple and teal and the column colorMap (screens-cell-pill-parity).
		// 2.77.0 adds the index key rowTitle (screens-table-rows-parity).
		// 2.78.0 adds config.searchPlaceholder on index pages (screens-index-toolbar-parity).
		// 2.79.0 adds the dashboard keys greeting, viewLinks and showActionsMenu (screens-dashboard-greeting-header).
		// 2.80.0 adds the index keys statRow and sidePanel (screens-index-stat-row).
		// 2.81.0 adds the @monthEnd and @nextMonthStart filter tokens (screens-active-filter-line-parity).
		// 2.82.0 adds config.viewSwitch on index pages (screens-view-switch-parity).
		// 2.83.0 adds config.queryPresets on index pages (screens-index-query-presets).
		// 2.84.0 adds formEyebrow and formSubtitle on an open-form action (screens-form-dialog-intro-parity).
		// 2.85.0 lets a header pill be a constant (`text`) or a count of a related list (`countFrom`, `countLabel`) (screens-relation-pages).
		const schema = require('../../src/schemas/app-manifest-v2.schema.json')
		// 2.86.0 allows an @row.<field> token in a field-list rowActions payload, and corrects sizeToContent:<int> to a row MAXIMUM (GridStack's meaning).
		// 2.87.0 adds the workspace-filter style `chips` with `urlKey` and per-option `countFrom`, and the visibleWhen `workspace` mode with the `in` operator (screens-page-lenses).
		// 2.88.0 adds the workspace-filter style `toggle`, layout `bar` with `controls`, and `pageControls` on a list source (screens-page-controls).
		// 2.89.0 adds source.order, notEmpty/empty operators and stacked on the banner widget (screens-start-here-banner).
		// 2.90.0 adds headerButtons[].items on the actions-menu button (screens-index-header-actions-menu).
		// 2.91.0 adds viewSwitchLinks on an index page (screens-view-switch-links).
		// 2.92.0 adds filterStrip on an index page (screens-filter-strip).
		// 2.93.0 adds { heading } and "separator" entries to headerButtons[].items (screens-index-header-menu-headings).
		// 2.94.0 adds startOn on a walkthrough tour (a-tour-starts-on-the-pages-it-names).
		// 2.95.0 adds config.visibilityContext and the @context token (detail-widgets-visible-when).
		// 2.96.0 adds headerButtons on a reports page (screens-reports-header-buttons).
		// 2.97.0 adds board columnFields, narrow, moveHandler, moveTargetsHandler, columnSwitchLabel, hint and wrap (screens-board-reference-columns).
		// 2.98.0 lets config.titleField name the record on a detail page (detail-title-field).
		// 2.99.0 lets config.countSubtitle take a singular and a plural form (index-count-plural).
		// 2.100.0 adds columnFields[].source.capacityField on a board (board-column-capacity).
		// 2.101.0 adds columnFields[].source.neutralColor on a board (board-neutral-column-colour).
		// 2.102.0 adds columnFields[].source.colorMap on a board (board-column-colour-map).
		// 2.108.0 adds config.modules, modulesTitle and footnote on a links page (screens-links-module-cards).
		// 2.111.0 lets config.greeting lead with a label or the date alone (dashboard-greeting-label).
		// 2.115.0 lets config.breadcrumb take a list of crumbs, for index, dashboard and settings pages too (page-header-breadcrumb).
		// 2.118.0 adds nav.searchPlaceholder (screens-board-top-bar-search).
		// 2.119.0 adds views[].title on a dashboard (view-title).
		// 2.120.0 adds chart barMax, footnote, highlight, valueFormat 'number' with suffix and endpointSource rowsPath (chart-bar-list-and-matrix).
		// 2.121.0 lets a query preset or a folder scope set addLabel, headerButtons, breadcrumb, headerMeta and afterList, adds config.afterList, and lets config.entitySource name the flowRuns, endpoint, search and users sources with a described sourceConfig (index-scope-presentation).
		// 2.122.0 adds headerPill.resolve, a pill that shows a referenced record's label (detail-pill-resolve), chart cellSource, a matrix read from records (matrix-cell-records), and the organisations entitySource (organisations-entity-source).
		// 2.123.0 adds the setup step's note and footnote, a line under a choice step's options (setup-wizard), config.headerMetaCounts on an index page (index-page), and actionsMenu.showMarkUnread and showOpenSidebar (detail-page).
		// 2.124.0 adds setup.steps[].visibleWhen (setup-wizard), and the dashboard config.pageFilters with control and placement (dashboard-page).
		// 2.125.0 adds chart emptyCellLabel and the footnote under line, area and bar charts (chart-widget), config.bulkBandAlways (actions-bar), config.quickFilterPlacement (index-page), config.rowClass rules on an index page (index-page) and sourceConfig.limit for a paging source (index-page).
		// 2.126.0 adds the setup choice step's display "rows" and default (setup-wizard), visibleWhen op anyOf and the record-list footerAction (record-list), and documents folderSidebar.pane and the fieldOverrides search look (index-page, form-dialog).
		// 2.127.0 adds config.sideColumnFrom on a detail page (detail-page), headerButtons[].run, config.search, searchPlacement, defaultOrder, listConfig leading / trailing / subtitleTemplate and folderSidebar heading / countText on an index page (index-page, object-row), and the object-table pageSize (object-table).
		// 2.128.0 adds the setup step's noteStyle (setup-wizard), chart referenceLines and categoryFormat (chart-widget), visibleWhen op contains (visible-when), config.tabsFrom on a detail page (detail-page) and the notice widget (notice-widget).
		// 2.129.0 adds config.cardLayout on an index page, the board record card's layout, with a meta part that names its own formatter (card-layout-part-formatter); also quickFilterPlacement row (index-page), nextStep.stagesFrom, side-column entry tabs and folderSidebar.scopeViews (detail-page, index-page), and the record-list dot / flags, related groupByRelation / layout / groupActions and nc-widget excludeApps / excludeTypes content (widgets).
		// 2.130.0 adds config.defaultSavedViews on an index page, views the app ships, read-only and copyable, with savedViewTree.seeded deprecated (saved-views-manage-and-defaults), and a dashboard page filter's optionsFrom, clearable and placeholder, with options required only without optionsFrom (dashboard-page).
		// 2.131.0 adds mapConfig markerColor, plotAll and count on an index page (index-map-parity).
		// 2.132.0 adds sortSelectOptions[].source, a sidebar sort order whose rows come from an app endpoint (sidebar-sort-endpoint-source), saved-view overrides with locked filters, profile patches and card parts (saved-view-overrides-v2), and the forms work: a field's optionsFrom, dotted-path fields, the sub-objects editor, list reorder by an order field and the smaller form features (form-small-features).
		// 2.133.0 adds the field override keys placeholderFrom, requiredWhen, warnWhen, clearWhenHidden, stored, initialWhen, sectionCollapsed, optionSwatches and optionIcons, optionsFrom groupField, where, itemsPath and hideWhenEmpty, and a source that follows another field through @answer (object-list-edit-in-place), the decision-list, retention, plan and work-queue widgets (widgets), and config.searchRefusalHint (index-page).
		// 2.134.0 adds headerPill.resolve colorField and iconField, a default saved view's icon, and resolve on the board card's pill and the record card's pills (pill-color-field-cards).
		// 2.135.0 adds $defs.headerAction / headerLinkAction: href with target "_blank" / "_self" on header actions, their children, quick actions and stage actions, a header action that is a real link (header-action-href, nextcloud-vue#1314).
		// 2.136.0 lets nextStep's title and a stage's title and after be a list of candidates, each naming record fields as {path} tokens (board-case-page).
		// 2.137.0 lets open-form edit and create through an endpoint (open-form-endpoint), a grouped-cards group carry an action (grouped-cards-group-action), a detail page ask for a purpose before it opens a record (detail-access-purpose), an api-call GET a download (api-call-get-download) and headerPill.values limit a pill to some values (detail-pill-values).
		// 2.138.0 adds after and before on a row indicator, a date bound that is now or an ISO date (cell-config-growth).
		// 2.139.0 adds the redaction page type (dq-abstract-record-widgets), quarter and year page filters with count, and loadOn, requestLabel, requestHint, truncatedText and namePath on endpoint widgets (dq-abstract-dash).
		// 2.140.0 lets an index page follow live changes (pl4-index-live), gives a row indicator lt and gt (pl4-cells), the export launcher its entity types (pl4-export-action), a board columns read from a list on a referenced row with itemsPath, keyField and closedField (pl4-board), card cells and card actions (pl4-board-cells, pl4-board-card-actions), and a select-or-create reference its createModal (pl4-form-create-modal).
		// 2.141.0 lets a widget header link switch the page to a body tab (header-link-switches-tab) and a side card name the body tabs it shows beside (side-card-follows-row).
		// 2.144.0 lets a detail page's quick actions and next step follow the open tab (r23-detail-actions-per-tab), a chart aggregate merge groups by label (aggregate-merge-by-label), a detail page read its quick actions from a field of the record (quickActionsFrom, r23-quick-actions-from), and a dashboard set its side column's width with layout tracks (gridSideColumn, dashboard-side-column-width).
		// 2.145.0 gives a detail page a band of widgets above its body (pq-adm-a-detail-band) and a primary action a query (pq-adm-a-detail-page-filters).
		// 2.146.0 lets a detail page opt into previous and next within the list it was opened from (listNavigation, detail-list-navigation-wired).
		expect(schema.version).toBe('2.146.0')
	})

	it('accepts the 2.145.0 detail band: ids, { widgetId, span, chrome } and inline definitions', () => {
		const page = (band) => ({ ...MINIMAL_V2, pages: [{ id: 'P', route: '/p/:id', type: 'detail', title: 'P', config: { register: 'r', schema: 's', band } }] })
		expect(validateManifestV2(page(['kpi', { widgetId: 'kpi', span: 3, chrome: 'bare' }, { type: 'banner', span: 12 }])).valid).toBe(true)
		expect(validateManifestV2(page([{ widgetId: 'kpi', span: 13 }])).valid).toBe(false)
		expect(validateManifestV2(page([{ widgetId: 'kpi', chrome: 'frame' }])).valid).toBe(false)
	})

	it('accepts the 2.145.0 query on a primary action', () => {
		const withPrimary = (primaryAction) => ({ ...MINIMAL_V2, pages: [{ id: 'P', route: '/p/:id', type: 'detail', title: 'P', primaryAction, config: { register: 'r', schema: 's' } }] })
		expect(validateManifestV2(withPrimary({ label: 'New page', route: 'Pages', query: { action: 'create' } })).valid).toBe(true)
		expect(validateManifestV2(withPrimary({ label: 'New page', route: 'Pages', query: { action: 3 } })).valid).toBe(false)
	})

	it('accepts the 2.135.0 header action href and refuses it with a handler, another type or a bad URL', () => {
		const withAction = (action) => ({ ...MINIMAL_V2, pages: [{ id: 'list', route: '/list', type: 'index', title: 'List', config: { register: 'r', schema: 's', headerActions: [{ id: 'add', label: 'Add integration', ...action }] } }] })
		expect(validateManifestV2(withAction({ href: '/apps/integriq/connections?app=stackiq' })).valid).toBe(true)
		expect(validateManifestV2(withAction({ href: 'https://example.org/docs', target: '_blank' })).valid).toBe(true)
		expect(validateManifestV2(withAction({ href: 'mailto:support@example.org', target: '_self' })).valid).toBe(true)
		expect(validateManifestV2(withAction({ href: '/apps/x', handler: 'openConnections' })).valid).toBe(false)
		expect(validateManifestV2(withAction({ href: '/apps/x', type: 'navigate' })).valid).toBe(false)
		expect(validateManifestV2(withAction({ href: '/apps/x', target: 'connections' })).valid).toBe(false)
		expect(validateManifestV2(withAction({ href: 'javascript:alert(1)' })).valid).toBe(false)
		expect(validateManifestV2(withAction({ href: 'apps/x' })).valid).toBe(false)
		expect(validateManifestV2(withAction({ href: 'HTTPS://example.org' })).valid).toBe(false)
		// Without href, `target` keeps naming a destination.
		expect(validateManifestV2(withAction({ type: 'open-modal', target: 'connections' })).valid).toBe(true)
	})

	it('takes href on header action children, quick actions and stage actions, but not on row, bulk or navigation actions', () => {
		const link = { id: 'go', label: 'Go', href: '/apps/x' }
		const index = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'list', route: '/list', type: 'index', title: 'List', config: { register: 'r', schema: 's', ...config } }] })
		const detail = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', ...config } }] })
		expect(validateManifestV2(index({ headerActions: [{ id: 'more', label: 'More', handler: 'emit', children: [link] }] })).valid).toBe(true)
		expect(validateManifestV2(index({ headerActions: [{ ...link, children: [{ ...link, id: 'sub' }] }] })).valid).toBe(true)
		expect(validateManifestV2(index({ headerActions: [{ id: 'more', label: 'More', children: [{ ...link, handler: 'x' }] }] })).valid).toBe(false)
		expect(validateManifestV2(detail({ quickActions: [link], primaryActionByStage: { open: link } })).valid).toBe(true)
		expect(validateManifestV2(index({ bulkActions: [link] })).valid).toBe(false)
		expect(validateManifestV2({ ...MINIMAL_V2, pages: [{ id: 'list', route: '/list', type: 'index', title: 'List', actions: [link] }] }).valid).toBe(false)
		expect(validateManifestV2({ ...MINIMAL_V2, nav: { primaryAction: { label: 'New', action: link } } }).valid).toBe(false)
		expect(validateManifestV2({ ...MINIMAL_V2, nav: { primaryAction: { label: 'New', action: { id: 'go', label: 'Go', type: 'navigate', target: '/x' } } } }).valid).toBe(true)
		// Children: a header action's take href, a row, bulk or navigation action's do not.
		const parent = (children) => ({ id: 'more', label: 'More', handler: 'emit', children })
		expect(validateManifestV2(index({ bulkActions: [parent([link])] })).valid).toBe(false)
		expect(validateManifestV2({ ...MINIMAL_V2, pages: [{ id: 'list', route: '/list', type: 'index', title: 'List', actions: [parent([link])] }] }).valid).toBe(false)
		expect(validateManifestV2({ ...MINIMAL_V2, nav: { primaryAction: { label: 'New', action: parent([link]) } } }).valid).toBe(false)
		expect(validateManifestV2({ ...MINIMAL_V2, nav: { primaryAction: { label: 'New', action: parent([{ id: 'sub', label: 'Sub', handler: 'emit' }]) } } }).valid).toBe(true)
		expect(validateManifestV2(index({ headerActions: [parent([{ id: 'sub', label: 'Sub', handler: 'emit', unknownKey: 1 }])] })).valid).toBe(false)
		// Both action defs stay closed and keep the per-type rules.
		expect(validateManifestV2(index({ bulkActions: [{ id: 'a', label: 'A', unknownKey: 1 }] })).valid).toBe(false)
		expect(validateManifestV2(index({ bulkActions: [{ id: 'a', label: 'A', type: 'object-op' }] })).valid).toBe(false)
		expect(validateManifestV2(index({ headerActions: [{ id: 'a', label: 'A', type: 'api-call' }] })).valid).toBe(false)
		expect(validateManifestV2(index({ headerActions: [{ id: 'a', label: 'A', type: 'api-call', url: '/apps/x/api' }] })).valid).toBe(true)
	})

	it('accepts the 2.133.0 widgets and searchRefusalHint, and refuses malformed ones', () => {
		const page = (widgets, config = {}) => ({ ...MINIMAL_V2, pages: [{ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', ...config }, widgets }] })
		const widget = (widgetKey, content) => ({ id: widgetKey, widgetKey, slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, props: { content } })
		expect(validateManifestV2(page([
			widget('decision-list', { source: { url: '/apps/x/api/signoffs' }, answers: [{ value: 'ok', label: 'Approve', fields: [{ field: 'until', type: 'date' }] }], reason: false, submit: { request: { method: 'POST', url: '/apps/x/api/signoffs/{id}' } } }),
			widget('retention', { statusField: 'archiveStatus', archivedValues: ['archived'], archivistGroups: ['archivaris'], recompute: false }),
			widget('plan', { emptyText: 'No plan yet' }),
			widget('work-queue', { source: { url: '/apps/x/api/queue' }, hide: '/apps/x/api/queue/{group}/hide', waitingParties: { applicant: 'the applicant' } }),
		])).valid).toBe(true)
		expect(validateManifestV2(page([widget('decision-list', { answers: [{ value: 'ok' }] })])).valid).toBe(false)
		expect(validateManifestV2(page([widget('decision-list', { reason: true })])).valid).toBe(false)
		expect(validateManifestV2(page([widget('decision-list', { submit: { request: { method: 'POST' } } })])).valid).toBe(false)
		expect(validateManifestV2(page([widget('retention', { recompute: 'no' })])).valid).toBe(false)
		expect(validateManifestV2(page([widget('work-queue', { waitingParties: { applicant: 1 } })])).valid).toBe(false)
		const index = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', ...config } }] })
		expect(validateManifestV2(index({ searchRefusalHint: 'Use AND, OR or NOT between words.' })).valid).toBe(true)
		expect(validateManifestV2(index({ searchRefusalHint: 3 })).valid).toBe(false)
	})

	it('accepts the 2.131.0 map keys and refuses malformed ones', () => {
		const index = (mapConfig) => ({ ...MINIMAL_V2, pages: [{ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', mapConfig: { latField: 'lat', lngField: 'lng', ...mapConfig } } }] })
		expect(validateManifestV2(index({ markerColor: { field: 'status', colorMap: { open: 'var(--color-success)' } }, plotAll: true, count: true })).valid).toBe(true)
		expect(validateManifestV2(index({ markerColor: { field: 'caseType', source: { register: 'r', schema: 'caseType', colorField: 'colour' } }, plotAll: 200, count: '{located} of {total}' })).valid).toBe(true)
		expect(validateManifestV2(index({ markerColor: { colorMap: {} } })).valid).toBe(false)
		expect(validateManifestV2(index({ markerColor: { field: 'caseType', source: { register: 'r' } } })).valid).toBe(false)
		expect(validateManifestV2(index({ plotAll: 0 })).valid).toBe(false)
		expect(validateManifestV2(index({ count: 3 })).valid).toBe(false)
	})

	it('accepts the 2.132.0 sort option with an endpoint source and refuses malformed ones', () => {
		const index = (sortSelectOptions) => ({ ...MINIMAL_V2, pages: [{ id: 'mine', route: '/mine', type: 'index', title: 'Mine', config: { register: 'r', schema: 's', sortSelectOptions } }] })
		const urgency = { value: 'urgency', label: 'Urgency', default: true, order: 'deadline', source: { url: '/apps/x/api/queue', rowsPath: 'items', rowPath: 'case', carry: ['deadlineTier'], annotate: true, failedNote: 'Ordered by deadline.' } }
		expect(validateManifestV2(index([urgency, { value: 'newest', label: 'Newest', order: '-startDate' }])).valid).toBe(true)
		expect(validateManifestV2(index([{ ...urgency, source: { rowsPath: 'items' } }])).valid).toBe(false)
		expect(validateManifestV2(index([{ ...urgency, source: { url: '/x', rows: 'items' } }])).valid).toBe(false)
		expect(validateManifestV2(index([{ label: 'No value' }])).valid).toBe(false)
	})

	it('a page filter takes its options or optionsFrom, and refuses neither or a malformed optionsFrom', () => {
		const withFilter = (filter) => ({ ...MINIMAL_V2, pages: [{ id: 'trend', route: '/trend', type: 'dashboard', title: 'Trend', config: { pageFilters: [filter] } }] })
		const options = [{ value: 'mean', label: 'Gemiddeld' }]
		expect(validateManifestV2(withFilter({ key: 'measure', options })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'caseType', optionsFrom: { register: 'dossiq', schema: 'caseType', labelField: 'name' }, clearable: true, placeholder: 'All case types' })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'caseType', optionsFrom: { url: '/apps/dossiq/api/case-types', responsePath: 'results' } })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'caseType' })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'caseType', clearable: true, placeholder: 'All' })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'caseType', optionsFrom: { labelField: 'name' } })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'caseType', optionsFrom: { register: 'dossiq', schema: 'caseType', source: 'x' } })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'caseType', options, clearable: 'yes' })).valid).toBe(false)
	})

	it('accepts a widget headerLink that names a tab, and refuses an empty one (2.140.0)', () => {
		const page = (headerLink) => ({
			...MINIMAL_V2,
			pages: [{
				id: 'reporting',
				route: '/reporting',
				type: 'dashboard',
				title: 'app.reporting',
				widgets: [
					{ widgetKey: 'AnnualStatementWidget', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, headerLink },
					{ widgetKey: 'AnnualStatementWidget', slot: 'body', gridX: 6, gridY: 0, gridWidth: 6, gridHeight: 4 },
				],
			}],
		})
		expect(validateManifestV2(page({ label: 'All history', tab: 'history' })).valid).toBe(true)
		expect(validateManifestV2(page({ label: 'All history', tab: '' })).valid).toBe(false)
	})

	it('accepts the 2.139.0 generated quarter and year filters without options, and the endpoint request keys', () => {
		const withFilter = (filter) => ({ ...MINIMAL_V2, pages: [{ id: 'report', route: '/report', type: 'dashboard', title: 'Report', config: { pageFilters: [filter] } }] })
		expect(validateManifestV2(withFilter({ key: 'quarter', type: 'quarter', count: 8 })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'year', type: 'year' })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'week', type: 'fortnight' })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'quarter', type: 'quarter', count: 0 })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'pick', type: 'select' })).valid).toBe(false)
	})

	it('accepts the 2.128.0 keys and refuses malformed ones', () => {
		const withPage = (page) => ({ ...MINIMAL_V2, pages: [page] })
		const notice = (content, visibleWhen) => withPage({ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', tabsFrom: '@context.caseType.tabs' }, widgets: [{ id: 'special', widgetKey: 'notice', slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 1, props: { content }, ...(visibleWhen ? { visibleWhen } : {}) }] })
		expect(validateManifestV2(notice({ variant: 'warning', title: 'Special category data', text: 'Every view is logged.' }, { field: 'overviewCards', op: 'contains', value: 'special' })).valid).toBe(true)
		expect(validateManifestV2(notice({ variant: 'loud', text: 'x' })).valid).toBe(false)
		expect(validateManifestV2(notice({ text: 'x' }, { field: 'overviewCards', op: 'includes', value: 'special' })).valid).toBe(false)
		expect(validateManifestV2(withPage({ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', tabsFrom: '' } })).valid).toBe(false)
	})

	it('accepts the other 2.129.0 keys and refuses malformed ones', () => {
		const withPage = (page) => ({ ...MINIMAL_V2, pages: [page] })
		const detail = (config, widgets = []) => withPage({ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', ...config }, widgets })
		const widget = (widgetKey, content) => ({ id: widgetKey, widgetKey, slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2, props: { content } })
		expect(validateManifestV2(detail({ nextStep: { stagesFrom: '@context.caseType.nextStep' }, sideColumn: [{ type: 'facts', tabs: ['fields'] }] }, [
			widget('record-list', { dot: { field: 'colour', colorMap: { open: 'green' } }, flags: [{ field: 'isStart', label: 'Start' }] }),
			widget('related', { groupByRelation: true, layout: 'sections', groupActions: { followUp: { type: 'open-form' } } }),
			widget('nc-widget', { excludeApps: ['systemtags'] }),
		])).valid).toBe(true)
		expect(validateManifestV2(detail({ nextStep: { title: 'Next' } })).valid).toBe(false)
		expect(validateManifestV2(detail({ sideColumn: [{ type: 'facts', tabs: [] }] })).valid).toBe(false)
		expect(validateManifestV2(detail({}, [widget('record-list', { flags: [{ field: 'isStart' }] })])).valid).toBe(false)
		expect(validateManifestV2(detail({}, [widget('related', { layout: 'grid' })])).valid).toBe(false)
		expect(validateManifestV2(detail({}, [widget('nc-widget', { excludeApps: 'systemtags' })])).valid).toBe(false)
		const index = (config) => withPage({ id: 'work', route: '/work', type: 'index', title: 'Work', config: { register: 'r', schema: 's', ...config } })
		expect(validateManifestV2(index({ quickFilterPlacement: 'row', folderSidebar: { scopeViews: ['table', 'list'] } })).valid).toBe(true)
		expect(validateManifestV2(index({ folderSidebar: { scopeViews: [] } })).valid).toBe(false)
	})

	it('accepts the 2.129.0 meta part with its own formatter and refuses one without a field', () => {
		const index = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'mine', route: '/mine', type: 'index', title: 'Mine', config: { register: 'r', schema: 's', ...config } }] })
		expect(validateManifestV2(index({ cardLayout: { meta: [{ field: 'caseType', formatter: 'caseTypeName' }, 'assignee'] } })).valid).toBe(true)
		expect(validateManifestV2(index({ cardLayout: { meta: [{ formatter: 'caseTypeName' }] } })).valid).toBe(false)
	})

	it('accepts the 2.129.0 cardLayout and refuses malformed ones', () => {
		const index = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'mine', route: '/mine', type: 'index', title: 'Mine', config: { register: 'r', schema: 's', ...config } }] })
		const cardLayout = {
			headPill: { field: 'urgency', colorMap: { late: 'error' }, labels: { late: 'Te laat' } },
			number: 'identifier',
			title: 'title',
			meta: ['caseTypeName', 'assignee'],
			footerPill: { field: 'statusName', colorMap: { 'in behandeling': 'purple' } },
			footerDate: { field: 'deadline', label: 'Termijn' },
		}
		expect(validateManifestV2(index({ cardLayout })).valid).toBe(true)
		expect(validateManifestV2(index({ cardLayout: { headPill: { colorMap: {} } } })).valid).toBe(false)
		expect(validateManifestV2(index({ cardLayout: { footerPill: { field: 's', colorMap: { x: 'lilac' } } } })).valid).toBe(false)
		expect(validateManifestV2(index({ cardLayout: { footerDate: { label: 'Termijn' } } })).valid).toBe(false)
		expect(validateManifestV2(index({ cardLayout: { badge: 'x' } })).valid).toBe(false)
	})

	it('accepts the 2.127.0 keys and refuses malformed ones', () => {
		const withPage = (page) => ({ ...MINIMAL_V2, pages: [page] })
		const index = (config) => withPage({ id: 'queue', route: '/queue', type: 'index', title: 'Queue', config: { register: 'r', schema: 's', ...config } })
		const table = (props) => withPage({ id: 'home', route: '/', type: 'dashboard', title: 'Home', widgets: [{ id: 'cat', widgetKey: 'object-table', slot: 'body', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3, props }] })
		expect(validateManifestV2(index({
			search: false,
			searchPlacement: 'toolbar',
			defaultOrder: '-createdAt',
			headerButtons: [{ action: 'export', run: 'export-queue' }],
			listConfig: { subtitleTemplate: '{caseType} · {assignee}', leading: { key: 'createdAt', widget: 'age' }, trailing: [{ key: 'deadline', widget: 'date' }] },
			folderSidebar: { heading: true, countText: '{count} leden' },
		})).valid).toBe(true)
		expect(validateManifestV2(index({ defaultOrder: [{ key: 'title', order: 'asc' }] })).valid).toBe(true)
		expect(validateManifestV2(index({ searchPlacement: 'header' })).valid).toBe(false)
		expect(validateManifestV2(index({ search: 'no' })).valid).toBe(false)
		expect(validateManifestV2(index({ listConfig: { leading: { widget: 'age' } } })).valid).toBe(false)
		expect(validateManifestV2(index({ headerButtons: [{ action: 'export', run: '' }] })).valid).toBe(false)
		expect(validateManifestV2(withPage({ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', sideColumnFrom: '@context.caseType.sideCards' } })).valid).toBe(true)
		expect(validateManifestV2(table({ pageSize: 4 })).valid).toBe(true)
		expect(validateManifestV2(table({ pageSize: 0 })).valid).toBe(false)
	})

	it('accepts the 2.126.0 keys and refuses malformed ones', () => {
		const withPage = (page) => ({ ...MINIMAL_V2, pages: [page] })
		const index = (config) => withPage({ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', ...config } })
		const recordList = (content) => withPage({ id: 'home', route: '/', type: 'dashboard', title: 'Home', widgets: [{ id: 'appeal', widgetKey: 'record-list', slot: 'body', gridX: 0, gridY: 0, gridWidth: 4, gridHeight: 2, props: { content } }] })
		const footerAction = { label: 'Register appeal', type: 'open-form', disabledWhen: { field: 'categories', op: 'anyOf', value: ['health', 'ethnicity'] }, disabledReason: 'Once the decision is sent' }
		expect(validateManifestV2(recordList({ footerAction })).valid).toBe(true)
		expect(validateManifestV2(recordList({ footerAction: { type: 'open-form' } })).valid).toBe(false)
		expect(validateManifestV2(index({ folderSidebar: { pane: false }, fieldOverrides: { team: { look: 'search', optionSecondary: '{members}', optionAvatar: true } } })).valid).toBe(true)
		expect(validateManifestV2(index({ folderSidebar: { pane: 'no' } })).valid).toBe(false)
		expect(validateManifestV2(index({ fieldOverrides: { team: { look: 'dropdown' } } })).valid).toBe(false)
	})

	it('accepts index rowClass rules, bulkBandAlways and quickFilterPlacement, and refuses malformed ones', () => {
		const withIndex = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'tasks', route: '/tasks', type: 'index', title: 'Tasks', config: { register: 'r', schema: 's', ...config } }] })
		const overdue = { when: { field: 'dueAt', op: 'lt', value: '@today' }, class: 'cn-row--overdue' }
		expect(validateManifestV2(withIndex({ rowClass: [overdue], bulkBandAlways: true, quickFilterPlacement: 'toolbar' })).valid).toBe(true)
		expect(validateManifestV2(withIndex({ rowClass: [{ when: { field: 'dueAt', op: 'before', value: '@today' }, class: 'x' }] })).valid).toBe(false)
		expect(validateManifestV2(withIndex({ rowClass: [{ when: { field: 'dueAt', value: 1 } }] })).valid).toBe(false)
		expect(validateManifestV2(withIndex({ bulkBandAlways: 'yes' })).valid).toBe(false)
		expect(validateManifestV2(withIndex({ quickFilterPlacement: 'header' })).valid).toBe(false)
	})

	it('accepts a row-class rule with a list of conditions and a numeric row indicator (pl4-cell-rules)', () => {
		const withIndex = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'leads', route: '/leads', type: 'index', title: 'Leads', config: { register: 'r', schema: 's', ...config } }] })
		const overdueOpen = { when: [{ field: 'expectedCloseDate', op: 'lt', value: '@today' }, { field: 'status', value: 'open' }], class: 'cn-row--overdue' }
		expect(validateManifestV2(withIndex({ rowClass: [overdueOpen] })).valid).toBe(true)
		expect(validateManifestV2(withIndex({ rowClass: [{ when: [], class: 'x' }] })).valid).toBe(false)
		expect(validateManifestV2(withIndex({ rowClass: [{ when: [{ field: 'a', op: 'before', value: 1 }], class: 'x' }] })).valid).toBe(false)
		expect(validateManifestV2(withIndex({ rowIndicators: [{ field: 'winProbability', lt: 30, text: 'Low' }] })).valid).toBe(true)
		expect(validateManifestV2(withIndex({ rowIndicators: [{ field: 'winProbability', lt: 'thirty', text: 'Low' }] })).valid).toBe(false)
		const stale = (value) => withIndex({ quickFilters: [{ label: 'Out of date', filter: { '@self[updated][lt]': value } }] })
		expect(validateManifestV2(stale('@today-{@config.lead_stale_threshold_days}d')).valid).toBe(true)
		expect(validateManifestV2(stale('@today-{config.x}d')).valid).toBe(false)
	})

	it('accepts an export action entity that names its OpenRegister objects (pl4-export-action)', () => {
		const withAction = (action) => ({ ...MINIMAL_V2, pages: [{ id: 'ops', route: '/ops', type: 'dashboard', title: 'Ops', config: { headerActions: [action] } }] })
		const entity = { id: 'requests', label: 'Requests', register: 'pipelinq', schema: 'ticket', filter: { ticketType: 'request' } }
		expect(validateManifestV2(withAction({ id: 'export-report', label: 'Export', type: 'export', entities: [entity], formats: ['excel', 'csv'] })).valid).toBe(true)
		expect(validateManifestV2(withAction({ id: 'export-report', label: 'Export', type: 'export', entities: [{ ...entity, register: '' }] })).valid).toBe(false)
		expect(validateManifestV2(withAction({ id: 'export-report', label: 'Export', type: 'export', entities: [{ ...entity, path: 'x' }] })).valid).toBe(false)
	})

	it('accepts board columns from a list on a parent row (pl4-board-list-stages)', () => {
		const withBoard = (source) => ({ ...MINIMAL_V2, pages: [{ id: 'leads', route: '/leads', type: 'index', title: 'Leads', config: { register: 'pipelinq', schema: 'lead', viewModes: ['table', 'board'], board: { statusField: 'stage', columnFields: [{ field: 'stage', source }] } } }] })
		const stages = { schema: 'pipeline', itemsPath: 'stages', keyField: 'name', labelField: 'name', orderField: 'order', colorField: 'color', closedField: 'isClosed', narrowBy: { field: '_parent', rowField: 'pipeline' } }
		expect(validateManifestV2(withBoard(stages)).valid).toBe(true)
		expect(validateManifestV2(withBoard({ ...stages, itemsPath: '' })).valid).toBe(false)
		const withCells = (cardCells) => ({ ...MINIMAL_V2, pages: [{ id: 'leads', route: '/leads', type: 'index', title: 'Leads', config: { register: 'pipelinq', schema: 'lead', board: { statusField: 'stage', cardFields: ['priority'], cardCells } } }] })
		expect(validateManifestV2(withCells({ priority: { widget: 'badge', widgetProps: { colorMap: { high: 'warning' } } } })).valid).toBe(true)
		expect(validateManifestV2(withCells({ priority: { colour: 'red' } })).valid).toBe(false)
		const withCardActions = (cardActions) => ({ ...MINIMAL_V2, pages: [{ id: 'leads', route: '/leads', type: 'index', title: 'Leads', config: { register: 'pipelinq', schema: 'lead', board: { statusField: 'stage', cardActions } } }] })
		expect(validateManifestV2(withCardActions(['assign', 'priority'])).valid).toBe(true)
		expect(validateManifestV2(withCardActions([''])).valid).toBe(false)
	})

	it('accepts an index page that follows live changes (pl4-index-live)', () => {
		const withLive = (live) => ({ ...MINIMAL_V2, pages: [{ id: 'leads', route: '/leads', type: 'index', title: 'Leads', config: { register: 'r', schema: 's', live } }] })
		expect(validateManifestV2(withLive(['lead', 'ticket'])).valid).toBe(true)
		expect(validateManifestV2(withLive([''])).valid).toBe(false)
	})

	it('accepts a dashboard page filter drawn as a segmented group on the description line, and refuses unknown keys', () => {
		const withFilter = (filter) => ({ ...MINIMAL_V2, pages: [{ id: 'trend', route: '/trend', type: 'dashboard', title: 'Trend', config: { pageFilters: [filter] } }] })
		const options = [{ value: 'mean', label: 'Gemiddeld' }, { value: 'median', label: 'Mediaan' }]
		expect(validateManifestV2(withFilter({ key: 'measure', options, control: 'segmented', placement: 'description' })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'period', options })).valid).toBe(true)
		expect(validateManifestV2(withFilter({ key: 'measure', options, control: 'radio' })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'measure', options, placement: 'footer' })).valid).toBe(false)
		expect(validateManifestV2(withFilter({ key: 'measure', options, colour: 'red' })).valid).toBe(false)
	})

	it('accepts nav.searchPlaceholder as a non-empty string', () => {
		const withLine = (searchPlaceholder) => ({ ...MINIMAL_V2, nav: { searchPlaceholder } })
		expect(validateManifestV2(withLine('Search cases, documents or contacts')).valid).toBe(true)
		expect(validateManifestV2(withLine('')).valid).toBe(false)
		expect(validateManifestV2(withLine(3)).valid).toBe(false)
	})

	it('accepts the index keys statRow and sidePanel, and refuses an entry without a type', () => {
		const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'queue', route: '/queue', type: 'index', title: 'Queue', config: { register: 'r', schema: 's', ...config } }] })
		expect(validateManifestV2(page({ statRow: [{ id: 'a', type: 'stat', content: { label: 'Open' } }], sidePanel: [{ id: 't', type: 'TeamToday', title: 'Team today', headerLink: { label: 'All', href: '#' } }] })).valid).toBe(true)
		expect(validateManifestV2(page({ statRow: [{ id: 'a' }] })).valid).toBe(false)
	})

	it('accepts the dashboard keys greeting, viewLinks and showActionsMenu, and refuses a link without a label', () => {
		const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'mywork', route: '/', type: 'dashboard', title: 'My work', config }] })
		expect(validateManifestV2(page({ greeting: true, showActionsMenu: false, viewLinks: [{ label: 'Your queue', icon: 'TrayFull', route: 'Queue' }, { label: 'Day', href: '/day' }, { label: 'Mine', route: { name: 'Cases', query: { assignee: 'me' } } }] })).valid).toBe(true)
		expect(validateManifestV2(page({ greeting: 'full' })).valid).toBe(true)
		expect(validateManifestV2(page({ greeting: 'nickname' })).valid).toBe(false)
		expect(validateManifestV2(page({ viewLinks: [{ route: 'Queue' }] })).valid).toBe(false)
	})

	it('accepts page views on a dashboard and a detail page, and refuses a view without an id or label', () => {
		const views = [
			{ id: 'mine', label: 'My work', widgets: [{ id: 'my-cases', type: 'object-table' }], layout: [{ id: '1', widgetId: 'my-cases', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 }] },
			{ id: 'team', label: 'My team', emptyText: 'Nobody in your team has open cases.' },
		]
		const page = (type, config) => ({ ...MINIMAL_V2, pages: [{ id: 'P', route: '/p', type, title: 'P', config }] })
		expect(validateManifestV2(page('dashboard', { views, defaultView: 'team', viewsLabel: 'Whose work' })).valid).toBe(true)
		expect(validateManifestV2(page('detail', { register: 'r', schema: 's', views })).valid).toBe(true)
		expect(validateManifestV2(page('dashboard', { views: [{ label: 'No id' }] })).valid).toBe(false)
		expect(validateManifestV2(page('dashboard', { views: [{ id: 'x' }] })).valid).toBe(false)
		expect(validateManifestV2(page('dashboard', { views: [{ id: 'has space', label: 'X' }] })).valid).toBe(false)
	})

	it('accepts the round-two Zuiddrecht keys and refuses a footer that is not a list of ids', () => {
		const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'P', route: '/p', type: 'detail', title: 'P', config }] })
		expect(validateManifestV2({ ...MINIMAL_V2, nav: { footer: ['settings', 'help'] } }).valid).toBe(true)
		expect(validateManifestV2({ ...MINIMAL_V2, nav: { footer: 'settings' } }).valid).toBe(false)
		expect(validateManifestV2(page({ register: 'r', schema: 's', headerCard: true, headerWidget: 'case-stages', breadcrumb: { label: 'All cases', route: 'Cases', icon: 'Home' } })).valid).toBe(true)
		expect(validateManifestV2({ ...MINIMAL_V2, pages: [{ id: 'D', route: '/d', type: 'dashboard', title: 'D', config: { showWidgetActions: false } }] }).valid).toBe(true)
	})

	it('accepts a declarative `store` block, and requires the remote schema', () => {
		// ADR-080 / ADR-114 D4: an app declares its store rather than writing
		// one. `schema` is the only required key because it is the one thing
		// the engine cannot default — it names what the registry serves.
		expect(validateManifestV2({
			...MINIMAL_V2,
			store: { schema: 'case-type-template', installable: ['caseType'] },
		}).valid).toBe(true)

		expect(validateManifestV2({
			...MINIMAL_V2,
			store: { installable: ['caseType'] },
		}).valid).toBe(false)
	})

	it('refuses an undeclared key inside the store block', () => {
		// additionalProperties:false is what stops a typo'd `installible` from
		// validating and then refusing every install at runtime, which is the
		// silent-no-op shape this whole block is exposed to.
		expect(validateManifestV2({
			...MINIMAL_V2,
			store: { schema: 'case-type-template', installible: ['caseType'] },
		}).valid).toBe(false)
	})

	it('accepts the `store` page type', () => {
		// The enum is the reachability contract: CnPageRenderer can dispatch a
		// type the schema refuses, and the manifest is then rejected before the
		// renderer ever sees it. nextcloud-vue#897 shipped exactly that for
		// `reports` — a component with no enum entry and no way to name it.
		const manifest = {
			...MINIMAL_V2,
			pages: [{ id: 'Store', route: '/store', type: 'store', title: 'Store' }],
		}
		expect(validateManifestV2(manifest).valid).toBe(true)
	})

	it('accepts the keys that narrow what an open-form button asks for', () => {
		// The schema is additionalProperties:false, so an undeclared key makes
		// a valid manifest invalid. dossiq's New case button collects nine of
		// the case schema's 53 fields and could not say so without these.
		const manifest = {
			$schema: V2_SCHEMA_URL,
			version: '1.0.0',
			menu: [{ id: 'Dashboard', label: 'Dashboard', route: 'Dashboard', order: 10 }],
			pages: [{
				id: 'Dashboard',
				route: '/',
				type: 'dashboard',
				title: 'Dashboard',
				config: {
					headerActions: [{
						id: 'new-case',
						label: 'New case',
						type: 'open-form',
						register: 'dossiq',
						schema: 'case',
						includeFields: ['caseType', 'title', 'description'],
						excludeFields: ['status'],
						fieldOverrides: { title: { order: 1 } },
						formTitle: 'File a case',
						formEyebrow: 'All cases',
						formSubtitle: 'Fields with * are required.',
						advanced: false,
						size: 'large',
						columns: 2,
					}],
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})

	it('rejects a column count the layout cannot render', () => {
		// The prop validator accepts 1 or 2 only, and a manifest declaring 3
		// would silently fall back rather than fail, so the schema is where
		// the mistake has to surface.
		const withColumns = (columns) => ({
			$schema: V2_SCHEMA_URL,
			version: '1.0.0',
			menu: [{ id: 'Dashboard', label: 'Dashboard', route: 'Dashboard', order: 10 }],
			pages: [{
				id: 'Dashboard',
				route: '/',
				type: 'dashboard',
				title: 'Dashboard',
				config: {
					headerActions: [{
						id: 'new-case',
						label: 'New case',
						type: 'open-form',
						register: 'dossiq',
						schema: 'case',
						columns,
					}],
				},
			}],
		})
		expect(validateManifestV2(withColumns(2)).valid).toBe(true)
		expect(validateManifestV2(withColumns(3)).valid).toBe(false)
		expect(validateManifestV2(withColumns(0)).valid).toBe(false)
	})

	it('accepts createOverride on an open-form action', () => {
		// CnActionButtons resolves this to a registry handler that owns the
		// persist. The schema is additionalProperties:false, so without the
		// declaration a valid manifest is rejected — which is exactly how this
		// gap surfaced: pipelinq could not declare its contact-first client
		// create.
		const manifest = {
			$schema: V2_SCHEMA_URL,
			version: '1.0.0',
			menu: [{ id: 'Dashboard', label: 'Dashboard', route: 'Dashboard', order: 10 }],
			pages: [{
				id: 'Dashboard',
				route: '/',
				type: 'dashboard',
				title: 'Dashboard',
				config: {
					headerActions: [{
						id: 'new-client',
						label: 'New client',
						type: 'open-form',
						register: 'pipelinq',
						schema: 'client',
						createOverride: 'createClientContactAware',
						onSuccessRoute: 'ClientDetail',
					}],
				},
			}],
		}
		const result = validateManifestV2(manifest)
		expect(result.valid).toBe(true)
	})
})

describe('case-page-and-list-as-a-place — the keys are refused off their page type', () => {
	const page = (extra) => ({
		$schema: V2_SCHEMA_URL,
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'p', route: '/p', type: 'index', title: 'P', ...extra }],
	})
	const detail = (extra) => ({
		$schema: V2_SCHEMA_URL,
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'p', route: '/p/:id', type: 'detail', title: 'P', ...extra }],
	})

	it('accepts splitView on an index page', () => {
		expect(validateManifestV2(page({ splitView: { enabled: true, breakpoint: 900 } })).valid).toBe(true)
	})

	it('accepts an index page that declares none of the new keys, unchanged', () => {
		expect(validateManifestV2(page({})).valid).toBe(true)
	})

	it('refuses splitView on a detail page, where it would validate and do nothing', () => {
		expect(validateManifestV2(detail({ splitView: { enabled: true } })).valid).toBe(false)
	})

	it('refuses manualOrder on a dashboard page', () => {
		const manifest = page({})
		manifest.pages[0] = { id: 'd', route: '/d', type: 'dashboard', title: 'D', manualOrder: true }
		expect(validateManifestV2(manifest).valid).toBe(false)
	})

	it('accepts tabInAddress on a detail page and refuses it on an index page', () => {
		expect(validateManifestV2(detail({ tabInAddress: true })).valid).toBe(true)
		expect(validateManifestV2(page({ tabInAddress: true })).valid).toBe(false)
	})

	// A saved view is a lens applied onto the page's own address, not a place.
	// The key is gone from the vocabulary, so a manifest still carrying it is
	// told so rather than validating and doing nothing.
	it('refuses savedViewPlaces anywhere, now that a saved view is not a place', () => {
		expect(validateManifestV2(page({ savedViewPlaces: { enabled: true, routeBase: 'views' } })).valid).toBe(false)
		expect(validateManifestV2(detail({ savedViewPlaces: { enabled: true } })).valid).toBe(false)
	})

	it('accepts savedViewTree on an index page, with a seeded view that carries a slug', () => {
		expect(validateManifestV2(page({
			savedViewTree: {
				enabled: true,
				maxDepth: 3,
				seeded: [
					{ slug: 'open-cases', name: 'Open cases', label: 'triage' },
					{ slug: 'open-mine', name: 'Mine', parent: 'open-cases', inherits: ['columns', 'sorting'] },
				],
			},
		})).valid).toBe(true)
		// A page that names nothing keeps the flat dropdown it has today.
		expect(validateManifestV2(page({})).valid).toBe(true)
	})

	it('refuses a seeded view nothing can call, and a depth nobody can read', () => {
		// The slug is what a widget, an export action or an API caller cites.
		// A seeded view without one is a view the product ships and nothing
		// can name, which is most of the reason to seed it.
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, seeded: [{ name: 'No slug' }] },
		})).valid).toBe(false)
		// Lowercase and dash only: it appears in an address and in somebody
		// else's manifest.
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, seeded: [{ slug: 'Open Cases', name: 'Open' }] },
		})).valid).toBe(false)
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, maxDepth: 9 },
		})).valid).toBe(false)
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, wat: true },
		})).valid).toBe(false)
	})

	it('refuses inherits on a seeded view with no parent, rather than ignoring it at render', () => {
		// A declaration that reads as configured and resolves to nothing is
		// the exact failure this change exists to stop.
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, seeded: [{ slug: 'orphan', name: 'Orphan', inherits: ['columns'] }] },
		})).valid).toBe(false)
		// The same view WITH a parent is fine, which is the control: a rule
		// that refused every `inherits` would pass the assertion above and
		// make the key unusable.
		expect(validateManifestV2(page({
			savedViewTree: {
				enabled: true,
				seeded: [
					{ slug: 'root', name: 'Root' },
					{ slug: 'child', name: 'Child', parent: 'root', inherits: ['columns'] },
				],
			},
		})).valid).toBe(true)
	})

	it('accepts templates, a landing view per role, per-role columns and a group-by', () => {
		expect(validateManifestV2(page({
			savedViewTree: {
				enabled: true,
				templates: [{ slug: 'triage', name: 'Triage', columns: ['id'], exportFields: ['id'] }],
				landingView: { behandelaar: 'open-cases' },
				columnsPerRole: { behandelaar: ['id', 'title'] },
				groupBy: 'status',
				seeded: [{ slug: 'open-cases', name: 'Open', actions: ['claim', 'assign'] }],
			},
		})).valid).toBe(true)
	})

	it('refuses a template nothing can name, and a stray key beside the roles', () => {
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, templates: [{ name: 'No slug' }] },
		})).valid).toBe(false)
		// patternProperties with additionalProperties false: a role key is a
		// role name, and anything that is not one is a typo rather than a
		// role nobody has yet.
		expect(validateManifestV2(page({
			savedViewTree: { enabled: true, landingView: { 'not a role': 'x' } },
		})).valid).toBe(false)
	})

	it('accepts a board and a date axis on an index page', () => {
		expect(validateManifestV2(page({
			board: { statusField: 'status', cardFields: ['title'], swimlaneField: 'assignee' },
			dateAxis: { startField: 'startDate', endField: 'deadline', laneField: 'assignee', labelField: 'title' },
		})).valid).toBe(true)
	})

	it('refuses a board with nothing to be a board of, and an axis with one end', () => {
		// A board with no status field has no columns; an axis with one date
		// has no bars. Both would validate and then render an explanation.
		expect(validateManifestV2(page({ board: { cardFields: ['title'] } })).valid).toBe(false)
		expect(validateManifestV2(page({ dateAxis: { startField: 'startDate' } })).valid).toBe(false)
		expect(validateManifestV2(page({ board: { statusField: 'status', wat: true } })).valid).toBe(false)
	})

	it('refuses a board and a date axis on a detail page', () => {
		expect(validateManifestV2(detail({ board: { statusField: 'status' } })).valid).toBe(false)
		expect(validateManifestV2(detail({ dateAxis: { startField: 'a', endField: 'b' } })).valid).toBe(false)
	})

	it('refuses savedViewTree on a detail page, where there is no dropdown to put a tree in', () => {
		expect(validateManifestV2(detail({ savedViewTree: { enabled: true } })).valid).toBe(false)
	})

	it('refuses a breakpoint no viewport has', () => {
		expect(validateManifestV2(page({ splitView: { enabled: true, breakpoint: 10 } })).valid).toBe(false)
	})

	it('accepts the root personalisation block and refuses a date display it does not offer', () => {
		expect(validateManifestV2({ ...page({}), personalisation: { enabled: true, dateDisplay: 'relative' } }).valid).toBe(true)
		expect(validateManifestV2({ ...page({}), personalisation: { dateDisplay: 'fuzzy' } }).valid).toBe(false)
	})
})

describe('app-manifest-v2 — ncDashboard, publishing a placement to the Nextcloud dashboard', () => {
	/**
	 * Builds a one-widget dashboard page. `gridWidth` stays at 6 deliberately:
	 * a lone `0,0,12,12` body widget whose key is not a library built-in is
	 * rejected by validateManifestV2 as a custom page in disguise (ADR-036
	 * decision 1), which would redden these tests for a reason that has
	 * nothing to do with ncDashboard.
	 *
	 * @param {object} widget - extra keys merged onto the placement.
	 * @return {object} a v2 manifest carrying that one placement.
	 */
	const withWidget = (widget) => ({
		...MINIMAL_V2,
		pages: [{
			id: 'reporting',
			route: '/reporting',
			type: 'dashboard',
			title: 'app.reporting',
			widgets: [{
				widgetKey: 'AnnualStatementWidget',
				slot: 'body',
				gridX: 0,
				gridY: 0,
				gridWidth: 6,
				gridHeight: 2,
				...widget,
			}],
		}],
	})

	it('a placement carrying ncDashboard and an id validates', () => {
		const result = validateManifestV2(withWidget({
			id: 'annual-statement',
			ncDashboard: {
				title: 'Annual statement',
				icon: 'ViewDashboardOutline',
				order: 20,
				link: '/reporting',
			},
		}))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('ncDashboard may declare nothing at all and still validates', () => {
		const result = validateManifestV2(withWidget({ id: 'annual-statement', ncDashboard: {} }))
		expect(result.valid).toBe(true)
	})

	/**
	 * 🔴 The one-way door. The host derives a permanent Nextcloud widget id
	 * from `id`, and Nextcloud stores each user's chosen widgets by that id in
	 * its own namespace, which no migration of a consuming app can reach. A
	 * placement identified by array position would move onto a different
	 * widget the moment the array is reordered, silently changing what every
	 * user who added the panel sees. The schema refuses the declaration rather
	 * than letting that reach a dashboard.
	 */
	it('ncDashboard without an id is refused, naming id', () => {
		const result = validateManifestV2(withWidget({ ncDashboard: { title: 'Annual statement' } }))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('id'))).toBe(true)
	})

	it('ncDashboard refuses a key it does not offer', () => {
		const result = validateManifestV2(withWidget({
			id: 'annual-statement',
			ncDashboard: { title: 'Annual statement', subtitle: 'not a thing' },
		}))
		expect(result.valid).toBe(false)
	})

	it('a placement without ncDashboard still validates, so nothing existing has to change', () => {
		const result = validateManifestV2(withWidget({ id: 'annual-statement' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	/**
	 * Builds two dashboard pages, each with one placement, so the uniqueness
	 * rule can be tested across pages rather than within one.
	 *
	 * @param {object} first - extra keys merged onto page one's placement.
	 * @param {object} second - extra keys merged onto page two's placement.
	 * @return {object} a v2 manifest carrying both.
	 */
	const withTwoPages = (first, second) => {
		const page = (pageId, widget) => ({
			id: pageId,
			route: `/${pageId}`,
			type: 'dashboard',
			title: `app.${pageId}`,
			widgets: [{
				widgetKey: 'AnnualStatementWidget',
				slot: 'body',
				gridX: 0,
				gridY: 0,
				gridWidth: 6,
				gridHeight: 2,
				...widget,
			}],
		})
		return { ...MINIMAL_V2, pages: [page('reporting', first), page('archive', second)] }
	}

	/**
	 * 🔴 The guard the `id` requirement stops one step short of. Requiring an
	 * id keeps a placement off array position; it does not keep two placements
	 * off each other. Nextcloud keys a user's chosen dashboard widgets per APP,
	 * so two pages both declaring 'recent' derive ONE panel, and whichever the
	 * host registers second silently takes the first one's place on every
	 * dashboard that added it. The page is the wrong scope for the rule, and
	 * `id`'s own description said so ("unique within a page's widgets[]").
	 */
	it('refuses the same ncDashboard id on two different pages', () => {
		const result = validateManifestV2(withTwoPages(
			{ id: 'recent', ncDashboard: { title: 'Recent' } },
			{ id: 'recent', ncDashboard: { title: 'Recent, again' } },
		))
		expect(result.valid).toBe(false)
		expect(result.errors.some((e) => e.includes('unique across the whole manifest'))).toBe(true)
	})

	it('leaves a repeated id alone when neither placement publishes to the dashboard', () => {
		// The rule is about the Nextcloud namespace, not about ids at large:
		// `id` is also the delta merge key, where a repeat across two pages is
		// ordinary and always has been.
		const result = validateManifestV2(withTwoPages({ id: 'recent' }, { id: 'recent' }))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('allows two placements that publish under ids of their own', () => {
		const result = validateManifestV2(withTwoPages(
			{ id: 'recent-reports', ncDashboard: {} },
			{ id: 'recent-archive', ncDashboard: {} },
		))
		expect(result.valid).toBe(true)
		expect(result.errors).toEqual([])
	})

	it('takes a link written the way a page route is', () => {
		const result = validateManifestV2(withWidget({
			id: 'annual-statement',
			ncDashboard: { link: '/reporting' },
		}))
		expect(result.valid).toBe(true)
	})

	/**
	 * 🔴 The panel is rendered by Nextcloud's dashboard, outside this app's
	 * pages, and the host resolves `link` against its own app root. An
	 * unconstrained string left every host to guess whether it had been handed
	 * a route or a URL, and `javascript:` is what that guess costs when one of
	 * them guesses wrong.
	 */
	it('refuses a link carrying a scheme or a protocol-relative host', () => {
		for (const link of ['https://example.org/x', 'javascript:alert(1)', '//example.org/x']) {
			expect(validateManifestV2(withWidget({
				id: 'annual-statement',
				ncDashboard: { link },
			})).valid).toBe(false)
		}
	})
})

describe('app-manifest-v2 — menu entry translateLabel', () => {
	it('accepts a boolean on an entry and on a child, and refuses anything else', () => {
		expect(validateManifestV2({
			...MINIMAL_V2,
			menu: [{
				id: 'group',
				label: 'Search',
				translateLabel: false,
				children: [{ id: 'child', label: 'Dashboard', route: 'Child', translateLabel: true }],
			}],
		}).valid).toBe(true)
		expect(validateManifestV2({
			...MINIMAL_V2,
			menu: [{ id: 'top', label: 'Search', route: 'Top', translateLabel: 'no' }],
		}).valid).toBe(false)
	})
})

describe('app-manifest-v2 — menu entry route params', () => {
	it('accepts string and number params on an entry and on a child', () => {
		const result = validateManifestV2({
			...MINIMAL_V2,
			menu: [
				{ id: 'news', label: 'News', route: 'Items', params: { slug: 'news' } },
				{
					id: 'group',
					label: 'Group',
					children: [{ id: 'second', label: 'Second', route: 'Items', params: { slug: 2 }, query: { tab: 'open' } }],
				},
			],
		})
		expect(result.valid).toBe(true)
	})

	it('refuses a param value that is not a non-empty string or a number', () => {
		for (const value of ['', true, null, { nested: 'x' }, ['a']]) {
			expect(validateManifestV2({
				...MINIMAL_V2,
				menu: [{ id: 'news', label: 'News', route: 'Items', params: { slug: value } }],
			}).valid).toBe(false)
		}
	})
})

/**
 * Build a minimal v2 manifest with one type='detail' page whose config is
 * merged from `config`.
 *
 * @param {object} config `pages[0].config` overrides.
 * @return {object} Complete v2 manifest.
 */
function manifestWithDetailPage(config) {
	return {
		...MINIMAL_V2,
		pages: [{
			id: 'PersonDetail',
			route: '/persons/:id',
			type: 'detail',
			title: 'app.person',
			config: { register: 'r', schema: 'person', ...config },
		}],
	}
}

describe('app-manifest-v2 — header pills: a constant or a count (screens-relation-pages, 2.85.0)', () => {
	it('a constant pill validates', () => {
		const result = validateManifestV2(manifestWithDetailPage({ typePill: { text: 'Inwoner', variant: 'info' } }))
		expect(result.valid).toBe(true)
	})

	it('a count pill validates', () => {
		const result = validateManifestV2(manifestWithDetailPage({
			statusPill: { countFrom: { register: 'r', schema: 'case', filter: { requester: '@objectId' } }, countLabel: { one: '{count} lopende zaak', other: '{count} lopende zaken' }, variant: 'purple' },
		}))
		expect(result.valid).toBe(true)
	})

	it('a field pill still validates', () => {
		expect(validateManifestV2(manifestWithDetailPage({ typePill: { field: 'legalForm' } })).valid).toBe(true)
	})

	it('a pill with none of field, text or countFrom is refused', () => {
		expect(validateManifestV2(manifestWithDetailPage({ typePill: { variant: 'info' } })).valid).toBe(false)
	})

	it('a count list without a schema is refused', () => {
		expect(validateManifestV2(manifestWithDetailPage({ statusPill: { countFrom: { register: 'r' } } })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — @row token in a field-list rowActions payload (2.86.0)', () => {
	const withPayload = (payload) => manifestWithDetailPage({
		rowActions: [{ id: 'a', label: 'Do', request: { method: 'POST', url: '/apps/x/api/items', payload } }],
	})

	it('accepts @row.<field> and a dot path at any depth of the payload', () => {
		const result = validateManifestV2(withPayload({ id: '@row.id', nested: [{ owner: '@row.owner.id' }] }))
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('still refuses an invented token', () => {
		expect(validateManifestV2(withPayload({ id: '@rows.id' })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — page lenses: chips and a workspace visibleWhen (screens-page-lenses, 2.87.0)', () => {
	const dashboard = (widgets) => ({
		...MINIMAL_V2,
		pages: [{
			id: 'MyWork',
			route: '/my-work',
			type: 'dashboard',
			title: 'app.mywork',
			widgets,
		}],
	})

	it('accepts a chips workspace-filter with urlKey and countFrom options, and a widget shown by a workspace value', () => {
		const result = validateManifestV2(dashboard([
			{
				id: 'lens',
				widgetKey: 'workspace-filter',
				slot: 'body',
				gridX: 0,
				gridY: 0,
				gridWidth: 12,
				gridHeight: 2,
				props: { content: { style: 'chips', writes: '@workspace.lens', urlKey: 'lens', default: 'all', options: [{ value: 'all', label: 'All', countFrom: [{ register: 'r', schema: 's' }] }] } },
			},
			{
				id: 'tickets',
				widgetKey: 'record-list',
				slot: 'body',
				gridX: 0,
				gridY: 2,
				gridWidth: 12,
				gridHeight: 4,
				visibleWhen: { workspace: 'lens', op: 'in', value: ['all', 'tickets'] },
				props: { content: { register: 'r', schema: 's' } },
			},
		]))
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses an unknown chip style and an unknown visibleWhen operator', () => {
		const chip = (style) => dashboard([{ id: 'lens', widgetKey: 'workspace-filter', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, props: { content: { style } } }])
		expect(validateManifestV2(chip('tabs')).valid).toBe(false)
		const op = (name) => dashboard([{ id: 'w', widgetKey: 'record-list', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, visibleWhen: { workspace: 'lens', op: name, value: 'x' }, props: { content: { register: 'r', schema: 's' } } }])
		expect(validateManifestV2(op('in')).valid).toBe(true)
		expect(validateManifestV2(op('like')).valid).toBe(false)
	})
})

describe('app-manifest-v2 — page controls: toggle, bar and pageControls (screens-page-controls, 2.88.0)', () => {
	const page = (widgets) => ({ ...MINIMAL_V2, pages: [{ id: 'P', route: '/p', type: 'dashboard', title: 'app.p', widgets }] })
	const entry = (id, widgetKey, content) => ({ id, widgetKey, slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, props: { content } })

	it('accepts a bar of controls and a toggle', () => {
		const result = validateManifestV2(page([entry('bar', 'workspace-filter', {
			layout: 'bar',
			controls: [{ style: 'toggle', label: 'Done', writes: '@workspace.done', align: 'end', onValue: 1, offValue: 0 }],
		})]))
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('accepts pageControls on an object-table source', () => {
		const table = (pageControls) => validateManifestV2(page([entry('t', 'object-table', { source: { register: 'r', schema: 's', pageControls } })]))
		expect(table({ sort: { key: 'sort', map: { a: { field: 'f', dir: 'desc' } } }, toggle: { key: 'done', removes: ['status'] } }).valid).toBe(true)
	})
})

describe('app-manifest-v2 — a banner that names one record (screens-start-here-banner, 2.89.0)', () => {
	const banner = (props) => ({
		...MINIMAL_V2,
		pages: [{ id: 'P', route: '/p', type: 'dashboard', title: 'app.p', widgets: [{ id: 'b', widgetKey: 'banner', slot: 'body', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2, props }] }],
	})

	it('accepts an ordered source, notEmpty and stacked', () => {
		const result = validateManifestV2(banner({
			layout: 'attention',
			stacked: true,
			title: '{subject.title}',
			visibleWhen: { source: { register: 'r', schema: 's', filter: {}, order: { deadline: 'asc' } }, field: 'id', op: 'notEmpty' },
			actions: [{ label: 'Open', route: { name: 'Detail', params: { id: '@subject.id' } } }],
		}))
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses an order direction that is not asc or desc', () => {
		expect(validateManifestV2(banner({ text: 't', visibleWhen: { source: { register: 'r', schema: 's', order: { deadline: 'up' } }, field: 'id' } })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — the header Actions menu names its entries (screens-index-header-actions-menu, 2.90.0)', () => {
	const manifest = (button) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'Meetings', route: '/meetings', type: 'index', title: 'Meetings', config: { register: 'r', schema: 'meeting', headerButtons: [button] } }],
	})

	it('accepts items on a header button', () => {
		expect(validateManifestV2(manifest({ action: 'actions-menu', items: ['header-actions', 'import', 'refresh', 'documentation'] })).valid).toBe(true)
	})

	it('rejects an empty list and a non-string entry', () => {
		expect(validateManifestV2(manifest({ action: 'actions-menu', items: [] })).valid).toBe(false)
		expect(validateManifestV2(manifest({ action: 'actions-menu', items: [1] })).valid).toBe(false)
	})

	it('accepts group headings and repeated separators (2.93.0), and refuses a heading without text or with another key', () => {
		const items = [{ heading: 'Go to' }, 'calendar', 'separator', 'import', 'separator', { heading: 'Selection' }, 'copy-selected']
		expect(validateManifestV2(manifest({ action: 'actions-menu', items })).valid).toBe(true)
		expect(validateManifestV2(manifest({ action: 'actions-menu', items: [{ heading: '' }, 'import'] })).valid).toBe(false)
		expect(validateManifestV2(manifest({ action: 'actions-menu', items: [{ heading: 'Go to', icon: 'Map' }, 'import'] })).valid).toBe(false)
		expect(validateManifestV2(manifest({ action: 'actions-menu', items: [{}] })).valid).toBe(false)
	})
})

describe('app-manifest-v2: header buttons on a reports page (screens-reports-header-buttons, 2.96.0)', () => {
	const reports = (config) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Reports', route: '/reports', type: 'reports', title: 'Reports', config: { cards: [], ...config } }],
	})

	it('accepts headerButtons naming a headerActions entry, and refuses a button without an action or with an unknown key', () => {
		const headerActions = [{ id: 'download', label: 'Download', handler: 'emit' }]
		expect(validateManifestV2(reports({ headerActions, headerButtons: [{ label: 'Download', action: 'download', icon: 'Download' }] })).valid).toBe(true)
		expect(validateManifestV2(reports({ headerActions, headerButtons: [{ label: 'Download' }] })).valid).toBe(false)
		expect(validateManifestV2(reports({ headerActions, headerButtons: [{ label: 'Download', action: 'download', colour: 'red' }] })).valid).toBe(false)
	})
})

describe('app-manifest-v2: board columns from a referenced field (screens-board-reference-columns, 2.97.0)', () => {
	const index = (board) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 'case', viewModes: ['table', 'board'], board } }],
	})

	it('accepts columnFields with a reference source, a values field, a narrow select and the move handlers', () => {
		const board = {
			statusField: 'status',
			wrap: true,
			card: { title: 'title', pill: 'caseType', formatters: { caseType: 'caseTypeName' } },
			hint: 'One column per value.',
			columnSwitchLabel: 'Columns',
			moveHandler: 'caseStatusMove',
			moveTargetsHandler: 'caseStatusTargets',
			narrow: { field: 'caseType', label: 'Case type', allLabel: 'All case types', source: { schema: 'caseType', labelField: 'title' } },
			columnFields: [
				{ field: 'status', label: 'status', source: { schema: 'statusType', labelField: 'name', orderField: 'order', colorField: 'colour', mergeBy: 'name', filter: { isFinal: false }, narrowBy: { field: 'caseType', rowField: 'caseType' } } },
				{ field: 'caseType', label: 'type', source: { schema: 'caseType', labelField: 'title' }, readOnly: true },
				{ field: 'assignee', label: 'assignee', kind: 'values', emptyLabel: 'Nobody' },
			],
		}
		expect(validateManifestV2(index(board)).valid).toBe(true)
	})

	it('refuses a column field without a field, an unknown kind, a narrowBy without rowField and an unknown key', () => {
		expect(validateManifestV2(index({ statusField: 'status', columnFields: [{ label: 'x' }] })).valid).toBe(false)
		expect(validateManifestV2(index({ statusField: 'status', columnFields: [{ field: 'a', kind: 'users' }] })).valid).toBe(false)
		expect(validateManifestV2(index({ statusField: 'status', columnFields: [{ field: 'a', source: { narrowBy: { field: 'caseType' } } }] })).valid).toBe(false)
		expect(validateManifestV2(index({ statusField: 'status', columnFields: [{ field: 'a', colour: 'red' }] })).valid).toBe(false)
		expect(validateManifestV2(index({ statusField: 'status', narrow: { label: 'x' } })).valid).toBe(false)
		expect(validateManifestV2(index({ statusField: 'status', card: { formatters: { caseType: 7 } } })).valid).toBe(false)
	})
})

describe('app-manifest-v2: titleField on a detail page (detail-title-field, 2.98.0)', () => {
	const detail = (config) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Invoice', route: '/invoices/:id', type: 'detail', title: 'Invoice', config: { register: 'r', schema: 's', ...config } }],
	})

	it('accepts a field path, and refuses one that is not a string', () => {
		expect(validateManifestV2(detail({ titleField: 'number' })).valid).toBe(true)
		expect(validateManifestV2(detail({ titleField: 'customer.ref' })).valid).toBe(true)
		expect(validateManifestV2(detail({ titleField: 3 })).valid).toBe(false)
	})
})

describe('app-manifest-v2: a plural countSubtitle (index-count-plural, 2.99.0)', () => {
	const index = (config) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Invoices', route: '/invoices', type: 'index', title: 'Invoices', config: { register: 'r', schema: 's', ...config } }],
	})

	it('accepts a string or a singular and plural, and refuses an incomplete or unknown form', () => {
		expect(validateManifestV2(index({ countSubtitle: '{total} invoices' })).valid).toBe(true)
		expect(validateManifestV2(index({ countSubtitle: { singular: '{total} invoice', plural: '{total} invoices' } })).valid).toBe(true)
		expect(validateManifestV2(index({ countSubtitle: { singular: '{total} invoice' } })).valid).toBe(false)
		expect(validateManifestV2(index({ countSubtitle: { singular: '{total} invoice', plural: '{total} invoices', few: 'x' } })).valid).toBe(false)
	})
})

describe('app-manifest-v2: a board column capacity (board-column-capacity, 2.100.0)', () => {
	const index = (source) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', board: { statusField: 'status', columnFields: [{ field: 'status', source }] } } }],
	})

	it('accepts source.capacityField as a field name and refuses an empty or non-string one', () => {
		expect(validateManifestV2(index({ schema: 'statusType', capacityField: 'capacity' })).valid).toBe(true)
		expect(validateManifestV2(index({ schema: 'statusType', capacityField: '' })).valid).toBe(false)
		expect(validateManifestV2(index({ schema: 'statusType', capacityField: 4 })).valid).toBe(false)
	})
})

describe('app-manifest-v2: a neutral column colour (board-neutral-column-colour, 2.101.0)', () => {
	const index = (source) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', board: { statusField: 'status', columnFields: [{ field: 'status', source }] } } }],
	})

	it('accepts source.neutralColor as a colour and refuses an empty or non-string one', () => {
		expect(validateManifestV2(index({ schema: 'statusType', colorField: 'colour', mergeBy: 'name', neutralColor: 'grey' })).valid).toBe(true)
		expect(validateManifestV2(index({ schema: 'statusType', neutralColor: '' })).valid).toBe(false)
		expect(validateManifestV2(index({ schema: 'statusType', neutralColor: 3 })).valid).toBe(false)
	})
})

describe('app-manifest-v2: a board column colour map (board-column-colour-map, 2.102.0)', () => {
	const index = (source) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', board: { statusField: 'status', columnFields: [{ field: 'status', source }] } } }],
	})

	it('accepts source.colorMap of colour strings and refuses another shape', () => {
		expect(validateManifestV2(index({ schema: 'statusType', colorField: 'colour', colorMap: { orange: 'var(--nl-color-orange, #e17000)' } })).valid).toBe(true)
		expect(validateManifestV2(index({ schema: 'statusType', colorMap: { orange: '' } })).valid).toBe(false)
		expect(validateManifestV2(index({ schema: 'statusType', colorMap: { orange: 3 } })).valid).toBe(false)
		expect(validateManifestV2(index({ schema: 'statusType', colorMap: 'orange' })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — config.breadcrumb (page-header-breadcrumb)', () => {
	const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'types', route: '/types', type: 'index', title: 'Zaaktypen', config: { register: 'r', schema: 's', ...config } }] })

	it('accepts one crumb, a list of crumbs and a headerMeta', () => {
		expect(validateManifestV2(page({ breadcrumb: { label: 'Instellingen', route: 'Settings' }, headerMeta: 'Geldt voor iedereen' })).valid).toBe(true)
		expect(validateManifestV2(page({ breadcrumb: [{ label: 'Beheer', href: '/beheer' }, { label: 'Organisatie', route: 'Org' }] })).valid).toBe(true)
	})

	it('rejects a crumb without a label, an unknown crumb key and an empty list', () => {
		expect(validateManifestV2(page({ breadcrumb: { route: 'Settings' } })).valid).toBe(false)
		expect(validateManifestV2(page({ breadcrumb: [{ label: 'A', colour: 'red' }] })).valid).toBe(false)
		expect(validateManifestV2(page({ breadcrumb: [] })).valid).toBe(false)
	})
})

describe('app-manifest-v2: module cards on a links page (screens-links-module-cards, 2.108.0)', () => {
	const linksPage = (config) => ({
		...MINIMAL_V2,
		pages: [{ id: 'Modules', route: '/modules', type: 'links', title: 'Modules', config: { cards: [{ id: 'Tasks', label: 'Tasks', route: 'Tasks' }], ...config } }],
	})

	it('accepts modules with pages, a state and an admin-settings link', () => {
		const result = validateManifestV2(linksPage({
			modulesTitle: 'Modules',
			footnote: 'An admin turns a module on.',
			modules: [
				{ id: 'sales', label: 'Sales', icon: 'CashMultiple', enabled: true, pages: [{ label: 'Leads', route: 'Leads', highlight: true }] },
				{ id: 'pos', label: 'Till', enabledIf: { 'config.modules': { contains: 'pos' } }, pages: [], settings: { route: '/admin', prefix: 'In het menu zetten:', permission: 'admin' } },
			],
			groupStyle: 'list',
		}))
		expect(result.valid).toBe(true)
	})

	it('refuses a module without a label, a page without a target and an unknown key', () => {
		expect(validateManifestV2(linksPage({ modules: [{ id: 'sales' }] })).valid).toBe(false)
		expect(validateManifestV2(linksPage({ modules: [{ id: 'sales', label: 'Sales', pages: [{ label: 'Leads' }] }] })).valid).toBe(false)
		expect(validateManifestV2(linksPage({ modules: [{ id: 'sales', label: 'Sales', colour: 'red' }] })).valid).toBe(false)
		expect(validateManifestV2(linksPage({ groupStyle: 'tiles' })).valid).toBe(false)
		expect(validateManifestV2(linksPage({ modules: [{ id: 'pos', label: 'Till', enable: { route: '/admin' } }] })).valid).toBe(false)
	})
})

describe('app-manifest-v2: a dashboard greeting label (dashboard-greeting-label, 2.111.0)', () => {
	const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'mywork', route: '/', type: 'dashboard', title: 'My work', config }] })

	it('accepts greeting "date" and { label }, and refuses an empty label or another key', () => {
		expect(validateManifestV2(page({ greeting: 'date' })).valid).toBe(true)
		expect(validateManifestV2(page({ greeting: { label: 'Customer contact' } })).valid).toBe(true)
		expect(validateManifestV2(page({ greeting: { label: '' } })).valid).toBe(false)
		expect(validateManifestV2(page({ greeting: {} })).valid).toBe(false)
		expect(validateManifestV2(page({ greeting: { label: 'Customer contact', icon: 'x' } })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — preset and scope presentation (index-scope-presentation)', () => {
	const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', ...config } }] })

	it('accepts the new preset keys and a page afterList', () => {
		expect(validateManifestV2(page({
			afterList: [{ id: 'per-subject', type: 'chart', title: 'Per subject', content: {} }],
			queryPresets: [{
				match: { caseType: 'uuid' },
				addLabel: 'Register complaint',
				headerButtons: [{ action: 'add' }],
				breadcrumb: { label: 'All cases', route: 'Cases' },
				headerMeta: 'Awb chapter 9',
				afterList: [{ id: 'chart', type: 'chart' }],
			}],
		})).valid).toBe(true)
	})

	it('refuses an afterList entry without a type and an unknown preset key', () => {
		expect(validateManifestV2(page({ afterList: [{ id: 'x' }] })).valid).toBe(false)
		expect(validateManifestV2(page({ queryPresets: [{ match: { a: 'b' }, colour: 'red' }] })).valid).toBe(false)
	})
})

describe('app-manifest-v2: a view title (view-title, 2.119.0)', () => {
	const page = (views) => ({ ...MINIMAL_V2, pages: [{ id: 'mywork', route: '/', type: 'dashboard', title: 'My work', config: { views } }] })

	it('accepts a view title and refuses an empty one', () => {
		expect(validateManifestV2(page([{ id: 'mine', label: 'My work' }, { id: 'team', label: 'My team', title: 'My team' }])).valid).toBe(true)
		expect(validateManifestV2(page([{ id: 'team', label: 'My team', title: '' }])).valid).toBe(false)
	})
})

describe('app-manifest-v2 — named index sources (index-scope-presentation)', () => {
	const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'list', route: '/list', type: 'index', title: 'List', config }] })

	it.each(['flows', 'flowRuns', 'tasks', 'endpoint', 'search', 'users'])('accepts entitySource "%s"', (name) => {
		expect(validateManifestV2(page({ entitySource: name })).valid).toBe(true)
	})

	it('accepts the endpoint and search sourceConfig shapes and refuses an unknown source', () => {
		expect(validateManifestV2(page({ entitySource: 'endpoint', sourceConfig: { url: '/apps/dossiq/api/postvak', rowsPath: 'results', channel: 'email' } })).valid).toBe(true)
		expect(validateManifestV2(page({ entitySource: 'search', sourceConfig: { termQuery: 'q', kinds: [{ id: 'cases', label: 'Zaken', register: 'dossiq', schema: 'case' }, { id: 'documents', label: 'Documenten', files: true }] } })).valid).toBe(true)
		expect(validateManifestV2(page({ entitySource: 'nope' })).valid).toBe(false)
		expect(validateManifestV2(page({ entitySource: 'endpoint', sourceConfig: { url: '' } })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — headerPill resolve (detail-pill-resolve)', () => {
	const page = (typePill) => ({ ...MINIMAL_V2, pages: [{ id: 'case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 's', typePill } }] })

	it('accepts a pill that resolves its field', () => {
		expect(validateManifestV2(page({ field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'title' } })).valid).toBe(true)
	})

	it('refuses a resolve without a schema or with an unknown key', () => {
		expect(validateManifestV2(page({ field: 'caseType', resolve: { register: 'dossiq' } })).valid).toBe(false)
		expect(validateManifestV2(page({ field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType', colour: 'red' } })).valid).toBe(false)
	})
})

describe('app-manifest-v2 — pill colour and icon (pill-color-field)', () => {
	const page = (typePill, defaultSavedViews) => ({
		...MINIMAL_V2,
		pages: [
			{ id: 'Case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'dossiq', schema: 'case', typePill } },
			{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'dossiq', schema: 'case', defaultSavedViews } },
		],
	})

	it('accepts colorField and iconField on a pill resolve and an icon on a default view', () => {
		const result = validateManifestV2(page(
			{ field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType', labelField: 'title', colorField: 'colour', iconField: 'icon' } },
			[{ slug: 'woo', name: 'Woo', filters: {}, icon: 'FileDocumentOutline' }],
		))
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses an empty colorField', () => {
		expect(validateManifestV2(page({ field: 'caseType', resolve: { register: 'dossiq', schema: 'caseType', colorField: '' } }, [])).valid).toBe(false)
	})
})

describe('app-manifest-v2 — card pill resolve (pill-color-field)', () => {
	const page = (config) => ({ ...MINIMAL_V2, pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'dossiq', schema: 'case', ...config } }] })
	const resolve = { colorField: 'colour', iconField: 'icon' }

	it('accepts resolve on the record card pills and the board card pill', () => {
		const result = validateManifestV2(page({
			cardLayout: { headPill: { field: 'caseType', resolve }, footerPill: { field: 'caseType', resolve }, chips: [{ field: 'caseType', resolve }] },
			board: { statusField: 'status', card: { title: 'title', pill: 'caseType', resolve } },
		}))
		expect(result.errors || []).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses an unknown resolve key on a card pill', () => {
		expect(validateManifestV2(page({ cardLayout: { headPill: { field: 'caseType', resolve: { colour: 'red' } } } })).valid).toBe(false)
	})
})

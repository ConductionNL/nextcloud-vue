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
		expect(result).toEqual({ valid: true, errors: [] })
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
		expect(result).toEqual({ valid: true, errors: [] })
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
		expect(result).toEqual({ valid: true, errors: [] })
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
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('unknown operator rejected, naming the op enum', () => {
		const manifest = manifestWithFormPage({
			fields: [
				{ key: 'kind', label: 'Kind', type: 'string' },
				{ key: 'kvk', label: 'KvK', type: 'string', visibleWhen: { field: 'kind', op: 'contains', value: 'x' } },
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
		expect(result).toEqual({ valid: true, errors: [] })
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
		expect(result).toEqual({ valid: true, errors: [] })
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
		expect(result).toEqual({ valid: true, errors: [] })
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
		expect(result).toEqual({ valid: true, errors: [] })
	})

	it('a manifest with runtime.user but no theme still validates unchanged (regression)', () => {
		const manifest = {
			...MINIMAL_V2,
			runtime: { user: { isOwner: true } },
		}
		const result = validateManifestV2(manifest)
		expect(result).toEqual({ valid: true, errors: [] })
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

	it('the manifest schema version reads 2.31.0', () => {
		// eslint-disable-next-line global-require
		const schema = require('../../src/schemas/app-manifest-v2.schema.json')
		expect(schema.version).toBe('2.31.0')
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

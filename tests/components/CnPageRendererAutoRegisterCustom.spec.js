/**
 * Tests for CnPageRenderer's auto-registration of object types on
 * `type:"custom"` pages. See ConductionNL/nextcloud-vue#341.
 *
 * Symmetry: CnIndexPage / CnDetailPage self-register when mounted with
 * `register` + `schema` props, so the manifest pipeline "just works"
 * for declarative page types. Custom components have no such
 * guarantee — each one would otherwise have to remember to call
 * `registerObjectType` in its own `mounted()` hook (a per-app landmine
 * that bit pipelinq#530 / fixed defensively in pipelinq#540).
 *
 * The renderer now closes that gap: when a `type:"custom"` page's
 * `config` declares `register` + `schema` (and/or `types[]` for
 * multi-type views), the store is auto-populated BEFORE the custom
 * component mounts.
 */

// `mock`-prefixed so jest.mock()'s hoisted factory may reference it.
const mockStore = {
	registerObjectType: jest.fn(),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
	createObjectStore: () => () => mockStore,
}))

const { shallowMount } = require('@vue/test-utils')
const CnPageRenderer = require('../../src/components/CnPageRenderer/CnPageRenderer.vue').default

const CustomBoardStub = {
	name: 'CustomBoardStub',
	template: '<div class="custom-board-stub" />',
}

function mountRenderer(manifest, pageId, customComponents = { CustomBoard: CustomBoardStub }) {
	return shallowMount(CnPageRenderer, {
		provide: {
			cnManifest: manifest,
			cnCustomComponents: customComponents,
			cnTranslate: (k) => k,
		},
		mocks: { $route: { name: pageId, params: {} } },
	})
}

describe('CnPageRenderer auto-register for type:"custom" pages (#341)', () => {
	let warnSpy

	beforeEach(() => {
		mockStore.registerObjectType.mockClear()
		warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warnSpy.mockRestore()
	})

	it('registers the {register}-{schema} type when config.register + config.schema are set', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'board',
				route: '/board',
				type: 'custom',
				title: 'Pipeline board',
				component: 'CustomBoard',
				config: { register: 'pipelines', schema: 'pipeline' },
			}],
		}
		mountRenderer(manifest, 'board')
		expect(mockStore.registerObjectType).toHaveBeenCalledTimes(1)
		expect(mockStore.registerObjectType).toHaveBeenCalledWith(
			'pipelines-pipeline',
			'pipeline',
			'pipelines',
		)
	})

	it('registers every entry when config.types[] is set (multi-type view)', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'kanban',
				route: '/kanban',
				type: 'custom',
				title: 'Kanban',
				component: 'CustomBoard',
				config: {
					types: [
						{ name: 'pipeline', register: 'pipelines', schema: 'pipeline' },
						{ name: 'stage', register: 'pipelines', schema: 'stage' },
						{ name: 'card', register: 'pipelines', schema: 'card' },
					],
				},
			}],
		}
		mountRenderer(manifest, 'kanban')
		expect(mockStore.registerObjectType).toHaveBeenCalledTimes(3)
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(1, 'pipeline', 'pipeline', 'pipelines')
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(2, 'stage', 'stage', 'pipelines')
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(3, 'card', 'card', 'pipelines')
	})

	it('registers single + every types[] entry when both shapes are present', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'mixed',
				route: '/mixed',
				type: 'custom',
				title: 'Mixed',
				component: 'CustomBoard',
				config: {
					register: 'pipelines',
					schema: 'pipeline',
					types: [
						{ name: 'stage', register: 'pipelines', schema: 'stage' },
					],
				},
			}],
		}
		mountRenderer(manifest, 'mixed')
		expect(mockStore.registerObjectType).toHaveBeenCalledTimes(2)
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(1, 'pipelines-pipeline', 'pipeline', 'pipelines')
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(2, 'stage', 'stage', 'pipelines')
	})

	it('does not call registerObjectType when neither register/schema nor types[] are set (backward compat)', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'settings',
				route: '/settings',
				type: 'custom',
				title: 'Settings',
				component: 'CustomBoard',
				config: { foo: 'bar' },
			}],
		}
		mountRenderer(manifest, 'settings')
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
		expect(warnSpy).not.toHaveBeenCalled()
	})

	it('does not call registerObjectType when config is absent entirely (backward compat)', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'plain',
				route: '/plain',
				type: 'custom',
				title: 'Plain',
				component: 'CustomBoard',
			}],
		}
		mountRenderer(manifest, 'plain')
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
	})

	it('does not run for non-custom page types (index/detail self-register inside the page component)', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'home',
				route: '/',
				type: 'index',
				title: 'Home',
				config: { register: 'r', schema: 's' },
			}],
		}
		mountRenderer(manifest, 'home')
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
	})

	it('logs a warning when only one of config.register / config.schema is set (manifest typo)', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'half',
				route: '/half',
				type: 'custom',
				title: 'Half',
				component: 'CustomBoard',
				// dangling schema, no register
				config: { schema: 'pipeline' },
			}],
		}
		mountRenderer(manifest, 'half')
		expect(mockStore.registerObjectType).not.toHaveBeenCalled()
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('declares only one of config.register / config.schema'),
		)
	})

	it('skips invalid types[] entries with a warning but still registers the valid ones', () => {
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'partial',
				route: '/partial',
				type: 'custom',
				title: 'Partial',
				component: 'CustomBoard',
				config: {
					types: [
						{ name: 'pipeline', register: 'pipelines', schema: 'pipeline' },
						{ name: '', register: 'pipelines', schema: 'stage' }, // empty name → skip
						{ name: 'card', register: 'pipelines' }, // missing schema → skip
						null, // null entry → skip
						{ name: 'lane', register: 'pipelines', schema: 'lane' },
					],
				},
			}],
		}
		mountRenderer(manifest, 'partial')
		// Only the two well-formed entries make it through.
		expect(mockStore.registerObjectType).toHaveBeenCalledTimes(2)
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(1, 'pipeline', 'pipeline', 'pipelines')
		expect(mockStore.registerObjectType).toHaveBeenNthCalledWith(2, 'lane', 'lane', 'pipelines')
		// Plus a warning for each of the three skipped entries.
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Skipping invalid entry in config.types'),
		)
	})

	it('survives registerObjectType throwing — page still mounts, warning logged', () => {
		mockStore.registerObjectType.mockImplementationOnce(() => {
			throw new Error('boom')
		})
		const manifest = {
			version: '1.0.0',
			menu: [],
			pages: [{
				id: 'crash',
				route: '/crash',
				type: 'custom',
				title: 'Crash',
				component: 'CustomBoard',
				config: { register: 'pipelines', schema: 'pipeline' },
			}],
		}
		const wrapper = mountRenderer(manifest, 'crash')
		// Page still mounted (currentPage resolved, custom component picked up).
		expect(wrapper.vm.currentPage.id).toBe('crash')
		expect(wrapper.vm.resolvedComponent).toBe(CustomBoardStub)
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('Failed to auto-register object type "pipelines-pipeline"'),
			expect.any(Error),
		)
	})
})

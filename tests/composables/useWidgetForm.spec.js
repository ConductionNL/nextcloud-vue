/**
 * Tests for useWidgetForm (cn-widget-library, Wave 0).
 *
 * Covers reset/load/validate/assemble over the shared registry-backed state.
 * The composable's getDefaultContent is bound to dashboardWidgetRegistry at
 * import time, so we load both from one isolated module graph and seed the
 * registry before exercising the composable.
 */

/**
 * Load the composable and the registry from one isolated module graph, with a
 * pair of widget types seeded into the registry.
 *
 * @return {{useWidgetForm: Function, registry: object}} the wired exports.
 */
const { toRaw } = require('vue')

function setup() {
	let useWidgetForm
	let registry
	jest.isolateModules(() => {
		registry = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
		useWidgetForm = require('../../src/composables/useWidgetForm.js').useWidgetForm
	})
	registry.registerDashboardWidget('label', {
		renderer: { name: 'R' },
		form: { name: 'F' },
		defaultContent: { text: '', fontSize: '16px' },
		displayName: 'Label',
		icon: 'FormatTitle',
	})
	registry.registerDashboardWidget('text', {
		renderer: { name: 'R' },
		form: { name: 'F' },
		defaultContent: { text: '', contentMode: 'markdown' },
		displayName: 'Text',
		icon: 'FormatText',
	})
	return { useWidgetForm, registry }
}

describe('useWidgetForm', () => {
	it('resetForm seeds defaults and clears editingWidget', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		form.state.editingWidget = { stale: true }
		form.resetForm('label')
		expect(form.state.type).toBe('label')
		expect(form.state.content).toEqual({ text: '', fontSize: '16px' })
		expect(form.state.editingWidget).toBeNull()
	})

	it('resetForm content is a fresh copy not the registry default', () => {
		const { useWidgetForm, registry } = setup()
		const form = useWidgetForm()
		form.resetForm('label')
		form.state.content.text = 'mutated'
		expect(registry.getDefaultContent('label').text).toBe('')
	})

	it('loadEditingWidget merges content over defaults', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		// persisted blob missing the newer `contentMode` key
		const widget = { type: 'text', content: { text: 'hello' } }
		form.loadEditingWidget(widget)
		expect(form.state.type).toBe('text')
		expect(form.state.content).toEqual({ text: 'hello', contentMode: 'markdown' })
		// `toRaw` on the received side: `state` is reactive, so reading the
		// stored widget hands back a Proxy. The assertion is still identity —
		// the caller's widget is held, not a merged copy of it (the merge only
		// applies to `content`, asserted above).
		expect(toRaw(form.state.editingWidget)).toBe(widget)
	})

	it('loadEditingWidget is a no-op for a falsy widget', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		form.resetForm('label')
		form.loadEditingWidget(null)
		expect(form.state.type).toBe('label')
	})

	it('validate returns the sentinel when the sub-form ref has no validate()', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		expect(form.validate(null)).toEqual(['__no-active-form__'])
		expect(form.validate({})).toEqual(['__no-active-form__'])
	})

	it('validate forwards to the sub-form validate()', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		expect(form.validate({ validate: () => [] })).toEqual([])
		expect(form.validate({ validate: () => ['bad'] })).toEqual(['bad'])
		// non-array return coerces to []
		expect(form.validate({ validate: () => undefined })).toEqual([])
	})

	it('assembleContent prefers the sub-form assembledContent getter', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		form.resetForm('label')
		const payload = form.assembleContent({ assembledContent: { text: 'from-getter' } })
		expect(payload).toEqual({ type: 'label', content: { text: 'from-getter' } })
	})

	it('assembleContent falls back to state.content when no getter', () => {
		const { useWidgetForm } = setup()
		const form = useWidgetForm()
		form.resetForm('text')
		form.state.content = { text: 'from-state', contentMode: 'html' }
		const payload = form.assembleContent({})
		expect(payload).toEqual({ type: 'text', content: { text: 'from-state', contentMode: 'html' } })
	})
})

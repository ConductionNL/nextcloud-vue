import { mount } from '@vue/test-utils'
import CnDataTable from '@/components/CnDataTable/CnDataTable.vue'

/**
 * Mount helper. Stubs CnCellRenderer so the test asserts the *value* the
 * table feeds it, not its rendering (covered elsewhere).
 *
 * @param {object} propsData Component props.
 * @return {object} The Vue Test Utils wrapper.
 */
function mountTable(propsData) {
	return mount(CnDataTable, {
		propsData,
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

const rows = [
	{ id: 'a', name: 'Welcome flow', level: 'high' },
	{ id: 'b', name: 'Lost-deal flow', level: 'low' },
]

// Column headers come from schema property titles, which are authored in
// English (canonical source, for API predictability). The visible header is
// resolved through the consumer's translation function, provided by the host
// app root as `cnTranslate` (bound to the host app id). This is what makes an
// English-authored `signatureLevel: { title: 'Level' }` render as "Niveau" for
// a Dutch user instead of leaking whichever language the schema was typed in.
describe('CnDataTable — column header translation via cnTranslate', () => {
	it('translates column labels through the injected cnTranslate', () => {
		const dict = { Name: 'Naam', Level: 'Niveau' }
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns: [{ key: 'name', label: 'Name' }, { key: 'level', label: 'Level' }] },
			provide: { cnTranslate: (key) => dict[key] || key },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
		})
		const headers = wrapper.findAll('thead th').wrappers.map((w) => w.text())
		expect(headers).toContain('Naam')
		expect(headers).toContain('Niveau')
		// The English source label is never shown when a translation exists.
		expect(headers).not.toContain('Name')
		expect(headers).not.toContain('Level')
	})

	it('falls back to the source label when no cnTranslate is provided', () => {
		const wrapper = mountTable({ rows, columns: [{ key: 'name', label: 'Name' }] })
		const headers = wrapper.findAll('thead th').wrappers.map((w) => w.text())
		expect(headers).toContain('Name')
	})
})

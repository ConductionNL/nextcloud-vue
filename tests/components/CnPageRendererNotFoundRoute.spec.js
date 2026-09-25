/**
 * CnPageRenderer.listPageForDetail: the index page a detail page's not-found
 * state sends the user back to.
 */

import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'

const PAGES = [
	{ id: 'Dashboard', type: 'dashboard' },
	{ id: 'Contracts', type: 'index', title: 'Contracts', config: { register: 'pipelinq', schema: 'salesContract' } },
	{ id: 'ExpiringContracts', type: 'index', title: 'Expiring', config: { register: 'pipelinq', schema: 'salesContract' } },
	{ id: 'ContractDetail', type: 'detail', config: { register: 'pipelinq', schema: 'salesContract' } },
]

function context(query = {}) {
	return {
		$route: { query },
		effectiveManifest: { pages: PAGES },
		pageById: new Map(PAGES.map((p) => [p.id, p])),
	}
}

const listPageForDetail = CnPageRenderer.methods.listPageForDetail
const CONFIG = { register: 'pipelinq', schema: 'salesContract' }

describe('CnPageRenderer.listPageForDetail', () => {
	it('returns the list named in the address', () => {
		expect(listPageForDetail.call(context({ _from: 'ExpiringContracts' }), CONFIG).id).toBe('ExpiringContracts')
	})

	it('falls back to the first index page on the same register and schema', () => {
		expect(listPageForDetail.call(context(), CONFIG).id).toBe('Contracts')
	})

	it('ignores a _from that names no index page', () => {
		expect(listPageForDetail.call(context({ _from: 'Dashboard' }), CONFIG).id).toBe('Contracts')
	})

	it('returns null when no index page shows the schema', () => {
		expect(listPageForDetail.call(context(), { register: 'pipelinq', schema: 'lead' })).toBeNull()
	})
})

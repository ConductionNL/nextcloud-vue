/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `cardButtons: "regular"` marks the page so its card header buttons take
 * the control height (DqZaakContact); the default stays compact.
 *
 * @spec openspec/changes/detail-card-buttons-regular/specs/detail-card-buttons/spec.md#requirement-a-detail-page-can-draw-its-card-header-buttons-at-the-control-height
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

function mountPage(props) {
	return mount(CnDetailPage, { propsData: { title: 'Case', ...props } })
}

describe('CnDetailPage cardButtons', () => {
	it('marks the page for regular card header buttons', () => {
		expect(mountPage({ cardButtons: 'regular' }).find('[data-testid="cn-detail-page"]').classes()).toContain('cn-detail-page--card-buttons-regular')
	})

	it('leaves the page unmarked by default', () => {
		expect(mountPage({}).find('[data-testid="cn-detail-page"]').classes()).not.toContain('cn-detail-page--card-buttons-regular')
	})
})

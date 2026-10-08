/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppRoot hands the app's `notificationLabels` to the notification pane.
 *
 * The pane reads them by inject; without this wiring an app could pass the
 * prop and every switch would still read as the key split into words. This
 * asserts the provide from the CALLER, not the pane in isolation.
 *
 * @spec openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md
 */

import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/capabilities', () => ({ getCapabilities: jest.fn(() => ({})) }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')), get: jest.fn().mockRejectedValue(new Error('offline')) },
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'admin', isAdmin: true })) }))
jest.mock('../../src/utils/appInstalled.js', () => ({ isAppInstalled: () => true }))

const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const MANIFEST = { version: '1.0.0', menu: [], pages: [{ id: 'home', route: '/', type: 'index', title: 'Home' }] }

/**
 * @param {object} props Extra CnAppRoot props.
 * @return {object} The mounted wrapper.
 */
function mountRoot(props = {}) {
	return mount(CnAppRoot, {
		propsData: { manifest: MANIFEST, appId: 'dossiq', requiresApps: [], ...props },
		stubs: { 'router-view': { template: '<div />' } },
	})
}

describe('CnAppRoot notificationLabels', () => {
	it('provides the labels the app passes', () => {
		const labels = { 'case.caseAssigned': 'Een zaak is aan mij toegewezen' }
		const wrapper = mountRoot({ notificationLabels: labels })

		expect(wrapper.vm.$.provides.cnNotificationLabels).toEqual(labels)
	})

	it('provides an empty map when the app passes none, which is the control', () => {
		const wrapper = mountRoot()

		expect(wrapper.vm.$.provides.cnNotificationLabels).toEqual({})
	})
})

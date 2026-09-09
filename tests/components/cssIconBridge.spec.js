/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the legacy `icon-*` → MDI bridge.
 *
 * Manifests written against Nextcloud's own class names are everywhere: the
 * menu-item picker offers them and buildiq's seeded fixtures use them
 * (`icon-comment` for the example Messages entry). The bridge started life as
 * a map private to CnAppNav, so the NAV resolved those names and nothing else
 * did — the same `icon-comment` drew a proper glyph in the live menu and a
 * help-circle "?" in the menu EDITOR, whose row renders through CnIcon.
 */
import { mount } from '@vue/test-utils'
import CnIcon from '../../src/components/CnIcon/CnIcon.vue'
import { CSS_ICON_TO_MDI, bridgedMdiForCssIcon } from '../../src/components/CnIcon/cssIconBridge.js'
import { NEXTCLOUD_ICONS } from '../../src/components/CnMenuTreeNode/nextcloudIcons.js'
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'

describe('cssIconBridge', () => {
	it('resolves a Nextcloud class name to a component', () => {
		expect(bridgedMdiForCssIcon('icon-comment')).toBeTruthy()
		expect(bridgedMdiForCssIcon('icon-dashboard')).toBeTruthy()
	})

	it('tolerates the -dark / -white theme variant suffixes', () => {
		expect(bridgedMdiForCssIcon('icon-comment-dark')).toBe(CSS_ICON_TO_MDI['icon-comment'])
		expect(bridgedMdiForCssIcon('icon-comment-white')).toBe(CSS_ICON_TO_MDI['icon-comment'])
	})

	it('answers undefined rather than throwing for junk', () => {
		expect(bridgedMdiForCssIcon('icon-not-a-real-thing')).toBeUndefined()
		expect(bridgedMdiForCssIcon('')).toBeUndefined()
		expect(bridgedMdiForCssIcon(null)).toBeUndefined()
		expect(bridgedMdiForCssIcon(undefined)).toBeUndefined()
	})

	it('every icon the menu picker offers has a bridge entry', () => {
		// The invariant the bridge's docblock asks for and nothing enforced.
		// An unbridged name falls through to the raw NC CSS class, which on
		// NC34+ can be a baked white data-URI — invisible on a light theme.
		const unbridged = NEXTCLOUD_ICONS
			.map((entry) => entry.value)
			.filter((value) => !bridgedMdiForCssIcon(value))
		expect(unbridged).toEqual([])
	})
})

describe('CnIcon resolving legacy class names', () => {
	const resolve = (name) => mount(CnIcon, { propsData: { name } }).vm.resolvedComponent

	it('renders the bridged glyph for an icon-* name, NOT the "?" fallback', () => {
		// The reported bug, in one assertion: the seeded Messages menu entry.
		expect(resolve('icon-comment')).toBe(CSS_ICON_TO_MDI['icon-comment'])
		expect(resolve('icon-comment')).not.toBe(HelpCircleOutline)
	})

	it('still falls back for a name nothing can resolve', () => {
		expect(resolve('icon-not-a-real-thing')).toBe(HelpCircleOutline)
		expect(resolve('NotAnIconAtAll')).toBe(HelpCircleOutline)
	})

	it('leaves the registry and semantic vocabulary taking precedence', () => {
		// The bridge is consulted AFTER them, so it cannot shadow a name an app
		// registered itself.
		expect(resolve('HelpCircleOutline')).toBe(HelpCircleOutline)
	})
})

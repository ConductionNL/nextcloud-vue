<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  Layout facts from the Zuiddrecht pixel-gap round 2 that only a real browser
  can measure (?pixgaps2=nav, ?pixgaps2=crumbs). The real NcAppNavigation and
  NcBreadcrumbs render here, not the jest stubs, because both claims are about
  what those components do with our markup: whether the navigation body
  squeezes the primary action, and whether the root crumb prints its label.
  `&plain=1` mounts the same surfaces without the round-2 keys.
-->
<template>
	<div class="pixgaps2">
		<div v-if="scenario === 'nav'" class="pixgaps2__nav" data-testid="pixgaps2-nav">
			<CnAppNav
				:manifest="navManifest"
				:translate="(key) => key" />
		</div>
		<div v-else-if="scenario === 'crumbs'" data-testid="pixgaps2-crumbs">
			<CnBreadcrumbs
				:crumbs="[{ label: 'All cases', href: '#cases' }, { label: '2026-0082' }]"
				:rootText="!plain" />
		</div>
	</div>
</template>

<script>
import CnAppNav from '../../src/components/CnAppNav/CnAppNav.vue'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

// dossiq's sidebar as the board draws it: a brand, a solid primary action, a
// menu long enough to fill the column, a card, a help entry and footer
// entries, so the column overflows the way it does on :8080.
const MENU = [
	...['Dashboard', 'My work', 'Team queue', 'All cases', 'Board', 'Tasks', 'Woo requests', 'Contacts', 'Organisations', 'Reports', 'Archive', 'Templates']
		.map((label, index) => ({ id: `entry-${index}`, label, href: `#entry-${index}`, order: index })),
	{ id: 'store', label: 'Store', href: '#store', section: 'footer', order: 90 },
	{ id: 'reports', label: 'Reports', href: '#reports', section: 'footer', order: 91 },
	{ id: 'roadmap', label: 'Features & roadmap', href: '#roadmap', section: 'footer', order: 92 },
]

export default {
	name: 'PixelGapsHarness',

	components: { CnAppNav, CnBreadcrumbs },

	data() {
		const plain = params.get('plain') === '1'
		return {
			scenario: params.get('pixgaps2') || 'nav',
			plain,
			navManifest: {
				version: '1.0.0',
				pages: [],
				menu: MENU,
				nav: {
					brand: { name: 'dossiq', caption: 'Gemeente Zuiddrecht' },
					primaryAction: { label: 'New case', icon: 'Plus', solid: true },
					card: { title: 'Close out your day', text: 'See what is still open today and get it ready for tomorrow.', link: { label: 'To the day close', href: '#day' } },
					help: { label: 'Help and explanation', href: '#help' },
					includePersonalSettings: true,
					...(plain ? {} : { footer: ['settings', 'help'] }),
				},
			},
		}
	},
}
</script>

<style scoped>
/* The height of the navigation column on a 1440x1000 screen under the top bar. */
.pixgaps2__nav {
	display: flex;
	height: 760px;
}
</style>

<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The settings widgets on a portal record (?settingswidgets=<name>), each
  resolved through CnDetailWidgetHost by its registry type. OpenRegister is
  stubbed by the specs with page.route().
-->
<template>
	<div class="settings-widgets-harness" data-testid="settings-widgets-harness">
		<CnDetailWidgetHost
			:widget="widget"
			chrome="card"
			objectId="p-1"
			:object="record"
			register="portaliq"
			schema="portal" />
	</div>
</template>

<script>
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

const RECORD = {
	id: 'p-1',
	slug: 'zuiddrecht',
	title: 'Gemeente Zuiddrecht',
	tagline: 'Samen maken we Zuiddrecht',
	kind: 'site',
	loginLabel: '',
	pageLimit: 33,
	trafficEnabled: true,
	installDisabled: false,
	signup: 'approval',
}

const WIDGETS = {
	radio: {
		id: 'portal-signup',
		type: 'radio-cards',
		title: 'Aanmelden',
		content: {
			field: 'signup',
			options: [
				{ value: 'nobody', label: 'Niemand', description: 'Alleen accounts die de gemeente uitgeeft of uitnodigt' },
				{ value: 'approval', label: 'Met goedkeuring', description: 'Iedereen meldt zich aan, een beheerder keurt goed' },
				{ value: 'anyone', label: 'Iedereen', description: 'Direct na de bevestigingsmail' },
			],
		},
	},
	switches: {
		id: 'portal-traffic',
		type: 'switch-rows',
		title: 'Verkeer meten',
		content: {
			rows: [
				{ key: 'trafficEnabled', label: 'Verkeer meten', hint: 'Zonder cookies, op de eigen server' },
				{ key: 'installDisabled', label: 'Als app installeren', hint: 'De app bewaart alleen de schil van de site.', invert: true },
			],
		},
	},
	form: {
		id: 'portal-details',
		type: 'settings-form',
		title: 'Gegevens van de portal',
		content: {
			saveLabel: 'Opslaan',
			savedText: 'De portal is opgeslagen.',
			fields: [
				{ key: 'title', label: 'Naam', required: true },
				{ key: 'tagline', label: 'Slogan' },
				{ key: 'slug', label: 'Adres in portaliq', hint: 'Pagina\'s en menu\'s horen via dit adres bij de portal.', pattern: '^[a-z0-9-]+$', patternMessage: 'Alleen kleine letters, cijfers en streepjes.' },
				{ key: 'kind', label: 'Soort', type: 'select', options: [{ value: 'site', label: 'Website op portaliq' }, { value: 'redirect', label: 'Verwijst naar een andere site' }] },
				{ key: 'loginLabel', label: 'Naam van de inlogknop' },
				{ key: 'pageLimit', label: 'Pagina\'s per lijst', type: 'number', min: 1, max: 100 },
			],
		},
	},
}

export default {
	name: 'SettingsWidgetsHarness',

	components: { CnDetailWidgetHost },

	data() {
		const name = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('settingswidgets') : ''
		return { record: { ...RECORD }, widget: WIDGETS[name] || WIDGETS.form }
	},
}
</script>

<style scoped>
.settings-widgets-harness {
	width: 720px;
	padding: 16px;
}
</style>

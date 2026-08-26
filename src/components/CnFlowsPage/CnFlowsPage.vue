<!-- SPDX-License-Identifier: EUPL-1.2 -->
<!-- Copyright (C) 2026 Conduction B.V. -->
<template>
	<CnIndexPage
		:title="resolvedTitle"
		:description="resolvedDescription"
		:columns="columns"
		:objects="rows"
		:loading="store.loading"
		:selectable="false"
		:show-add="false"
		:show-view-action="false"
		:show-edit-action="false"
		:actions="rowActions"
		row-click-to-view
		@row-click="openFlow">
		<template #header-actions>
			<NcButton variant="primary" @click="createFlow">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t("nextcloud-vue", "New flow") }}
			</NcButton>
		</template>
	</CnIndexPage>
</template>

<script>
import { NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnIndexPage from '../CnIndexPage/CnIndexPage.vue'
import { useFlowStore } from '../../composables/useFlowStore.js'

/**
 * The app-scoped flow list — manifest page type `flows`.
 *
 * Every app authors its own flows (ADR-110 Decision 4): a dossiq flow operates
 * on cases, a shillinq flow on budget lines, so the authoring surface belongs
 * in the app whose objects it drives rather than behind a deep link to another
 * app's list. The ENGINE stays single (ADR-065) — this is a scoped view onto
 * OpenRegister's one native flow store, not a per-app store.
 *
 * Built on `CnIndexPage` per ADR-096, and NOT on the deprecated
 * `CnFlowIndexPage`: a flow list is an ordinary index surface. The source is
 * external (`:objects` from `useFlowStore`) because a flow is not an
 * OpenRegister object, so there is no register/schema pair for a `type: "index"`
 * page to bind to — which is exactly why this needs its own page type instead
 * of being expressible in the manifest as an index.
 *
 * This component exists so an app declares two manifest pages and no component
 * files. The three apps that adopted flows before it each copied ~270 lines of
 * identical wrapper differing only in an app-id string; a fix to any of it had
 * to be applied once per app.
 *
 * Manifest declaration:
 *
 *   { "id": "Flows", "route": "/flows", "type": "flows", "title": "Flows",
 *     "config": { "app": "dossiq" } }
 */
export default {
	name: 'CnFlowsPage',

	components: {
		CnIndexPage,
		NcButton,
		// Pencil is deliberately NOT registered: it is passed as an icon
		// COMPONENT in `rowActions`, never used as a tag in this template.
		Plus,
	},

	props: {
		/**
		 * The owning app id this list is scoped to. Omit to list every app's
		 * flows — the fleet-wide view OpenRegister uses; a leaf app should
		 * always set it, or it shows other apps' automations as its own.
		 */
		app: {
			type: String,
			default: null,
		},

		/**
		 * Page heading. Defaults to a translated "Flows".
		 */
		title: {
			type: String,
			default: '',
		},

		/**
		 * Page description. Defaults to a translated one-line explanation of
		 * what a flow is.
		 */
		description: {
			type: String,
			default: '',
		},

		/**
		 * Route path the list navigates to for a flow, with `/<id>` appended.
		 * Change it only if the detail page is mounted somewhere other than
		 * the conventional `/flows/:id`.
		 */
		detailRoute: {
			type: String,
			default: '/flows',
		},
	},

	/**
	 * Share the one flow store with the editor page.
	 *
	 * @return {object} The setup bindings.
	 */
	setup() {
		return { store: useFlowStore() }
	},

	computed: {
		/**
		 * @return {string} The heading.
		 */
		resolvedTitle() {
			return this.title || t('nextcloud-vue', 'Flows')
		},

		/**
		 * @return {string} The description.
		 */
		resolvedDescription() {
			return this.description || t('nextcloud-vue', 'A flow runs a series of steps when something happens — an object changes, a schedule fires, or you run it yourself.')
		},

		/**
		 * @return {Array<object>} The row-action menu: Edit, and only Edit.
		 */
		rowActions() {
			return [
				{
					label: t('nextcloud-vue', 'Edit'),
					icon: Pencil,
					handler: (row) => this.openFlow(row),
				},
			]
		},

		/**
		 * @return {Array<object>} The column definitions.
		 */
		columns() {
			return [
				{ key: 'name', label: t('nextcloud-vue', 'Name') },
				{ key: 'description', label: t('nextcloud-vue', 'Description') },
				{ key: 'trigger', label: t('nextcloud-vue', 'Trigger') },
				{ key: 'cron', label: t('nextcloud-vue', 'Schedule') },
				{ key: 'statusLabel', label: t('nextcloud-vue', 'Status') },
			]
		},

		/**
		 * The flows with the status rendered for display.
		 *
		 * @return {Array<object>} The rows.
		 */
		rows() {
			return (this.store.flows || []).map((flow) => ({
				...flow,
				statusLabel: this.statusLabel(flow),
			}))
		},
	},

	async mounted() {
		await this.store.load({ app: this.app })
	},

	methods: {
		t,

		/**
		 * Enabled and dispatchable are NOT the same thing: a trigger fires with
		 * no acting user, so a flow with no owner has no identity to run as and
		 * will not start however enabled it looks. Saying so in the list is the
		 * only place a user finds out before waiting for a run that never comes.
		 *
		 * @param {object} flow The flow.
		 * @return {string} The label.
		 */
		statusLabel(flow) {
			if (!flow.enabled) {
				return t('nextcloud-vue', 'Disabled')
			}
			if (!flow.owner) {
				return t(
					'nextcloud-vue',
					'Enabled, but has no owner — it will not start',
				)
			}

			return t('nextcloud-vue', 'Enabled')
		},

		/**
		 * @param {object} flow The activated flow.
		 * @return {void}
		 */
		openFlow(flow) {
			const id = flow?.id || flow?.uuid
			if (!id) {
				return
			}

			this.$router.push(`${this.detailRoute}/${id}`)
		},

		/**
		 * @return {void}
		 */
		createFlow() {
			this.$router.push(`${this.detailRoute}/new`)
		},
	},
}
</script>

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div class="cn-saved-view-alert" data-testid="cn-saved-view-alert">
		<p v-if="!view" class="cn-saved-view-alert__empty" data-testid="cn-saved-view-alert-empty">
			{{ emptyText }}
		</p>
		<template v-else>
			<dl class="cn-saved-view-alert__facts">
				<dt>{{ t('nextcloud-vue', 'Name') }}</dt>
				<dd data-testid="cn-saved-view-alert-name">
					{{ view.name }}
				</dd>
				<template v-if="countText">
					<dt>{{ t('nextcloud-vue', 'Now') }}</dt>
					<dd data-testid="cn-saved-view-alert-count">
						{{ countText }}
					</dd>
				</template>
			</dl>
			<NcCheckboxRadioSwitch
				type="switch"
				:modelValue="enabled"
				:disabled="saving || !canEdit"
				data-testid="cn-saved-view-alert-switch"
				@update:modelValue="onToggle">
				<span class="cn-saved-view-alert__switch-text">
					<span>{{ t('nextcloud-vue', 'Tell me above a number') }}</span>
					<span class="cn-saved-view-alert__hint">{{ hintText }}</span>
				</span>
			</NcCheckboxRadioSwitch>
			<NcTextField v-if="enabled"
				:modelValue="String(threshold)"
				type="number"
				min="0"
				:label="t('nextcloud-vue', 'Threshold')"
				:disabled="saving || !canEdit"
				data-testid="cn-saved-view-alert-threshold"
				@update:modelValue="onThreshold" />
			<p v-if="error"
				class="cn-saved-view-alert__error"
				role="alert"
				data-testid="cn-saved-view-alert-error">
				{{ error }}
			</p>
		</template>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { NcCheckboxRadioSwitch, NcTextField } from '@nextcloud/vue'
import { useSavedViewsApi } from '../../composables/useSavedViewsApi.js'

/**
 * CnSavedViewAlertWidget — the saved view an index page has applied, with its
 * count alert (DqZoekresultaten "Opgeslagen zoekopdracht"): its name, how many
 * rows it holds now, and a switch that asks OpenRegister to tell the reader
 * when the count reaches a threshold.
 *
 * The alert is the view's own `alert` (`{ operator: 'gte', threshold,
 * recipients }`), saved with a PATCH on the view; OpenRegister evaluates it on
 * its sweep and fires on the crossing, not on the state. Switching it off
 * clears it. The widget reads the page through the `cnIndexList` CnIndexPage
 * provides, so it belongs in an index page's `sidePanel`
 * (`type: "saved-view-alert"`).
 *
 * Example (manifest):
 * ```json
 * { "id": "alert", "type": "saved-view-alert", "title": "Saved search", "content": { "noun": { "one": "case", "other": "cases" } } }
 * ```
 */
export default {
	name: 'CnSavedViewAlertWidget',

	components: { NcCheckboxRadioSwitch, NcTextField },

	inject: {
		/** The index page's list: its applied saved view and its total. */
		cnIndexList: { default: null },
		/** Host translate function provided by CnAppRoot. */
		cnTranslate: { default: () => (key) => key },
	},

	props: {
		/**
		 * The widget content: `{ noun?: { one, other }, emptyText? }`. `noun`
		 * names what is counted ("9 zaken"); `emptyText` shows while no saved
		 * view is applied. Both are translated with the app's catalogue.
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return { saving: false, error: '', draft: null }
	},

	computed: {
		/** @return {object|null} The applied saved view, or null. */
		view() {
			return (this.cnIndexList && this.cnIndexList.appliedView) || null
		},

		/** @return {boolean} Whether the view carries an alert. */
		enabled() {
			const alert = this.view && this.view.alert
			return Boolean(alert && typeof alert === 'object' && Number.isFinite(Number(alert.threshold)))
		},

		/** @return {number} The threshold being edited, else the view's, else 10. */
		threshold() {
			if (this.draft !== null) {
				return this.draft
			}
			const value = this.enabled ? Number(this.view.alert.threshold) : 10
			return Number.isFinite(value) ? value : 10
		},

		/** @return {boolean} Whether the reader may change the view: its owner, or when the view says nothing. */
		canEdit() {
			const owner = this.view && this.view.owner
			if (!owner) {
				return true
			}
			const user = getCurrentUser()
			return Boolean(user && user.uid === owner)
		},

		/** @return {string} "9 zaken", or '' while the total is unknown. */
		countText() {
			const total = this.cnIndexList ? this.cnIndexList.total : undefined
			if (typeof total !== 'number') {
				return ''
			}
			const noun = this.content && this.content.noun
			if (noun && typeof noun === 'object' && noun.one && noun.other) {
				return `${total} ${this.cnTranslate(total === 1 ? noun.one : noun.other)}`
			}
			return n('nextcloud-vue', '%n result', '%n results', total)
		},

		/** @return {string} The line under the switch. */
		hintText() {
			return t('nextcloud-vue', 'A message to you when there are {threshold} or more', { threshold: this.threshold })
		},

		/** @return {string} What shows while no saved view is applied. */
		emptyText() {
			const own = this.content && this.content.emptyText
			return own ? this.cnTranslate(own) : t('nextcloud-vue', 'Save this search or open a saved one to set an alert on it.')
		},
	},

	methods: {
		t,

		/**
		 * Switch the alert on (at the shown threshold) or off.
		 *
		 * @param {boolean} on The new state.
		 * @return {Promise<void>}
		 */
		async onToggle(on) {
			await this.save(on ? this.alertFor(this.threshold) : null)
		},

		/**
		 * Save a new threshold, when the alert is on.
		 *
		 * @param {string} value The typed value.
		 * @return {Promise<void>}
		 */
		async onThreshold(value) {
			const number = Math.max(0, Math.floor(Number(value)))
			if (!Number.isFinite(number)) {
				return
			}
			this.draft = number
			await this.save(this.alertFor(number))
			this.draft = null
		},

		/**
		 * The alert the view stores: reaching the threshold tells the reader.
		 *
		 * @param {number} threshold The threshold.
		 * @return {{operator: string, threshold: number, recipients: Array<string>}}
		 */
		alertFor(threshold) {
			const user = getCurrentUser()
			return { operator: 'gte', threshold, recipients: user && user.uid ? [user.uid] : [] }
		},

		/**
		 * PATCH the view's alert and hand the saved view back to the page.
		 *
		 * @param {object|null} alert The alert, or null to clear it.
		 * @return {Promise<void>}
		 */
		async save(alert) {
			if (!this.view) {
				return
			}
			this.saving = true
			this.error = ''
			try {
				const saved = await useSavedViewsApi().patchView(this.view.uuid || this.view.id, { alert })
				if (saved && this.cnIndexList && typeof this.cnIndexList.replaceSavedView === 'function') {
					this.cnIndexList.replaceSavedView(saved)
				}
			} catch (error) {
				this.error = (error && error.response && error.response.data && error.response.data.error) || t('nextcloud-vue', 'The alert could not be saved.')
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-saved-view-alert {
	display: flex;
	flex-direction: column;
	gap: 12px;
	font-size: 14px;
}

.cn-saved-view-alert__facts {
	display: grid;
	grid-template-columns: max-content 1fr;
	gap: 6px 16px;
	margin: 0;
}

.cn-saved-view-alert__facts dt {
	color: var(--color-text-maxcontrast);
}

.cn-saved-view-alert__facts dd {
	margin: 0;
	font-weight: 500;
}

.cn-saved-view-alert__switch-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-saved-view-alert__hint,
.cn-saved-view-alert__empty {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-saved-view-alert__empty,
.cn-saved-view-alert__error {
	margin: 0;
}

.cn-saved-view-alert__error {
	color: var(--color-error-text, var(--color-error));
	font-size: 13px;
}
</style>

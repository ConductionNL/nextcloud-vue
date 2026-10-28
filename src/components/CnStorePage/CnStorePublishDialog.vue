<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<!--
  CnStorePublishDialog: publish a store item built from this instance's own
  configuration (board PqStore, Publiceren).

  The app serves two endpoints, beside its store search:
  - GET  /apps/<app>/api/store/publishable?kind=<kind>
    answers `{objects: [{schema, id, title}]}`, the local configuration an item
    of that kind may carry;
  - POST /apps/<app>/api/store/publish with `{item, objects}`
    answers `{outcome, slug}`. OpenRegister's store plane decides who may
    publish and sends only the fields the app declared.
  An app without the first endpoint gets an empty list, and the item is
  published without components.
-->
<template>
	<CnDialog
		:name="t('nextcloud-vue', 'Publish to the store')"
		:subtitle="t('nextcloud-vue', 'Share a template built from your own configuration with the registry.')"
		data-testid="store-publish-dialog"
		@closing="$emit('close')">
		<div class="cn-store-publish">
			<NcSelect
				v-model="kindOption"
				:options="kindOptions"
				:inputLabel="t('nextcloud-vue', 'Kind')"
				:clearable="false"
				label="label"
				data-testid="store-publish-kind" />
			<fieldset class="cn-store-publish__objects">
				<legend>{{ t('nextcloud-vue', 'What the template carries') }}</legend>
				<p v-if="loadingObjects" class="cn-store-publish__note">
					{{ t('nextcloud-vue', 'Loading…') }}
				</p>
				<p v-else-if="objects.length === 0" class="cn-store-publish__note">
					{{ t('nextcloud-vue', 'Nothing of this kind on this instance yet.') }}
				</p>
				<label
					v-for="object in objects"
					:key="`${object.schema}:${object.id}`"
					class="cn-store-publish__object"
					data-testid="store-publish-object">
					<input v-model="chosen" type="checkbox" :value="`${object.schema}:${object.id}`">
					{{ object.title }}
				</label>
			</fieldset>
			<NcTextField
				v-model="title"
				:label="t('nextcloud-vue', 'Title')"
				data-testid="store-publish-title" />
			<NcTextField
				v-model="description"
				:label="t('nextcloud-vue', 'Description')"
				data-testid="store-publish-description" />
			<div class="cn-store-publish__row">
				<NcTextField
					v-model="version"
					:label="t('nextcloud-vue', 'Version')"
					data-testid="store-publish-version" />
				<NcTextField
					v-model="publisher"
					:label="t('nextcloud-vue', 'Publisher')"
					data-testid="store-publish-publisher" />
			</div>
		</div>
		<template #actions>
			<NcButton variant="tertiary" @click="$emit('close')">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				variant="primary"
				:disabled="!canSubmit"
				data-testid="store-publish-submit"
				@click="publish">
				{{ publishing ? t('nextcloud-vue', 'Publishing…') : t('nextcloud-vue', 'Publish') }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { showError, showSuccess } from '@nextcloud/dialogs'
import { t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton, NcSelect, NcTextField } from '@nextcloud/vue'
import CnDialog from '../CnDialog/CnDialog.vue'

/**
 * A store slug of a title: lower case, accents dropped, words joined by dashes.
 *
 * @param {string} title The item title.
 * @return {string}
 */
export function slugFor(title) {
	return String(title || '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export default {
	name: 'CnStorePublishDialog',

	components: {
		CnDialog,
		NcButton,
		NcSelect,
		NcTextField,
	},

	props: {
		/** The app id, the only app-specific part of the two endpoints. */
		app: {
			type: String,
			required: true,
		},

		/** The kinds an item may be published as; the first is chosen. */
		kinds: {
			type: Array,
			default: () => [],
		},

		/** Turns a kind into its label (the store page's kindLabel). */
		kindLabel: {
			type: Function,
			default: (kind) => kind,
		},
	},

	emits: ['close', 'published'],

	data() {
		return {
			kindOption: null,
			objects: [],
			loadingObjects: false,
			chosen: [],
			title: '',
			description: '',
			version: '1.0.0',
			publisher: '',
			publishing: false,
		}
	},

	computed: {
		kindOptions() {
			return this.kinds.map((kind) => ({ value: kind, label: this.kindLabel(kind) }))
		},

		kind() {
			return this.kindOption?.value || ''
		},

		canSubmit() {
			return !this.publishing && slugFor(this.title) !== '' && this.kind !== '' && this.version.trim() !== ''
		},
	},

	watch: {
		kind() {
			this.chosen = []
			this.loadObjects()
		},
	},

	created() {
		this.kindOption = this.kindOptions[0] || null
	},

	mounted() {
		if (this.kind === '') {
			return
		}
		this.loadObjects()
	},

	methods: {
		t,

		async loadObjects() {
			this.loadingObjects = true
			try {
				const response = await fetch(
					generateUrl(`/apps/${this.app}/api/store/publishable?kind=${encodeURIComponent(this.kind)}`),
					{ headers: { requesttoken: window.OC?.requestToken } },
				)
				const body = response.ok ? await response.json() : {}
				this.objects = Array.isArray(body.objects) ? body.objects : []
			} catch {
				this.objects = []
			} finally {
				this.loadingObjects = false
			}
		},

		async publish() {
			this.publishing = true
			const item = {
				slug: slugFor(this.title),
				title: this.title.trim(),
				description: this.description.trim(),
				kind: this.kind,
				category: this.kind,
				version: this.version.trim(),
				publisher: this.publisher.trim(),
			}
			const objects = this.chosen.map((key) => {
				const at = key.indexOf(':')
				return { schema: key.slice(0, at), id: key.slice(at + 1) }
			})
			try {
				const response = await fetch(generateUrl(`/apps/${this.app}/api/store/publish`), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', requesttoken: window.OC?.requestToken },
					body: JSON.stringify({ item, objects }),
				})
				const body = await response.json()
				if (body.outcome === 'ok') {
					showSuccess(t('nextcloud-vue', 'Published to the store.'))
					this.$emit('published', body.slug)
					return
				}
				showError(this.outcomeMessage(body, response.status))
			} catch {
				showError(t('nextcloud-vue', 'The item could not be published.'))
			} finally {
				this.publishing = false
			}
		},

		/**
		 * What went wrong, and what to do about it.
		 *
		 * @param {object} body The publish answer.
		 * @param {number} status The HTTP status.
		 * @return {string}
		 */
		outcomeMessage(body, status) {
			if (status === 403) {
				return t('nextcloud-vue', 'You may not publish to this store.')
			}
			const messages = {
				not_configured: t('nextcloud-vue', 'No store registry is configured. An administrator connects one under Administration settings.'),
				store_unreachable: t('nextcloud-vue', 'The store registry did not answer. Try again later.'),
				store_rejected: t('nextcloud-vue', 'The store registry refused the item.'),
				too_large: t('nextcloud-vue', 'The item is too large to publish.'),
				rate_limited: t('nextcloud-vue', 'The store registry is busy. Try again in a minute.'),
			}
			return messages[body?.outcome] || body?.message || t('nextcloud-vue', 'The item could not be published.')
		},
	},
}
</script>

<style scoped>
.cn-store-publish {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.cn-store-publish__objects {
	display: flex;
	flex-direction: column;
	gap: 6px;
	margin: 0;
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: 8px;
}

.cn-store-publish__objects legend {
	padding: 0 4px;
	font-weight: 600;
}

.cn-store-publish__object {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-store-publish__note {
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-store-publish__row {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.cn-store-publish__row > * {
	flex: 1 1 160px;
}
</style>

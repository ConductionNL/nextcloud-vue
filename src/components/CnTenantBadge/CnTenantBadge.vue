<!--
	CnTenantBadge — compact badge rendering the active organisation's name
	and (optional) icon. Auto-hides when the user has at most ONE
	organisation (single-tenant or no-tenant deployments don't need the
	visual chrome). Wires to `useTenantContext()` so the badge stays
	reactive when an upstream `setActiveTenant()` call switches tenants.

	With `switchSource` it is a switcher instead: it reads the user's scopes
	from an endpoint, names the active one, and posts the chosen id to
	`switchUrl`. It hides with one scope or none.

	Spec: openspec/changes/multi-tenancy-context — REQ-MT-4 (UI).
-->
<template>
	<div v-if="switchSource && switchItems.length > 1"
		class="cn-tenant-badge cn-tenant-badge--switcher"
		:class="[sizeClass]">
		<NcActions :menuName="activeSwitchLabel"
			:aria-label="switchLabel"
			:title="switchLabel"
			:disabled="switching"
			:forceName="true"
			variant="tertiary">
			<template #icon>
				<span v-if="activeSwitchLabel" class="cn-tenant-badge__icon" :style="colourFor(activeSwitchLabel)">{{ activeSwitchLabel.charAt(0).toUpperCase() }}</span>
			</template>
			<NcActionButton v-for="item in switchItems"
				:key="itemId(item)"
				:disabled="switching || itemId(item) === activeSwitchId"
				:closeAfterClick="true"
				@click="switchTo(itemId(item))">
				<template #icon>
					<Check v-if="itemId(item) === activeSwitchId" :size="18" />
				</template>
				{{ itemLabel(item) }}
			</NcActionButton>
		</NcActions>
		<p v-if="switchError" class="cn-tenant-badge__error" role="alert">
			{{ switchError }}
		</p>
	</div>
	<div v-else-if="!switchSource && visible"
		class="cn-tenant-badge"
		:class="[sizeClass]"
		:title="badgeTitle">
		<span v-if="iconLetter" class="cn-tenant-badge__icon" :style="iconStyle">{{ iconLetter }}</span>
		<span class="cn-tenant-badge__name">{{ displayName }}</span>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcActions } from '@nextcloud/vue'
import Check from 'vue-material-design-icons/Check.vue'
import { tenantContextMixin } from '../../mixins/tenantContext.js'
import { firstFilled } from '../../utils/fillTemplate.js'
import { prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'

export default {
	name: 'CnTenantBadge',

	components: { Check, NcActionButton, NcActions },

	mixins: [tenantContextMixin],

	props: {
		/**
		 * Full list of organisations the current user belongs to. When
		 * supplied, the badge auto-hides when length <= 1. When unset
		 * (length unknown), the badge always renders if an active
		 * organisation exists.
		 */
		organisations: {
			type: Array,
			default: null,
		},

		/**
		 * Badge size: `'sm'` (default — fits the top-bar) or `'md'`.
		 */
		size: {
			type: String,
			default: 'sm',
			validator: (v) => ['sm', 'md'].includes(v),
		},

		/**
		 * Optional fallback name shown when the active organisation
		 * entity has not been resolved yet (only UUID known).
		 */
		fallbackName: {
			type: String,
			default: '',
		},

		/**
		 * Makes the badge a switcher. `{ url, itemsPath, activePath,
		 * idField, labelTemplate }`: `GET url` answers the scopes at
		 * `itemsPath` and the active id at `activePath`; `idField`
		 * (default `id`) names each scope's id and `labelTemplate` (one
		 * template or a list of candidates, `{field}` tokens) its label.
		 */
		switchSource: {
			type: Object,
			default: null,
		},

		/** `POST` target of a switch, with the chosen id under `switchParam`. */
		switchUrl: {
			type: String,
			default: '',
		},

		/** Body key the chosen id is posted under. */
		switchParam: {
			type: String,
			default: 'id',
		},

		/** Reload the page after a switch, so every view reads the new scope. */
		reloadAfterSwitch: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['switched'],

	data() {
		return {
			switchItems: [],
			activeSwitchId: null,
			switching: false,
			switchError: '',
		}
	},

	computed: {
		/**
		 * Render gate.
		 *
		 * Auto-hide rules:
		 *   - When `organisations` is a non-null array of length <= 1 → hide.
		 *   - When no active organisation UUID AND no fallback → hide.
		 */
		visible() {
			if (Array.isArray(this.organisations) && this.organisations.length <= 1) {
				return false
			}
			return Boolean(this.activeOrganisationUuid || this.fallbackName)
		},

		/**
		 * Display name — prefer the resolved entity's name, fall back
		 * to `fallbackName`, then the UUID itself.
		 */
		displayName() {
			if (this.activeOrganisation && this.activeOrganisation.name) {
				return this.activeOrganisation.name
			}
			if (this.fallbackName) {
				return this.fallbackName
			}
			return this.activeOrganisationUuid || ''
		},

		/** Single-letter avatar based on the resolved name. */
		iconLetter() {
			const name = this.displayName
			if (!name) {
				return ''
			}
			return name.charAt(0).toUpperCase()
		},

		/** Deterministic colour-from-name for the avatar background. */
		iconStyle() {
			const name = this.displayName
			if (!name) {
				return {}
			}
			let hash = 0
			for (let i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash)
			}
			const hue = Math.abs(hash) % 360
			return { backgroundColor: `hsl(${hue}, 45%, 40%)` }
		},

		/** Native tooltip text — full org name + uuid hint. */
		badgeTitle() {
			const name = this.displayName
			const uuid = this.activeOrganisationUuid
			if (name && uuid && name !== uuid) {
				return `${name} (${uuid})`
			}
			return name || uuid || ''
		},

		sizeClass() {
			return `cn-tenant-badge--${this.size}`
		},

		/** Label of the active scope in switcher mode. */
		activeSwitchLabel() {
			const active = this.switchItems.find((item) => this.itemId(item) === this.activeSwitchId)
			return active ? this.itemLabel(active) : ''
		},

		/** Accessible name of the switcher. */
		switchLabel() {
			return this.activeSwitchLabel
				? t('nextcloud-vue', 'Switch from {name}', { name: this.activeSwitchLabel })
				: t('nextcloud-vue', 'Switch')
		},
	},

	mounted() {
		if (this.switchSource) {
			this.loadSwitchItems()
		}
	},

	methods: {
		/** Read the scopes and the active id from `switchSource.url`. */
		async loadSwitchItems() {
			try {
				const { data } = await axios.get(prefixUrl(this.switchSource.url))
				const items = readPath(data, this.switchSource.itemsPath)
				this.switchItems = Array.isArray(items) ? items : []
				const active = readPath(data, this.switchSource.activePath)
				this.activeSwitchId = active === undefined || active === null ? null : String(active)
			} catch {
				this.switchItems = []
				this.activeSwitchId = null
			}
		},

		/**
		 * @param {object} item A scope.
		 * @return {string} Its id.
		 */
		itemId(item) {
			return String(readPath(item, this.switchSource?.idField || 'id') ?? '')
		},

		/**
		 * @param {object} item A scope.
		 * @return {string} Its label, or its id when no template fills.
		 */
		itemLabel(item) {
			const template = this.switchSource?.labelTemplate || '{name}'
			return firstFilled(template, item) || this.itemId(item)
		},

		/**
		 * Post the chosen scope and make it active.
		 *
		 * @param {string} id The chosen scope id.
		 */
		async switchTo(id) {
			if (this.switching || id === this.activeSwitchId || !this.switchUrl) {
				return
			}
			this.switching = true
			this.switchError = ''
			try {
				await axios.post(prefixUrl(this.switchUrl), { [this.switchParam]: id })
				this.activeSwitchId = id
				this.$emit('switched', id)
				if (this.reloadAfterSwitch && typeof window !== 'undefined' && window.location) {
					window.location.reload()
				}
			} catch {
				this.switchError = t('nextcloud-vue', 'Could not switch. Try again.')
			} finally {
				this.switching = false
			}
		},

		/**
		 * @param {string} name A label.
		 * @return {object} The avatar colour for it.
		 */
		colourFor(name) {
			let hash = 0
			for (let i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash)
			}
			return { backgroundColor: `hsl(${Math.abs(hash) % 360}, 45%, 40%)` }
		},
	},
}
</script>

<style scoped>
.cn-tenant-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 8px;
	border-radius: 12px;
	background: var(--color-background-hover, rgba(127, 127, 127, 0.12));
	color: var(--color-main-text, inherit);
	font-size: 12px;
	line-height: 1.25;
	max-width: 220px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	cursor: default;
}

.cn-tenant-badge--md {
	font-size: 14px;
	padding: 4px 12px;
}

.cn-tenant-badge__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	color: #fff;
	font-size: 11px;
	font-weight: 600;
	flex: 0 0 auto;
}

.cn-tenant-badge--md .cn-tenant-badge__icon {
	width: 22px;
	height: 22px;
	font-size: 12px;
}

.cn-tenant-badge__name {
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-tenant-badge--switcher {
	padding: 0;
	background: none;
	max-width: none;
	overflow: visible;
	cursor: auto;
}

.cn-tenant-badge__error {
	margin: 0 0 0 4px;
	color: var(--color-error-text, var(--color-error));
}
</style>

<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnSettingsSection
		class="cn-leaf-dependency-settings"
		:name="sectionName"
		:description="sectionDescription"
		data-testid="cn-leaf-dependency-settings">
		<p v-if="loading" class="cn-leaf-dependency-settings__loading">
			<NcLoadingIcon :size="20" />
			{{ loadingLabel }}
		</p>

		<!-- Everything resolved. Said explicitly rather than rendering nothing:
		     an admin page that goes blank cannot be told from one that failed
		     to load, and "no missing apps" is the answer they came for. -->
		<div
			v-else-if="rows.length === 0"
			class="cn-leaf-dependency-settings__all-good"
			data-testid="cn-leaf-dependency-settings-resolved">
			<CheckCircleOutline :size="20" class="cn-leaf-dependency-settings__all-good-icon" />
			<span>{{ allResolvedLabel }}</span>
		</div>

		<ul v-else class="cn-leaf-dependency-settings__list">
			<li
				v-for="dep in rows"
				:key="dep.id"
				class="cn-leaf-dependency-settings__row"
				:class="`cn-leaf-dependency-settings__row--${dep.required ? 'required' : 'optional'}`"
				:data-testid="'cn-leaf-dependency-' + dep.id">
				<div class="cn-leaf-dependency-settings__icon" :class="`cn-leaf-dependency-settings__icon--${dep.required ? 'required' : 'optional'}`">
					<AlertCircleOutline v-if="dep.required" :size="22" />
					<PuzzleOutline v-else :size="22" />
				</div>

				<div class="cn-leaf-dependency-settings__body">
					<p class="cn-leaf-dependency-settings__name">
						{{ dep.name }}
						<span class="cn-leaf-dependency-settings__tag">
							{{ dep.required ? requiredTagLabel : optionalTagLabel }}
						</span>
					</p>
					<!-- The two states the old in-app banner distinguished are
					     preserved here verbatim: "installed but disabled" reads
					     differently from "not installed at all", because the
					     admin's next action differs. -->
					<p class="cn-leaf-dependency-settings__state">
						{{ dep.enabled === false ? disabledText(dep) : missingText(dep) }}
					</p>
					<p
						v-if="error && erroredId === dep.id"
						class="cn-leaf-dependency-settings__error"
						:data-testid="'cn-leaf-dependency-error-' + dep.id">
						{{ error }}
					</p>
				</div>

				<div class="cn-leaf-dependency-settings__actions">
					<NcButton
						v-if="isAdmin"
						variant="secondary"
						:disabled="installing"
						:data-testid="'cn-leaf-dependency-install-' + dep.id"
						@click="onInstall(dep)">
						<template #icon>
							<NcLoadingIcon v-if="installing && busyId === dep.id" :size="20" />
							<Download v-else :size="20" />
						</template>
						{{ dep.enabled === false ? enableLabel : installLabel }}
					</NcButton>
					<span v-else class="cn-leaf-dependency-settings__ask-admin">
						{{ askAdminText(dep) }}
					</span>
				</div>
			</li>
		</ul>
	</CnSettingsSection>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import PuzzleOutline from 'vue-material-design-icons/PuzzleOutline.vue'
import CheckCircleOutline from 'vue-material-design-icons/CheckCircleOutline.vue'
import Download from 'vue-material-design-icons/Download.vue'
import CnSettingsSection from '../CnSettingsSection/CnSettingsSection.vue'
import { useAppStatus } from '../../composables/useAppStatus.js'
import { useAppInstaller } from '../../composables/useAppInstaller.js'

/**
 * CnLeafDependencySettings — admin-settings section for an app's leaf
 * dependencies.
 *
 * This is where a Conduction app now tells an administrator that an
 * integration it can use is missing. It replaces the stack of orange
 * `NcNoteCard` banners `CnAppRoot` used to render at the top of every index
 * page: four of them at once pushed the app's own content below the fold, and
 * they addressed an audience — administrators — who were not the ones reading
 * the index page. The information is the same and the two actionable states
 * are preserved: an app that is not installed offers "Install and enable", one
 * that is installed but disabled offers "Enable".
 *
 * Mount it in the app's admin settings Vue entry point:
 *
 * ```vue
 * <CnLeafDependencySettings
 *   app-id="dossiq"
 *   :dependencies="manifest.dependencies"
 *   :is-admin="true" />
 * ```
 *
 * `dependencies` takes the manifest's own `dependencies` array — either bare
 * app-id strings (treated as required) or `{ id, name, required }` objects.
 * Nothing else is needed: the component resolves each app's installed/enabled
 * state itself via `useAppStatus`, and installs through `useAppInstaller`
 * (the same admin-password-confirming path the old banner used).
 */
export default {
	name: 'CnLeafDependencySettings',

	components: {
		CnSettingsSection,
		NcButton,
		NcLoadingIcon,
		AlertCircleOutline,
		PuzzleOutline,
		CheckCircleOutline,
		Download,
	},

	inject: {
		/**
		 * The app manifest provided by a CnAppRoot ancestor. Used only as a
		 * fallback source of `dependencies` when the `dependencies` prop is
		 * empty — an admin settings page usually mounts standalone, so the
		 * prop is the primary path.
		 */
		cnManifest: { default: null },
	},

	props: {
		/** The consuming app's id (e.g. `dossiq`). Used for status lookups. */
		appId: {
			type: String,
			default: '',
		},
		/**
		 * Dependency declarations, in the manifest's own shape: a list of
		 * app-id strings, or `{ id, name?, required? }` objects. `required`
		 * defaults to true, matching the manifest schema.
		 *
		 * @type {Array<string|{id: string, name?: string, required?: boolean}>}
		 */
		dependencies: {
			type: Array,
			default: () => [],
		},
		/**
		 * Whether the current user may install/enable apps. When false the
		 * row shows an "ask your administrator" line instead of the button.
		 */
		isAdmin: {
			type: Boolean,
			default: true,
		},
		/**
		 * Also list dependencies that are present and enabled. Off by
		 * default — an admin section about what is missing should be empty
		 * when nothing is.
		 */
		showResolved: {
			type: Boolean,
			default: false,
		},
		/** Pre-translated section heading. */
		sectionName: {
			type: String,
			default: () => t('nextcloud-vue', 'Optional integrations'),
		},
		/** Pre-translated section description. */
		sectionDescription: {
			type: String,
			default: () => t('nextcloud-vue', 'Other Nextcloud apps this app can use. Installing them unlocks extra features; the app works without them.'),
		},
	},

	emits: ['installed'],

	setup() {
		const { installing, error, installAndEnable } = useAppInstaller()
		return { installing, error, installAndEnable }
	},

	data() {
		return {
			/** Id of the dependency whose install is in flight. */
			busyId: '',
			/** Id of the dependency whose install failed (scopes the error line). */
			erroredId: '',
		}
	},

	computed: {
		/**
		 * The declared dependencies, normalised to `{ id, name, required }`
		 * and paired with a live `useAppStatus` result. Falls back to the
		 * injected manifest when the prop is empty.
		 *
		 * @return {Array<object>}
		 */
		declared() {
			const raw = (this.dependencies && this.dependencies.length > 0)
				? this.dependencies
				: ((this.cnManifest && this.cnManifest.dependencies) || [])
			return raw
				.map((entry) => {
					const isObject = entry && typeof entry === 'object'
					const id = isObject ? entry.id : entry
					if (typeof id !== 'string' || id === '') return null
					return {
						id,
						name: (isObject && entry.name) || id,
						required: isObject ? entry.required !== false : true,
						status: useAppStatus(id),
					}
				})
				.filter((e) => e !== null)
		},

		/** Whether any dependency's status is still resolving. */
		loading() {
			return this.declared.some((d) => d.status.loading.value)
		},

		/**
		 * The rows to render: unresolved dependencies (or all of them when
		 * `showResolved`), required ones first so the blocking problem is
		 * read before the optional ones.
		 *
		 * @return {Array<object>}
		 */
		rows() {
			return this.declared
				.filter((d) => this.showResolved || !d.status.installed.value || !d.status.enabled.value)
				.map((d) => ({
					id: d.id,
					name: d.name,
					required: d.required,
					// `false` = installed but disabled → "Enable".
					// `undefined` = not installed at all → "Install and enable".
					enabled: d.status.installed.value ? false : undefined,
				}))
				.sort((a, b) => (Number(b.required) - Number(a.required)) || a.name.localeCompare(b.name))
		},

		loadingLabel() { return t('nextcloud-vue', 'Checking apps…') },
		allResolvedLabel() { return t('nextcloud-vue', 'All integrations this app can use are installed and enabled.') },
		installLabel() { return t('nextcloud-vue', 'Install and enable') },
		enableLabel() { return t('nextcloud-vue', 'Enable') },
		requiredTagLabel() { return t('nextcloud-vue', 'Required') },
		optionalTagLabel() { return t('nextcloud-vue', 'Optional') },
	},

	methods: {
		/**
		 * Copy for a dependency that is not installed at all.
		 *
		 * @param {object} dep Row.
		 * @return {string}
		 */
		missingText(dep) {
			return dep.required
				? t('nextcloud-vue', '{name} is required by this app and is not installed.', { name: dep.name })
				: t('nextcloud-vue', '{name} is not installed. Installing it unlocks optional features.', { name: dep.name })
		},

		/**
		 * Copy for a dependency that is installed but disabled.
		 *
		 * @param {object} dep Row.
		 * @return {string}
		 */
		disabledText(dep) {
			return dep.required
				? t('nextcloud-vue', '{name} is installed but disabled, and this app requires it.', { name: dep.name })
				: t('nextcloud-vue', '{name} is installed but disabled. Enabling it unlocks optional features.', { name: dep.name })
		},

		/**
		 * Copy shown instead of the button to a non-admin.
		 *
		 * @param {object} dep Row.
		 * @return {string}
		 */
		askAdminText(dep) {
			return t('nextcloud-vue', 'Ask your administrator to enable {name}.', { name: dep.name })
		},

		/**
		 * Install (or enable) one dependency, then emit `installed` so the
		 * host can refresh whatever depended on it.
		 *
		 * @param {object} dep Row.
		 * @return {Promise<void>}
		 */
		async onInstall(dep) {
			this.busyId = dep.id
			this.erroredId = ''
			try {
				await this.installAndEnable(dep.id)
				/**
				 * @event installed A dependency was installed and enabled.
				 * @type {{ id: string }}
				 */
				this.$emit('installed', { id: dep.id })
			} catch (e) {
				this.erroredId = dep.id
			} finally {
				this.busyId = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-leaf-dependency-settings__loading,
.cn-leaf-dependency-settings__all-good {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-leaf-dependency-settings__all-good-icon {
	color: var(--color-success);
}

.cn-leaf-dependency-settings__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-leaf-dependency-settings__row {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-main-background);
}

.cn-leaf-dependency-settings__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	flex-shrink: 0;
}

.cn-leaf-dependency-settings__icon--required {
	color: var(--color-error);
	background: color-mix(in srgb, var(--color-error) 12%, transparent);
}

.cn-leaf-dependency-settings__icon--optional {
	color: var(--color-primary-element);
	background: color-mix(in srgb, var(--color-primary-element) 12%, transparent);
}

.cn-leaf-dependency-settings__body {
	flex: 1 1 auto;
	min-width: 0;
}

.cn-leaf-dependency-settings__name {
	margin: 0;
	display: flex;
	align-items: center;
	gap: 8px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-leaf-dependency-settings__tag {
	font-size: 11px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	padding: 1px 6px;
	border-radius: 10px;
	color: var(--color-text-maxcontrast);
	background: var(--color-background-dark);
}

.cn-leaf-dependency-settings__state {
	margin: 2px 0 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-leaf-dependency-settings__error {
	margin: 4px 0 0;
	font-size: 13px;
	color: var(--color-error);
}

.cn-leaf-dependency-settings__actions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.cn-leaf-dependency-settings__ask-admin {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}
</style>

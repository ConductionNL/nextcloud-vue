<!--
  CnDependencyMissing — full-page screen shown when one or more apps
  declared in `manifest.dependencies` are not installed or not enabled.

  CnAppRoot mounts this in its dependency-check phase (between loading
  and shell). Apps can override CnAppRoot's #dependency-missing slot to
  customise the screen.

  See REQ-JMR-011 of the json-manifest-renderer specification.
-->
<template>
	<div class="cn-dependency-missing" data-testid="cn-dependency-missing">
		<div class="cn-dependency-missing__inner">
			<h1 class="cn-dependency-missing__heading">
				{{ heading }}
			</h1>
			<p class="cn-dependency-missing__intro">
				{{ intro }}
			</p>
			<ul class="cn-dependency-missing__list">
				<li
					v-for="dep in dependencies"
					:key="dep.id"
					class="cn-dependency-missing__item">
					<span class="cn-dependency-missing__item-name">{{ dep.name || dep.id }}</span>
					<!--
					  Admin: one click installs-and-enables (or enables) the app
					  via Nextcloud's own settings/apps/enable endpoint, then
					  reloads. On failure the error shows inline and the store
					  link stays as a fallback (REQ-DIA-2).
					-->
					<div v-if="isAdmin" class="cn-dependency-missing__item-action">
						<NcButton
							type="primary"
							data-testid="cn-dependency-missing-install"
							:disabled="installing"
							@click="install(dep)">
							<template #icon>
								<NcLoadingIcon v-if="installing && installingDepId === dep.id" :size="20" />
							</template>
							{{ dep.enabled === false ? enableLabel : installLabel }}
						</NcButton>
						<template v-if="error && erroredDepId === dep.id">
							<span class="cn-dependency-missing__item-error">{{ error }}</span>
							<a
								class="cn-dependency-missing__item-link"
								:href="resolveLink(dep)"
								target="_self">
								{{ dep.enabled === false ? enableLabel : installLabel }}
							</a>
						</template>
					</div>
					<!--
					  Non-admin: they cannot hit the admin-only endpoint, so
					  point them at their administrator instead of a dead-end
					  link (REQ-DIA-2).
					-->
					<span
						v-else
						class="cn-dependency-missing__item-ask-admin"
						data-testid="cn-dependency-missing-ask-admin">
						{{ resolveAskAdmin(dep) }}
					</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import { useAppInstaller } from '../../composables/useAppInstaller.js'

export default {
	name: 'CnDependencyMissing',

	components: {
		NcButton,
		NcLoadingIcon,
	},

	props: {
		/**
		 * Array of missing dependencies. Each entry:
		 *   { id, name?, installUrl?, enabled? }
		 * - `id` is the Nextcloud app id (matches the entries in
		 *   manifest.dependencies)
		 * - `name` is a human-readable label; `id` is used as a fallback
		 * - `installUrl` overrides the default install/enable URL when
		 *   set; otherwise the default Nextcloud apps page is used
		 * - `enabled` discriminates the link label: `false` means the
		 *   app is installed but disabled; otherwise it's not installed
		 * @type {Array<{id: string, name: string, installUrl: string, enabled: boolean}>}
		 */
		dependencies: {
			type: Array,
			required: true,
		},
		/**
		 * Optional name of the host app, included in the default heading.
		 *
		 * @type {string}
		 */
		appName: {
			type: String,
			default: '',
		},
		/** Heading text. Override for localisation. */
		heading: {
			type: String,
			default: 'Required apps are missing',
		},
		/** Introductory text under the heading. */
		intro: {
			type: String,
			default: 'This app needs the following Nextcloud apps to be installed and enabled.',
		},
		/**
		 * Label for the install/enable action when the app is not
		 * installed. Defaults to "Install and enable" — the single
		 * `settings/apps/enable` call both downloads and enables the app.
		 */
		installLabel: {
			type: String,
			default: 'Install and enable',
		},
		/** Label for the action when dep.enabled === false (installed but disabled). */
		enableLabel: {
			type: String,
			default: 'Enable',
		},
		/**
		 * Copy shown to non-admins in place of the action, with `{name}`
		 * replaced by the dependency's display name. Non-admins cannot hit
		 * the admin-only enable endpoint (REQ-DIA-2).
		 */
		askAdminLabel: {
			type: String,
			default: 'Ask your administrator to enable {name}',
		},
	},

	/**
	 * Wire the shared install/enable action (REQ-DIA-1). The composable's
	 * `installing` / `error` refs are returned top-level so the template
	 * auto-unwraps them; `installAndEnable` is called from the `install`
	 * method.
	 *
	 * @return {object} `{ installer, installing, error }`.
	 */
	setup() {
		const installer = useAppInstaller()
		return {
			installer,
			installing: installer.installing,
			error: installer.error,
		}
	},

	data() {
		return {
			/**
			 * Id of the dependency whose install/enable is currently in
			 * flight — drives the per-row spinner and scopes the inline
			 * error to the clicked row. `null` when idle.
			 *
			 * @type {string|null}
			 */
			installingDepId: null,
			/**
			 * Id of the dependency whose last install/enable attempt failed —
			 * scopes the inline error + fallback store link to that row.
			 * Survives after `installingDepId` is cleared, so the error stays
			 * visible once the attempt settles.
			 *
			 * @type {string|null}
			 */
			erroredDepId: null,
		}
	},

	computed: {
		/**
		 * Whether the current user is a Nextcloud admin. Only admins can
		 * hit `settings/apps/enable`, so the component branches on this:
		 * admins get the install/enable button, non-admins get
		 * "ask your administrator" copy (REQ-DIA-2).
		 *
		 * @return {boolean}
		 */
		isAdmin() {
			try {
				return getCurrentUser()?.isAdmin === true
			} catch (e) {
				return false
			}
		},
	},

	methods: {
		/**
		 * Install-and-enable (or enable) a dependency via the shared
		 * `useAppInstaller`, reloading on success so the freshly installed
		 * app's assets are present. On failure the error is surfaced inline
		 * and the store link (`resolveLink`) stays as a fallback (REQ-DIA-2).
		 *
		 * @param {object} dep The dependency `{ id, name?, enabled?, ... }`.
		 * @return {Promise<void>}
		 */
		async install(dep) {
			this.installingDepId = dep.id
			this.erroredDepId = null
			try {
				await this.installer.installAndEnable(dep.id)
				window.location.reload()
			} catch (e) {
				// Error surfaced via `error`; the fallback store link stays.
				// A cancelled password confirmation also lands here (no text).
				this.erroredDepId = dep.id
			} finally {
				this.installingDepId = null
			}
		},
		/**
		 * Interpolate the non-admin copy with the dependency's display name.
		 *
		 * @param {object} dep The dependency `{ id, name?, ... }`.
		 * @return {string}
		 */
		resolveAskAdmin(dep) {
			return this.askAdminLabel.replace('{name}', dep.name || dep.id)
		},
		resolveLink(dep) {
			if (dep.installUrl) return dep.installUrl
			if (dep.enabled === false) {
				return `/index.php/settings/apps/disabled/${dep.id}`
			}
			return `/index.php/settings/apps/${dep.category ?? 'featured'}/${dep.id}`
		},
	},
}
</script>

<style>
.cn-dependency-missing {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 100%;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-dependency-missing__inner {
	max-width: 600px;
	padding: calc(4 * var(--default-grid-baseline));
}

.cn-dependency-missing__heading {
	margin: 0 0 calc(2 * var(--default-grid-baseline));
	font-size: 1.5em;
}

.cn-dependency-missing__intro {
	margin: 0 0 calc(3 * var(--default-grid-baseline));
	color: var(--color-text-maxcontrast);
}

.cn-dependency-missing__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-dependency-missing__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: calc(2 * var(--default-grid-baseline)) 0;
	border-bottom: 1px solid var(--color-border);
}

.cn-dependency-missing__item:last-child {
	border-bottom: 0;
}

.cn-dependency-missing__item-name {
	font-weight: bold;
}

.cn-dependency-missing__item-link {
	color: var(--color-primary-element);
	text-decoration: underline;
}

.cn-dependency-missing__item-action {
	display: flex;
	align-items: center;
	gap: calc(2 * var(--default-grid-baseline));
	flex-wrap: wrap;
	justify-content: flex-end;
}

.cn-dependency-missing__item-error {
	color: var(--color-error);
}

.cn-dependency-missing__item-ask-admin {
	color: var(--color-text-maxcontrast);
	text-align: right;
}
</style>

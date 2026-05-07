<!--
  CnDependencyMissing — full-page screen shown when one or more apps
  declared in `manifest.dependencies` are not installed or not enabled.

  CnAppRoot mounts this in its dependency-check phase (between loading
  and shell). Apps can override CnAppRoot's #dependency-missing slot to
  customise the screen.

  See REQ-JMR-011 of the json-manifest-renderer specification.
-->
<template>
	<div class="cn-dependency-missing">
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
					<a
						class="cn-dependency-missing__item-link"
						:href="resolveLink(dep)"
						target="_self">
						{{ dep.enabled === false ? enableLabel : installLabel }}
					</a>
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
export default {
	name: 'CnDependencyMissing',

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
		/** Label for the install link. */
		installLabel: {
			type: String,
			default: 'Install',
		},
		/** Label for the enable link (used when dep.enabled === false). */
		enableLabel: {
			type: String,
			default: 'Enable',
		},
	},

	methods: {
		resolveLink(dep) {
			if (dep.installUrl) return dep.installUrl
			return '/index.php/settings/apps'
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
	min-height: 100vh;
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
</style>

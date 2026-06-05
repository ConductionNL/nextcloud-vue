<!--
  CnAppLoading — full-page loading screen used during the loading phase
  of CnAppRoot (while useAppManifest is fetching).

  Apps can override CnAppRoot's #loading slot to swap branding /
  messaging. The default rendering shows an optional logo, the
  Nextcloud loading spinner, and a message.

  See REQ-JMR-010 of the json-manifest-renderer specification.
-->
<template>
	<div class="cn-app-loading" data-testid="cn-app-loading">
		<div class="cn-app-loading__inner">
			<slot name="logo">
				<img
					v-if="logoUrl"
					:src="logoUrl"
					alt=""
					class="cn-app-loading__logo">
			</slot>
			<NcLoadingIcon :size="48" />
			<p class="cn-app-loading__message">
				{{ message }}
			</p>
		</div>
	</div>
</template>

<script>
import { NcLoadingIcon } from '@nextcloud/vue'

export default {
	name: 'CnAppLoading',

	components: {
		NcLoadingIcon,
	},

	props: {
		/**
		 * Loading message displayed below the spinner. Plain string —
		 * the consuming app pre-translates if needed (this library
		 * never imports `t()` from a specific app).
		 *
		 * @type {string}
		 */
		message: {
			type: String,
			default: 'Loading...',
		},
		/**
		 * Optional logo image URL displayed above the spinner. Apps
		 * with custom branding can also override the `#logo` slot.
		 *
		 * @type {string}
		 */
		logoUrl: {
			type: String,
			default: '',
		},
	},
}
</script>

<style>
.cn-app-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 100%;
	background: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-app-loading__inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: calc(2 * var(--default-grid-baseline));
}

.cn-app-loading__logo {
	max-width: 96px;
	max-height: 96px;
}

.cn-app-loading__message {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--default-font-size);
}
</style>

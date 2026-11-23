<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The credentials section of the user settings dialog
  (?l7=credentials-name) as CnAppRoot mounts it for an app that gives no
  display name: the app id is handed on as the name. The spec stubs the two
  OpenRegister requests.
-->
<template>
	<div class="credentials-name" data-testid="credentials-name">
		<CnCredentials
			scope="personal"
			appId="launchpad"
			appName="launchpad"
			:appCredentials="[]" />
	</div>
</template>

<script>
import CnCredentials from '../../../src/components/CnCredentials/CnCredentials.vue'

export default {
	name: 'CredentialsName',

	components: { CnCredentials },
}
</script>

<!--
  SPDX-FileCopyrightText: 2026 Conduction B.V.
  SPDX-License-Identifier: EUPL-1.2

  The files browser bar at the width of a case page's Documents tab
  (?filesbar=1), with a root crumb as long as a folder named after a uuid and
  the Dutch upload label. There is no DAV server behind the harness, so the
  list itself shows its error state; the bar is what is measured.
-->
<template>
	<div class="files-bar" data-testid="files-bar">
		<CnFilesBrowser
			rootPath="/Open Registers/Zaken/95096834-daa7-4aee-8770-08ee81617204"
			uploadButton
			uploadButtonLabel="Bestanden toevoegen" />
	</div>
</template>

<script>
import CnFilesBrowser from '../../src/components/CnFilesBrowser/CnFilesBrowser.vue'

export default {
	name: 'FilesBarHarness',
	components: { CnFilesBrowser },
}
</script>

<style scoped>
.files-bar {
	width: 520px;
	padding: 16px;
}
</style>

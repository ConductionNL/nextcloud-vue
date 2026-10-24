<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<div
		class="cn-files-browser"
		:class="{ 'cn-files-browser--dragging': dragging, 'cn-files-browser--drop-panel': dropOverlay && dropDetail !== '' }"
		data-testid="cn-files-browser"
		@dragenter.prevent="onDragEnter"
		@dragover.prevent="onDragOver"
		@dragleave.prevent="onDragLeave"
		@drop.prevent="onDrop">
		<!-- The drop state, drawn on the browser itself when the host names it
		     (`dropOverlay`): a dashed frame and one centred line over the list,
		     so it is plain where the files go. The overlay is decoration for
		     sighted users; the live region below says the same thing to a
		     screen reader, and the upload button stays the way in for anyone
		     who cannot drag. -->
		<div v-if="dropOverlay && dragging"
			class="cn-files-browser__drop-overlay"
			aria-hidden="true"
			data-testid="cn-files-browser-drop-overlay">
			<span class="cn-files-browser__drop-icon"><Upload :size="28" /></span>
			<strong class="cn-files-browser__drop-label">{{ cnTranslate(dropLabel) }}</strong>
			<span v-if="dropDetailText"
				class="cn-files-browser__drop-detail"
				data-testid="cn-files-browser-drop-detail">{{ dropDetailText }}</span>
		</div>
		<p v-if="dropOverlay"
			class="hidden-visually"
			aria-live="polite"
			data-testid="cn-files-browser-drop-status">
			{{ dropStatus }}
		</p>
		<!-- The bar: where you are, and what you can add. The crumbs are the
		     Files app's own breadcrumb component; the New menu lists what the
		     Files app and its plugins registered for this folder (a new folder,
		     a template, a file request) beside a plain upload. -->
		<div class="cn-files-browser__bar">
			<NcBreadcrumbs class="cn-files-browser__crumbs">
				<!-- The whole trail from the user's files root, as the Files app
				     draws it. A crumb above the browser's root links into the Files
				     app (the browser never leaves its root); the root and everything
				     beneath it navigate in place. NcBreadcrumbs draws its first
				     crumb as a home icon and keeps the name for screen readers;
				     forceIconText puts the name beside the icon. -->
				<NcBreadcrumb
					v-for="(crumb, index) in crumbs"
					:key="crumb.path"
					:name="crumb.name"
					:forceIconText="index === 0"
					:disableDrop="true"
					:href="crumb.aboveRoot ? filesAppUrl(crumb.path) : undefined"
					:target="crumb.aboveRoot ? '_blank' : undefined"
					:data-above-root="crumb.aboveRoot ? 'true' : undefined"
					data-testid="cn-files-browser-crumb"
					@click="crumb.aboveRoot ? undefined : navigate(crumb.path)" />
			</NcBreadcrumbs>
			<!-- The Columns chooser hides declared columns for this user. It
			     cannot add one: it is built by walking the host's declaration,
			     so a column the host removed is not listed and cannot be
			     ticked back on however the stored preference reads. -->
			<NcActions v-if="columnsChooserEnabled"
				:menuName="columnsLabel"
				:forceMenu="true"
				data-testid="cn-files-browser-columns">
				<NcActionCheckbox
					v-for="column in declaredColumns"
					:key="column.key"
					:modelValue="isColumnVisible(column)"
					:data-testid="`cn-files-browser-column-${column.key}`"
					@update:modelValue="toggleColumn(column)">
					{{ columnLabel(column) }}
				</NcActionCheckbox>
			</NcActions>
			<NcActions v-if="canChange && newMenu"
				:menuName="newLabel"
				:forceMenu="true"
				:forceName="true"
				:variant="uploadButton ? 'secondary' : 'primary'"
				:disabled="folder === null"
				data-testid="cn-files-browser-new">
				<template #icon>
					<Plus :size="20" />
				</template>
				<NcActionButton :closeAfterClick="true" data-testid="cn-files-browser-upload" @click="pickFiles">
					<template #icon>
						<Upload :size="20" />
					</template>
					{{ uploadLabel }}
				</NcActionButton>
				<NcActionButton
					v-for="entry in newMenuEntries"
					:key="entry.id"
					:closeAfterClick="true"
					:data-testid="`cn-files-browser-new-${entry.id}`"
					@click="runNewEntry(entry)">
					<template #icon>
						<NcIconSvgWrapper v-if="entry.iconSvgInline" :svg="entry.iconSvgInline" />
						<span v-else-if="entry.iconClass" :class="entry.iconClass" />
						<Plus v-else :size="20" />
					</template>
					{{ entry.displayName }}
				</NcActionButton>
				<!-- The host's own entries, after the Files app's. -->
				<NcActionButton
					v-for="action in newActions"
					:key="`host-${action.id}`"
					:closeAfterClick="true"
					:data-testid="`cn-files-browser-new-host-${action.id}`"
					@click="runHostAction(action, null)">
					<template #icon>
						<CnIcon :name="action.icon || 'Plus'" :size="20" />
					</template>
					{{ hostLabel(action) }}
				</NcActionButton>
			</NcActions>
			<!-- The host's own buttons in the bar ("Vraag een bestand aan een
			     partij", DqZaakDocumenten), dispatched like a New-menu entry with
			     the current folder; `#header-actions` adds anything else. -->
			<NcButton v-for="action in headerActions"
				:key="`header-${action.id}`"
				:variant="action.variant === 'primary' ? 'primary' : 'secondary'"
				:disabled="folder === null"
				:data-testid="`cn-files-browser-header-action-${action.id}`"
				@click="runHostAction(action, null)">
				<template v-if="action.icon" #icon>
					<CnIcon :name="action.icon" :size="20" />
				</template>
				{{ hostLabel(action) }}
			</NcButton>
			<!-- New folder as its own button, when the host names it
			     (`folderButton`): a bar without the New menu still creates
			     folders. -->
			<NcButton v-if="folderButton && canChange"
				variant="secondary"
				:disabled="folder === null"
				data-testid="cn-files-browser-new-folder-button"
				@click="askNewFolder">
				<template #icon>
					<FolderPlusOutline :size="20" />
				</template>
				{{ newFolderLabel }}
			</NcButton>
			<!-- @slot header-actions Buttons in the bar, before the upload button. -->
			<slot name="header-actions" />
			<!-- A plain upload as its own button, when the host names it
			     (`uploadButton`). It takes the primary place and the New
			     menu steps back beside it. -->
			<NcButton v-if="uploadButton && canChange"
				variant="primary"
				:disabled="folder === null"
				data-testid="cn-files-browser-upload-button"
				@click="pickFiles">
				<template #icon>
					<Upload :size="20" />
				</template>
				{{ uploadButtonLabel }}
			</NcButton>
		</div>

		<!-- `:ref` (dynamic), not `ref`: a static ref on a vnode with only static
		     bindings is hoisted, and a hoisted vnode has no owner instance to
		     hold the ref, which throws in a production build. -->
		<input
			:ref="fileInputRef"
			type="file"
			multiple
			class="cn-files-browser__file-input"
			:aria-label="uploadLabel"
			@change="onFilesPicked">

		<ul v-if="uploads.length > 0" class="cn-files-browser__uploads" data-testid="cn-files-browser-uploads">
			<li v-for="upload in uploads" :key="upload.key" class="cn-files-browser__upload">
				<span class="cn-files-browser__upload-name">{{ upload.name }}</span>
				<NcProgressBar :value="upload.progress" :error="upload.error !== ''" />
				<span v-if="upload.error" class="cn-files-browser__upload-error" role="alert">{{ upload.error }}</span>
			</li>
		</ul>

		<!-- The review summary (`reviewSummary`): how many files are reviewed,
		     a bar in the review tones and a legend with the count per value. -->
		<div v-if="review && review.total > 0 && !loading && error === ''"
			class="cn-files-browser__review"
			data-testid="cn-files-browser-review">
			<div class="cn-files-browser__review-head">
				<strong class="cn-files-browser__review-title">{{ reviewTitle }}</strong>
				<span v-if="reviewSubtitle" class="cn-files-browser__review-sub">{{ reviewSubtitle }}</span>
			</div>
			<span class="cn-files-browser__review-bar" role="img" :aria-label="reviewTitle">
				<span v-for="segment in review.segments"
					v-show="segment.count > 0 && !isOpenValue(segment.value)"
					:key="segment.value"
					:class="`cn-files-browser__review-part cn-files-browser__review-part--${segment.tone}`"
					:style="{ width: `${segment.share}%` }" />
			</span>
			<ul class="cn-files-browser__review-legend">
				<li v-for="segment in review.segments" :key="segment.value" data-testid="cn-files-browser-review-entry">
					<span :class="`cn-files-browser__review-dot cn-files-browser__review-part--${segment.tone}`" aria-hidden="true" />
					{{ hostLabel(segment) }}
					<strong>{{ segment.count }}</strong>
				</li>
			</ul>
		</div>

		<!-- The host's filter: per declared column, a chip per value in use
		     with how many files carry it. Chips narrow the list. -->
		<div v-if="facetGroups.length > 0 && !loading && error === ''"
			class="cn-files-browser__facets"
			data-testid="cn-files-browser-facets">
			<div v-for="facet in facetGroups"
				:key="facet.key"
				class="cn-files-browser__facet"
				role="group"
				:aria-label="t('nextcloud-vue', 'Filter by {column}', { column: facet.label })">
				<button v-for="option in facet.values"
					:key="option.value"
					type="button"
					class="cn-files-browser__facet-chip"
					:class="{ 'cn-files-browser__facet-chip--active': option.active }"
					:aria-pressed="option.active ? 'true' : 'false'"
					data-testid="cn-files-browser-facet-chip"
					@click="toggleFacet(facet.key, option.value)">
					{{ option.value }}
					<strong class="cn-files-browser__facet-count">{{ option.count }}</strong>
				</button>
			</div>
			<NcButton v-if="facetActive"
				variant="tertiary"
				data-testid="cn-files-browser-facets-clear"
				@click="clearFacets">
				{{ t('nextcloud-vue', 'Clear filters') }}
			</NcButton>
		</div>

		<!-- The host's bulk actions, once something is selected. -->
		<div v-if="bulkEnabled && selectedIds.length > 0"
			class="cn-files-browser__bulk-bar"
			role="toolbar"
			:aria-label="t('nextcloud-vue', 'Actions for the selected files')"
			data-testid="cn-files-browser-bulk-bar">
			<span class="cn-files-browser__bulk-count" aria-live="polite" data-testid="cn-files-browser-bulk-count">
				{{ selectionCountText }}
			</span>
			<NcButton v-for="action in bulkActions"
				:key="action.id"
				:data-testid="`cn-files-browser-bulk-action-${action.id}`"
				@click="runBulkAction(action)">
				<template #icon>
					<CnIcon :name="action.icon || 'CheckboxMultipleMarkedOutline'" :size="20" />
				</template>
				{{ hostLabel(action) }}
			</NcButton>
			<NcButton v-if="showClearSelection"
				variant="tertiary"
				data-testid="cn-files-browser-bulk-clear"
				@click="clearSelection">
				{{ t('nextcloud-vue', 'Clear selection') }}
			</NcButton>
		</div>

		<NcLoadingIcon v-if="loading" :size="32" class="cn-files-browser__loading" />

		<CnEmptyContent v-else-if="error !== ''"
			error
			:name="error"
			class="cn-files-browser__state">
			<template #icon>
				<AlertCircleOutline :size="44" />
			</template>
			<template #action>
				<NcButton @click="refresh">
					{{ retryLabel }}
				</NcButton>
			</template>
		</CnEmptyContent>

		<CnEmptyContent
			v-else-if="sorted.length === 0 && linkedItems.length === 0"
			:name="emptyLabel"
			:description="canChange ? emptyHint : ''"
			class="cn-files-browser__state">
			<template #icon>
				<FolderOutline :size="44" />
			</template>
		</CnEmptyContent>

		<!-- The table. Its rows are @nextcloud/files nodes read over DAV, and
		     each row's menu is the list of actions the Files app registered on
		     this page, offered under the same names and icons the Files app
		     uses. What cannot run away from the Files page (the details
		     sidebar) is left out, and Show in Files covers it. -->
		<div v-else
			class="cn-files-browser__body"
			:class="{ 'cn-files-browser__body--with-side': sideNode !== null && !sideInPage }">
			<table class="cn-files-browser__table" data-testid="cn-files-browser-table">
				<thead>
					<tr>
						<th v-if="bulkEnabled" class="cn-files-browser__col-select" scope="col">
							<input type="checkbox"
								class="cn-files-browser__select"
								:checked="allSelected"
								:indeterminate.prop="someSelected && !allSelected"
								:disabled="selectableIds.length === 0"
								:aria-label="t('nextcloud-vue', 'Select all files')"
								data-testid="cn-files-browser-select-all"
								@change="toggleAll($event.target.checked)">
						</th>
						<th class="cn-files-browser__col-icon" scope="col">
							<span class="hidden-visually">{{ t('nextcloud-vue', 'Type') }}</span>
						</th>
						<th v-for="column in renderedColumns"
							:key="column.key"
							scope="col"
							:class="`cn-files-browser__col-${column.key}`"
							:aria-sort="ariaSort(sortTokenOf(column))"
							:data-testid="`cn-files-browser-header-${column.key}`">
							<button v-if="column.sortable !== false"
								type="button"
								class="cn-files-browser__sort"
								@click="sortBy(sortTokenOf(column))">
								{{ columnLabel(column) }}
								<component :is="sortIcon(sortTokenOf(column))" v-if="sortKey === sortTokenOf(column)" :size="16" />
							</button>
							<template v-else>
								{{ columnLabel(column) }}
							</template>
						</th>
						<th class="cn-files-browser__col-actions" scope="col">
							<span class="hidden-visually">{{ t('nextcloud-vue', 'Actions') }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<!-- A heading row per group when the host groups on a column; the
				     destructured entry is either a group or a node. -->
					<template v-for="{ key, group, node } in displayRows" :key="key">
						<tr v-if="group"
							class="cn-files-browser__group"
							data-testid="cn-files-browser-group">
							<th :colspan="columnCount" scope="rowgroup" class="cn-files-browser__group-heading">
								{{ group.label }}
								<span class="cn-files-browser__group-count">{{ group.count }}</span>
							</th>
						</tr>
						<tr
							v-else
							:key="key"
							class="cn-files-browser__row"
							:class="{ 'cn-files-browser__row--folder': isFolder(node) }"
							data-testid="cn-files-browser-row"
							:data-name="node.basename"
							@click="onRowClick(node, $event)"
							@mousedown="preventMiddleClickAutoscroll"
							@auxclick="onRowAuxClick(node, $event)">
							<td v-if="bulkEnabled"
								class="cn-files-browser__col-select"
								@click.stop
								@auxclick.stop>
								<input v-if="!isFolder(node)"
									type="checkbox"
									class="cn-files-browser__select"
									:checked="isSelected(node)"
									:aria-label="t('nextcloud-vue', 'Select {name}', { name: node.basename })"
									data-testid="cn-files-browser-select"
									@change="toggleSelected(node, $event.target.checked)">
							</td>
							<td class="cn-files-browser__col-icon">
								<img
									v-if="previewUrlFor(node)"
									class="cn-files-browser__thumb"
									:src="previewUrlFor(node)"
									alt=""
									loading="lazy"
									@error="onPreviewError(node)">
								<img
									v-else-if="mimeIconFor(node)"
									class="cn-files-browser__mime"
									:src="mimeIconFor(node)"
									alt="">
								<FolderOutline v-else-if="isFolder(node)" :size="32" />
								<FileOutline v-else :size="32" />
							</td>
							<td v-for="column in renderedColumns"
								:key="column.key"
								:class="`cn-files-browser__col-${column.key}`"
								:data-testid="`cn-files-browser-cell-${column.key}`">
								<span v-if="column.key === 'name'" class="cn-files-browser__name">{{ node.basename }}</span>
								<span v-if="column.key === 'name' && nameSecondaryOf(node)"
									class="cn-files-browser__name-secondary"
									data-testid="cn-files-browser-name-secondary">{{ nameSecondaryOf(node) }}</span>
								<template v-else-if="column.key === 'size'">
									{{ isFolder(node) ? '' : formatSize(node.size) }}
								</template>
								<NcDateTime v-else-if="column.key === 'modified'" :timestamp="node.mtime" :ignoreSeconds="true" />
								<!-- Everything the host declared renders through the same
							     cell renderer the tables use, so a `formatter` means
							     here what it means there. -->
								<CnCellRenderer v-else
									:class="column.widget !== 'badge' && toneOf(column, node) ? `cn-files-browser__tone cn-files-browser__tone--${toneOf(column, node)}` : null"
									:value="cellValue(column, node)"
									:formatter="column.formatter || null"
									:formatterOptions="column.formatterOptions || null"
									:widget="column.widget || null"
									:widgetProps="cellWidgetProps(column, node)"
									:row="node" />
							</td>
							<td class="cn-files-browser__col-actions" @click.stop @auxclick.stop>
								<!-- The host's one visible button on a file ("Beoordelen"),
								     primary while the row still asks for it. -->
								<NcButton v-if="rowButton && !isFolder(node) && hostActionApplies(rowButton, node)"
									:variant="rowButtonPrimary(node) ? 'primary' : 'secondary'"
									class="cn-files-browser__row-button"
									:aria-label="t('nextcloud-vue', '{action}: {name}', { action: hostLabel(rowButton), name: node.basename })"
									data-testid="cn-files-browser-row-button"
									@click="runHostAction(rowButton, node)">
									{{ hostLabel(rowButton) }}
								</NcButton>
								<NcActions class="cn-files-browser__row-menu" :forceMenu="true" :ariaLabel="t('nextcloud-vue', 'Actions for {name}', { name: node.basename })">
									<NcActionButton
										v-for="action in actionsFor(node)"
										:key="action.id"
										:closeAfterClick="true"
										:data-testid="`cn-files-browser-action-${action.id}`"
										@click="run(action, node)">
										<template #icon>
											<NcIconSvgWrapper :svg="iconOf(action, node)" />
										</template>
										{{ labelOf(action, node) }}
									</NcActionButton>
									<!-- The host's own actions on a file (never on a folder): declared
								     in its manifest, dispatched through the page's action runner
								     with the node's file id, name and path merged in. -->
									<template v-if="!isFolder(node)">
										<NcActionButton
											v-for="action in hostActionsFor(node)"
											:key="`host-${action.id}`"
											:closeAfterClick="true"
											:data-testid="`cn-files-browser-host-action-${action.id}`"
											@click="runHostAction(action, node)">
											<template #icon>
												<CnIcon :name="action.icon || 'FileDocumentEditOutline'" :size="20" />
											</template>
											{{ hostLabel(action) }}
										</NcActionButton>
									</template>
									<NcActionSeparator v-if="actionsFor(node).length > 0 || (!isFolder(node) && hostActionsFor(node).length > 0)" />
									<!-- The Files app's own rename is its list's inline input,
								     which is not here; this one is a dialog over a DAV move. -->
									<!-- With a `source`, the Files app's actions (which act over
								     WebDAV) are not offered; download and delete go through
								     the source instead. -->
									<NcActionLink
										v-if="source && sourceDownloadUrl(node)"
										:href="sourceDownloadUrl(node)"
										:download="node.basename"
										:closeAfterClick="true"
										data-testid="cn-files-browser-action-download">
										<template #icon>
											<Download :size="20" />
										</template>
										{{ downloadLabel }}
									</NcActionLink>
									<NcActionButton v-if="source && canChange"
										:closeAfterClick="true"
										data-testid="cn-files-browser-action-delete"
										@click="askRemove(node)">
										<template #icon>
											<TrashCanOutline :size="20" />
										</template>
										{{ deleteLabel }}
									</NcActionButton>
									<NcActionButton v-if="canChange"
										:closeAfterClick="true"
										data-testid="cn-files-browser-action-rename"
										@click="askRename(node)">
										<template #icon>
											<Pencil :size="20" />
										</template>
										{{ renameLabel }}
									</NcActionButton>
									<NcActionLink
										v-if="node.fileid && !source"
										:href="permalink(node)"
										target="_blank"
										:closeAfterClick="true">
										<template #icon>
											<OpenInNew :size="20" />
										</template>
										{{ showInFilesLabel }}
									</NcActionLink>
								</NcActions>
							</td>
						</tr>
					</template>
					<tr v-if="facetActive && filteredFiles.length === 0" class="cn-files-browser__no-match-row">
						<td :colspan="columnCount" class="cn-files-browser__no-match" data-testid="cn-files-browser-no-match">
							{{ t('nextcloud-vue', 'No files match the filter.') }}
						</td>
					</tr>
					<!-- Rows that are not nodes of this folder: documents the host
				     joined from elsewhere (another object's folder). Open and
				     download only; nothing here can change the file. -->
					<tr
						v-for="item in linkedItems"
						:key="`linked-${item.id}`"
						class="cn-files-browser__row cn-files-browser__row--linked"
						data-testid="cn-files-browser-linked-row"
						:data-name="item.name"
						@click="openLinked(item)"
						@mousedown="preventMiddleClickAutoscroll"
						@auxclick="onLinkedAuxClick(item, $event)">
						<td v-if="bulkEnabled" class="cn-files-browser__col-select" />
						<td class="cn-files-browser__col-icon">
							<img
								v-if="mimeIconFor({ mime: item.mime })"
								class="cn-files-browser__mime"
								:src="mimeIconFor({ mime: item.mime })"
								alt="">
							<FileOutline v-else :size="32" />
						</td>
						<!-- A linked item is not a node of this folder, so it can only
					     answer for name, size and modified. It still walks the same
					     column list, or a declared column set would shift every
					     linked row one cell out of line with its header. -->
						<td v-for="column in renderedColumns"
							:key="column.key"
							:class="`cn-files-browser__col-${column.key}`">
							<template v-if="column.key === 'name'">
								<span class="cn-files-browser__name">{{ item.name }}</span>
								<span v-if="item.note" class="cn-files-browser__note">
									<a
										v-if="item.noteHref"
										:href="item.noteHref"
										class="cn-files-browser__note-link"
										@click.stop>{{ item.note }}</a>
									<template v-else>{{ item.note }}</template>
								</span>
							</template>
							<template v-else-if="column.key === 'size'">
								{{ item.size ? formatSize(item.size) : '' }}
							</template>
							<NcDateTime v-else-if="column.key === 'modified' && item.mtime" :timestamp="item.mtime" :ignoreSeconds="true" />
						</td>
						<td class="cn-files-browser__col-actions" @click.stop @auxclick.stop>
							<NcActions class="cn-files-browser__row-menu" :forceMenu="true" :ariaLabel="t('nextcloud-vue', 'Actions for {name}', { name: item.name })">
								<NcActionLink
									v-if="item.href"
									:href="item.href"
									target="_blank"
									:closeAfterClick="true"
									data-testid="cn-files-browser-linked-open">
									<template #icon>
										<OpenInNew :size="20" />
									</template>
									{{ openLinkedLabel }}
								</NcActionLink>
								<NcActionLink
									v-if="item.downloadHref"
									:href="item.downloadHref"
									:download="item.name"
									:closeAfterClick="true"
									data-testid="cn-files-browser-linked-download">
									<template #icon>
										<Download :size="20" />
									</template>
									{{ downloadLabel }}
								</NcActionLink>
							</NcActions>
						</td>
					</tr>
				</tbody>
			</table>

			<!-- `sideCards`: cards about the last selected file, beside the list,
			     or in the detail page's side column (`sideCardsPlacement`). -->
			<Teleport v-if="sideNode !== null"
				:to="pageSideTarget"
				:disabled="!sideInPage"
				defer>
				<aside
					class="cn-files-browser__side"
					:class="{ 'cn-files-browser__side--in-page': sideInPage }"
					:aria-label="t('nextcloud-vue', 'About {name}', { name: sideNode.basename })"
					data-testid="cn-files-browser-side">
					<section v-for="card in sideCardsFor(sideNode)"
						:key="card.id"
						class="cn-files-browser__side-card"
						:data-testid="`cn-files-browser-side-card-${card.id}`">
						<h3 class="cn-files-browser__side-title">
							{{ card.title }}
						</h3>
						<dl v-if="card.fields.length > 0" class="cn-files-browser__side-facts">
							<template v-for="field in card.fields" :key="field.key">
								<dt>{{ field.label }}</dt>
								<dd :class="field.tone ? `cn-files-browser__tone cn-files-browser__tone--${field.tone}` : ''">
									<CnCellRenderer
										:value="field.value"
										:formatter="field.formatter || null"
										:formatterOptions="field.formatterOptions || null"
										:row="sideNode" />
								</dd>
							</template>
						</dl>
						<div v-if="card.actions.length > 0" class="cn-files-browser__side-actions">
							<NcButton v-for="action in card.actions"
								:key="action.id"
								:data-testid="`cn-files-browser-side-action-${action.id}`"
								@click="runHostAction(action, sideNode)">
								<template v-if="action.icon" #icon>
									<CnIcon :name="action.icon" :size="20" />
								</template>
								{{ hostLabel(action) }}
							</NcButton>
						</div>
					</section>
				</aside>
			</Teleport>
		</div>

		<p v-if="dropHint && canChange && !loading && error === ''"
			class="cn-files-browser__drop-hint"
			data-testid="cn-files-browser-drop-hint">
			<Upload :size="16" />
			{{ dropHintLabel }}
		</p>
		<!-- The host's own line under the list ("Elk bestand wordt bij het
		     uploaden op virussen gescand", DqDocumentenBeheer), apart from
		     the drop hint. -->
		<p v-if="footnote && !loading && error === ''"
			class="cn-files-browser__footnote"
			data-testid="cn-files-browser-footnote">
			{{ cnTranslate(footnote) }}
		</p>

		<NcDialog
			v-if="renaming !== null"
			:name="renameLabel"
			size="small"
			data-testid="cn-files-browser-rename"
			@closing="renaming = null">
			<form class="cn-files-browser__new-folder" @submit.prevent="rename">
				<NcTextField
					v-model="renameName"
					:label="t('nextcloud-vue', 'New name')"
					:error="renameError !== ''"
					:helperText="renameError"
					data-testid="cn-files-browser-rename-name" />
			</form>
			<template #actions>
				<NcButton @click="renaming = null">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="renameName.trim() === '' || renameName.trim() === renaming.basename"
					data-testid="cn-files-browser-rename-confirm"
					@click="rename">
					{{ renameLabel }}
				</NcButton>
			</template>
		</NcDialog>

		<NcDialog
			v-if="removing !== null"
			:name="deleteLabel"
			size="small"
			data-testid="cn-files-browser-delete"
			@closing="removing = null">
			<p>{{ t('nextcloud-vue', 'Delete {name}? This cannot be undone here.', { name: removing.basename }) }}</p>
			<p v-if="removeError" class="cn-files-browser__upload-error" role="alert">
				{{ removeError }}
			</p>
			<template #actions>
				<NcButton @click="removing = null">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton variant="error" data-testid="cn-files-browser-delete-confirm" @click="remove">
					{{ deleteLabel }}
				</NcButton>
			</template>
		</NcDialog>

		<NcDialog
			v-if="newFolderOpen"
			:name="newFolderLabel"
			size="small"
			data-testid="cn-files-browser-new-folder"
			@closing="newFolderOpen = false">
			<form class="cn-files-browser__new-folder" @submit.prevent="createFolder">
				<NcTextField
					v-model="newFolderName"
					:label="t('nextcloud-vue', 'Folder name')"
					:error="newFolderError !== ''"
					:helperText="newFolderError"
					data-testid="cn-files-browser-new-folder-name" />
			</form>
			<template #actions>
				<NcButton @click="newFolderOpen = false">
					{{ t('nextcloud-vue', 'Cancel') }}
				</NcButton>
				<NcButton variant="primary"
					:disabled="newFolderName.trim() === ''"
					data-testid="cn-files-browser-new-folder-create"
					@click="createFolder">
					{{ t('nextcloud-vue', 'Create') }}
				</NcButton>
			</template>
		</NcDialog>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
/**
 * CnFilesBrowser — a folder of Nextcloud files, on any page, built from the
 * Files app's own primitives rather than a copy of its screen.
 *
 * WHAT IS BORROWED, AND FROM WHERE.
 *
 * - The rows are `@nextcloud/files` nodes read over WebDAV with the same
 *   PROPFIND the Files app sends, so a node here carries what a node there
 *   carries: id, mime, size, mtime, permissions, attributes.
 * - Each row's menu is `getFileActions()`: the actions the Files app and its
 *   plugins registered on this page (download, delete, rename, favourite, move
 *   and copy, sharing status, tags, lock, open in Files…). They are run with
 *   the same context the Files app hands them, so a plugin's action does what
 *   it does in the Files app. The host page has to load those scripts: it
 *   dispatches `LoadAdditionalScriptsEvent` and asks for the Files app's `init`
 *   script server-side. On a page that did not, the menu holds only Show in
 *   Files, which is the honest fallback.
 * - The New menu is `getNewFileMenuEntries(folder)`: new folder, a template,
 *   a file request, whatever the plugins offer for this folder, beside a plain
 *   upload that PUTs over DAV.
 * - The crumbs are NcBreadcrumbs, the icons are the theme's own mime icons
 *   through `OC.MimeType`, and image previews come from the core preview
 *   endpoint.
 *
 * WHAT IS NOT. The Files app's list itself (its column filters, selection bar
 * and inline rename) is a Vue app bound to the Files router and its own stores,
 * and so is its details sidebar on Nextcloud 34. Neither can be mounted here.
 * The actions that need them are left out of the menu by name
 * (`ACTIONS_NEEDING_THE_FILES_PAGE`), and Show in Files opens the Files app on
 * the file for the rest.
 *
 * THE REGISTRY IS VERSIONED. `@nextcloud/files` keeps its registries under
 * `window._nc_files_scope.v4_0`; a page's plugins register into the copy the
 * server ships, and this component reads through its own bundled copy. Both
 * have to be the same major, which is why this library depends on 4.x: a 3.x
 * copy read `window._nc_fileactions`, which the server's plugins never write,
 * and saw nothing while the page held thirty actions.
 */
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { FileType, formatFileSize, getFileActions, getNewFileMenuEntries, sortNodes, View } from '@nextcloud/files'
import { getClient, getDefaultPropfind, getRemoteURL, getRootPath, resultToNode } from '@nextcloud/files/dav'
import { translatePlural as n, translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcActionButton, NcActionCheckbox, NcActionLink, NcActions, NcActionSeparator, NcBreadcrumb, NcBreadcrumbs, NcButton, NcDateTime, NcDialog, NcIconSvgWrapper, NcLoadingIcon, NcProgressBar, NcTextField } from '@nextcloud/vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import ChevronDown from 'vue-material-design-icons/ChevronDown.vue'
import ChevronUp from 'vue-material-design-icons/ChevronUp.vue'
import Download from 'vue-material-design-icons/Download.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'
import FolderPlusOutline from 'vue-material-design-icons/FolderPlusOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import CnCellRenderer from '../CnCellRenderer/CnCellRenderer.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import CnIcon from '../CnIcon/CnIcon.vue'
import { readUserPreference, writeUserPreference } from '../../composables/useUserPreferences.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { fillTemplate } from '../../utils/fillTemplate.js'
import { readPath } from '../../utils/readPath.js'
import { isNewTabClick, isRowMiddleClick, preventMiddleClickAutoscroll } from '../../utils/rowAuxClick.js'
import { ACTIONS_NEEDING_THE_FILES_PAGE, crumbsFor, hostActionApplies, joinPath } from './filesBrowser.js'
import {
	attributePropertiesFor,
	facetCounts,
	fileColumnValue,
	groupNodes,
	nodeMatchesFacets,
	normaliseFileColumns,
	sortNodesByColumn,
	visibleFileColumns,
} from './filesBrowserColumns.js'
import { reviewSummary } from './filesReview.js'

let uploadSeq = 0

/** A folder glyph, the icon the Files app's View constructor requires. */
const VIEW_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>'

// Event-bus channels that mean the open folder may have changed: the page's
// Refresh signal, and the node events the Files app's actions and uploader emit.
const FOLDER_CHANGED_CHANNELS = ['cn:page:refresh', 'files:node:created', 'files:node:deleted', 'files:node:updated', 'files:node:moved']

const FOLDER_CHANGED_DEBOUNCE_MS = 300

export default {
	name: 'CnFilesBrowser',

	components: {
		AlertCircleOutline,
		CnCellRenderer,
		CnIcon,
		Download,
		FileOutline,
		FolderOutline,
		FolderPlusOutline,
		NcActionButton,
		NcActionCheckbox,
		NcActionLink,
		NcActionSeparator,
		NcActions,
		NcBreadcrumb,
		NcBreadcrumbs,
		NcButton,
		NcDateTime,
		NcDialog,
		CnEmptyContent,
		NcIconSvgWrapper,
		NcLoadingIcon,
		NcProgressBar,
		NcTextField,
		OpenInNew,
		Pencil,
		Plus,
		TrashCanOutline,
		Upload,
	},

	inject: {
		// The page's pre-bound action runner (CnPageRenderer provides it);
		// absent outside a page tree, in which case the bare dispatcher runs.
		cnDispatchAction: { default: null },
		// The host app's translate function (CnAppRoot provides it). A row
		// action or column the manifest declares is authored in English as
		// the catalogue key, and read through this in the user's language.
		cnTranslate: { default: () => (key) => key },
		// The detail page's side column (CnDetailPage), for side cards placed there.
		cnDetailSideColumn: { default: null },
	},

	props: {
		/**
		 * Where the folder is read from and written to. Null (the default)
		 * is WebDAV under the signed-in person's files root, with the Files
		 * app's own actions and New menu. An object from
		 * `createOpenRegisterSource()` reads one OpenRegister object's folder
		 * through OpenRegister's files API instead, under the object's access
		 * rule: `rootPath` is then `/`, the Files app's actions and New menu
		 * are not offered (they act over WebDAV), and upload, new folder,
		 * rename and delete appear only when the listing says the person may
		 * change the folder.
		 *
		 * @type {object|null}
		 */
		source: {
			type: Object,
			default: null,
		},

		/** Label of the delete action and its dialog, with a `source`. */
		deleteLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Delete'),
		},

		/**
		 * The host's own actions on each file row, declared the way a
		 * manifest declares any action (`open-modal`, `handler`, ...), and
		 * dispatched through the page's action runner with the node's
		 * `fileId`, `fileName` and `path` merged into an `open-modal` action's
		 * props (or appended as the node to a `handler` action's args). Folders
		 * get none. `icon` is an MDI icon name. `visibleIf` offers the action
		 * only on some files: `extension` (a list, no case) and `mime` (a list;
		 * `image/` or `image/*` names the family), each that is named must hold.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, type?: string, target?: string, props?: object, handler?: string, args?: Array, visibleIf?: {extension?: string[], mime?: string[]}}>}
		 */
		rowActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * The host's own entries in the New menu, after the ones the Files
		 * app and its plugins register. Each is dispatched like a row action
		 * (`type: 'open-modal' | 'handler' | …`) through the page's
		 * `cnDispatchAction`, carrying the current folder rather than a row,
		 * so a host can offer "new from template" or "request a file from a
		 * party" here.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, type?: string, target?: string, props?: object, handler?: string, args?: Array}>}
		 */
		newActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * The host's own buttons in the bar, before the upload button ("Vraag
		 * een bestand aan een partij", DqZaakDocumenten). Each is dispatched
		 * like a New-menu entry, with the current folder; `variant:
		 * 'primary'` draws it as the primary button.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, variant?: string, type?: string, target?: string, props?: object, handler?: string, args?: Array}>}
		 */
		headerActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * One visible button on every file row ("Beoordelen"), dispatched like a
		 * row action. `primaryWhen: { key, values }` draws it as the primary
		 * button while the row-data field `key` holds one of `values` (a file
		 * still to review), and secondary otherwise. `visibleIf` works as on a
		 * row action.
		 *
		 * @type {{id: string, label: string, type?: string, target?: string, props?: object, handler?: string, args?: Array, primaryWhen?: {key: string, values: Array<string>}, visibleIf?: object}|null}
		 */
		rowButton: {
			type: Object,
			default: null,
		},

		/**
		 * A review summary above the list (DqZaakDocumenten "4 van 7
		 * beoordeeld"): `{ key, open, values: [{ value, label?, tone? }], title?,
		 * subtitle? }`. `key` is the row-data field with the review state, `open`
		 * the value (or values) of a file still to review; a file without a
		 * listed value counts as open. `tone` is `success`, `warning`, `error`,
		 * `info` or `default`. `title` and `subtitle` take `{done}`, `{total}` and
		 * `{open}`, through the host's translate; they default to the library's
		 * "{done} of {total} reviewed" and "{open} still to review".
		 *
		 * @type {{key: string, open?: string|Array<string>, values: Array<{value: string, label?: string, tone?: string}>, title?: string, subtitle?: string}|null}
		 */
		reviewSummary: {
			type: Object,
			default: null,
		},

		/**
		 * Rows that are not nodes of this folder: files the host joined from
		 * another object's folder. Rendered after the folder's own rows with
		 * open and download only. `note` (and its optional `noteHref`) says
		 * where the file lives.
		 *
		 * @type {Array<{id: string|number, name: string, mime?: string, size?: number, mtime?: Date|number, href?: string, downloadHref?: string, note?: string, noteHref?: string}>}
		 */
		linkedItems: {
			type: Array,
			default: () => [],
		},

		/**
		 * Label of a linked row's open action.
		 */
		openLinkedLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Open'),
		},

		/**
		 * Label of a linked row's download action.
		 */
		downloadLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Download'),
		},

		/**
		 * The folder this browser is rooted at, relative to the current user's
		 * files root (`/Open Registers/Cases/<uuid>`). The browser never
		 * navigates above it. Resolve it with `resolveObjectFolder()` for an
		 * OpenRegister object.
		 */
		rootPath: {
			type: String,
			required: true,
		},

		/**
		 * What the root crumb reads. Null shows the folder's own name, which
		 * is what the Files app shows; pass a label when the folder on disk is
		 * a uuid and the host knows a better name.
		 */
		rootLabel: {
			type: String,
			default: null,
		},

		/** Label of the New menu. */
		newLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'New'),
		},

		/** Label of the upload entry in the New menu. */
		uploadLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Upload files'),
		},

		/** Label of the new-folder entry and its dialog. */
		newFolderLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'New folder'),
		},

		/** Label of the rename action and its dialog. */
		renameLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Rename'),
		},

		/** Label of the link that opens the file in the Files app. */
		showInFilesLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Show in Files'),
		},

		/**
		 * Show a primary upload button beside the New menu, which then steps
		 * back to a secondary button. Off (the default) keeps the upload
		 * inside the New menu only.
		 */
		uploadButton: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whether the bar has the New menu (upload, new folder, the Files
		 * app's entries and `newActions`). `false` leaves it out, so the bar
		 * holds the host's `headerActions` buttons and, with `uploadButton`,
		 * the upload button (DqZaakDocumenten).
		 *
		 * @spec openspec/changes/files-browser-toolbar-actions/specs/files-browser/spec.md#requirement-the-host-chooses-whether-the-bar-has-a-new-menu
		 */
		newMenu: {
			type: Boolean,
			default: true,
		},

		/**
		 * Show New folder as a button in the bar, before the host's buttons.
		 * With `newMenu: false` it keeps folder creation in reach.
		 *
		 * @spec openspec/changes/files-browser-toolbar-actions/specs/files-browser/spec.md#requirement-the-host-can-put-new-folder-in-the-bar-as-a-button
		 */
		folderButton: {
			type: Boolean,
			default: false,
		},

		/** Label of the upload button `uploadButton` shows. */
		uploadButtonLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Add files'),
		},

		/**
		 * Draw the drop state over the browser while files are dragged onto
		 * it (a dashed frame and `dropLabel`, centred) and announce it to
		 * screen readers. Off (the default) keeps the plain dashed outline and
		 * announces nothing.
		 */
		dropOverlay: {
			type: Boolean,
			default: false,
		},

		/** The line `dropOverlay` draws and announces, through the host translate. */
		dropLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Drop to add'),
		},

		/**
		 * A second line under `dropLabel` in the drop state, through the host
		 * translate: where the files go ("{count} bestanden komen bij zaak
		 * 2026-0082, als nog te beoordelen document."). `{count}` is the number
		 * of files dragged when the browser can tell, and the line is left out
		 * when it cannot. The overlay then also fills the panel.
		 *
		 * @spec openspec/changes/files-drop-panel/specs/files-browser/spec.md#requirement-the-drop-state-fills-the-panel-and-says-where-the-files-go
		 */
		dropDetail: {
			type: String,
			default: '',
		},

		/** Show a line under the list saying files can be dropped on it. */
		dropHint: {
			type: Boolean,
			default: false,
		},

		/**
		 * A line of the host's own under the list, apart from the drop hint
		 * ("Elk bestand wordt bij het uploaden op virussen gescand en krijgt een
		 * controlegetal", DqDocumentenBeheer). Translated with the host's
		 * catalogue.
		 */
		footnote: {
			type: String,
			default: '',
		},

		/**
		 * A second line under each file's name (DqDocumentenBeheer "Inwoner ·
		 * 4 okt", DqZaakDocumenten "PDF · 1,2 MB · 14 januari 2026"): a field
		 * template read from the file's row data, plus `name`, `modified` (the
		 * change date), `owner` (the owner's display name), `size` (formatted)
		 * and `type` ("PDF", "Word", "Email", else the extension), e.g.
		 * `"{type} · {size} · {modified|date}"`. A line with an empty
		 * value is left out. Translated with the host's catalogue first.
		 */
		nameSecondary: {
			type: String,
			default: '',
		},

		/**
		 * The second line as a list of fields joined with " · ", a field
		 * without a value left out: the `nameSecondary` tokens without their
		 * braces (`["type", "size", "modified|date"]`, a row-data field such as
		 * `"senderName"`). Or a list of variants `{ when, fields }`: the first
		 * whose `when` is `true`, or that has no `when`, is used (a case type
		 * flag read through `@context`). Takes precedence over `nameSecondary`.
		 *
		 * @spec openspec/changes/files-second-line-fields/specs/files-second-line-fields/spec.md#requirement-a-files-second-line-is-a-list-of-fields
		 */
		secondLine: {
			type: Array,
			default: null,
		},

		/** The line `dropHint` shows. */
		dropHintLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Or drag files onto this list.'),
		},

		/** Title of the empty state. */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'This folder is empty'),
		},

		/** Line under the empty state's title. */
		emptyHint: {
			type: String,
			default: () => t('nextcloud-vue', 'Drop files here, or use New'),
		},

		/** Label of the retry button on a failed listing. */
		retryLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Try again'),
		},

		/**
		 * The columns this browser shows, in order. An entry is a built-in name
		 * (`name`, `size`, `modified`, `owner`, `type`, `tags`) or an object
		 * declaring its own: `{ key, label, source, attribute, formatter,
		 * sortable }`, where `source` is `node` (a property of the node),
		 * `attribute` (a DAV property, added to the PROPFIND before listing) or
		 * `row` (a value from `rowData`).
		 *
		 * Declaring none keeps today's table: name, size and modified.
		 *
		 * This is the membership list. The Columns chooser lets a user hide any
		 * of these; it never adds one, and a column removed from here is gone
		 * for every user, whatever they had stored.
		 *
		 * @type {Array<string|object>}
		 */
		columns: {
			type: Array,
			default: () => [],
		},

		/**
		 * The host's own per-file data for `source: 'row'` columns, keyed by
		 * file id. Either an object, or a function of the listed nodes called
		 * once per folder so the host can fetch its projection in one request.
		 *
		 * @type {object | ((nodes: Array<object>) => (object|Promise<object>))}
		 */
		rowData: {
			type: [Object, Function],
			default: null,
		},

		/**
		 * The app id the Columns chooser stores this user's choice under. Unset
		 * means the chooser is not offered and every declared column renders.
		 *
		 * @type {string}
		 */
		preferenceApp: {
			type: String,
			default: '',
		},

		/**
		 * The key this browser's column choice is stored under, so two browsers
		 * in one app remember separately.
		 *
		 * @type {string}
		 */
		preferenceKey: {
			type: String,
			default: 'files-browser-columns',
		},

		/**
		 * The host's actions on a selection of files, declared like
		 * `rowActions`. With at least one, every file row (never a folder or a
		 * linked row) gets a checkbox, the header a select-all, and a bar with
		 * these actions shows while files are selected. An `open-modal`
		 * action's props gain `files` (each `{ fileId, fileName, path }`) and
		 * `fileIds`; a `handler` action's args gain the selected nodes. The
		 * selection clears after an action and when another folder opens.
		 *
		 * @type {Array<{id: string, label: string, icon?: string, type?: string, target?: string, props?: object, handler?: string, args?: Array}>}
		 */
		bulkActions: {
			type: Array,
			default: () => [],
		},

		/**
		 * The bulk bar's count, as a translatable template with `{count}`
		 * ("{count} documents selected"); `selectionLabelOne` is used for one.
		 * Empty reads "{count} selected".
		 *
		 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-the-bulk-bar-names-what-is-selected
		 */
		selectionLabel: {
			type: String,
			default: '',
		},

		/** The bulk bar's count for one selected file, e.g. "{count} document selected". */
		selectionLabelOne: {
			type: String,
			default: '',
		},

		/** Whether the bulk bar ends in a "Clear selection" button. */
		showClearSelection: {
			type: Boolean,
			default: true,
		},

		/**
		 * Cards beside the list about the last selected file:
		 * `[{ id, title, fields: [{ key, label, source?, formatter?, formatterOptions?, colorMap?, colorKey? }], actions? }]`.
		 * `title` may hold `{name}`, the file's name. A field reads `rowData`
		 * (`source: 'row'`, the default) or the node (`source: 'node'`); a field
		 * with no value is left out. `actions` are declared like `rowActions`
		 * and run on that file. No side column while nothing is selected.
		 *
		 * @type {Array<{id: string, title: string, fields?: Array<object>, actions?: Array<object>}>}
		 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-cards-beside-the-list-describe-the-selected-file
		 */
		sideCards: {
			type: Array,
			default: () => [],
		},

		/**
		 * Where the side cards stand: `beside` (default) next to the list, or
		 * `page-side` in the detail page's side column, in place of its
		 * generic cards while a file is selected. Without a page side column
		 * they stay beside the list.
		 */
		sideCardsPlacement: {
			type: String,
			default: 'beside',
		},

		/**
		 * The key of a declared column to group the files on: a heading row
		 * per value, in the order each is first met, with its count. Files
		 * with no value come last under `groupEmptyLabel`; folders stay above.
		 * Empty (the default) does not group.
		 */
		groupBy: {
			type: String,
			default: '',
		},

		/** The heading of the group of files with no value in the `groupBy` column. */
		groupEmptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Other'),
		},

		/**
		 * Keys of declared columns to filter on. Each gets a chip per value in
		 * use among the folder's files (a list counts per entry) with how many
		 * files carry it; chosen chips keep the files with any chosen value of
		 * that column, across every column with a choice.
		 *
		 * @type {string[]}
		 */
		facets: {
			type: Array,
			default: () => [],
		},

		/** Label of the toolbar's Columns chooser. */
		columnsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Columns'),
		},
	},

	emits: ['changed'],

	data() {
		return {
			currentPath: this.rootPath,
			/** The open folder as a node, or null before the first listing. */
			folder: null,
			/** The open folder's children as nodes. */
			nodes: [],
			loading: false,
			error: '',
			sortKey: 'basename',
			sortAsc: true,
			/** The host's per-file data for `row` columns, by file id. */
			resolvedRowData: null,
			/** File ids (as strings) of the selected files. */
			selectedIds: [],
			/** Chosen facet values by column key. */
			facetSelections: {},
			/**
			 * The column keys this user chose to see, or null while they have
			 * chosen nothing. Never a source of membership: it is intersected
			 * with the host's declaration, never added to it.
			 */
			visibleColumnKeys: null,
			dragging: false,
			/** The number of files the current drag carries, null when unknown. */
			dragCount: null,
			/** Nested dragenter/dragleave pairs, so a child does not end the drag. */
			dragDepth: 0,
			/** What the live region says: the drop label, then what was added. */
			dropStatus: '',
			uploads: [],
			previewFailed: {},
			newFolderOpen: false,
			newFolderName: '',
			newFolderError: '',
			/** The node being renamed, or null. */
			renaming: null,
			renameName: '',
			renameError: '',
			/** The row being deleted (with a `source`), or null. */
			removing: null,
			removeError: '',
			fileInputEl: null,
			/**
			 * The view the Files app's actions are handed. They read `view.id`
			 * to tell a trash bin or a share view from a plain folder; this is
			 * a plain folder.
			 */
			view: new View({
				id: 'files',
				name: t('nextcloud-vue', 'Files'),
				// The View constructor refuses anything but an SVG string here,
				// and throws from data(), which takes the whole tab down.
				icon: VIEW_ICON,
				order: 0,
				getContents: async () => ({ folder: this.folder, contents: this.nodes }),
			}),
		}
	},

	computed: {
		/**
		 * `dropDetail` through the host translate with `{count}` filled, '' when
		 * there is none or the count it needs is unknown.
		 *
		 * @spec openspec/changes/files-drop-panel/specs/files-browser/spec.md#requirement-the-drop-state-fills-the-panel-and-says-where-the-files-go
		 * @return {string}
		 */
		dropDetailText() {
			if (!this.dropDetail) {
				return ''
			}
			const text = this.cnTranslate(this.dropDetail)
			if (!text.includes('{count}')) {
				return text
			}
			return this.dragCount === null ? '' : text.replace(/\{count\}/g, String(this.dragCount))
		},

		/**
		 * Whether this person may add to and change the open folder. Over
		 * WebDAV the server answers each write on its own, so this is true;
		 * with a `source` it is what the listing said.
		 *
		 * @return {boolean} True when upload, new folder, rename and delete are offered.
		 */
		canChange() {
			if (!this.source) {
				return true
			}
			return this.folder !== null && this.folder.canChange === true
		},

		/**
		 * The breadcrumb trail from the root to the open folder.
		 *
		 * @return {Array<{name: string, path: string}>} The crumbs.
		 */
		crumbs() {
			return crumbsFor(this.rootPath, this.currentPath, this.rootLabel)
		},

		/**
		 * The children in the chosen order, folders first the way the Files app
		 * lists them.
		 *
		 * @return {Array<object>} The nodes.
		 */
		sorted() {
			const column = this.activeSortColumn
			if (column && !column.sortKey) {
				// A declared column has no meaning to the Files app's sorter, so
				// it sorts here, within the folder that is listed.
				return sortNodesByColumn(this.nodes, column, this.sortAsc, this.resolvedRowData, (node) => this.isFolder(node))
			}
			return sortNodes(this.nodes, {
				sortingMode: this.sortKey,
				sortingOrder: this.sortAsc ? 'asc' : 'desc',
				sortFoldersFirst: true,
				sortFavoritesFirst: false,
			})
		},

		/**
		 * The columns the host declared, resolved. This is the membership list:
		 * a column exists because the host declared it, in the host's order.
		 *
		 * @return {Array<object>} The declared columns.
		 * @spec openspec/changes/files-browser-columns/specs/files-browser/spec.md
		 */
		declaredColumns() {
			return normaliseFileColumns(this.columns)
		},

		/**
		 * The library's own word for each built-in column, used when the host
		 * did not write a label.
		 *
		 * @return {object} Labels by column key.
		 */
		builtInColumnLabels() {
			return {
				name: t('nextcloud-vue', 'Name'),
				size: t('nextcloud-vue', 'Size'),
				modified: t('nextcloud-vue', 'Modified'),
				owner: t('nextcloud-vue', 'Owner'),
				type: t('nextcloud-vue', 'Type'),
				tags: t('nextcloud-vue', 'Tags'),
			}
		},

		/**
		 * The columns this browser renders: the host's declaration narrowed by
		 * what this user chose to see.
		 *
		 * The user's stored choice only ever takes columns away. It is applied
		 * by walking the declaration, so a key the host no longer declares is
		 * passed over rather than rendered, and a preference written when a
		 * different set was declared cannot bring an old column back.
		 *
		 * @return {Array<object>} The columns to render.
		 * @spec openspec/changes/files-browser-columns/specs/files-browser/spec.md
		 */
		renderedColumns() {
			return visibleFileColumns(this.declaredColumns, this.visibleColumnKeys)
		},

		/**
		 * The declared columns by key, for grouping and facets.
		 *
		 * @return {object} Resolved columns by key.
		 */
		columnsByKey() {
			const byKey = {}
			this.declaredColumns.forEach((column) => {
				byKey[column.key] = column
			})
			return byKey
		},

		/**
		 * How many cells a row has, for a heading or message spanning the row.
		 *
		 * @return {number} The column count.
		 */
		columnCount() {
			return this.renderedColumns.length + 2 + (this.bulkEnabled ? 1 : 0)
		},

		/**
		 * Whether the host gave bulk actions, which turns on the selection.
		 *
		 * @return {boolean} True with at least one bulk action.
		 * @spec openspec/changes/files-browser-hosts-a-documents-list/specs/files-browser/spec.md
		 */
		bulkEnabled() {
			return Array.isArray(this.bulkActions) && this.bulkActions.length > 0
		},

		/**
		 * The listed folders, in display order.
		 *
		 * @return {Array<object>} The folder nodes.
		 */
		folderNodes() {
			return this.sorted.filter((node) => this.isFolder(node))
		},

		/**
		 * The listed files, in display order, before the filter.
		 *
		 * @return {Array<object>} The file nodes.
		 */
		/**
		 * The fields `secondLine` names for this browser: the list itself, or
		 * the fields of its first variant whose `when` is `true` or absent.
		 * Null without `secondLine` or a matching variant.
		 *
		 * @return {Array<string>|null}
		 * @spec openspec/changes/files-second-line-fields/specs/files-second-line-fields/spec.md#requirement-a-files-second-line-is-a-list-of-fields
		 */
		secondLineFields() {
			const list = Array.isArray(this.secondLine) ? this.secondLine : []
			if (list.length === 0) {
				return null
			}
			if (list.every((item) => typeof item === 'string')) {
				return list
			}
			const variant = list.find((item) => item && typeof item === 'object' && Array.isArray(item.fields) && (!('when' in item) || item.when === true))
			return variant ? variant.fields.filter((field) => typeof field === 'string') : null
		},

		/**
		 * The bulk bar's count text.
		 *
		 * @return {string}
		 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-the-bulk-bar-names-what-is-selected
		 */
		selectionCountText() {
			const count = this.selectedIds.length
			const template = count === 1 && this.selectionLabelOne ? this.selectionLabelOne : this.selectionLabel
			if (template) {
				return this.cnTranslate(template).replace(/\{count\}/g, String(count))
			}
			return t('nextcloud-vue', '{count} selected', { count })
		},

		/**
		 * The file the side cards describe: the last one selected, or null
		 * without side cards or a selection.
		 *
		 * @return {object|null}
		 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-cards-beside-the-list-describe-the-selected-file
		 */
		/** @return {boolean} Whether the side cards fill the page's side column now. */
		sideClaimed() {
			return this.sideInPage && this.sideNode !== null
		},

		/** @return {boolean} Whether the side cards stand in the page's side column. */
		sideInPage() {
			return this.sideCardsPlacement === 'page-side' && this.cnDetailSideColumn !== null && this.cnDetailSideColumn.available === true
		},

		/** @return {string} Where the side cards are teleported to in the page. */
		pageSideTarget() {
			return this.cnDetailSideColumn?.target || 'body'
		},

		sideNode() {
			if (!Array.isArray(this.sideCards) || this.sideCards.length === 0 || this.selectedIds.length === 0) {
				return null
			}
			const id = this.selectedIds[this.selectedIds.length - 1]
			return this.fileNodes.find((node) => String(node.fileid) === id) || null
		},

		fileNodes() {
			return this.sorted.filter((node) => !this.isFolder(node))
		},

		/**
		 * The review counts over the folder's files, or null without a summary.
		 *
		 * @return {object|null}
		 */
		review() {
			return reviewSummary(this.reviewSummary, this.fileNodes, this.resolvedRowData)
		},

		/** @return {string} The summary's title, counts filled in. */
		reviewTitle() {
			return this.reviewText('title', t('nextcloud-vue', '{done} of {total} reviewed'))
		},

		/** @return {string} The summary's second line, or '' when nothing is open. */
		reviewSubtitle() {
			if (!this.review || this.review.open === 0) {
				return ''
			}
			return this.reviewText('subtitle', t('nextcloud-vue', '{open} still to review'))
		},

		/**
		 * Whether any facet value is chosen.
		 *
		 * @return {boolean} True when the filter narrows the list.
		 */
		facetActive() {
			return Object.values(this.facetSelections).some((values) => Array.isArray(values) && values.length > 0)
		},

		/**
		 * The chips: per facet column, the values in use with their counts.
		 *
		 * @return {Array<{key: string, label: string, values: Array<{value: string, count: number, active: boolean}>}>} The facets.
		 * @spec openspec/changes/files-browser-hosts-a-documents-list/specs/files-browser/spec.md
		 */
		facetGroups() {
			const keys = Array.isArray(this.facets) ? this.facets : []
			return keys
				.map((key) => this.columnsByKey[key])
				.filter(Boolean)
				.map((column) => {
					const chosen = this.facetSelections[column.key] || []
					return {
						key: column.key,
						label: this.columnLabel(column),
						values: facetCounts(this.fileNodes, column, this.resolvedRowData)
							.map((entry) => ({ ...entry, active: chosen.includes(entry.value) })),
					}
				})
				.filter((facet) => facet.values.length > 0)
		},

		/**
		 * The files the filter keeps.
		 *
		 * @return {Array<object>} The file nodes.
		 */
		filteredFiles() {
			if (!this.facetActive) {
				return this.fileNodes
			}
			return this.fileNodes.filter((node) => nodeMatchesFacets(node, this.facetSelections, this.columnsByKey, this.resolvedRowData))
		},

		/**
		 * What the table body renders, in order: folders, then the files,
		 * under a heading per group when the host groups.
		 *
		 * @return {Array<{key: string, group?: object, node?: object}>} The rows.
		 * @spec openspec/changes/files-browser-hosts-a-documents-list/specs/files-browser/spec.md
		 */
		displayRows() {
			const rows = this.folderNodes.map((node) => ({ key: node.source, node }))
			const column = this.groupBy ? this.columnsByKey[this.groupBy] : null
			if (!column) {
				this.filteredFiles.forEach((node) => rows.push({ key: node.source, node }))
				return rows
			}
			groupNodes(this.filteredFiles, column, this.resolvedRowData).forEach((group) => {
				const label = group.value === null ? this.groupEmptyLabel : group.value
				rows.push({ key: `group-${group.value === null ? '' : group.value}`, group: { label, count: group.nodes.length } })
				group.nodes.forEach((node) => rows.push({ key: node.source, node }))
			})
			return rows
		},

		/**
		 * The ids of the files a select-all takes: the files the filter keeps.
		 *
		 * @return {string[]} File ids as strings.
		 */
		selectableIds() {
			return this.filteredFiles.map((node) => String(node.fileid))
		},

		/**
		 * Whether every selectable file is selected.
		 *
		 * @return {boolean} True when all are.
		 */
		allSelected() {
			return this.selectableIds.length > 0 && this.selectableIds.every((id) => this.selectedIds.includes(id))
		},

		/**
		 * Whether some file is selected.
		 *
		 * @return {boolean} True when one or more are.
		 */
		someSelected() {
			return this.selectedIds.length > 0
		},

		/**
		 * The column the table is currently sorted on, or null when the sort
		 * key belongs to no declared column.
		 *
		 * @return {(object|null)} The active column.
		 */
		activeSortColumn() {
			return this.declaredColumns.find((column) => this.sortTokenOf(column) === this.sortKey) || null
		},

		/**
		 * Whether the Columns chooser is offered: only when the host said where
		 * to store the answer, because a chooser that forgets is worse than no
		 * chooser.
		 *
		 * @return {boolean} True when the chooser renders.
		 */
		columnsChooserEnabled() {
			return this.preferenceApp !== '' && this.declaredColumns.length > 0
		},

		/**
		 * What the Files app and its plugins offer to create in this folder.
		 *
		 * Read at render, not cached: a plugin's script may register its entry
		 * after this component mounted.
		 *
		 * @return {Array<object>} The entries, in the plugins' order.
		 */
		newMenuEntries() {
			if (this.folder === null || this.source) {
				return []
			}
			try {
				return getNewFileMenuEntries(this.folder)
					.filter((entry) => typeof entry.handler === 'function')
					.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			} catch {
				return []
			}
		},
	},

	watch: {
		/**
		 * Tell the page whether the side cards stand in its side column now,
		 * so its generic cards stand aside meanwhile.
		 */
		sideClaimed: {
			immediate: true,
			handler(on) {
				this.cnDetailSideColumn?.claim?.(this.$.uid, on)
			},
		},

		rootPath(next) {
			this.currentPath = next
			this.refresh()
		},

		// A selection belongs to the folder it was made in.
		currentPath() {
			this.selectedIds = []
		},
	},

	mounted() {
		this.loadColumnChoice()
		this.refresh()
		// Another surface on the page changed the folder: the page's Refresh,
		// a dialog that filed a document, or a Files action whose work ends
		// after its own call returned (the delete confirmation, an upload).
		for (const channel of FOLDER_CHANGED_CHANNELS) {
			subscribe(channel, this.onFolderChanged)
		}
	},

	beforeUnmount() {
		this.cnDetailSideColumn?.claim?.(this.$.uid, false)
		for (const channel of FOLDER_CHANGED_CHANNELS) {
			unsubscribe(channel, this.onFolderChanged)
		}
		clearTimeout(this._folderChangedTimer)
	},

	methods: {
		t,

		preventMiddleClickAutoscroll,

		/**
		 * Hold the file input element from its function ref.
		 *
		 * @param {HTMLInputElement|null} el The element.
		 * @return {void}
		 */
		fileInputRef(el) {
			this.fileInputEl = el || null
		},

		/**
		 * The DAV path of a user-relative path.
		 *
		 * @param {string} path The user-relative path.
		 * @return {string} The path under the DAV files root.
		 */
		davPath(path) {
			return `${getRootPath()}${path}`
		},

		/**
		 * List the open folder over DAV, with the same PROPFIND the Files app sends.
		 *
		 * @return {Promise<void>}
		 */
		async refresh() {
			this.loading = true
			this.error = ''
			if (this.source) {
				await this.refreshFromSource()
				return
			}
			try {
				const client = getClient()
				const { data } = await client.getDirectoryContents(this.davPath(this.currentPath), {
					details: true,
					data: this.propfindBody(),
					includeSelf: true,
				})
				const stats = Array.isArray(data) ? data : []
				const nodes = stats.map((stat) => resultToNode(stat))
				const self = nodes.find((node) => node.path === this.currentPath) || nodes[0] || null
				this.folder = self
				this.nodes = nodes.filter((node) => node !== self)
				// One call per folder, not one per file: the host's projection
				// is asked for the whole listing at once.
				await this.resolveRowData(this.nodes)
			} catch (err) {
				const status = err?.response?.status ?? err?.status
				this.error = status === 404
					? t('nextcloud-vue', 'This folder no longer exists')
					: (status === 403 ? t('nextcloud-vue', 'You cannot see this folder') : t('nextcloud-vue', 'The folder could not be read'))
				this.folder = null
				this.nodes = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * List the open folder through the `source`.
		 *
		 * @return {Promise<void>}
		 */
		async refreshFromSource() {
			try {
				const { folder, nodes } = await this.source.list(this.currentPath)
				this.folder = folder
				this.nodes = nodes
				await this.resolveRowData(this.nodes)
			} catch (err) {
				const atRoot = (this.currentPath.replace(/\/+$/, '') || '/') === (this.rootPath.replace(/\/+$/, '') || '/')
				this.error = err?.status === 404
					? (atRoot ? t('nextcloud-vue', 'You cannot see these files') : t('nextcloud-vue', 'This folder no longer exists'))
					: (err?.status === 403 ? t('nextcloud-vue', 'You cannot see this folder') : t('nextcloud-vue', 'The folder could not be read'))
				this.folder = null
				this.nodes = []
			} finally {
				this.loading = false
			}
		},

		/**
		 * Where a file downloads from, through the `source`.
		 *
		 * @param {object} node The row.
		 * @return {string|null} The url.
		 */
		sourceDownloadUrl(node) {
			return this.source && typeof this.source.downloadUrl === 'function' ? this.source.downloadUrl(node) : null
		},

		/**
		 * Open the delete dialog on a row.
		 *
		 * @param {object} node The row.
		 * @return {void}
		 */
		askRemove(node) {
			this.removing = node
			this.removeError = ''
		},

		/**
		 * Delete the row named in the dialog, through the `source`.
		 *
		 * @return {Promise<void>}
		 */
		async remove() {
			const node = this.removing
			if (node === null || !this.source) {
				return
			}
			try {
				await this.source.remove(node)
				this.removing = null
				await this.refresh()
				this.$emit('changed')
			} catch (err) {
				this.removeError = err?.message || t('nextcloud-vue', '{action} did not succeed', { action: this.deleteLabel })
			}
		},

		/**
		 * Open a folder below the root.
		 *
		 * @param {string} path The user-relative path.
		 * @return {void}
		 */
		navigate(path) {
			const root = this.rootPath.replace(/\/+$/, '') || '/'
			if (path !== root && !path.startsWith(root === '/' ? '/' : `${root}/`)) {
				return
			}
			this.currentPath = path
			this.refresh()
		},

		/**
		 * Whether a node is a folder.
		 *
		 * @param {object} node The node.
		 * @return {boolean} true for a folder.
		 */
		isFolder(node) {
			return node.type === FileType.Folder
		},

		/**
		 * A row was clicked: enter a folder, or open a file the way the Files
		 * app would (its `view` action, which hands over to the Viewer).
		 *
		 * @param {object} node The node.
		 * @return {Promise<void>}
		 */
		async open(node) {
			if (this.isFolder(node)) {
				this.navigate(node.path)
				return
			}
			if (this.source) {
				const url = this.sourceDownloadUrl(node)
				if (url) {
					window.open(url, '_blank', 'noopener,noreferrer')
				}
				return
			}
			const view = this.actionsFor(node).find((action) => action.id === 'view')
			if (view) {
				await this.run(view, node)
				return
			}
			if (node.fileid) {
				window.open(this.permalink(node), '_blank', 'noopener,noreferrer')
			}
		},

		/**
		 * Row click: a ctrl/cmd/shift click opens the node's permalink in a new
		 * tab, like a link would; a plain click opens it in place (`open`).
		 *
		 * @param {object} node The node.
		 * @param {MouseEvent} [event] The click event.
		 * @return {void}
		 */
		onRowClick(node, event) {
			if (isNewTabClick(event)) {
				this.openInNewTab(node)
				return
			}
			this.open(node)
		},

		/**
		 * Row middle click: open the node's permalink in a new tab.
		 *
		 * @param {object} node The node.
		 * @param {MouseEvent} event The auxclick event.
		 * @return {void}
		 */
		onRowAuxClick(node, event) {
			if (isRowMiddleClick(event)) {
				this.openInNewTab(node)
			}
		},

		/**
		 * Open a node's permalink (a file or a folder in the Files app) in a new tab.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		openInNewTab(node) {
			if (this.source) {
				if (this.isFolder(node)) {
					return
				}
				const url = this.sourceDownloadUrl(node)
				if (url) {
					window.open(url, '_blank', 'noopener,noreferrer')
				}
				return
			}
			if (node.fileid) {
				window.open(this.permalink(node), '_blank', 'noopener,noreferrer')
			}
		},

		/**
		 * The action context the Files app hands its actions for one node.
		 *
		 * @param {object} node The node.
		 * @return {object} The context.
		 */
		contextFor(node) {
			return { nodes: [node], view: this.view, folder: this.folder, contents: this.nodes }
		},

		/**
		 * The registered actions that apply to a node, in the Files app's order.
		 *
		 * Inline actions (a sharing badge, an unread-comments dot) are status
		 * marks the Files app paints beside the name, not menu items; a
		 * sub-action lives under its parent's own menu; and the actions that
		 * need the Files page are named in `ACTIONS_NEEDING_THE_FILES_PAGE`.
		 *
		 * @param {object} node The node.
		 * @return {Array<object>} The actions.
		 */
		actionsFor(node) {
			if (this.source) {
				return []
			}
			let actions
			try {
				actions = getFileActions()
			} catch {
				return []
			}
			const context = this.contextFor(node)
			return actions
				.filter((action) => !action.parent && !ACTIONS_NEEDING_THE_FILES_PAGE.includes(action.id))
				.filter((action) => typeof action.inline !== 'function' || action.inline(context) !== true)
				.filter((action) => {
					try {
						return typeof action.enabled !== 'function' || action.enabled(context) === true
					} catch {
						return false
					}
				})
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		},

		/**
		 * An action's label for a node, in the words the Files app uses.
		 *
		 * @param {object} action The action.
		 * @param {object} node The node.
		 * @return {string} The label.
		 */
		/**
		 * A host action's label in the user's language.
		 *
		 * @spec openspec/changes/files-browser-hears-the-page/specs/files-browser/spec.md#requirement-a-declared-row-action-reads-in-the-users-language
		 * @param {object} action The manifest-declared action.
		 * @return {string} The label.
		 */
		hostLabel(action) {
			return this.cnTranslate(String(action?.label ?? ''))
		},

		/**
		 * The second line under a file's name, or '' without `nameSecondary`,
		 * for a folder, or when a value in it is empty.
		 *
		 * @param {object} node The file.
		 * @return {string}
		 */
		nameSecondaryOf(node) {
			const fields = this.secondLineFields
			if ((!this.nameSecondary && fields === null) || this.isFolder(node)) {
				return ''
			}
			const byId = this.resolvedRowData && typeof this.resolvedRowData === 'object' ? this.resolvedRowData : {}
			const entry = byId[node.fileid] ?? byId[String(node.fileid)] ?? {}
			const owner = node.attributes ? node.attributes['owner-display-name'] : undefined
			const object = {
				...entry,
				name: node.basename,
				modified: node.mtime,
				size: this.formatSize(node.size),
				type: this.typeLabelOf(node),
				...(owner ? { owner } : {}),
			}
			if (fields !== null) {
				return fields
					.map((field) => fillTemplate(`{${field}}`, object))
					.filter((text) => text !== '')
					.join(' · ')
			}
			return fillTemplate(this.cnTranslate(this.nameSecondary), object)
		},

		/**
		 * A file's type as a reader names it: the application for common
		 * office types ("PDF", "Word", "Excel"), "Email" for a mail, "Image"
		 * for a picture, else the extension in capitals.
		 *
		 * @param {object} node The file.
		 * @return {string} The label, or ''.
		 * @spec openspec/changes/files-browser-second-line-size-type/specs/files-browser-second-line-size-type/spec.md#requirement-a-files-second-line-can-name-its-type-and-size
		 */
		typeLabelOf(node) {
			const mime = String(node?.mime || '')
			if (mime === 'application/pdf') {
				return 'PDF'
			}
			if (/msword|wordprocessingml/.test(mime)) {
				return 'Word'
			}
			if (/ms-excel|spreadsheetml/.test(mime)) {
				return 'Excel'
			}
			if (/ms-powerpoint|presentationml/.test(mime)) {
				return 'PowerPoint'
			}
			if (mime === 'message/rfc822' || mime === 'application/vnd.ms-outlook') {
				return t('nextcloud-vue', 'Email')
			}
			if (mime.startsWith('image/')) {
				return t('nextcloud-vue', 'Image')
			}
			const match = /\.([a-z0-9]+)$/i.exec(String(node?.basename || ''))
			return match ? match[1].toUpperCase() : ''
		},

		/**
		 * A review summary line: the host's template through its translate, else
		 * the library's, with the counts filled in.
		 *
		 * @param {string} key `title` or `subtitle`.
		 * @param {string} fallback The library's line, already translated.
		 * @return {string}
		 */
		reviewText(key, fallback) {
			const own = this.reviewSummary && typeof this.reviewSummary[key] === 'string' && this.reviewSummary[key] !== ''
				? this.cnTranslate(this.reviewSummary[key])
				: fallback
			const counts = this.review || { done: 0, total: 0, open: 0 }
			return own.replace(/\{(done|total|open)\}/g, (match, name) => String(counts[name]))
		},

		/**
		 * Whether a review value is one of the summary's open values.
		 *
		 * @param {string} value The value.
		 * @return {boolean}
		 */
		isOpenValue(value) {
			const open = this.reviewSummary ? this.reviewSummary.open : undefined
			const list = (Array.isArray(open) ? open : [open]).filter((v) => v !== undefined && v !== null)
			return list.some((v) => String(v).toLowerCase() === String(value).toLowerCase())
		},

		/**
		 * Whether a file's row button is the primary one: the row-data field
		 * `primaryWhen.key` holds one of `primaryWhen.values`.
		 *
		 * @param {object} node The file.
		 * @return {boolean}
		 */
		rowButtonPrimary(node) {
			const when = this.rowButton && this.rowButton.primaryWhen
			if (!when || typeof when.key !== 'string' || !Array.isArray(when.values)) {
				return false
			}
			const raw = fileColumnValue({ key: when.key, source: 'row' }, node, this.resolvedRowData)
			if (raw === null || raw === undefined) {
				return false
			}
			return when.values.some((v) => String(v).toLowerCase() === String(raw).toLowerCase())
		},

		hostActionApplies,

		/**
		 * Re-read the folder once after a burst of change signals. One upload
		 * of ten files answers ten `files:node:created`, and one PROPFIND
		 * covers them all.
		 *
		 * @spec openspec/changes/files-browser-hears-the-page/specs/files-browser/spec.md#requirement-the-files-browser-re-reads-when-the-page-says-files-changed
		 * @return {void}
		 */
		onFolderChanged() {
			clearTimeout(this._folderChangedTimer)
			this._folderChangedTimer = setTimeout(() => this.refresh(), FOLDER_CHANGED_DEBOUNCE_MS)
		},

		labelOf(action, node) {
			try {
				return action.displayName(this.contextFor(node))
			} catch {
				return action.id
			}
		},

		/**
		 * An action's icon for a node, as inline SVG.
		 *
		 * @param {object} action The action.
		 * @param {object} node The node.
		 * @return {string} The SVG, or the empty string.
		 */
		iconOf(action, node) {
			try {
				return action.iconSvgInline(this.contextFor(node)) || ''
			} catch {
				return ''
			}
		},

		/**
		 * Run a registered action on a node, then re-read the folder: most of
		 * them change it (a delete, a rename, a move), and the ones that do
		 * not cost one PROPFIND.
		 *
		 * @param {object} action The action.
		 * @param {object} node The node.
		 * @return {Promise<void>}
		 */
		async run(action, node) {
			try {
				const result = await action.exec(this.contextFor(node))
				if (result === false) {
					const { showError } = await import('@nextcloud/dialogs')
					showError(t('nextcloud-vue', '{action} did not succeed', { action: this.labelOf(action, node) }))
				}
			} catch (err) {
				const { showError } = await import('@nextcloud/dialogs')
				showError(err?.message || t('nextcloud-vue', '{action} did not succeed', { action: this.labelOf(action, node) }))
			}
			await this.refresh()
			/**
			 * @event changed The folder's contents changed through this browser:
			 * an upload, a new folder, or an action that ran.
			 */
			this.$emit('changed')
		},

		/**
		 * Run a New menu entry the Files app or a plugin registered, then re-read.
		 *
		 * The `newFolder` entry the Files app registers opens its own inline
		 * rename in the Files list, which is not here, so that one is answered
		 * by this component's dialog instead.
		 *
		 * @param {object} entry The entry.
		 * @return {Promise<void>}
		 */
		async runNewEntry(entry) {
			if (entry.id === 'newFolder') {
				this.askNewFolder()
				return
			}
			try {
				await entry.handler(this.folder, this.nodes)
			} catch (err) {
				const { showError } = await import('@nextcloud/dialogs')
				showError(err?.message || t('nextcloud-vue', '{action} did not succeed', { action: entry.displayName }))
			}
			await this.refresh()
			this.$emit('changed')
		},

		/**
		 * Open the new-folder dialog.
		 *
		 * @return {void}
		 */
		askNewFolder() {
			this.newFolderName = ''
			this.newFolderError = ''
			this.newFolderOpen = true
		},

		/**
		 * Create the folder named in the dialog, over DAV.
		 *
		 * @return {Promise<void>}
		 */
		async createFolder() {
			const name = this.newFolderName.trim()
			if (name === '') {
				return
			}
			if (this.nodes.some((node) => node.basename === name)) {
				this.newFolderError = t('nextcloud-vue', 'A file or folder with that name is already here')
				return
			}
			try {
				if (this.source) {
					await this.source.createFolder(this.currentPath, name)
				} else {
					await getClient().createDirectory(this.davPath(joinPath(this.currentPath, name)))
				}
				this.newFolderOpen = false
				await this.refresh()
				this.$emit('changed')
			} catch (err) {
				this.newFolderError = err?.message || t('nextcloud-vue', 'The folder could not be created')
			}
		},

		/**
		 * Open the rename dialog on a node.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		askRename(node) {
			this.renaming = node
			this.renameName = node.basename
			this.renameError = ''
		},

		/**
		 * Rename the node named in the dialog, as a DAV move within its folder.
		 *
		 * @return {Promise<void>}
		 */
		async rename() {
			const node = this.renaming
			const name = this.renameName.trim()
			if (node === null || name === '' || name === node.basename) {
				return
			}
			if (name.includes('/')) {
				this.renameError = t('nextcloud-vue', 'A name cannot contain a slash')
				return
			}
			if (this.nodes.some((other) => other !== node && other.basename === name)) {
				this.renameError = t('nextcloud-vue', 'A file or folder with that name is already here')
				return
			}
			try {
				if (this.source) {
					await this.source.rename(node, name)
				} else {
					await getClient().moveFile(this.davPath(node.path), this.davPath(joinPath(this.currentPath, name)))
				}
				this.renaming = null
				await this.refresh()
				this.$emit('changed')
			} catch (err) {
				this.renameError = err?.message || t('nextcloud-vue', 'The name could not be changed')
			}
		},

		/**
		 * Open the file picker.
		 *
		 * @return {void}
		 */
		pickFiles() {
			this.fileInputEl?.click()
		},

		/**
		 * Files were picked.
		 *
		 * @param {Event} event The change event.
		 * @return {Promise<void>}
		 */
		async onFilesPicked(event) {
			const files = event.target?.files
			if (files?.length) {
				await this.uploadFiles(files)
			}
			if (this.fileInputEl) {
				this.fileInputEl.value = ''
			}
		},

		/**
		 * Files were dropped.
		 *
		 * @param {DragEvent} event The drop.
		 * @return {Promise<void>}
		 */
		async onDrop(event) {
			this.dragging = false
			this.dragDepth = 0
			this.dropStatus = ''
			if (!this.canChange) {
				return
			}
			const files = event.dataTransfer?.files
			if (files?.length) {
				await this.uploadFiles(files)
				if (this.dropOverlay) {
					this.dropStatus = n('nextcloud-vue', '%n file added', '%n files added', files.length)
				}
			}
		},

		/**
		 * Something is dragged into the browser: show the drop state when it
		 * carries files, and say so once.
		 *
		 * @param {DragEvent} event The drag.
		 * @return {void}
		 */
		onDragEnter(event) {
			if (!this.canChange || !this.carriesFiles(event)) {
				return
			}
			this.dragDepth++
			if (!this.dragging) {
				this.dragging = true
				this.dragCount = this.draggedFileCount(event)
				this.dropStatus = this.dropOverlay ? [this.cnTranslate(this.dropLabel), this.dropDetailText].filter(Boolean).join(' ') : ''
			}
		},

		/**
		 * Keep the drop state while files move over the browser.
		 *
		 * @param {DragEvent} event The drag.
		 * @return {void}
		 */
		onDragOver(event) {
			if (this.canChange && this.carriesFiles(event)) {
				this.dragging = true
			}
		},

		/**
		 * Something left the browser, or one of its children. The drop state
		 * ends only when the drag has left the browser itself.
		 *
		 * @return {void}
		 */
		onDragLeave() {
			this.dragDepth = Math.max(0, this.dragDepth - 1)
			if (this.dragDepth === 0) {
				this.dragging = false
				this.dropStatus = ''
			}
		},

		/**
		 * How many files a drag carries, or null when the browser does not
		 * say (it lists the items only once they are dropped in some browsers).
		 *
		 * @param {DragEvent} event The drag.
		 * @return {number|null}
		 */
		draggedFileCount(event) {
			const items = event?.dataTransfer?.items
			if (!items || typeof items.length !== 'number') {
				return null
			}
			const count = Array.from(items).filter((item) => item && item.kind === 'file').length
			return count > 0 ? count : null
		},

		/**
		 * Whether a drag carries files (not text or a link from the page).
		 * A drag whose types cannot be read counts as files, as before.
		 *
		 * @param {DragEvent} event The drag.
		 * @return {boolean}
		 */
		carriesFiles(event) {
			const types = event?.dataTransfer?.types
			if (!types) {
				return true
			}
			return Array.from(types).includes('Files')
		},

		/**
		 * PUT each file into the open folder over DAV, with a progress row
		 * each, then re-read the folder once.
		 *
		 * @param {FileList|File[]} files The files.
		 * @return {Promise<void>}
		 */
		async uploadFiles(files) {
			if (this.folder === null) {
				return
			}
			// A PUT through axios rather than the DAV client: the client's
			// putFileContents refuses a browser File ("Cannot calculate data
			// length"), and fetch reports no upload progress anyway. axios
			// carries the session and the request token, and its XHR reports
			// progress per file. If-None-Match: * refuses to overwrite.
			const batch = [...files].map((file) => ({ key: `u${++uploadSeq}`, name: file.name, progress: 0, error: '', file }))
			this.uploads = [...this.uploads, ...batch]
			for (const upload of batch) {
				if (this.source) {
					await this.uploadThroughSource(upload)
					continue
				}
				try {
					await axios.put(`${getRemoteURL()}${this.davPath(joinPath(this.currentPath, upload.name))}`, upload.file, {
						headers: {
							'Content-Type': upload.file.type || 'application/octet-stream',
							'If-None-Match': '*',
						},
						onUploadProgress: (progress) => {
							if (progress?.total) {
								upload.progress = Math.round((progress.loaded / progress.total) * 100)
							}
						},
					})
					upload.progress = 100
				} catch (err) {
					const status = err?.response?.status ?? err?.status
					upload.error = status === 412
						? t('nextcloud-vue', 'A file with that name is already here')
						: (err?.message || t('nextcloud-vue', 'The upload failed'))
				}
			}
			await this.refresh()
			this.$emit('changed')
			// Finished rows leave the list; failed ones stay with their reason.
			window.setTimeout(() => {
				this.uploads = this.uploads.filter((upload) => upload.error !== '' || batch.every((b) => b.key !== upload.key))
			}, 1500)
		},

		/**
		 * Store one upload through the `source`, keeping its progress row.
		 *
		 * @param {object} upload The progress row, carrying the file.
		 * @return {Promise<void>}
		 */
		async uploadThroughSource(upload) {
			try {
				await this.source.upload(this.currentPath, upload.file, (percent) => {
					upload.progress = percent
				})
				upload.progress = 100
			} catch (err) {
				upload.error = err?.status === 409
					? t('nextcloud-vue', 'A file with that name is already here')
					: (err?.message || t('nextcloud-vue', 'The upload failed'))
			}
		},

		/**
		 * Change the sort column, or flip the order on the same one.
		 *
		 * @param {string} key `basename`, `size` or `mtime`.
		 * @return {void}
		 */
		/**
		 * The PROPFIND this browser sends: the Files app's own body, plus one
		 * `<prop>` for every DAV property a declared `attribute` column reads,
		 * so that value is on the node when the folder lists rather than one
		 * request later.
		 *
		 * @return {string} The PROPFIND body.
		 * @spec openspec/changes/files-browser-columns/specs/files-browser/spec.md
		 */
		propfindBody() {
			const base = getDefaultPropfind()
			const extra = attributePropertiesFor(this.declaredColumns)
			if (extra.length === 0) {
				return base
			}
			const props = extra.map((name) => {
				const match = /^\{(.+)\}(.+)$/.exec(name)
				if (!match) {
					return `<d:${name} />`
				}
				return `<x-cn:${match[2]} xmlns:x-cn="${match[1]}" />`
			}).join('')
			// Spliced into the existing <d:prop> rather than appended after it:
			// a second <d:prop> block is not a PROPFIND any server answers.
			return base.includes('</d:prop>')
				? base.replace('</d:prop>', `${props}</d:prop>`)
				: base
		},

		/**
		 * The token a column sorts under: the Files app's own sorting mode for
		 * a built-in, the column key for anything else.
		 *
		 * @param {object} column A resolved column.
		 * @return {string} The sort token.
		 */
		sortTokenOf(column) {
			return (column && (column.sortKey || column.key)) || ''
		},

		/**
		 * The label a column's header shows: what the host wrote, else the
		 * library's own word for a built-in, else the key.
		 *
		 * @param {object} column A resolved column.
		 * @return {string} The header text.
		 */
		columnLabel(column) {
			if (column && typeof column.label === 'string' && column.label !== '') {
				return this.cnTranslate(column.label)
			}
			return this.builtInColumnLabels[column && column.key] || (column && column.key) || ''
		},

		/**
		 * One cell's value.
		 *
		 * @param {object} column A resolved column.
		 * @param {object} node The node.
		 * @return {(Array|object|string|number|boolean|undefined)} The value.
		 */
		cellValue(column, node) {
			return fileColumnValue(column, node, this.resolvedRowData)
		},

		/**
		 * The tone a column or card field draws a value in: its `colorMap`
		 * entry for the value (case-insensitive), read from the `colorKey` field
		 * of the row when given, else from the value itself. '' without one.
		 *
		 * @param {object} column A resolved column or a side card field.
		 * @param {object} node The node.
		 * @return {string} A badge variant (`success`, `warning`, `error`, ...) or ''.
		 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-a-row-column-can-draw-its-values-in-tones
		 */
		toneOf(column, node) {
			const map = column && column.colorMap
			if (!map || typeof map !== 'object') {
				return ''
			}
			const raw = column.colorKey
				? fileColumnValue({ key: column.colorKey, source: 'row' }, node, this.resolvedRowData)
				: this.cellValue(column, node)
			if (raw === null || raw === undefined || typeof raw === 'object') {
				return ''
			}
			const wanted = String(raw).toLowerCase()
			const hit = Object.keys(map).find((key) => key.toLowerCase() === wanted)
			return hit ? String(map[hit]) : ''
		},

		/**
		 * The widget props a cell gets: the column's own, and for a `badge`
		 * its tone as the variant.
		 *
		 * @param {object} column A resolved column.
		 * @param {object} node The node.
		 * @return {object|null}
		 */
		cellWidgetProps(column, node) {
			if (column.widget !== 'badge') {
				return column.widgetProps || null
			}
			const tone = this.toneOf(column, node)
			return { ...(column.widgetProps || {}), ...(tone ? { variant: tone } : {}) }
		},

		/**
		 * The side cards for a file, resolved: the title with `{name}` filled
		 * in, the fields that have a value with their tone, and the actions.
		 *
		 * @param {object} node The node.
		 * @return {Array<{id: string, title: string, fields: Array<object>, actions: Array<object>}>}
		 * @spec openspec/changes/files-browser-side-cards/specs/files-browser/spec.md#requirement-cards-beside-the-list-describe-the-selected-file
		 */
		sideCardsFor(node) {
			return this.sideCards
				.filter((card) => card && card.id)
				.map((card) => ({
					id: String(card.id),
					title: this.cnTranslate(String(card.title || '')).replace(/\{name\}/g, node.basename),
					fields: (Array.isArray(card.fields) ? card.fields : [])
						.filter((field) => field && field.key)
						.map((field) => {
							const column = { ...field, source: field.source || 'row' }
							return {
								key: String(field.key),
								label: this.cnTranslate(String(field.label || field.key)),
								value: this.cellValue(column, node),
								formatter: field.formatter,
								formatterOptions: field.formatterOptions,
								tone: this.toneOf(column, node),
							}
						})
						.filter((field) => field.value !== null && field.value !== undefined && field.value !== ''),
					actions: (Array.isArray(card.actions) ? card.actions : []).filter((action) => action && action.id),
				}))
		},

		/**
		 * Whether a user currently sees a column, for the chooser's ticks.
		 *
		 * @param {object} column A resolved column.
		 * @return {boolean} True when it renders.
		 */
		isColumnVisible(column) {
			return this.renderedColumns.some((c) => c.key === column.key)
		},

		/**
		 * Tick or untick a column for this user and remember it.
		 *
		 * The stored value is always rebuilt from the host's declaration, never
		 * from the previous stored value, so a key the host has since dropped
		 * cannot survive a toggle and reappear later.
		 *
		 * @param {object} column The column being toggled.
		 * @return {void}
		 * @spec openspec/changes/files-browser-columns/specs/files-browser/spec.md
		 */
		toggleColumn(column) {
			const next = this.declaredColumns
				.filter((c) => (c.key === column.key ? !this.isColumnVisible(c) : this.isColumnVisible(c)))
				.map((c) => c.key)
			this.visibleColumnKeys = next
			this.saveColumnChoice(next)
		},

		/**
		 * Read this user's column choice. A stored key the host no longer
		 * declares is dropped on the way in as well as on the way out, so the
		 * chooser never lists a column that cannot render.
		 *
		 * @return {Promise<void>}
		 */
		async loadColumnChoice() {
			if (!this.columnsChooserEnabled) {
				return
			}
			const stored = await readUserPreference(this.preferenceApp, this.preferenceKey, null)
			if (!Array.isArray(stored)) {
				this.visibleColumnKeys = null
				return
			}
			const declared = new Set(this.declaredColumns.map((c) => c.key))
			this.visibleColumnKeys = stored.filter((key) => declared.has(key))
		},

		/**
		 * Store this user's column choice.
		 *
		 * @param {string[]} keys The visible column keys.
		 * @return {Promise<void>}
		 */
		async saveColumnChoice(keys) {
			if (!this.columnsChooserEnabled) {
				return
			}
			await writeUserPreference(this.preferenceApp, this.preferenceKey, keys)
		},

		/**
		 * Resolve the host's per-file data for this folder's nodes. Called once
		 * per listing, so a projection of ninety files is one request.
		 *
		 * @param {Array<object>} nodes The listed nodes.
		 * @return {Promise<void>}
		 */
		async resolveRowData(nodes) {
			if (this.rowData === null || this.rowData === undefined) {
				this.resolvedRowData = null
				return
			}
			if (typeof this.rowData !== 'function') {
				this.resolvedRowData = this.rowData
				return
			}
			try {
				this.resolvedRowData = await this.rowData(nodes)
			} catch {
				// A projection that could not be fetched leaves those cells
				// empty. It is not a reason to say the folder failed to list:
				// the files are there and the host's extra columns are not.
				this.resolvedRowData = null
			}
		},

		sortBy(key) {
			if (this.sortKey === key) {
				this.sortAsc = !this.sortAsc
				return
			}
			this.sortKey = key
			// Size and modified read most usefully largest and newest first;
			// everything else, including every declared column, starts at A.
			this.sortAsc = key !== 'size' && key !== 'mtime'
		},

		/**
		 * The `aria-sort` value for a column header.
		 *
		 * @param {string} key The column's sort key.
		 * @return {string|null} `ascending`, `descending` or null.
		 */
		ariaSort(key) {
			if (this.sortKey !== key) {
				return null
			}
			return this.sortAsc ? 'ascending' : 'descending'
		},

		/**
		 * The arrow beside the sorted column's name.
		 *
		 * @param {string} key The column's sort key.
		 * @return {object} The icon component.
		 */
		sortIcon(key) {
			return this.sortKey === key && !this.sortAsc ? ChevronDown : ChevronUp
		},

		/**
		 * A file's size the way the Files app prints it.
		 *
		 * @param {number|undefined} size The size in bytes.
		 * @return {string} The size, or the empty string.
		 */
		formatSize(size) {
			return typeof size === 'number' ? formatFileSize(size, true) : ''
		},

		/**
		 * The theme's own icon for a node's mime type, or null off Nextcloud.
		 *
		 * @param {object} node The node.
		 * @return {string|null} The icon url.
		 */
		mimeIconFor(node) {
			const getIconUrl = typeof window !== 'undefined' ? window.OC?.MimeType?.getIconUrl : null
			if (typeof getIconUrl !== 'function') {
				return null
			}
			try {
				return getIconUrl(this.isFolder(node) ? 'dir' : (node.mime || '')) || null
			} catch {
				return null
			}
		},

		/**
		 * A small preview for a raster image, from the core preview endpoint.
		 *
		 * @param {object} node The node.
		 * @return {string|null} The url, or null.
		 */
		previewUrlFor(node) {
			const mime = node.mime || ''
			if (!node.fileid || this.isFolder(node) || !/^image\//i.test(mime) || /svg/i.test(mime) || this.previewFailed[node.fileid]) {
				return null
			}
			if (this.source) {
				return typeof this.source.previewUrl === 'function' ? this.source.previewUrl(node) : null
			}
			return generateUrl('/core/preview?fileId={fileId}&x=64&y=64&a=1', { fileId: node.fileid })
		},

		/**
		 * Remember a preview that did not load.
		 *
		 * @param {object} node The node.
		 * @return {void}
		 */
		onPreviewError(node) {
			this.previewFailed = { ...this.previewFailed, [node.fileid]: true }
		},

		/**
		 * The Files app opened on a folder, for the crumbs above the root.
		 *
		 * @param {string} path The user-relative folder path.
		 * @return {string} The url.
		 */
		filesAppUrl(path) {
			return generateUrl('/apps/files/files?dir={dir}', { dir: path })
		},

		/**
		 * The Files app's permalink for a node.
		 *
		 * @param {object} node The node.
		 * @return {string} The url.
		 */
		permalink(node) {
			return generateUrl('/f/{fileid}', { fileid: node.fileid })
		},

		/**
		 * Whether a file is selected.
		 *
		 * @param {object} node The file.
		 * @return {boolean} True when selected.
		 */
		isSelected(node) {
			return this.selectedIds.includes(String(node.fileid))
		},

		/**
		 * Select or deselect one file.
		 *
		 * @param {object} node The file.
		 * @param {boolean} checked Whether it is now selected.
		 * @return {void}
		 */
		toggleSelected(node, checked) {
			const id = String(node.fileid)
			const rest = this.selectedIds.filter((entry) => entry !== id)
			this.selectedIds = checked ? [...rest, id] : rest
		},

		/**
		 * Select every file the filter keeps, or none.
		 *
		 * @param {boolean} checked Whether to select all.
		 * @return {void}
		 */
		toggleAll(checked) {
			this.selectedIds = checked ? [...this.selectableIds] : []
		},

		/** Drop the selection. */
		clearSelection() {
			this.selectedIds = []
		},

		/**
		 * Run one of the host's bulk actions on the selected files, then drop
		 * the selection. An `open-modal` action's props gain `files` and
		 * `fileIds`; a `handler` action's args gain the selected nodes.
		 *
		 * @param {object} action The declared bulk action.
		 * @return {void}
		 * @spec openspec/changes/files-browser-hosts-a-documents-list/specs/files-browser/spec.md
		 */
		runBulkAction(action) {
			if (!action || typeof action !== 'object') {
				return
			}
			const nodes = this.fileNodes.filter((node) => this.selectedIds.includes(String(node.fileid)))
			const type = action.type || 'handler'
			let wrapped = action
			if (type === 'open-modal') {
				const files = nodes.map((node) => ({ fileId: node.fileid, fileName: node.basename, path: node.path }))
				wrapped = { ...action, props: { ...(action.props || {}), files, fileIds: files.map((file) => file.fileId) } }
			} else if (type === 'handler') {
				wrapped = { ...action, args: [...(action.args || []), nodes] }
			}
			this.selectedIds = []
			if (typeof this.cnDispatchAction === 'function') {
				this.cnDispatchAction(wrapped)
				return
			}
			dispatchAction(wrapped, { router: this.$router || null })
		},

		/**
		 * Choose or drop one facet value.
		 *
		 * @param {string} key The column key.
		 * @param {string} value The value.
		 * @return {void}
		 */
		toggleFacet(key, value) {
			const chosen = this.facetSelections[key] || []
			const next = chosen.includes(value) ? chosen.filter((entry) => entry !== value) : [...chosen, value]
			this.facetSelections = { ...this.facetSelections, [key]: next }
		},

		/** Drop every facet choice. */
		clearFacets() {
			this.facetSelections = {}
		},

		/**
		 * The host's own row actions that belong on this file: those whose
		 * `visibleIf` (extension, mime) holds for it, or that name none.
		 *
		 * @param {object} node The file.
		 * @return {Array<object>} The actions to offer.
		 * @spec openspec/changes/files-browser-hosts-a-documents-list/specs/files-browser/spec.md
		 */
		hostActionsFor(node) {
			return this.rowActions.filter((action) => hostActionApplies(action, node))
		},

		/**
		 * Run one of the host's declared actions on a file.
		 *
		 * An `open-modal` action gets the node merged onto its props as
		 * `fileId`, `fileName` and `path`, the same way a widget's row action
		 * hands a modal its row; a `handler` action gets the node appended to
		 * its args. Everything else is dispatched as declared.
		 *
		 * @param {object} action The declared action.
		 * @param {object} node The file it was clicked on.
		 * @return {void}
		 */
		runHostAction(action, node) {
			if (!action || typeof action !== 'object') {
				return
			}
			const type = action.type || 'handler'
			let wrapped = action
			// A New-menu entry carries no row, only the folder it was opened in.
			const context = node === null
				? { path: this.currentPath }
				: { fileId: node.fileid, fileName: node.basename, path: node.path }
			if (type === 'open-modal') {
				wrapped = { ...action, props: { ...(action.props || {}), ...context, ...this.rowPropsOf(action, node) } }
			} else if (type === 'handler') {
				wrapped = { ...action, args: [...(action.args || []), node ?? this.folder] }
			}
			if (typeof this.cnDispatchAction === 'function') {
				this.cnDispatchAction(wrapped)
				return
			}
			dispatchAction(wrapped, { router: this.$router || null })
		},

		/**
		 * The clicked file's row-data fields an action asks for as modal props
		 * (`rowProps: { prop: field }`), or none.
		 *
		 * @param {object} action The declared action.
		 * @param {object|null} node The file, or null for a New-menu entry.
		 * @return {object} The props.
		 * @spec openspec/changes/files-review-row-when/specs/files-review-row-when/spec.md#requirement-a-modal-action-can-carry-fields-of-the-clicked-files-row-data
		 */
		rowPropsOf(action, node) {
			const wanted = action && action.rowProps
			if (node === null || !wanted || typeof wanted !== 'object') {
				return {}
			}
			const byId = this.resolvedRowData && typeof this.resolvedRowData === 'object' ? this.resolvedRowData : {}
			const entry = byId[node.fileid] ?? byId[String(node.fileid)] ?? {}
			const out = {}
			for (const [prop, field] of Object.entries(wanted)) {
				const value = readPath(entry, String(field))
				if (value !== undefined && value !== null && value !== '') {
					out[prop] = value
				}
			}
			return out
		},

		/**
		 * A click on a linked row opens the file where it lives.
		 *
		 * @param {object} item The linked item.
		 * @return {void}
		 */
		openLinked(item) {
			if (item.href && typeof window !== 'undefined') {
				window.open(item.href, '_blank', 'noopener')
			}
		},

		/**
		 * A middle click on a linked row opens it like a click does.
		 *
		 * @param {object} item The linked item.
		 * @param {MouseEvent} event The auxclick event.
		 * @return {void}
		 */
		onLinkedAuxClick(item, event) {
			if (isRowMiddleClick(event)) {
				this.openLinked(item)
			}
		},

		/**
		 * The current user's id, for callers resolving a root path.
		 *
		 * @return {string} The uid, or the empty string.
		 */
		currentUid() {
			return getCurrentUser()?.uid || ''
		},
	},
}
</script>

<style scoped>
.cn-files-browser {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
	position: relative;
	border-radius: var(--border-radius-large, 8px);
}

.cn-files-browser--dragging {
	outline: 2px dashed var(--color-primary-element);
	outline-offset: 4px;
}

/* With a `dropDetail` the drop state fills the panel it sits in, as the
   board draws it (DqZaakDocumentenSlepen), not only the list's own height. */
.cn-files-browser--dragging.cn-files-browser--drop-panel {
	min-height: max(320px, 100%);
}

.cn-files-browser__drop-detail {
	max-width: 520px;
	font-size: 14px;
	color: var(--color-main-text);
}

.cn-files-browser__drop-overlay {
	position: absolute;
	inset: 0;
	z-index: 2;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 24px;
	box-sizing: border-box;
	border: 2px dashed var(--color-primary-element);
	border-radius: var(--border-radius-large, 8px);
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text, var(--color-main-text));
	text-align: center;
	pointer-events: none;
}

.cn-files-browser__drop-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 56px;
	height: 56px;
	border-radius: 50%;
	background: var(--color-main-background);
	color: var(--color-primary-element);
}

.cn-files-browser__drop-label {
	font-size: 20px;
	font-weight: 700;
}

.cn-files-browser__drop-hint {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-width: 0;
}

.cn-files-browser__crumbs {
	min-width: 0;
	flex: 1 1 auto;
}

/* The crumbs give way, the controls do not: a long crumb (a folder named
   after a uuid) shrank the upload button to "Bestanden..." while the crumbs
   kept their width. */
.cn-files-browser__bar > :not(.cn-files-browser__crumbs) {
	flex-shrink: 0;
}

.cn-files-browser__file-input {
	display: none;
}

.cn-files-browser__uploads {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-files-browser__upload {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-files-browser__upload-name {
	font-size: 13px;
}

.cn-files-browser__upload-error {
	color: var(--color-error);
	font-size: 13px;
}

.cn-files-browser__loading {
	padding: 24px 0;
}

/* `sideCards`: the list and, while a file is selected, a column of cards. */
.cn-files-browser__body--with-side {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(240px, 300px);
	align-items: start;
	gap: 16px;
}

@media (max-width: 900px) {
	.cn-files-browser__body--with-side {
		grid-template-columns: minmax(0, 1fr);
	}
}

.cn-files-browser__side {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

/* In the detail page's side column the cards take its gap and its card
   anatomy, as the page's own side cards are drawn. */
.cn-files-browser__side--in-page {
	gap: calc(5 * var(--default-grid-baseline));
}

.cn-files-browser__side--in-page .cn-files-browser__side-card {
	padding: var(--cn-board-card-padding, 16px 18px);
	border-radius: var(--cn-board-card-radius, var(--border-radius-large));
}

.cn-files-browser__side-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 16px 18px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-main-background);
}

.cn-files-browser__side-title {
	margin: 0;
	font-size: 15px;
	font-weight: 700;
	overflow-wrap: anywhere;
}

.cn-files-browser__side-facts {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr);
	gap: 6px 12px;
	margin: 0;
	font-size: 14px;
}

.cn-files-browser__side-facts dt {
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__side-facts dd {
	margin: 0;
	overflow-wrap: anywhere;
}

.cn-files-browser__side-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

/* A value drawn in a tone (`colorMap` on a column that is not a badge): the
   text in the tone's colour, as the boards write a restricted level. */
.cn-files-browser__tone {
	font-weight: 600;
}

.cn-files-browser__tone--success {
	color: var(--color-success-text, var(--color-success));
}

.cn-files-browser__tone--warning {
	color: var(--color-warning-text, var(--color-warning));
}

.cn-files-browser__tone--error {
	color: var(--color-error-text, var(--color-error));
}

.cn-files-browser__tone--primary,
.cn-files-browser__tone--info {
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-files-browser__table {
	width: 100%;
	border-collapse: collapse;
	table-layout: fixed;
}

.cn-files-browser__table th {
	text-align: start;
	font-weight: normal;
	color: var(--color-text-maxcontrast);
	padding: 4px 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-files-browser__sort {
	background: none;
	border: none;
	padding: 0;
	font: inherit;
	color: inherit;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 2px;
}

.cn-files-browser__sort:hover,
.cn-files-browser__sort:focus-visible {
	color: var(--color-main-text);
}

.cn-files-browser__row {
	cursor: pointer;
}

.cn-files-browser__row:hover,
.cn-files-browser__row:focus-within {
	background-color: var(--color-background-hover);
}

.cn-files-browser__table td {
	padding: 4px 8px;
	border-bottom: 1px solid var(--color-border);
	vertical-align: middle;
}

.cn-files-browser__col-icon {
	width: 48px;
}

.cn-files-browser__col-size {
	width: 96px;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__col-mtime {
	width: 140px;
	white-space: nowrap;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__col-select {
	width: 36px;
	text-align: center;
}

.cn-files-browser__select {
	width: 18px;
	height: 18px;
	margin: 0;
	accent-color: var(--color-primary-element);
}

.cn-files-browser__bulk-bar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: var(--border-radius-large);
	background: var(--color-primary-element-light);
}

.cn-files-browser__bulk-count {
	font-weight: 600;
	margin-inline-end: 8px;
}

.cn-files-browser__review {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-block-end: 12px;
	padding: 14px 16px;
	border-radius: 10px;
	background: var(--color-background-hover);
}

.cn-files-browser__review-head {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	justify-content: space-between;
	gap: 8px;
}

.cn-files-browser__review-title {
	font-size: 15px;
}

.cn-files-browser__review-sub {
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-files-browser__review-bar {
	display: flex;
	height: 8px;
	overflow: hidden;
	border-radius: 4px;
	background: var(--color-border);
}

.cn-files-browser__review-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 18px;
	margin: 0;
	padding: 0;
	font-size: 14px;
	list-style: none;
}

.cn-files-browser__review-legend li {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.cn-files-browser__review-dot {
	width: 10px;
	height: 10px;
	border-radius: 5px;
}

.cn-files-browser__review-part--success {
	background: var(--color-success-text, var(--color-success));
}

.cn-files-browser__review-part--warning {
	background: var(--color-warning);
}

.cn-files-browser__review-part--error {
	background: var(--color-error-text, var(--color-error));
}

.cn-files-browser__review-part--info {
	background: var(--color-primary-element);
}

.cn-files-browser__review-part--default {
	background: var(--color-border-dark);
}

.cn-files-browser__row-button {
	display: inline-flex;
	margin-inline-end: 8px;
	vertical-align: middle;
}

.cn-files-browser__facets {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 16px;
}

.cn-files-browser__facet {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.cn-files-browser__facet-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 32px;
	padding: 0 12px;
	border: 1px solid var(--color-border-dark);
	border-radius: var(--border-radius-pill);
	background: var(--color-main-background);
	color: var(--color-main-text);
	cursor: pointer;
}

.cn-files-browser__facet-chip--active {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light);
}

.cn-files-browser__group-heading {
	padding: 12px 8px 4px;
	text-align: start;
	font-weight: 700;
}

.cn-files-browser__group-count {
	margin-inline-start: 6px;
	font-weight: 400;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__no-match {
	padding: 16px 8px;
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__col-actions {
	width: 48px;
	white-space: nowrap;
}

.cn-files-browser__col-actions:has(.cn-files-browser__row-button) {
	width: auto;
}

.cn-files-browser__col-name {
	min-width: 0;
}

.cn-files-browser__name {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-files-browser__name-secondary {
	display: block;
	overflow: hidden;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-files-browser__footnote {
	margin: 0;
	padding-top: 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-files-browser__row--linked {
	color: var(--color-text-maxcontrast);
}

.cn-files-browser__note {
	color: var(--color-text-maxcontrast);
	display: block;
	font-size: var(--font-size-small, 13px);
}

.cn-files-browser__note-link {
	color: inherit;
	text-decoration: underline;
}

.cn-files-browser__row--folder .cn-files-browser__name {
	font-weight: 600;
}

.cn-files-browser__mime,
.cn-files-browser__thumb {
	width: 32px;
	height: 32px;
	display: block;
}

.cn-files-browser__thumb {
	object-fit: cover;
	border-radius: var(--border-radius, 4px);
}

.cn-files-browser__new-folder {
	padding: 8px 0;
}

.hidden-visually {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>

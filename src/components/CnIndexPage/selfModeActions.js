import {
	cloneObjectForCopy,
	runSelfExportRequest,
	runSelfImportRequest,
} from './selfModeIO.js'

function resolveNameField(ctx) {
	return ctx.effectiveSchema()?.configuration?.objectNameField
		|| ctx.massActionNameField()
}

function findSource(ctx, id) {
	return ctx.effectiveObjects().find((o) => o.id === id || o['@self']?.id === id)
}

function selfModeReady(ctx) {
	return ctx.isSelfFetchMode() && !!ctx.selfObjectStore() && !!ctx.selfObjectType()
}

function refreshList(ctx) {
	const list = ctx.list()
	if (list && typeof list.refresh === 'function') {
		list.refresh()
	}
}

function storeErrorMessage(ctx, fallback) {
	const err = ctx.selfObjectStore()?.getError?.(ctx.selfObjectType())
	return (err && err.message) || fallback
}

/**
 * Self-mode action handlers for CnIndexPage. Each `handle*` returns `true`
 * when self-mode handled it (caller should NOT emit), `false` otherwise.
 *
 * @param {object} ctx Accessor closures + emit/setResults forwarders.
 * @return {object}
 */
export function createSelfModeActions(ctx) {
	async function handleSingleDelete(id) {
		if (!selfModeReady(ctx)) return false
		try {
			const ok = await ctx.selfObjectStore().deleteObject(ctx.selfObjectType(), id)
			if (ok) {
				ctx.setResults.singleDelete({ success: true })
				ctx.emit('delete', id)
				refreshList(ctx)
			} else {
				ctx.setResults.singleDelete({ error: storeErrorMessage(ctx, 'Delete failed') })
			}
		} catch (err) {
			ctx.setResults.singleDelete({ error: (err && err.message) || 'Delete failed' })
		}
		return true
	}

	async function handleMassDelete(ids) {
		if (!selfModeReady(ctx)) return false
		try {
			const { successfulIds, failedIds } = await ctx.selfObjectStore().deleteObjects(ctx.selfObjectType(), ids)
			if (failedIds.length === 0) {
				ctx.setResults.massDelete({ success: true, successfulIds })
			} else {
				ctx.setResults.massDelete({
					error: storeErrorMessage(ctx, `Failed to delete ${failedIds.length} item(s)`),
					successfulIds,
					failedIds,
				})
			}
			refreshList(ctx)
		} catch (err) {
			ctx.setResults.massDelete({ error: (err && err.message) || 'Delete failed' })
		}
		return true
	}

	async function handleSingleCopy(payload) {
		if (!selfModeReady(ctx)) return false
		const { id, newName } = payload || {}
		const source = findSource(ctx, id)
		if (!source) {
			ctx.setResults.singleCopy({ error: 'Source object not found in current view' })
			return true
		}
		try {
			const clone = cloneObjectForCopy(source, newName, resolveNameField(ctx))
			const saved = await ctx.selfObjectStore().saveObject(ctx.selfObjectType(), clone)
			if (saved) {
				ctx.setResults.singleCopy({ success: true })
				ctx.emit('copy', payload)
				refreshList(ctx)
			} else {
				ctx.setResults.singleCopy({ error: storeErrorMessage(ctx, 'Copy failed') })
			}
		} catch (err) {
			ctx.setResults.singleCopy({ error: (err && err.message) || 'Copy failed' })
		}
		return true
	}

	async function handleMassCopy(payload) {
		if (!selfModeReady(ctx)) return false
		const ids = (payload && payload.ids) || []
		const nameField = resolveNameField(ctx)
		const getName = (payload && payload.getName) || ((item) => item[ctx.massActionNameField()])
		const successfulIds = []
		const failedIds = []
		for (const id of ids) {
			const source = findSource(ctx, id)
			if (!source) {
				failedIds.push(id)
				continue
			}
			const clone = cloneObjectForCopy(source, getName(source), nameField)
			try {
				const saved = await ctx.selfObjectStore().saveObject(ctx.selfObjectType(), clone)
				if (saved) successfulIds.push(id)
				else failedIds.push(id)
			} catch (_e) {
				failedIds.push(id)
			}
		}
		if (failedIds.length === 0) {
			ctx.setResults.massCopy({ success: true, successfulIds })
		} else {
			ctx.setResults.massCopy({
				error: storeErrorMessage(ctx, `Failed to copy ${failedIds.length} item(s)`),
				successfulIds,
				failedIds,
			})
		}
		refreshList(ctx)
		return true
	}

	async function handleMassExport(payload) {
		if (!ctx.isSelfFetchMode() || !ctx.register() || !ctx.schema()) return false
		try {
			await runSelfExportRequest({
				register: ctx.register(),
				schema: ctx.schema(),
				format: payload && payload.format,
			})
			ctx.setResults.massExport({ success: true })
		} catch (err) {
			ctx.setResults.massExport({ error: (err && err.message) || 'Export failed' })
		}
		return true
	}

	async function handleMassImport(payload) {
		if (!ctx.isSelfFetchMode() || !ctx.register()) return false
		try {
			await runSelfImportRequest({
				register: ctx.register(),
				schema: ctx.schema(),
				file: payload && payload.file,
			})
			ctx.setResults.massImport({ success: true })
			refreshList(ctx)
		} catch (err) {
			ctx.setResults.massImport({ error: (err && err.message) || 'Import failed' })
		}
		return true
	}

	async function handleFormSave(formData) {
		if (!selfModeReady(ctx)) return false
		try {
			const saved = await ctx.selfObjectStore().saveObject(ctx.selfObjectType(), formData)
			if (saved) {
				ctx.setResults.form({ success: true })
				ctx.emit(ctx.editItem() ? 'edit' : 'create', saved)
				refreshList(ctx)
			} else {
				const err = ctx.selfObjectStore()?.getError?.(ctx.selfObjectType())
				if (err && err.isValidation) {
					// Keep the form visible so the user can fix the invalid data.
					ctx.setResults.formValidation(err.fields, err.message || 'Validation failed')
				} else {
					ctx.setResults.form({ error: (err && err.message) || 'Save failed' })
				}
			}
		} catch (err) {
			ctx.setResults.form({ error: (err && err.message) || 'Save failed' })
		}
		return true
	}

	return {
		handleSingleDelete,
		handleMassDelete,
		handleSingleCopy,
		handleMassCopy,
		handleMassExport,
		handleMassImport,
		handleFormSave,
	}
}

# CnFormBuilder — visual form composer

## Why

The pipelinq triage flagged `SurveyFormView` (visual survey builder) and `FormBuilderView` (forms list visual builder) as customs because no lib widget composes a form definition. The shape recurs for survey builders, intake form designers, signup field editors.

## What

`src/components/CnFormBuilder/CnFormBuilder.vue` (~430 LOC). Three-column composer (palette, field list, per-field config) + JSON preview footer. v-model emits the live `fields[]` array. Default palette: string / number / boolean / enum / textarea. `availableTypes` prop lets consumers extend.

MVP — drag-drop reorder deferred to follow-up (issue #279). The contract is forward-compatible.

## Non-goals (this PR)

- Drag-drop reorder.
- Per-field validation rule editor (regex / min / max).
- Conditional visibility (`showIf`).
- Live embedded `CnFormDialog` preview (consumers compose this).

## References

- [nextcloud-vue#279](https://github.com/ConductionNL/nextcloud-vue/issues/279).
- pipelinq `SurveyFormView` + `FormBuilderView`.

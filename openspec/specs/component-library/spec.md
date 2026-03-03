# Component Library — Core Conventions

## Purpose
Defines the foundational conventions all components in @conduction/nextcloud-vue MUST follow.

---

## Requirements

### REQ-CL-001: Component Naming and Structure

All components MUST follow the Cn-prefixed naming convention with barrel exports.

#### Scenario: Component directory structure

- GIVEN a new component named `CnMyComponent`
- THEN it MUST live in `src/components/CnMyComponent/CnMyComponent.vue`
- AND an `index.js` barrel MUST exist at `src/components/CnMyComponent/index.js`
- AND the barrel MUST re-export as `export { default as CnMyComponent } from './CnMyComponent.vue'`
- AND the component MUST be added to `src/components/index.js`
- AND the component MUST be added to `src/index.js`

### REQ-CL-002: Vue 2 Options API

All components MUST use Vue 2 Options API.

#### Scenario: Component structure

- GIVEN any component in the library
- THEN it MUST use `export default { name, components, props, data, computed, methods }`
- AND it MUST NOT use `<script setup>` or Composition API
- AND `name` MUST match the file name (e.g., `name: 'CnDataTable'`)

### REQ-CL-003: Backward Compatibility

Components MUST maintain backward compatibility across versions.

#### Scenario: Adding a new prop

- GIVEN an existing component
- WHEN a new prop is added
- THEN the prop MUST have a default value
- AND existing consumers MUST NOT break

#### Scenario: Removing a prop

- GIVEN an existing component with a prop
- WHEN the prop is no longer needed
- THEN it MUST be deprecated with `console.warn` (not removed)
- AND behavior MUST remain unchanged for consumers using the deprecated prop

### REQ-CL-004: CSS Conventions

All CSS classes MUST follow the library's naming and theming conventions.

#### Scenario: Class naming

- GIVEN any component CSS
- THEN all classes MUST use the `cn-` prefix (e.g., `cn-data-table__header`)

#### Scenario: Nextcloud-native theming

- GIVEN a CSS property that uses color or theming
- THEN it MUST use Nextcloud CSS variables (e.g., `var(--color-primary-element)`, `var(--color-border)`)
- AND MUST NOT reference `--nldesign-*` variables directly (the nldesign app overrides Nextcloud variables automatically)
- AND MUST NOT hardcode color values

### REQ-CL-005: Translation Support

Components MUST support pre-translated strings via props.

#### Scenario: Translatable labels

- GIVEN a component with user-visible text
- THEN all text MUST be configurable via props with English defaults
- AND components MUST NOT import `t()` from any specific app

### REQ-CL-006: JSDoc Documentation

All component interfaces MUST be documented with JSDoc.

#### Scenario: Component documentation

- GIVEN any component
- THEN every prop MUST have a JSDoc comment
- AND every emitted event MUST have an `@event` tag
- AND every public method MUST have `@public` and `@param` tags
- AND the component MUST have a module-level JSDoc with `@example`

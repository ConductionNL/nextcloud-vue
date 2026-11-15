# record-list-section-intro-heading Delta: record-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-section-intro-heading](../../)

## ADDED Requirements

### Requirement: A section's intro can be its group heading

With `content.introAsHeading: true` a record list SHALL draw its `intro` as a group heading (`h3`, the `cn-record-list__group-heading` style) instead of the intro line. While such a list has read no rows and declares `emptyText: ""`, the heading SHALL NOT be drawn. Without `introAsHeading` the intro SHALL stay the plain line.

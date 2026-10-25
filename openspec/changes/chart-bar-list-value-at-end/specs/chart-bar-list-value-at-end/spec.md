# chart-bar-list-value-at-end Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A bar list can put each value at its bar's end

With `barValueAtEnd: true` a `bar-list` chart SHALL draw each bar without a track, sized to its share of the largest value (or `barMax`), and SHALL draw the value right after the bar's end; the longest bar gives way so its value fits. Without it the track and the value column SHALL stay. A dashboard chart SHALL hand `barValueAtEnd` through from its content. In the board look the rows SHALL be 13px, the label in the soft secondary text.

#### Scenario: DqProcesanalyse Doorlooptijd per status

- **THEN** "Advies" has the longest bar with "432 h" right after it, and "Ontvangst" a short bar with "31 h" after it

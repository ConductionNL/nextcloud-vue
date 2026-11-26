# BOARD_LOOK_FLAG

The attribute (`data-cn-board-look`) that [`enableBoardLookStyle`](./enable-board-look-style.md) sets on `<html>` once a component on the page uses the board look. The library's stylesheet installer reads it: a board-look sheet installed after the flag is set is active at once.

## Import

```js
import { BOARD_LOOK_FLAG } from '@conduction/nextcloud-vue'
```

## Usage

```js
import { BOARD_LOOK_FLAG } from '@conduction/nextcloud-vue'

const boardLookInUse = document.documentElement.hasAttribute(BOARD_LOOK_FLAG)
```

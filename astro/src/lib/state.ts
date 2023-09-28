import type { EditorView } from '@codemirror/view'
import { signal } from '@preact/signals'
import { createState } from './createState.js'
import { type Haxidraw, Turtle, type Point } from './drawingToolkit/index.js'
import type { Art, SessionInfo } from './db/account.ts'

// state types

export type CodePosition = {
  line: number
  column: number
}

export type ErrorState = {
  stack: CodePosition[]
  code: string
  name: string
  message: string
}

export type ConsoleMessage = {
  values: [any, ...any[]]
  type: 'log' | 'error' | 'warn'
  time: number
  pos?: CodePosition
}

export type GlobalState = {
  inst: Haxidraw | null
  connected: boolean
  turtles: Turtle[]
  turtlePos: Point | null
  error: ErrorState | null
  console: ConsoleMessage[]
  docDimensions: {
    width: number
    height: number
  }
  running: boolean
  view: EditorView | null
  theme: 'light' | 'dark'
  vimMode: boolean
}

// setting/initializing state

const newState: Omit<GlobalState, 'code'> = {
  inst: null,
  connected: false,
  turtles: [],
  turtlePos: null,
  error: null,
  console: [],
  running: false,
  docDimensions: {
    width: 125,
    height: 125
  },
  view: null,
  theme: 'light',
  vimMode: false
}

export const makeNewState = (): GlobalState => {
  return {
    ...newState
  }
}

export const [patchStore, getStore] = createState<GlobalState>(makeNewState())

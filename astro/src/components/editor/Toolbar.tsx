import { useEffect, useState } from 'preact/hooks'
import download from '../../lib/client/download'
import runCode from '../../lib/run'
import defaultProgram from '../../lib/examples/defaultProgram'
import { patchStore, getStore } from '../../lib/state/state'
import { type PersistenceState } from '../../lib/state/persist'
import { loadCodeFromString } from '../../lib/client/loadCodeFromString'
import styles from './Toolbar.module.scss'
import Button from '../../ui/editor/Button'
import cx from 'classnames'
import {
  connect,
  disconnect,
  runMachine,
  tryAutoConnect
} from '../../lib/client/machine'
import { throttle } from 'throttle-debounce'
import { Signal, useSignal, useSignalEffect } from '@preact/signals'
import BrightnessContrastIcon from '../../ui/icons/BrightnessContrastIcon'
import SettingsIcon from '../../ui/icons/SettingsIcon'
import KeyboardIcon from '../../ui/icons/KeyboardIcon'
import GitHubIcon from '../../ui/icons/GitHubIcon'
import SaveButton from './SaveButton'
import { persist } from '../../db/auth-helper'

export default function Toolbar({ persistenceState }) {
  const { connected } = getStore()

  const [hidden, setHidden] = useState(true)
  const [status, setStatus] = useState('')

  useSignalEffect(() => {
    switch (persistenceState.value.cloudSaveState) {
      case 'SAVED':
        setStatus('Saved')
        break
      case 'SAVING':
        setStatus('Saving')
        break
      case 'ERROR':
        setStatus('Error')
        break
    }
  })

  return (
    <nav id="navbar">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
        <div>
          <h1 style={{ paddingRight: 0 }}>
            <a href="/">blot</a>
          </h1>
        </div>
        <div class="navbar-links no-gap">
          <RunButton />
          <NewButton />
          <OpenButton />
          <div
            style={{
              position: 'relative',
              cursor: 'default',
              width: 'min-width'
            }}
            onMouseEnter={() => setHidden(false)}
            onMouseLeave={() => setHidden(true)}>
            <Button variant="ghost">download</Button>
            <div
              style={{
                display: hidden ? 'none' : '',
                position: 'absolute',
                background: 'var(--primary)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 9999,
                width: '100%',
                top: '100%',
                padding: '5px',
                borderRadius: '5px'
              }}>
              <DownloadButton />
              <DownloadSVG />
              <DownloadPNG />
            </div>
          </div>
        </div>
      </div>
      {persistenceState ? (
        <div
          class="navbar-links no-gap"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column'
          }}>
          <a>{persistenceState.value.art.name}</a>
          {status}
        </div>
      ) : null}
      <div
        class="navbar-links no-gap"
        style={{ display: 'flex', alignItems: 'center' }}>
        <MachineControls />
        <GitHubLink />
        <SettingsButton />
        {persistenceState ? (
          <ShareLink persistenceState={persistenceState} />
        ) : (
          <RemixLink />
        )}
      </div>
    </nav>
  )
}

export function ShareLink({ persistenceState }) {
  return (
    <Button variant="ghost" onClick={() => {}}>
      share
    </Button>
  )
}

export function RemixLink() {
  return <Button variant="ghost">remix to save edits</Button>
}

export function GitHubLink() {
  return (
    <Button variant="ghost">
      <a
        style={{ all: 'unset' }}
        href="https://github.com/hackclub/blot/tree/main"
        rel="noreferrer"
        target="_blank">
        <div style={{ transform: 'translate(0, 3.5px)' }}>
          <GitHubIcon className={styles.icon} />
        </div>
      </a>
    </Button>
  )
}

export function RunButton() {
  // Keyboard shortcut - shift + enter
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        await runCode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <Button class="navbar-button" variant="ghost" onClick={() => runCode()}>
      run (shift+enter)
    </Button>
  )
}

function getCode() {
  const { view } = getStore()

  const code = view.state.doc.toString()

  return code
}

function DownloadButton() {
  return (
    <div
      class={styles.dropdownEntry}
      onClick={() => download('project.js', getCode())}>
      js
    </div>
  )
}

function NewButton() {
  return (
    <Button
      variant="ghost"
      onClick={() => {
        loadCodeFromString(defaultProgram)
      }}>
      new
    </Button>
  )
}

function DownloadSVG() {
  return (
    <div
      class={styles.dropdownEntry}
      onClick={() => {
        const { turtles, docDimensions } = getStore()

        const turtleToPathData = t => {
          let d = ''

          t.path.forEach(pl =>
            pl.forEach((pt, i) => {
              const [x, y] = pt
              if (i === 0) d += `M ${x} ${y}`
              else d += `L ${x} ${y}`
            })
          )

          return d
        }

        const turtleToPath = t => {
          const d = turtleToPathData(t)

          return `<path 
                    d="${d}" 
                    stroke-width="0.25" 
                    stroke="black" 
                    fill="none" 
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="transform: scale(1, 1);"
                    />`
        }

        const paths = turtles.map(turtleToPath)

        const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
                  docDimensions.width
                } ${docDimensions.height}" width="${
                  docDimensions.width
                }mm" height="${docDimensions.height}mm">
                    ${paths.join('\n')}
                </svg>
            `
        download('anon.svg', svg)
      }}>
      svg
    </div>
  )
}

function DownloadPNG() {
  return (
    <div
      class={styles.dropdownEntry}
      onClick={() => {
        const { turtles, docDimensions } = getStore()

        const turtleToPathData = t => {
          let d = ''

          t.path.forEach(pl =>
            pl.forEach((pt, i) => {
              const [x, y] = pt
              if (i === 0) d += `M ${x} ${y}`
              else d += `L ${x} ${y}`
            })
          )

          return d
        }

        const turtleToPath = t => {
          const d = turtleToPathData(t)

          return `<path 
                    d="${d}" 
                    stroke-width="0.25" 
                    stroke="black" 
                    fill="none" 
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="transform: scale(1, 1);"
                    />`
        }

        const paths = turtles.map(turtleToPath)

        const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
                  docDimensions.width
                } ${docDimensions.height}" width="${
                  docDimensions.width
                }mm" height="${docDimensions.height}mm">
                    ${paths.join('\n')}
                </svg>
            `

        // Create a new Image element
        const img = new Image()
        img.onload = function () {
          // Create a temporary canvas
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          // Draw the image on the canvas
          const context = canvas.getContext('2d')
          context.drawImage(img, 0, 0)

          // Convert canvas to PNG data URL
          const pngDataUrl = canvas.toDataURL('image/png')

          // Create a download link
          const downloadLink = document.createElement('a')
          downloadLink.href = pngDataUrl
          downloadLink.download = 'image.png'
          downloadLink.textContent = 'Download PNG'

          // Simulate a click on the download link
          downloadLink.click()
        }

        // Convert SVG to data URL
        const svgDataUrl =
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

        // Set the Image source to the SVG data URL
        img.src = svgDataUrl
      }}>
      png
    </div>
  )
}

function OpenButton() {
  return (
    <Button
      variant="ghost"
      onClick={() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.js'
        input.onchange = () => {
          if (input.files?.length) {
            const file = input.files[0]
            const reader = new FileReader()
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                loadCodeFromString(reader.result)
              }
            }
            reader.readAsText(file)
          }
        }
        input.click()
      }}>
      open
    </Button>
  )
}

export function MachineControls() {
  const { inst, running } = getStore()

  useEffect(() => {
    tryAutoConnect()
  }, [])

  return (
    <div>
      {inst ? (
        <>
          <Button variant="ghost" onClick={disconnect}>
            <span>disconnect</span>
          </Button>
          <div class={styles.separator} />
          <Button variant="ghost" loading={running} onClick={runMachine}>
            run machine
          </Button>
        </>
      ) : (
        <Button variant="ghost" onClick={connect}>
          <span>connect to machine</span>
        </Button>
      )}
    </div>
  )
}

function SettingsButton() {
  const { theme, vimMode } = getStore()
  const [hidden, setHidden] = useState(true)

  return (
    <div
      style={{
        cursor: 'default',
        width: 'min-width'
      }}
      onMouseEnter={() => setHidden(false)}
      onMouseLeave={() => setHidden(true)}>
      <Button variant="ghost">
        <a style={{ all: 'unset' }}>
          <div style={{ transform: 'translate(0, 3.5px)' }}>
            <SettingsIcon className={styles.icon} />
          </div>
        </a>
      </Button>
      <div
        style={{
          'display': hidden ? 'none' : '',
          'position': 'absolute',
          'right': '5px',
          'background': 'var(--primary)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'z-index': 9999,
          'padding': '5px',
          'border-radius': '5px'
        }}>
        <Button
          class={styles.dropdownEntry}
          variant="ghost"
          onClick={() => {
            const newTheme = theme === 'dark' ? 'light' : 'dark'
            patchStore({
              theme: newTheme
            })

            document.body.dataset.theme = newTheme
            localStorage.setItem('colorTheme', newTheme)
            setHidden(false)
          }}>
          <BrightnessContrastIcon className={styles.icon} />
          <span>toggle theme</span>
        </Button>
        <Button
          class={styles.dropdownEntry}
          variant="ghost"
          onClick={() => {
            patchStore({ vimMode: !vimMode })
            localStorage.setItem('vimMode', (!vimMode).toString())
            setHidden(false)
          }}>
          <KeyboardIcon className={styles.icon} />
          <span>{vimMode ? 'disable' : 'enable'} vim mode</span>
        </Button>
      </div>
    </div>
  )
}

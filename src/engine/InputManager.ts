import type { InputState } from '../types/engine'

export class InputManager {
  private keys = new Set<string>()
  private justPressed = new Set<string>()
  private prevKeys = new Set<string>()

  state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    jumpPressed: false,
    action: false,
  }

  attach(target: HTMLElement) {
    target.tabIndex = 0
    target.style.outline = 'none'
    target.addEventListener('keydown', this.onKeyDown)
    target.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('blur', this.onBlur)
    target.focus()
  }

  detach(target: HTMLElement) {
    target.removeEventListener('keydown', this.onKeyDown)
    target.removeEventListener('keyup', this.onKeyUp)
    target.removeEventListener('blur', this.onBlur)
  }

  poll() {
    this.justPressed.clear()
    for (const key of this.keys) {
      if (!this.prevKeys.has(key)) {
        this.justPressed.add(key)
      }
    }

    this.state.left = this.keys.has('ArrowLeft') || this.keys.has('KeyA')
    this.state.right = this.keys.has('ArrowRight') || this.keys.has('KeyD')
    this.state.up = this.keys.has('ArrowUp') || this.keys.has('KeyW')
    this.state.down = this.keys.has('ArrowDown') || this.keys.has('KeyS')
    this.state.jump = this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW')
    this.state.jumpPressed = this.justPressed.has('Space') || this.justPressed.has('ArrowUp') || this.justPressed.has('KeyW')
    this.state.action = this.keys.has('KeyE') || this.keys.has('Enter')

    this.prevKeys = new Set(this.keys)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    e.preventDefault()
    this.keys.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  private onBlur = () => {
    this.keys.clear()
  }
}

import { currentFiber, dispatchUpdate } from './ui/renderer'

export const statesWatchers = new WeakMap()
window.states = statesWatchers // debug

export default function State(initial) {

    // Local
    if (currentFiber) {
        const fiber = currentFiber
        const index = fiber.stateIndex++
        const state = fiber.states.hasOwnProperty(index) ? fiber.states[index] : initial
        fiber.states[index] = state

        const setState = data => {
            fiber.states[index] = typeof data === 'function' ? data(fiber.states[index]) : data
            dispatchUpdate(fiber)
        }

        return [state, setState]
    }

    // Global
    const watchers = []

    const setState = data => {
        Object.assign(initial, (typeof data === 'function' ? data(initial) : data))
        watchers.forEach(fiber => dispatchUpdate(fiber))
    }

    statesWatchers.set(initial, watchers)

    return [initial, setState]
}

export function watch(globalState) {

    if (!currentFiber) return
    if (currentFiber.watching.indexOf(globalState) !== -1) return

    const watchers = statesWatchers.get(globalState)

    /* if (currentFiber.alternate) {
        const index = watchers.indexOf(currentFiber.alternate)
        if (index !== -1) watchers.splice(index, 1)
    } */

    currentFiber.watching.push(globalState)
    watchers.push(currentFiber)
}

import Element from './types/Element'
import Inline from './types/Inline'
import Value from './types/Value'
import render from './render'

export default function reconcile(currentContainer, newContainer) {

    if (!currentContainer.children.length) return

    if (currentContainer.childKeys.length || newContainer.childKeys.length) {
        replaceKeyed(currentContainer.children, newContainer.children)
        return
    }

    replace(currentContainer.children, newContainer.children)
}

function replace(currentContainers, newContainers) {

    const parentNode = currentContainers[0].node.parentNode

    for (let i=0; ; i++) {

        if (currentContainers[i]) {

            if (newContainers[i]) {

                if (diff(currentContainers[i], newContainers[i])) continue
                render(newContainers[i])
                parentNode.replaceChild(newContainers[i].node, currentContainers[i].node)
                continue
            }

            parentNode.removeChild(currentContainers[i].node)
            continue
        }

        if (newContainers[i]) {
            const fragment = document.createDocumentFragment()
            for ( ; i<newContainers.length; i++) {
                render(newContainers[i])
                fragment.appendChild(newContainers[i].node)
            }
            parentNode.appendChild(fragment)
            return
        }

        return
    }
}

function replaceKeyed(currentContainers, newContainers) {

    const parentNode = currentContainers[0].node.parentNode

    // Swaps the current containers
    const swap = (i, index) => {
        const nextSibling = currentContainers[index].node.nextSibling
        const currentContainerNode = parentNode.replaceChild(currentContainers[index].node, currentContainers[i].node)
        parentNode.insertBefore(currentContainerNode, nextSibling)
        newContainers[i] = currentContainers[index]
        currentContainers[index] = currentContainers[i]
    }

    // Inserts the new container
    const insert = (i) => {
        render(newContainers[i])
        parentNode.insertBefore(newContainers[i].node, currentContainers[i].node)
        currentContainers.unshift(null) // aligns indexes of both arrays
    }

    // Replaces the current container with the new container
    const replaceWithNew = (i) => {
        if (diff(currentContainers[i], newContainers[i])) return
        render(newContainers[i])
        parentNode.replaceChild(newContainers[i].node, currentContainers[i].node)
    }

    // Replaces the current container with the existing new container (actually, with another current container)
    const replaceWithExisting = (i, index) => {
        parentNode.replaceChild(currentContainers[index].node, currentContainers[i].node)
        newContainers[i] = currentContainers[index]
        currentContainers.splice(index, 1)
    }

    // Returns true if the key of the current container was found in newContainers
    const foundCurrentInNewContainers = (i) => {
        for (let j=i+1; j<newContainers.length; j++) if (currentContainers[i].key === newContainers[j].key) return true
        return false
    }

    // Returns the index of the current container whose key matches the key of the new container, or -1 if there is no 
    // match
    const getIndexOfCurrentThatMatchesNew = (i) => {
        for (let j=i+1; j<currentContainers.length; j++) if (newContainers[i].key === currentContainers[j].key) return j
        return -1
    }

    for (let i=0; ; i++) {

        if (currentContainers[i]) {

            // Both containers exist
            if (newContainers[i]) {

                if (currentContainers[i].key != null) {

                    // Both containers keyed
                    if (newContainers[i].key != null) {

                        // Equal keys, so skip
                        if (currentContainers[i].key === newContainers[i].key) {
                            newContainers[i] = currentContainers[i]
                            continue
                        }

                        // Different keys
                        const indexOfCurrentThatMatchesNew = getIndexOfCurrentThatMatchesNew(i)

                        // The key of the current container was found, so the current container will remain
                        if (foundCurrentInNewContainers(i)) {

                            //  The key of the already existing new container was found, both containers remain, so swap
                            if (indexOfCurrentThatMatchesNew !== -1) {
                                swap(i, indexOfCurrentThatMatchesNew)
                                continue
                            }

                            // The key of the new container wasn't found, so insert the new container
                            insert(i)
                            continue
                        }

                        // The key of the current container wasn't found, but the key of the already existing new 
                        // container was found, so replace
                        if (indexOfCurrentThatMatchesNew !== -1) {
                            replaceWithExisting(i, indexOfCurrentThatMatchesNew)
                            continue
                        }

                        // The key of the current container wasn't found, also the key of the new container wasn't 
                        // found, so replace the current container with the new one
                        replaceWithNew(i)
                        continue
                    }

                    // Keyed current container and non-keyed new container

                    // The key of the current container was found, so insert the new container
                    if (foundCurrentInNewContainers(i)) {
                        insert(i)
                        continue
                    }

                    // The key of the current container wasn't found, so replace with the new container
                    replaceWithNew(i)
                    continue
                }

                // Non-keyed current container and keyed new container
                if (newContainers[i].key != null) {

                    const indexOfCurrentThatMatchesNew = getIndexOfCurrentThatMatchesNew(i)

                    // The key of the existing new container was found, so replace
                    if (indexOfCurrentThatMatchesNew !== -1) {
                        replaceWithExisting(i, indexOfCurrentThatMatchesNew)
                        continue
                    }

                    // The key of the existing new container wasn't found, so replace with the new container:
                    // --->
                }

                // Non-keyed current container and non-keyed new container, so replace with the new container
                replaceWithNew(i)
                continue
            }

            // No more new containers, so remove the remaining current containers
            for (let j=currentContainers.length-1; j>=i; j--) parentNode.removeChild(currentContainers[j].node)
            return
        }

        // No more current containers, so append the remaining new containers
        if (newContainers[i]) {
            const fragment = document.createDocumentFragment()
            for ( ; i<newContainers.length; i++) {
                render(newContainers[i])
                fragment.appendChild(newContainers[i].node)
            }
            parentNode.appendChild(fragment)
            return
        }

        // No more containers
        return
    }

}

function diff(currentContainer, newContainer) {

    // Skip same containers from props.children of a Component
    if (currentContainer.node === newContainer.node) return true

    // Same type containers
    if (currentContainer.constructor === newContainer.constructor) {

        // Skip same Value containers
        if (currentContainer instanceof Value && currentContainer.value === newContainer.value) {
            newContainer.node = currentContainer.node
            return true
        }

        // Skip same Inline containers
        if (currentContainer instanceof Inline && currentContainer.inline === newContainer.inline) {
            newContainer.node = currentContainer.node
            return true
        }

        // Update same type Elements
        if (currentContainer instanceof Element && currentContainer.type === newContainer.type) {

            // node
            newContainer.node = currentContainer.node

            // attributes

            for (const attr in currentContainer.attributes) {
                
                // the attribute exists in the new container
                if (newContainer.attributes[attr] != null) {

                    // skip same attribute values
                    if (currentContainer.attributes[attr] === newContainer.attributes[attr]) continue

                    // update attribute values
                    newContainer.node.setAttribute(attr, newContainer.attributes[attr])
                    continue
                }

                // remove the current container attributes not present in the new container
                newContainer.node.removeAttribute(attr)

            }

            for (const attr in newContainer.attributes) {

                if (attr === 'value') {
                    newContainer.node.value = newContainer.attributes[attr]
                    continue
                }

                // skip already processed attributes
                if (currentContainer.attributes[attr] != null) continue

                // set the new attributes
                newContainer.node.setAttribute(attr, newContainer.attributes[attr])

            }

            // event listeners

            for (let eventType in currentContainer.eventListeners) {
                newContainer.node[eventType] = null
            }

            for (let eventType in newContainer.eventListeners) {
                newContainer.node[eventType] = newContainer.eventListeners[eventType]
            }

            // Replace children or set/update innerHTML

            if (newContainer.html != null) {
                newContainer.node.innerHTML = newContainer.html
                return true
            }

            if (currentContainer.html != null) {
                const fragment = document.createDocumentFragment()
                for (let i=0; i<newContainer.children.length; i++) {
                        render(newContainer.children[i])
                        fragment.appendChild(newContainer.children[i].node)
                }
                newContainer.node.innerHTML = ''
                newContainer.node.appendChild(fragment)
                return true
            }

            reconcile(currentContainer, newContainer)
            return true
        }
    }

    return false
}
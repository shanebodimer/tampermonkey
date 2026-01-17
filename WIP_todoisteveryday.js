// ==UserScript==
// @name         Todoist Everyday
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hide everyday tasks from personal filter view
// @author       You
// @match        https://app.todoist.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=todoist.com
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoisteveryday.js
// @downloadURL  https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoisteveryday.js
// ==/UserScript==

;(function () {
    'use strict'

    // Constants for filter names
    const FILTER_PERSONAL = 'personal'
    const FILTER_PERSONAL_TOMORROW = 'personal-tomorrow'

    // Task IDs to remove
    const TASKS = ['task_id']

    // Flags to track initialization state
    let isInitialized = false
    let currentUrl = window.location.href

    // Add custom styles
    GM_addStyle(`
        .todoist-everyday-header-wrapper {
            display: flex !important;
            width: 100% !important;
            align-items: center !important;
        }
        .todoist-everyday-header-wrapper > div:first-child {
            width: auto !important;
            flex-shrink: 0 !important;
        }
        .todoist-everyday-spacer {
            flex-grow: 1 !important;
            border: 1px solid white !important;
            height: 100% !important;
            min-height: 40px !important;
        }
    `)

    // Function to check if current URL matches the target pattern
    function isTargetUrl() {
        const url = window.location.href
        return (
            url.includes(
                `https://app.todoist.com/app/filter/${FILTER_PERSONAL}-`
            ) ||
            url === `https://app.todoist.com/app/filter/${FILTER_PERSONAL}` ||
            url ===
                `https://app.todoist.com/app/filter/${FILTER_PERSONAL_TOMORROW}`
        )
    }

    // Function to modify the header element
    function modifyHeader() {
        if (!isTargetUrl()) {
            return
        }

        // Find all h1 elements
        const h1Elements = document.querySelectorAll('h1')

        h1Elements.forEach((h1) => {
            const text = h1.textContent.trim()

            // Check if h1 contains target text
            if (text === FILTER_PERSONAL || text === FILTER_PERSONAL_TOMORROW) {
                // Find the parent div that wraps the h1
                // Based on the HTML structure provided: <div><div><h1>personal</h1></div></div>
                // We need to go up two levels to get to the outer wrapper div
                const innerDiv = h1.parentElement
                if (!innerDiv) return

                const outerDiv = innerDiv.parentElement
                if (!outerDiv) return

                // Check if we've already modified this element
                if (
                    outerDiv.classList.contains(
                        'todoist-everyday-header-wrapper'
                    )
                ) {
                    return
                }

                // Add our custom class to make it flex container
                outerDiv.classList.add('todoist-everyday-header-wrapper')

                // Create the red spacer div
                const spacerDiv = document.createElement('div')
                spacerDiv.className = 'todoist-everyday-spacer'

                // Append the spacer to the outer div
                outerDiv.appendChild(spacerDiv)

                console.log('Todoist Everyday: Modified header for', text)
            }
        })
    }

    // Function to remove tasks by ID
    function removeTasksById() {
        TASKS.forEach((taskId) => {
            // Find the li element with matching task id
            const taskElement = document.getElementById(`task-${taskId}`)

            if (taskElement) {
                // Navigate up to get the wrapper divs
                // Structure: <div overflow-anchor><div role="presentation"><li>
                const presentationDiv = taskElement.parentElement
                if (!presentationDiv) return

                const outerWrapperDiv = presentationDiv.parentElement
                if (!outerWrapperDiv) return

                // Log the full element being removed
                console.log(
                    `Todoist Everyday: Removing task element for ID ${taskId}:`
                )
                console.log(outerWrapperDiv.outerHTML)

                // Remove the entire wrapper
                outerWrapperDiv.remove()
            }
        })
    }

    // Function to handle URL changes
    function handleUrlChange() {
        const newUrl = window.location.href

        if (newUrl !== currentUrl) {
            console.log('Todoist Everyday: URL changed to', newUrl)
            currentUrl = newUrl
            isInitialized = false

            // Run the modification after a small delay to let the DOM update
            setTimeout(() => {
                modifyHeader()
                removeTasksById()
            }, 100)
        }
    }

    // Monitor for URL changes using multiple methods
    function setupUrlMonitoring() {
        // Method 1: Listen to popstate event (browser back/forward)
        window.addEventListener('popstate', handleUrlChange)

        // Method 2: Override pushState and replaceState
        const originalPushState = history.pushState
        const originalReplaceState = history.replaceState

        history.pushState = function (...args) {
            originalPushState.apply(this, args)
            handleUrlChange()
        }

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args)
            handleUrlChange()
        }

        // Method 3: Watch for DOM changes and check URL periodically
        setInterval(() => {
            handleUrlChange()
        }, 500)

        console.log('Todoist Everyday: URL monitoring set up')
    }

    // Initialize the script
    function initialize() {
        if (isInitialized) return

        if (isTargetUrl()) {
            modifyHeader()
            removeTasksById()
            isInitialized = true
        }
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize)
    } else {
        initialize()
    }

    // Set up URL monitoring
    setupUrlMonitoring()

    // Also observe DOM changes for dynamic content
    const observer = new MutationObserver(() => {
        if (isTargetUrl() && !isInitialized) {
            modifyHeader()
            removeTasksById()
            isInitialized = true
        } else if (isTargetUrl()) {
            // Keep checking in case new elements are added
            modifyHeader()
            removeTasksById()
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    console.log('Todoist Everyday: Script initialized')
})()

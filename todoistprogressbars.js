// ==UserScript==
// @name         Todoist Progress Bars
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Add progress bars to tasks with subtasks (perf-safe)
// @author       You
// @match        https://app.todoist.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=todoist.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistprogressbars.js
// @downloadURL  https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistprogressbars.js
// ==/UserScript==
;(function () {
    'use strict'

    // Add CSS for progress bars
    const style = document.createElement('style')
    style.textContent = `
        .custom-progress-bar {
            width: 100px;
            height: 4px;
            background-color: #777;
            border-radius: 3px;
            overflow: hidden;
            display: inline-block;
            vertical-align: middle;
            margin-top: 2px;
        }
        .custom-progress-fill {
            height: 100%;
            background-color: #CCC;
            transition: width 0.3s ease;
        }
    `
    document.head.appendChild(style)

    // --- perf guards ---
    let observer = null
    let selfMutating = false // true while WE are touching the DOM, so we ignore our own mutations
    let scheduled = false // rAF debounce flag

    function addProgressBars() {
        const subtaskSvgs = document.querySelectorAll(
            'svg[aria-label*="sub-task"]'
        )

        subtaskSvgs.forEach((svg) => {
            const span = svg.parentElement
            if (!span) return

            const textSpan = span.querySelector('span[aria-hidden="true"]')
            if (!textSpan) return

            const text = textSpan.textContent.trim()
            const match = text.match(/(\d+)\/(\d+)/)
            if (!match) return

            const completed = parseInt(match[1], 10)
            const total = parseInt(match[2], 10)
            const percentage = total > 0 ? (completed / total) * 100 : 0

            let progressBar = span.nextElementSibling
            if (
                progressBar &&
                progressBar.classList.contains('custom-progress-bar')
            ) {
                // Update existing — but only write to the DOM if the value actually changed.
                const progressFill = progressBar.querySelector(
                    '.custom-progress-fill'
                )
                if (progressFill) {
                    const desired = `${percentage}%`
                    if (progressFill.style.width !== desired) {
                        progressFill.style.width = desired
                    }
                }
            } else {
                // Create new
                progressBar = document.createElement('div')
                progressBar.className = 'custom-progress-bar'
                const progressFill = document.createElement('div')
                progressFill.className = 'custom-progress-fill'
                progressFill.style.width = `${percentage}%`
                progressBar.appendChild(progressFill)
                span.parentNode.insertBefore(progressBar, span.nextSibling)
            }
        })
    }

    // Run our DOM writes inside a "self-mutating" window and temporarily
    // disconnect the observer so our own insertions can never re-trigger us.
    function runGuarded() {
        scheduled = false
        selfMutating = true
        if (observer) observer.disconnect()
        try {
            addProgressBars()
        } finally {
            if (observer) observer.observe(target, observeOpts)
            selfMutating = false
        }
    }

    // Coalesce many mutations into at most one run per animation frame.
    function schedule() {
        if (scheduled || selfMutating) return
        scheduled = true
        requestAnimationFrame(runGuarded)
    }

    // Observe the app content container if we can find it, else fall back to body.
    // Narrower target = far fewer irrelevant mutations to process.
    const target =
        document.querySelector('[data-testid="app"]') ||
        document.querySelector('main') ||
        document.body

    const observeOpts = { childList: true, subtree: true }

    observer = new MutationObserver(() => schedule())
    observer.observe(target, observeOpts)

    // Initial pass
    schedule()
})()

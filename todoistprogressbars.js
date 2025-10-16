// ==UserScript==
// @name         Todoist Progress Bars
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add progress bars to tasks with subtasks
// @author       You
// @match        https://app.todoist.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=todoist.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistprogressbars.js
// @downloadURL  https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistprogressbars.js

// ==/UserScript==
(function() {
    'use strict';

    // Add CSS for progress bars
    const style = document.createElement('style');
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
    `;
    document.head.appendChild(style);

    // Function to add progress bars
    function addProgressBars() {
        // Find all subtask indicators by looking for the SVG with aria-label containing "sub-task" (handles both singular and plural)
        const subtaskSvgs = document.querySelectorAll('svg[aria-label*="sub-task"]');

        subtaskSvgs.forEach(svg => {
            // Get the parent span that contains both the SVG and the text
            const span = svg.parentElement;
            if (!span) return;

            // Find the text content (e.g., "2/5" or "0/1")
            const textSpan = span.querySelector('span[aria-hidden="true"]');
            if (!textSpan) return;

            const text = textSpan.textContent.trim();
            const match = text.match(/(\d+)\/(\d+)/);

            if (match) {
                const completed = parseInt(match[1]);
                const total = parseInt(match[2]);
                const percentage = (completed / total) * 100;

                // Check if progress bar already exists after the span
                let progressBar = span.nextElementSibling;
                if (progressBar && progressBar.classList.contains('custom-progress-bar')) {
                    // Update existing progress bar
                    const progressFill = progressBar.querySelector('.custom-progress-fill');
                    if (progressFill) {
                        progressFill.style.width = `${percentage}%`;
                    }
                } else {
                    // Create new progress bar
                    progressBar = document.createElement('div');
                    progressBar.className = 'custom-progress-bar';

                    const progressFill = document.createElement('div');
                    progressFill.className = 'custom-progress-fill';
                    progressFill.style.width = `${percentage}%`;

                    progressBar.appendChild(progressFill);
                    span.parentNode.insertBefore(progressBar, span.nextSibling);
                }
            }
        });
    }

    // Run initially
    addProgressBars();

    // Watch for changes
    const observer = new MutationObserver(addProgressBars);
    observer.observe(document.body, { childList: true, subtree: true });
})();

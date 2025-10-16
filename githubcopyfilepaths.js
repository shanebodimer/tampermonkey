// ==UserScript==
// @name         GitHub Copy File Paths
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a button to copy all file paths from a GitHub PR
// @author       You
// @match        https://github.com/*/pull/*/files
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/githubcopyfilepaths.js
// @downloadURL  https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/githubcopyfilepaths.js

// ==/UserScript==
(function() {
    'use strict';

    // Add CSS for the button
    const style = document.createElement('style');
    style.textContent = `
        .copy-paths-button {
            width: 100%;
            padding: 2px 14px;
            font-size: 12px;
            font-weight: 500;
            line-height: 20px;
            border-radius: 6px;
            border: 1px solid rgba(27, 31, 36, 0.15);
            background-color: #347D39;
            color: #ffffff;
            cursor: pointer;
            margin-bottom: 16px;
        }

        .copy-paths-button:hover {
            background-color: #1a7f37;
            border-color: rgba(27, 31, 36, 0.15);
        }

        .copy-paths-button:active {
            background-color: #18762f;
        }

        @media (prefers-color-scheme: dark) {
            .copy-paths-button {
                background-color: #238636;
                color: #ffffff;
                border-color: rgba(240, 246, 252, 0.1);
            }

            .copy-paths-button:hover {
                background-color: #2ea043;
            }

            .copy-paths-button:active {
                background-color: #26a641;
            }
        }
    `;
    document.head.appendChild(style);

    // Function to get all file paths
    function getAllFilePaths() {
        const filePaths = [];

        // Find all copilot-diff-entry elements with data-file-path attribute
        const diffEntries = document.querySelectorAll('copilot-diff-entry[data-file-path]');

        diffEntries.forEach(entry => {
            const filePath = entry.getAttribute('data-file-path');
            if (filePath) {
                filePaths.push(filePath);
            }
        });

        return filePaths;
    }

    // Function to copy paths to clipboard
    function copyPathsToClipboard() {
        const paths = getAllFilePaths();

        if (paths.length === 0) {
            alert('No file paths found on this page.');
            return;
        }

        const pathsText = paths.map(path => `- ${path}`).join('\n');

        navigator.clipboard.writeText(pathsText).then(() => {
            // Show success feedback
            const button = document.querySelector('.copy-paths-button');
            if (button) {
                const originalText = button.textContent;
                button.textContent = `${paths.length} files copied`;

                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            alert('Failed to copy file paths: ' + err);
        });
    }

    // Function to create and insert the button
    function insertCopyButton() {
        // Check if button already exists
        if (document.querySelector('.copy-paths-button')) {
            return;
        }

        // Find the filter input field
        const filterInput = document.querySelector('#file-tree-filter-field');

        if (filterInput) {
            // Create the button
            const button = document.createElement('button');
            button.textContent = 'Copy all file paths';
            button.className = 'copy-paths-button';
            button.onclick = copyPathsToClipboard;

            // Insert button before the filter input's parent container
            const filterContainer = filterInput.closest('div');
            if (filterContainer && filterContainer.parentNode) {
                filterContainer.parentNode.insertBefore(button, filterContainer);
            }
        }
    }

    // Run initially after a short delay to ensure DOM is loaded
    setTimeout(insertCopyButton, 1000);

    // Watch for changes in case GitHub dynamically updates content
    const observer = new MutationObserver(insertCopyButton);
    observer.observe(document.body, { childList: true, subtree: true });
})();
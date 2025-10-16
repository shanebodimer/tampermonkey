// ==UserScript==
// @name         Todoist Filter Tidy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Clean up filter view
// @author       You
// @match        https://app.todoist.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=todoist.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistfiltertidy.js
// @downloadURL  https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistfiltertidy.js

// ==/UserScript==
(function() {
    'use strict';

    // Define the filter URLs we want to match
    const filterPatterns = [
        /^https:\/\/app\.todoist\.com\/app\/filter\/personal/,
        /^https:\/\/app\.todoist\.com\/app\/filter\/workomode/
    ];

    let style = null;
    let observer = null;
    let isActive = false;

    // Function to check if current URL matches our filter patterns
    function shouldBeActive() {
        const currentUrl = window.location.href;
        return filterPatterns.some(pattern => pattern.test(currentUrl));
    }

    // Function to simplify section titles
    function simplifyTitles() {
        if (!isActive) return;

        const sections = document.querySelectorAll('div[data-layout="LIST"] section.section');

        sections.forEach(section => {
            const titleElement = section.querySelector('h2 span');
            if (titleElement) {
                let title = titleElement.textContent;

                // Replace patterns
                if (title.startsWith('@OVERDUE_')) {
                    titleElement.textContent = 'Overdue';
                } else if (title.startsWith('@TIMED_')) {
                    titleElement.textContent = 'Timed';
                } else if (title.startsWith('@PRIORITY_1_')) {
                    titleElement.textContent = 'Priority 1';
                } else if (title.startsWith('@PRIORITY_2_')) {
                    titleElement.textContent = 'Priority 2';
                } else if (title.startsWith('@PRIORITY_3_')) {
                    titleElement.textContent = 'Priority 3';
                } else if (title.startsWith('@PRIORITY_4_')) {
                    titleElement.textContent = 'Priority 4';
                } else if (title.startsWith('@UNSORTED_')) {
                    titleElement.textContent = 'Unsorted';
                }
            }
        });
    }

    // Function to activate the script
    function activate() {
        if (isActive) return;
        isActive = true;

        // Add CSS to adjust margins
        if (!style) {
            style = document.createElement('style');
            style.textContent = `
                div[data-layout="LIST"] section.section {
                    margin-top: 0px !important;
                    margin-bottom: 20px !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Run title simplification
        simplifyTitles();

        // Start observing for changes
        if (!observer) {
            observer = new MutationObserver(simplifyTitles);
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Function to deactivate the script
    function deactivate() {
        if (!isActive) return;
        isActive = false;

        // Remove CSS
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
            style = null;
        }

        // Stop observing
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // Function to handle URL changes
    function handleUrlChange() {
        if (shouldBeActive()) {
            activate();
        } else {
            deactivate();
        }
    }

    // Monitor URL changes for SPA navigation
    let lastUrl = window.location.href;
    new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            handleUrlChange();
        }
    }).observe(document, { subtree: true, childList: true });

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);

    // Initial check
    handleUrlChange();
})();

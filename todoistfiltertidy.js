// ==UserScript==
// @name         Todoist Filter Tidy
// @namespace    http://tampermonkey.net/
// @version      1
// @description  try to take over the world!
// @author       You
// @match        https://app.todoist.com/app/filter/personal*
// @match        https://app.todoist.com/app/filter/workomode*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=todoist.com
// @grant        none
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistfiltertidy.js
// @downloadURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistfiltertidy.js
// ==/UserScript==
(function() {
    'use strict';

    // Add CSS to create red borders around sections
    const style = document.createElement('style');
    style.textContent = `
        div[data-layout="LIST"] section.section {
            margin-top: 0px !important;
            margin-bottom: 20px !important;
        }
    `;
    document.head.appendChild(style);

    // Function to simplify section titles
    function simplifyTitles() {
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

    // Run initially
    simplifyTitles();

    // Watch for changes (in case Todoist dynamically updates content)
    const observer = new MutationObserver(simplifyTitles);
    observer.observe(document.body, { childList: true, subtree: true });
})();
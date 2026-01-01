// ==UserScript==
// @name         Todoist Spread
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Display chart in sidebar
// @author       You
// @match        https://app.todoist.com/app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=todoist.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.min.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@0.7.0
// @resource     CHART_JS_CSS https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.4/Chart.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @updateURL    https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistspread.js
// @downloadURL  https://raw.githubusercontent.com/shanebodimer/tampermonkey/refs/heads/main/todoistspread.js
// ==/UserScript==

;(function () {
    /* global Chart */
    'use strict'

    // ========== TODOIST API CODE ==========
    // Todoist API Configuration
    const EXCLUDE_PROJECT = 'PROJECT_ID'
    const API_TOKEN = 'TOKEN'
    const API_BASE_URL = 'https://api.todoist.com/api/v1/tasks/filter'
    const QUERY_FILTER = '7%20days'
    const PAGE_LIMIT = 200 // Maximum allowed by Todoist API

    // Function to fetch tasks for the next 7 days with pagination support
    async function fetchProjectTasks() {
        try {
            let allTasks = []
            let nextCursor = null
            let pageNumber = 1

            do {
                // Build URL with limit and optional cursor
                let url = `${API_BASE_URL}?query=${QUERY_FILTER}&limit=${PAGE_LIMIT}`
                if (nextCursor) {
                    url += `&cursor=${encodeURIComponent(nextCursor)}`
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${API_TOKEN}`,
                    },
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    throw new Error(
                        `API request failed: ${response.status} - ${errorText}`
                    )
                }

                const response_json = await response.json()
                const tasks = response_json.results || []
                nextCursor = response_json.next_cursor || null

                // Accumulate tasks from this page
                allTasks = allTasks.concat(tasks)
                pageNumber++

                // Continue if there's a next_cursor
            } while (nextCursor)

            return allTasks
        } catch (error) {
            throw error
        }
    }

    // Function to aggregate tasks by day and priority
    function aggregateTasksByDayAndPriority(tasks) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Initialize data structure for 7 days
        const dayData = Array(7)
            .fill(null)
            .map(() => ({
                priority1: 0,
                priority2: 0,
                priority3: 0,
                priority4: 0,
            }))

        tasks.forEach((task) => {
            if (!task.due || !task.due.date) return

            // Exclude tasks from specific project
            if (task.project_id === EXCLUDE_PROJECT) return

            // Parse task due date in local timezone (not UTC)
            const [year, month, day] = task.due.date.split('-').map(Number)
            const dueDate = new Date(year, month - 1, day) // month is 0-indexed

            // Calculate day offset (0 = today, 1 = tomorrow, etc.)
            const dayOffset = Math.floor(
                (dueDate - today) / (1000 * 60 * 60 * 24)
            )

            // Only count tasks in the next 7 days
            if (dayOffset >= 0 && dayOffset < 7) {
                // Todoist priority: 1=normal(p4), 2=p3, 3=p2, 4=p1
                const priority = task.priority || 1

                if (priority === 4) {
                    dayData[dayOffset].priority1++
                } else if (priority === 3) {
                    dayData[dayOffset].priority2++
                } else if (priority === 2) {
                    dayData[dayOffset].priority3++
                } else {
                    dayData[dayOffset].priority4++
                }
            }
        })

        return dayData
    }
    // ========== END API CODE ==========

    // Flags to prevent infinite loops and duplicate calls
    let isInitialized = false
    let monitoringEnabled = false
    let refreshButton = null

    // Fetch tasks on load
    fetchProjectTasks().catch(() => {})

    // Function to set up network monitoring using PerformanceObserver
    function setupNetworkMonitoring() {
        // Use PerformanceObserver to watch for network requests
        try {
            const observer = new PerformanceObserver((list) => {
                if (!monitoringEnabled) return

                for (const entry of list.getEntries()) {
                    if (
                        entry.entryType === 'resource' &&
                        entry.name.includes('/api/v1/sync')
                    ) {
                        console.log(
                            'Todoist Spread: Detected sync API call via PerformanceObserver:',
                            entry.name
                        )
                        if (refreshButton && !refreshButton.disabled) {
                            console.log(
                                'Todoist Spread: Triggering refresh button'
                            )
                            refreshButton.click()
                        } else {
                            console.log(
                                'Todoist Spread: Refresh button not available or disabled'
                            )
                        }
                    }
                }
            })

            observer.observe({ entryTypes: ['resource'] })
            console.log(
                'Todoist Spread: PerformanceObserver set up successfully'
            )
        } catch (e) {
            console.error(
                'Todoist Spread: Failed to set up PerformanceObserver:',
                e
            )
        }

        // Also intercept fetch as backup
        const originalFetch = window.fetch
        window.fetch = function (...args) {
            const url = args[0]
            if (monitoringEnabled && typeof url === 'string') {
                console.log('Todoist Spread: Fetch call detected:', url)
                if (url.includes('/api/v1/sync')) {
                    console.log(
                        'Todoist Spread: Sync API call detected via fetch, triggering refresh'
                    )
                    if (refreshButton && !refreshButton.disabled) {
                        refreshButton.click()
                    }
                }
            }
            return originalFetch.apply(this, args)
        }

        // Intercept XMLHttpRequest as backup
        const originalXHROpen = XMLHttpRequest.prototype.open
        XMLHttpRequest.prototype.open = function (method, url, ...rest) {
            if (monitoringEnabled && typeof url === 'string') {
                console.log('Todoist Spread: XHR call detected:', url)
                if (url.includes('/api/v1/sync')) {
                    console.log(
                        'Todoist Spread: Sync API call detected via XHR, triggering refresh'
                    )
                    if (refreshButton && !refreshButton.disabled) {
                        refreshButton.click()
                    }
                }
            }
            return originalXHROpen.apply(this, [method, url, ...rest])
        }

        console.log('Todoist Spread: All network interception methods set up')
    }

    // Enable monitoring 10 seconds after page load
    function enableMonitoringAfterDelay() {
        setTimeout(() => {
            monitoringEnabled = true
            console.log('Todoist Spread: Network monitoring ENABLED')
            console.log(
                'Todoist Spread: Refresh button reference:',
                refreshButton
            )
        }, 10000) // 10 seconds
    }

    // Setup network monitoring immediately
    setupNetworkMonitoring()

    // Start monitoring after delay when page is fully loaded
    if (document.readyState === 'complete') {
        enableMonitoringAfterDelay()
    } else {
        window.addEventListener('load', enableMonitoringAfterDelay)
    }

    // Add Chart.js CSS and custom styles
    GM_addStyle(`${GM_getResourceText('CHART_JS_CSS')}
        .tampermonkey-chart-wrapper {
            width: calc(100% - 40px);
            padding-top: 8px;
            padding-right: 6px;
            padding-bottom: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            margin-top: 26px;
            margin-left: 18px;
            margin-right: 18px;
        }
        .tampermonkey-chart-canvas {
            width: 100% !important;
            height: auto !important;
        }
        .tampermonkey-title {
            color: white;
            font-size: 12px;
            padding-top: 6px;
            padding-left: 12px;
            padding-bottom: 8px;
            opacity: 0.8;
            text-align: left;
        }
        .tampermonkey-button-container {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding-top: 8px;
            gap: 8px;
            margin-bottom: 6px;
        }
        .tampermonkey-refresh-button {
            background: none;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 12px;
            padding: 0;
            opacity: 0.8;
            transition: opacity 0.2s;
            margin-right: 6px;
           
        }
        .tampermonkey-refresh-button:hover {
            opacity: 1;
        }
        .tampermonkey-refresh-button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
        .tampermonkey-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            visibility: hidden;
        }
        .tampermonkey-spinner.active {
            visibility: visible;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `)

    // Helper function to create elements
    const createElement = (tagName, config = {}) => {
        const el = document.createElement(tagName)
        if (config.attrs)
            Object.entries(config.attrs).forEach(([attr, val]) =>
                el.setAttribute(attr, val)
            )
        if (config.props)
            Object.entries(config.props).forEach(
                ([prop, val]) => (el[prop] = val)
            )
        if (config.css)
            Object.entries(config.css).forEach(
                ([prop, val]) => (el.style[prop] = val)
            )
        if (config.children)
            config.children.forEach((child) => el.append(child))
        return el
    }

    // Helper function to create a chart
    const createChart = (canvas, settings) => {
        return new Chart(
            (typeof canvas === 'string'
                ? document.querySelector(canvas)
                : canvas
            ).getContext('2d'),
            settings
        )
    }

    // Function to create a stacked bar chart
    const createStackedBarChart = (selector, chartData) => {
        const { labels, datasets } = chartData
        return createChart(selector, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                maintainAspectRatio: true,
                aspectRatio: 2,
                layout: {
                    padding: {
                        top: 25,
                    },
                },
                scales: {
                    xAxes: [
                        {
                            stacked: true,
                            gridLines: {
                                display: false,
                            },
                        },
                    ],
                    yAxes: [
                        {
                            stacked: true,
                            ticks: {
                                display: false,
                            },
                            gridLines: {
                                display: false,
                            },
                        },
                    ],
                },
                legend: {
                    display: false,
                },
                tooltips: {
                    callbacks: {
                        title: function (tooltipItem, data) {
                            return '' // Returns empty string to hide title
                        },
                    },
                },
            },
        })
    }

    // Store chart instance globally so it can be refreshed
    let chartInstance = null

    // Function to refresh chart data
    async function refreshChartData() {
        if (!chartInstance) {
            return
        }

        // Generate day-of-week labels
        const today = new Date()
        const getDateLabel = (daysOffset) => {
            const date = new Date(today)
            date.setDate(today.getDate() + daysOffset)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[date.getDay()]
        }

        // Create labels for 7 days
        const dayLabels = [
            'Tod.',
            'Tom.',
            getDateLabel(2),
            getDateLabel(3),
            getDateLabel(4),
            getDateLabel(5),
            getDateLabel(6),
        ]

        // Fetch tasks and aggregate by day and priority
        let dayData
        try {
            const tasks = await fetchProjectTasks()
            dayData = aggregateTasksByDayAndPriority(tasks)
        } catch (error) {
            // Use empty data if fetch fails
            dayData = Array(7)
                .fill(null)
                .map(() => ({
                    priority1: 0,
                    priority2: 0,
                    priority3: 0,
                    priority4: 0,
                }))
        }

        // Update chart data
        chartInstance.data.labels = dayLabels
        chartInstance.data.datasets[0].data = dayData.map(
            (day) => day.priority4
        )
        chartInstance.data.datasets[1].data = dayData.map(
            (day) => day.priority3
        )
        chartInstance.data.datasets[2].data = dayData.map(
            (day) => day.priority2
        )
        chartInstance.data.datasets[3].data = dayData.map(
            (day) => day.priority1
        )
        chartInstance.update()
    }

    // Function to add chart to the sidebar
    async function addChartToSidebar() {
        // Prevent running if already initialized
        if (isInitialized) {
            return
        }

        const sidebar = document.querySelector(
            'div[data-testid="app-sidebar-scrollable-container"]'
        )

        if (!sidebar) {
            return
        }

        // Check if we've already added the chart
        if (sidebar.querySelector('.tampermonkey-chart-wrapper')) {
            return
        }

        // Create spinner element
        const spinner = createElement('div', {
            props: {
                className: 'tampermonkey-spinner',
            },
        })

        // Create refresh button and store globally for network monitoring
        refreshButton = createElement('button', {
            props: {
                className: 'tampermonkey-refresh-button',
                textContent: 'Refresh',
                onclick: async function () {
                    // Disable button and show spinner
                    this.disabled = true
                    spinner.classList.add('active')

                    // Refresh the chart data
                    await refreshChartData()

                    // Keep button disabled and spinner showing for 1 second
                    setTimeout(() => {
                        this.disabled = false
                        spinner.classList.remove('active')
                    }, 1000)
                },
            },
        })

        // Create button container with spinner on left, button on right
        const buttonContainer = createElement('div', {
            props: {
                className: 'tampermonkey-button-container',
            },
            children: [spinner, refreshButton],
        })

        // Create title element
        const titleElement = createElement('div', {
            props: {
                className: 'tampermonkey-title',
                textContent: 'Personal Task Distribution',
            },
        })

        // Create chart wrapper and canvas
        const chartWrapper = createElement('div', {
            props: {
                className: 'tampermonkey-chart-wrapper',
            },
            children: [
                titleElement,
                createElement('canvas', {
                    attrs: { id: 'todoist-spread-chart' },
                    props: { className: 'tampermonkey-chart-canvas' },
                }),
                buttonContainer,
            ],
        })

        // Add to sidebar
        sidebar.appendChild(chartWrapper)

        // Generate day-of-week labels
        const today = new Date()
        const getDateLabel = (daysOffset) => {
            const date = new Date(today)
            date.setDate(today.getDate() + daysOffset)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
            return days[date.getDay()]
        }

        // Create labels for 7 days
        const dayLabels = [
            'Tod.',
            'Tom.',
            getDateLabel(2),
            getDateLabel(3),
            getDateLabel(4),
            getDateLabel(5),
            getDateLabel(6),
        ]

        // Fetch tasks and aggregate by day and priority
        let dayData
        try {
            const tasks = await fetchProjectTasks()
            dayData = aggregateTasksByDayAndPriority(tasks)
        } catch (error) {
            // Use empty data if fetch fails
            dayData = Array(7)
                .fill(null)
                .map(() => ({
                    priority1: 0,
                    priority2: 0,
                    priority3: 0,
                    priority4: 0,
                }))
        }

        // Create chart data from aggregated task data
        const chartData = {
            labels: dayLabels,
            datasets: [
                {
                    label: 'P4',
                    data: dayData.map((day) => day.priority4),
                    backgroundColor: 'rgba(169, 169, 169, 1)',
                    datalabels: {
                        display: false,
                    },
                },
                {
                    label: 'P3',
                    data: dayData.map((day) => day.priority3),
                    backgroundColor: 'rgba(82, 151, 255, 1)',
                    datalabels: {
                        display: false,
                    },
                },
                {
                    label: 'P2',
                    data: dayData.map((day) => day.priority2),
                    backgroundColor: 'rgba(255, 154, 19, 1)',
                    datalabels: {
                        display: false,
                    },
                },
                {
                    label: 'P1',
                    data: dayData.map((day) => day.priority1),
                    backgroundColor: 'rgba(255, 112, 102, 1)',
                    datalabels: {
                        color: 'rgba(255,255,255,0.5)',
                        anchor: 'end',
                        align: 'top',
                        font: {
                            size: 12,
                        },
                        formatter: function (value, ctx) {
                            const dataIndex = ctx.dataIndex
                            const datasets = ctx.chart.data.datasets
                            const total =
                                datasets[0].data[dataIndex] +
                                datasets[1].data[dataIndex] +
                                datasets[2].data[dataIndex] +
                                datasets[3].data[dataIndex]
                            return total > 0 ? total : ''
                        },
                    },
                },
            ],
        }

        // Create the chart and store the instance globally
        chartInstance = createStackedBarChart(
            '#todoist-spread-chart',
            chartData
        )

        // Mark as initialized
        isInitialized = true
    }

    // Run the function when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addChartToSidebar()
        })
    } else {
        addChartToSidebar()
    }

    // Also observe for changes in case the sidebar loads dynamically
    const observer = new MutationObserver(() => {
        // Only try to initialize if not already done
        if (!isInitialized) {
            addChartToSidebar()
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })
})()

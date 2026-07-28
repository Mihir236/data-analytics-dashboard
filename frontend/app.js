// Client-side Application Controller - AeroAnalytics

const API_BASE = '/api';

// Global application state
const state = {
    activeTab: 'overview',
    theme: 'dark',
    kpis: {},
    schema: {},
    predefinedQueries: {},
    charts: {
        revenueTrend: null,
        productCategory: null,
        regionalSales: null,
        sandbox: null
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Theme toggle listener
    const themeBtn = document.getElementById('themeToggle');
    themeBtn.addEventListener('click', toggleTheme);
    
    // 2. Navigation Tab Click Handlers
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchTab(item.getAttribute('data-tab'));
        });
    });
    
    // 3. Database reset handler
    const resetBtn = document.getElementById('resetDbBtn');
    resetBtn.addEventListener('click', resetDatabase);
    
    // 4. SQL Sandbox handlers
    const runQueryBtn = document.getElementById('runQueryBtn');
    runQueryBtn.addEventListener('click', executeCustomQuery);
    
    const queryTextarea = document.getElementById('sqlQueryTextarea');
    queryTextarea.addEventListener('keydown', (e) => {
        // Run on Cmd+Enter or Ctrl+Enter
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            executeCustomQuery();
        }
    });
    
    const chartTypeSelect = document.getElementById('sandboxChartTypeSelect');
    chartTypeSelect.addEventListener('change', () => {
        if (state.lastQueryResult) {
            renderSandboxChart(state.lastQueryResult);
        }
    });

    // 5. Initial Data Fetch
    fetchInitialData();
}

/* Tab Management */
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Update nav indicator
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update visible content pane
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Perform actions specific to the tab loaded
    if (tabId === 'overview') {
        fetchOverviewDashboard();
    } else if (tabId === 'sql-sandbox') {
        renderSchemaExplorer();
    } else if (tabId === 'bi-integration') {
        lazyLoadTableau();
    }
}

let tableauLoaded = false;
function lazyLoadTableau() {
    if (tableauLoaded) return;
    
    const container = document.getElementById('tableauContainer');
    if (!container) return;
    
    // Create iframe dynamically
    const iframe = document.createElement('iframe');
    iframe.src = "https://public.tableau.com/views/Superstore_24/Overview?:showVizHome=no&:embed=true";
    iframe.width = "100%";
    iframe.height = "600";
    iframe.style.border = "none";
    iframe.style.borderRadius = "var(--radius-md)";
    
    iframe.onload = () => {
        const placeholder = container.querySelector('.tableau-placeholder-load');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        tableauLoaded = true;
    };
    
    container.appendChild(iframe);
}

/* Theme Management */
function toggleTheme() {
    const root = document.documentElement;
    const themeIcon = document.querySelector('#themeToggle i');
    
    if (state.theme === 'dark') {
        state.theme = 'light';
        root.setAttribute('data-theme', 'light');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        state.theme = 'dark';
        root.removeAttribute('data-theme');
        themeIcon.className = 'fa-solid fa-moon';
    }
    
    // Redraw charts with new styles if active
    if (state.activeTab === 'overview') {
        renderOverviewCharts();
    }
}

/* API Fetching and Data Population */
async function fetchInitialData() {
    try {
        const alertBanner = document.getElementById('connectionAlert');
        if (alertBanner) alertBanner.style.display = 'none';

        // Fetch predefined queries first
        const queriesRes = await fetch(`${API_BASE}/predefined`);
        state.predefinedQueries = await queriesRes.json();
        
        // Fetch database schema definitions
        const schemaRes = await fetch(`${API_BASE}/schema`);
        state.schema = await schemaRes.json();
        
        renderPredefinedQueries();
        fetchOverviewDashboard();
    } catch (err) {
        console.error("Error loading setup data:", err);
        const alertBanner = document.getElementById('connectionAlert');
        if (alertBanner) alertBanner.style.display = 'flex';
    }
}

async function fetchOverviewDashboard() {
    try {
        // 1. Fetch KPIs
        const kpiRes = await fetch(`${API_BASE}/kpis`);
        state.kpis = await kpiRes.json();
        populateKPIs(state.kpis);
        
        // 2. Fetch Insights
        const insightsRes = await fetch(`${API_BASE}/insights`);
        const insights = await insightsRes.json();
        populateInsights(insights);
        
        // 3. Render dashboard charts
        renderOverviewCharts();
    } catch (err) {
        console.error("Error loading overview dashboard details:", err);
    }
}

function populateKPIs(kpis) {
    document.querySelector('#kpi-sales .kpi-value').textContent = formatCurrency(kpis.total_sales);
    document.querySelector('#kpi-profit .kpi-value').textContent = formatCurrency(kpis.total_profit);
    document.querySelector('#kpi-margin .kpi-value').textContent = `${kpis.profit_margin}%`;
    document.querySelector('#kpi-customers .kpi-value').textContent = kpis.total_customers.toLocaleString();
}

function populateInsights(insights) {
    const list = document.getElementById('insightsList');
    list.innerHTML = '';
    
    if (insights.length === 0) {
        list.innerHTML = '<div class="insight-placeholder">No insights could be drawn from the current dataset.</div>';
        return;
    }
    
    insights.forEach(insight => {
        const item = document.createElement('div');
        item.className = `insight-item ${insight.type}`;
        
        // Icon mapping
        let icon = 'fa-circle-info';
        if (insight.type === 'success') icon = 'fa-circle-check';
        if (insight.type === 'warning') icon = 'fa-triangle-exclamation';
        if (insight.type === 'danger') icon = 'fa-circle-xmark';
        
        item.innerHTML = `
            <i class="fa-solid ${icon} insight-icon"></i>
            <div class="insight-body">
                <h4>${insight.title}</h4>
                <p>${insight.message}</p>
            </div>
        `;
        list.appendChild(item);
    });
}

function renderPredefinedQueries() {
    const grid = document.getElementById('quickQueriesGrid');
    grid.innerHTML = '';
    
    const queryLabels = {
        "sales_by_category": "Sales & Profit by Category",
        "monthly_sales_trend": "Monthly Sales Revenue Trend",
        "customer_segments": "Segment Breakdown & Average Order",
        "regional_sales": "Regional Revenue & Active Customer Share",
        "top_products": "Top 10 Products by Net Revenue",
        "recent_transactions": "Recent Transaction Records Log"
    };
    
    Object.keys(state.predefinedQueries).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'query-shortcut-btn';
        btn.innerHTML = `
            <span>${queryLabels[key] || key}</span>
            <i class="fa-solid fa-angle-right"></i>
        `;
        btn.addEventListener('click', () => {
            const queryText = state.predefinedQueries[key];
            switchTab('sql-sandbox');
            const textarea = document.getElementById('sqlQueryTextarea');
            textarea.value = queryText.trim().replace(/^\s+/gm, ''); // clean leading spaces
            executeCustomQuery();
        });
        grid.appendChild(btn);
    });
}

/* Chart.js Integrations */
async function renderOverviewCharts() {
    // 1. Fetch data for trend chart (from monthly_sales_trend predefined SQL query)
    try {
        const trendRes = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query: state.predefinedQueries.monthly_sales_trend})
        });
        const trendData = await trendRes.json();
        
        const catRes = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query: state.predefinedQueries.sales_by_category})
        });
        const catData = await catRes.json();
        
        const regionRes = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query: state.predefinedQueries.regional_sales})
        });
        const regionData = await regionRes.json();

        // Chart styling colors dynamically updated based on active theme
        const gridColor = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const textLabelColor = state.theme === 'dark' ? '#9ca3af' : '#475569';
        
        // Render 1: Monthly Sales Trend Line/Bar Chart
        if (state.charts.revenueTrend) state.charts.revenueTrend.destroy();
        if (trendData.success && trendData.rows) {
            const labels = trendData.rows.map(r => r.month);
            const sales = trendData.rows.map(r => r.total_sales);
            const profit = trendData.rows.map(r => r.total_profit);
            
            const ctx = document.getElementById('revenueTrendChart').getContext('2d');
            state.charts.revenueTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Revenue',
                            data: sales,
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.35
                        },
                        {
                            label: 'Net Profit',
                            data: profit,
                            borderColor: '#10b981',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: textLabelColor }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { 
                                color: textLabelColor,
                                callback: (value) => '$' + value.toLocaleString()
                            }
                        }
                    }
                }
            });
        }
        
        // Render 2: Product Category distribution (Doughnut)
        if (state.charts.productCategory) state.charts.productCategory.destroy();
        if (catData.success && catData.rows) {
            const labels = catData.rows.map(r => r.category);
            const sales = catData.rows.map(r => r.total_sales);
            
            const ctx = document.getElementById('productCategoryChart').getContext('2d');
            state.charts.productCategory = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: sales,
                        backgroundColor: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: textLabelColor, boxWidth: 12, padding: 15 }
                        }
                    },
                    cutout: '65%'
                }
            });
        }

        // Render 3: Regional account share (Horizontal Bar)
        if (state.charts.regionalSales) state.charts.regionalSales.destroy();
        if (regionData.success && regionData.rows) {
            const labels = regionData.rows.map(r => r.region);
            const sales = regionData.rows.map(r => r.total_sales);
            
            const ctx = document.getElementById('regionalSalesChart').getContext('2d');
            state.charts.regionalSales = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        data: sales,
                        backgroundColor: '#3b82f6',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { 
                                color: textLabelColor,
                                callback: (value) => '$' + value.toLocaleString()
                            }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: textLabelColor }
                        }
                    }
                }
            });
        }

    } catch (err) {
        console.error("Error generating overview charts:", err);
    }
}

/* Database resetting operations */
async function resetDatabase() {
    if (!confirm("Are you sure you want to restore the SQLite database to its original state? This will recreate all tables from the sales.csv and customers.csv files.")) {
        return;
    }
    
    const resetBtn = document.getElementById('resetDbBtn');
    resetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';
    resetBtn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/reset`, {method: 'POST'});
        const data = await res.json();
        
        if (data.success) {
            alert("Database re-populated successfully!");
            // Refresh schemas & details
            fetchInitialData();
            if (state.activeTab === 'sql-sandbox') {
                renderSchemaExplorer();
            }
        } else {
            alert(`Error resetting database: ${data.error}`);
        }
    } catch (err) {
        alert(`API connection failure during reset: ${err}`);
    } finally {
        resetBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Reset Database';
        resetBtn.disabled = false;
    }
}

/* SQL Console Operations */
async function executeCustomQuery() {
    const query = document.getElementById('sqlQueryTextarea').value.trim();
    if (!query) return;
    
    const runBtn = document.getElementById('runQueryBtn');
    const statusBar = document.getElementById('queryStatusBar');
    const statusText = document.getElementById('queryStatusText');
    const execTime = document.getElementById('queryExecutionTime');
    const badge = document.getElementById('rowCountBadge');
    const tableWrapper = document.getElementById('tableWrapper');
    
    runBtn.disabled = true;
    runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Executing...';
    statusText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Query running...';
    statusBar.className = 'query-status-bar';
    execTime.textContent = '';
    
    try {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({query})
        });
        const data = await res.json();
        
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Query';
        
        if (data.success) {
            statusBar.className = 'query-status-bar success';
            statusText.innerHTML = '<i class="fa-solid fa-check-circle"></i> Query completed successfully.';
            execTime.textContent = `${data.execution_time_ms} ms`;
            
            if (data.headers && data.rows) {
                // Table output
                badge.style.display = 'inline-block';
                badge.textContent = `${data.row_count} rows`;
                renderResultsTable(data.headers, data.rows);
                
                // Visualization recommendations
                state.lastQueryResult = data;
                renderSandboxChart(data);
            } else {
                // Modification command (UPDATE/INSERT/DELETE)
                badge.style.display = 'none';
                tableWrapper.innerHTML = `
                    <div class="table-placeholder">
                        <i class="fa-solid fa-circle-check" style="color: var(--accent-teal)"></i>
                        <p>${data.message || 'SQL executed successfully.'}</p>
                    </div>
                `;
                document.getElementById('sandboxChartContainer').style.display = 'none';
                state.lastQueryResult = null;
                // Re-evaluate database schema/overview if modifications are made
                fetchInitialData();
            }
        } else {
            statusBar.className = 'query-status-bar error';
            statusText.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> SQL Error: ${data.error}`;
            badge.style.display = 'none';
            tableWrapper.innerHTML = `
                <div class="table-placeholder">
                    <i class="fa-solid fa-circle-xmark" style="color: var(--accent-rose)"></i>
                    <p style="color: var(--accent-rose); font-weight: 600;">SQL syntax execution error.</p>
                    <small style="max-width: 80%; text-align: center; color: var(--text-secondary); font-family: monospace;">${data.error}</small>
                </div>
            `;
            document.getElementById('sandboxChartContainer').style.display = 'none';
            state.lastQueryResult = null;
        }
    } catch (err) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Query';
        statusBar.className = 'query-status-bar error';
        statusText.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Network connection error: ${err}`;
    }
}

function renderResultsTable(headers, rows) {
    const wrapper = document.getElementById('tableWrapper');
    wrapper.innerHTML = '';
    
    if (rows.length === 0) {
        wrapper.innerHTML = `
            <div class="table-placeholder">
                <i class="fa-solid fa-table-cells-empty"></i>
                <p>Query returned 0 output rows.</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'sql-table';
    
    // Build Header row
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        headerTr.appendChild(th);
    });
    thead.appendChild(headerTr);
    table.appendChild(thead);
    
    // Build Rows
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
            const td = document.createElement('td');
            const val = r[h];
            
            // Format numeric column display
            if (typeof val === 'number') {
                if (h.toLowerCase().includes('amount') || h.toLowerCase().includes('profit') || h.toLowerCase().includes('cost') || h.toLowerCase().includes('revenue') || h.toLowerCase().includes('price')) {
                    td.textContent = formatCurrency(val);
                } else if (val % 1 !== 0) {
                    td.textContent = val.toFixed(2);
                } else {
                    td.textContent = val.toLocaleString();
                }
            } else {
                td.textContent = val !== null ? val : 'NULL';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    wrapper.appendChild(table);
}

/* Automatic Query Visualizer Chart */
function renderSandboxChart(queryResult) {
    const container = document.getElementById('sandboxChartContainer');
    const canvasCtx = document.getElementById('sandboxChart').getContext('2d');
    
    const { headers, rows } = queryResult;
    if (rows.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    // Determine possible charting fields
    // Find numeric fields (values) and string/date fields (labels)
    let labelField = null;
    let valueField = null;
    
    // Scan columns to find best matches
    for (const h of headers) {
        const sampleVal = rows[0][h];
        if (typeof sampleVal === 'number' && !valueField) {
            valueField = h;
        } else if ((typeof sampleVal === 'string') && !labelField) {
            labelField = h;
        }
    }
    
    // Fallbacks if no columns found
    if (!valueField) {
        container.style.display = 'none'; // No numeric values, cannot build chart
        return;
    }
    
    if (!labelField) {
        labelField = headers[0]; // fallback
    }
    
    container.style.display = 'block';
    
    const labels = rows.map(r => String(r[labelField]));
    const dataValues = rows.map(r => r[valueField]);
    const chartType = document.getElementById('sandboxChartTypeSelect').value;
    
    // Clean up old instance
    if (state.charts.sandbox) {
        state.charts.sandbox.destroy();
    }
    
    const gridColor = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textLabelColor = state.theme === 'dark' ? '#9ca3af' : '#475569';
    
    const isPie = chartType === 'pie';
    
    state.charts.sandbox = new Chart(canvasCtx, {
        type: chartType,
        data: {
            labels,
            datasets: [{
                label: valueField,
                data: dataValues,
                backgroundColor: isPie 
                    ? ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#a855f7'] 
                    : '#6366f1',
                borderColor: isPie ? 'transparent' : '#6366f1',
                borderWidth: isPie ? 0 : 2,
                borderRadius: chartType === 'bar' ? 4 : 0,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: isPie,
                    position: 'bottom',
                    labels: { color: textLabelColor, boxWidth: 10 }
                }
            },
            scales: isPie ? {} : {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textLabelColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textLabelColor }
                }
            }
        }
    });
}

/* Database catalog layout generator */
function renderSchemaExplorer() {
    const explorer = document.getElementById('schemaExplorer');
    explorer.innerHTML = '';
    
    Object.keys(state.schema).forEach(tableName => {
        const tableNode = document.createElement('div');
        tableNode.className = 'schema-table-node';
        
        tableNode.innerHTML = `
            <div class="table-node-header">
                <span class="table-node-name">
                    <i class="fa-solid fa-table"></i>
                    <strong>${tableName}</strong>
                </span>
                <i class="fa-solid fa-chevron-down chevron-icon"></i>
            </div>
            <ul class="table-columns-list">
                ${state.schema[tableName].map(col => `
                    <li class="column-item" data-col="${col.column}">
                        <span class="col-name">${col.column}${col.key ? `<span class="col-badge ${col.key.toLowerCase()}">${col.key}</span>` : ''}</span>
                        <span class="col-type">${col.type}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Expand/collapse logic
        const header = tableNode.querySelector('.table-node-header');
        header.addEventListener('click', () => {
            tableNode.classList.toggle('collapsed');
        });
        
        // Append query insertion bindings: click table/column to append to editor
        header.querySelector('.table-node-name').addEventListener('click', (e) => {
            e.stopPropagation(); // prevent collapsing toggle
            insertTextAtCursor(` ${tableName} `);
        });
        
        tableNode.querySelectorAll('.column-item').forEach(item => {
            item.addEventListener('click', () => {
                const colName = item.getAttribute('data-col');
                insertTextAtCursor(` ${colName} `);
            });
        });
        
        explorer.appendChild(tableNode);
    });
}

function insertTextAtCursor(text) {
    const textarea = document.getElementById('sqlQueryTextarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    textarea.value = val.substring(0, start) + text + val.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

/* Currency and value format helpers */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
}

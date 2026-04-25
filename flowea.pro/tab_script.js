// Navigation and state controller:
// single brain, context engine
// Track routine logic, manages framing, 
// what is current mode, display relevant tabs
// 
// --- Constants ---
const CORE_DEFAULT_TABS = ["work", "personal"];

// ------------------- CONTEXTS -----------------------
const ROUTINE_CONTEXTS = {
    "Morning": { start: 5,  end: 9,  icon: "🌅", theme: "#ff9f43" },
    "Work":    { start: 9,  end: 17, icon: "💻", theme: "#54a0ff" },
    "Gym":    { start: 17,  end: 18, icon: "🏋️", theme: "#80450e" },
    "Evening": { start: 18, end: 22, icon: "🌆", theme: "#5f27cd" },
    "Night":   { start: 22, end: 5,  icon: "🌙", theme: "#222f3e" }
};



// Global config sourced from Storage or Defaults
window.routineConfig = JSON.parse(localStorage.getItem('routine_config')) || ROUTINE_CONTEXTS;

// --- Global State ---
// --- Global State ---
// 1. Try to get existing tabs
let storedTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

// 2. If no tabs exist (New User / Cleared Data), create the Default Tab
if (storedTabs.length === 0) {
    const defaultTab = {
        id: "tab_" + Date.now(), // Unique ID
        name: "TabName",
        icon: "📝",
        mode: "Work", // Default category
        order: 0
    };
    storedTabs = [defaultTab];
    localStorage.setItem('master_tabs', JSON.stringify(storedTabs));
    localStorage.setItem(`tabName_${defaultTab.id}`, defaultTab.name);
    // Set as active so the first task has a destination
    localStorage.setItem('activeTab', defaultTab.id);
}

window.allTabs = storedTabs;
window.editingTabId = null;
window.isManualOverride = false; // Prevents auto-switching if the user manually picks a tab

// Initialize Context: Start with the clock
window.currentContext = getAutoContext();

// Initialize global variables used by script.js
window.activeTab = localStorage.getItem("activeTab") || 'work';
window.activeTabList = `${window.activeTab}List`;
window.activeTabPurgeList = `${window.activeTab}PurgeList`;




/**
 * 1. GET THE AUTO CONTEXT
 * Logic to handle the 24-hour wrap-around for 'Night'
 */
function getAutoContext() {
    const hour = new Date().getHours();
    for (const [name, limits] of Object.entries(ROUTINE_CONTEXTS)) {
        if (limits.start < limits.end) {
            if (hour >= limits.start && hour < limits.end) return name;
        } else {
            // Handles wrap-around (e.g., 22:00 to 05:00)
            if (hour >= limits.start || hour < limits.end) return name;
        }
    }
    return "Work"; // Fallback
}

/**
 * 2. MASTER APPLY FUNCTION
 * Handles Header, Command Bar, and Tab Visibility
 */
window.applyContext = function(contextName, manual = false) {
  // 1. Update the State
    window.currentContext = contextName;
    if (manual) window.isManualOverride = true;
    
    const contextData = ROUTINE_CONTEXTS[contextName] || { icon: "❓" };
    
    // Update Header Label
    const label = $('#active_context_label');
    label.html(`${contextData.icon} ${contextName}`);
    label.toggleClass('manual-mode', window.isManualOverride);

    // Update Command Bar Icons (Bottom)
    $('.context-btn').removeClass('active');
    $(`.context-btn[data-context="${contextName}"]`).addClass('active');

    // Filter Tabs
    let firstVisibleTabId = null;
    let currentTabVisible = false;

    $('.tab').each(function() {
        const tabId = $(this).attr('data-tab-id');
        const tabData = getTabData(tabId);
        
        // Show if category matches OR if it's a new/uncategorized tab
        const isVisible = !tabData.category || 
                          tabData.category === contextName || 
                          tabData.category === "undefined";

        $(this).toggle(isVisible);

        if (isVisible) {
            if (!firstVisibleTabId) firstVisibleTabId = tabId;
            if (tabId === window.activeTab) currentTabVisible = true;
        }
    });

    // Auto-switch focus if current tab is now hidden
    if (!currentTabVisible && firstVisibleTabId) {
        switchTab(firstVisibleTabId);
    }
};

// **
// SAVE TAB LOGIC
// **
function handleSaveTab() {
    const name = $('#tab_name_input').val().trim();
    const category = $('.cat-opt.selected').data('val');
    const type = $('#tab_mode_select').val();

    if (!name || !category) return alert("Please provide a name and select an icon/category.");

    // Refresh memory from storage to be safe
    window.allTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

    if (window.editingTabId) {
        const index = window.allTabs.findIndex(t => t.id === window.editingTabId);
        if (index !== -1) {
            window.allTabs[index] = { ...window.allTabs[index], name, category, type };
        }
    } else {
        const newId = "tab_" + Date.now();
        window.allTabs.push({ id: newId, name, category, type });
        window.activeTab = newId; 
    }

    // Update Memory and Storage
    localStorage.setItem('master_tabs', JSON.stringify(window.allTabs));
    
    // Update UI
    closeTabSettings();
    initTabs(); // Redraws buttons and calls applyContext automatically
    
    if (typeof showToast === 'function') showToast("Tab Saved!");
}

/**
 * 4. EVENT LISTENERS
 * Checks every 30 seconds if the hour has shifted
 */
function initEventListeners() {
    // Save Button
    $('#save_tab_btn').off('click').on('click', handleSaveTab);

    // Context Buttons
    $(document).off('click', '.context-btn').on('click', '.context-btn', function() {
        const selectedContext = $(this).data('context');
        window.applyContext(selectedContext, true);
        // if (typeof showToast === 'function') showToast(`${selectedContext} Mode Active`);
    });

    // Category Selection in Modal
    $(document).off('click', '.cat-opt').on('click', '.cat-opt', function() {
        $('.cat-opt').removeClass('selected');
        $(this).addClass('selected');
    });
}


/**
 * Initializes the Tab UI from the master data.
 */
function initTabs() {
    // 1. Ensure we have the latest data from memory
    const container = document.getElementById("tabsContainer");
    if (!container) return;
    container.innerHTML = "";

    // 2. Render all tabs
    window.allTabs.forEach(tab => {
        container.appendChild(createTabElement(tab));
    });

    // 3. Set the initial active tab
// Re-apply the filter using the global state variable
    window.applyContext(window.currentContext, window.isManualOverride);
    
    switchTab(window.activeTab);
}

function startRoutineHeartbeat() {
    setInterval(() => {
        if (!window.isManualOverride) {
            const freshAutoContext = getAutoContext();
            
            // Only trigger a re-filter if the hour actually shifted the context
            if (window.currentContext !== freshAutoContext) {
                window.applyContext(freshAutoContext);
            }
        }
    }, 30000); 
}

/**
 * Creates the DOM element for a single tab.
 * @param {Object} tab - The tab object from master_tabs.
 */
function createTabElement(tab) {
    const tabEl = document.createElement("div");
    tabEl.className = "tab";
    tabEl.setAttribute("data-tab-id", tab.id);
    tabEl.setAttribute("data-category", tab.category);

    const span = document.createElement("span");
    span.className = "tab-label";
    span.textContent = tab.name;

    // Double-tap/click to open settings
    tabEl.ondblclick = (e) => {
        e.stopPropagation();
        openTabSettings(tab.id);
    };

    tabEl.appendChild(span);
    tabEl.onclick = () => switchTab(tab.id);

    return tabEl;
}

/**
 * Manages the transition between tabs.
 */
function switchTab(tabId) {
    const tabData = getTabData(tabId);
    
    // 1. Sync Memory & Storage
    window.activeTab = tabId;
    window.activeTabList = `${tabId}List`;
    window.activeTabPurgeList = `${tabId}PurgeList`;
    localStorage.setItem("activeTab", tabId);

    // 2. UI: Update Active Styles
    document.querySelectorAll(".tab").forEach(el => {
        el.classList.toggle("active", el.getAttribute("data-tab-id") === tabId);
    });

    // 3. UI: Positioning & Placeholder ??
    const selectedTab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (selectedTab) {
        selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    const enterTaskInput = document.getElementById("enter_task");
    if (enterTaskInput) {
        enterTaskInput.placeholder = `Enter task for ${tabData.name}`;
    }

    // 4. Data Refresh: Trigger main list update in script.js
    if (typeof window.displayData === 'function') window.displayData();
}

/**
 * Helper to get a tab object from memory.
 */
function getTabData(tabId) {
    return window.allTabs.find(t => t.id === tabId) || 
           { id: tabId, name: "New Tab", category: 'Work', type: 'list' };
}

// --- Tab Settings Card Logic ---
function openTabSettings(tabId = null) {
    window.editingTabId = tabId;
    const card = $('#tab_settings_card');
    
    if (tabId) {
        const tab = getTabData(tabId);
        $('#sheet_title').text('Edit Tab');
        $('#tab_name_input').val(tab.name);
        $('#tab_mode_select').val(tab.type || 'list');
        selectCategoryIcon(tab.category);
        $('#delete_tab_btn').toggle(!CORE_DEFAULT_TABS.includes(tabId));
    } else {
        $('#sheet_title').text('New Tab');
        $('#tab_name_input').val('');
        $('#tab_mode_select').val('list');
        selectCategoryIcon(window.currentContext || 'Work');
        $('#delete_tab_btn').hide();
    }
    card.addClass('active');
}

function closeTabSettings() {
    $('#tab_settings_card').removeClass('active');
    window.editingTabId = null;
}

function selectCategoryIcon(val) {
    $('.cat-opt').removeClass('selected');
    $(`.cat-opt[data-val="${val}"]`).addClass('selected');
}


function finalizeTabDeletion(tabId) {
    // 1. Data Purge
    localStorage.removeItem(`${tabId}List`);
    localStorage.removeItem(`${tabId}PurgeList`);
// localStorage.removeItem(`tabName_${tabId}`); // Clean up legacy keys if any

// 2. Identify the CURRENTLY VISIBLE context before we wipe the tab from memory
    // This ensures we respect the Manual Override if it's active.
    const currentContext = window.currentContext;
    console.log(currentContext);

    // 2. Memory Update
    window.allTabs = window.allTabs.filter(t => t.id !== tabId);
    localStorage.setItem('master_tabs', JSON.stringify(window.allTabs));

    // 3. Smart UI Reset
    // Instead of forcing "work", let's find the first tab that is actually 
    // visible in the current context so the user isn't jarred.
    // const currentContext = getAutoContext();
    const visibleTabs = window.allTabs.filter(t => t.category === currentContext);
    
    // Fallback logic: Visible tab > First available tab > "work"
    let fallbackTab;
    if (visibleTabs.length > 0) {
        fallbackTab = visibleTabs[0].id;
    } else {
        // Total Fallback: If no tabs left in this context, go to the first global tab
        fallbackTab = window.allTabs.length > 0 ? window.allTabs[0].id : "work";
        window.isManualOverride = false; // Reset override since that context is now empty
    }

    // 4. Execute the switch and redraw
    window.activeTab = fallbackTab; 
    localStorage.setItem("activeTab", fallbackTab);

    // 3. UI Reset
    // switchTab("work");
    initTabs();

    if (typeof showToast === 'function') showToast("Tab and data deleted");
}

// Global Bridges
// --- Window Bridge (Public API) ---
// window.openActiveTabSettings = () => { if (window.activeTab) openTabSettings(window.activeTab); };
window.openNewTabCreator = () => openTabSettings(null);
window.deleteTab = () => {
    const tabId = window.activeTab;
    if (CORE_DEFAULT_TABS.includes(tabId)) return alert("Default tabs cannot be deleted.");
    const tab = getTabData(tabId);
    if (confirm(`Delete "${tab.name}" and all its tasks?`)) finalizeTabDeletion(tabId);
};



// Start
document.addEventListener("DOMContentLoaded", () => {
    // RUN MIGRATION CHECK
    if (localStorage.getItem('tabList')) {
        migrateLegacyTabs();
    }
    initTabs();
    initEventListeners();
    startRoutineHeartbeat();
});

function migrateLegacyTabs() {
    console.log("Migration: Starting...");
    
    // 1. Get current master list and legacy list
    let masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');
    let legacyIds = JSON.parse(localStorage.getItem('tabList') || '[]');
    
    if (legacyIds.length === 0) {
        console.log("Migration: No legacy tabs found in 'tabList'.");
        return;
    }

    let migrationCount = 0;

    legacyIds.forEach(id => {
        // Check if this ID is already in the master list
        const exists = masterTabs.some(t => t.id === id);
        
        if (!exists) {
            // Retrieve the name from the old individual key
            const oldName = localStorage.getItem(`tabName_${id}`) || "Recovered Tab";
            
            // Create a new master_tab object
            const newTabEntry = {
                id: id,
                name: oldName,
                category: "Work", // Default for legacy
                type: "list",
                items: [] // Placeholder for task persistence
            };
            
            masterTabs.push(newTabEntry);
            migrationCount++;
        }
    });

    if (migrationCount > 0) {
        // Update both memory and storage
        window.allTabs = masterTabs;
        localStorage.setItem('master_tabs', JSON.stringify(masterTabs));
        console.log(`Migration: Successfully moved ${migrationCount} tabs.`);
        
        // Refresh the UI
        initTabs();
    } else {
        console.log("Migration: All tabs were already present in master_tabs.");
    }
}


// ROutine order
const ROUTINE_ORDER = ["Morning", "Work", "Gym", "Evening", "Night"];

function renderRoutineBar() {
    const container = $('#routine_container');
    const handleCont = $('#handle_container');
    
    // Safety check
    if (container.length === 0) return;

    handleCont.empty(); 
    
    ROUTINE_ORDER.forEach((key) => {
        // Use window.routineConfig which we defined earlier
        const config = window.routineConfig[key];
        const leftPercent = (config.start / 24) * 100;

        const handle = $(`
            <div class="handle" 
                 data-mode="${key}" 
                 style="left: ${leftPercent}%" 
                 data-time="${String(config.start).padStart(2, '0')}:00">
            </div>
        `);
        
        handleCont.append(handle);
        setupDraggable(handle, key);
    });
    
    updateSegments(); 
}

// Call this manually in the console to test: renderRoutineBar();
            
function updateBoundary(modeName, newStartValue) {
    const keys = Object.keys(window.routineConfig);
    const currentIndex = keys.indexOf(modeName);
    const prevIndex = (currentIndex - 1 + keys.length) % keys.length;
    const prevModeName = keys[prevIndex];

    // 1. Update this mode's start
    window.routineConfig[modeName].start = newStartValue;
    
    // 2. Update the previous mode's end to match
    window.routineConfig[prevModeName].end = newStartValue;
    
    // 3. Persist and Refresh
    localStorage.setItem('routine_config', JSON.stringify(window.routineConfig));
}

function saveRoutinePrefs() {
    $('.time-slider').each(function() {
        const mode = $(this).data('mode');
        const startTime = parseInt($(this).val());
        
        // Update the start of THIS mode
        ROUTINE_CONTEXTS[mode].start = startTime;
        
        // Update the end of the PREVIOUS mode in the cycle
        const modes = Object.keys(ROUTINE_CONTEXTS);
        const prevMode = modes[(modes.indexOf(mode) + modes.length - 1) % modes.length];
        ROUTINE_CONTEXTS[prevMode].end = startTime;
    });

    localStorage.setItem('routine_config', JSON.stringify(ROUTINE_CONTEXTS));
    
    // Immediately re-run the clock check
    const newContext = getAutoContext();
    if (!window.isManualOverride) {
        window.applyContext(newContext);
    }
    
    showToast("Routine Updated");
}

function updateSegments() {
    const segDisplay = $('#segment_display');
    segDisplay.empty();

    ROUTINE_ORDER.forEach((key) => {
        const config = window.routineConfig[key];
        const nextKey = ROUTINE_ORDER[(ROUTINE_ORDER.indexOf(key) + 1) % ROUTINE_ORDER.length];
        
        // Calculate start and width as percentages
        const startPercent = (config.start / 24) * 100;
        let duration = (window.routineConfig[nextKey].start - config.start + 24) % 24;
        if (duration === 0) duration = 24; 
        const widthPercent = (duration / 24) * 100;

        const seg = $(`
            <div class="bar-segment" 
                 style="position: absolute; left: ${startPercent}%; width: ${widthPercent}%; background: ${config.theme}; height: 100%;">
                 <span class="segment-icon">${config.icon}</span>
            </div>
        `);
        segDisplay.append(seg);
    });
}

function openSyncDashboard() {
    const syncDash = $('#syncDashboard'); // Using jQuery for consistency
    syncDash.toggleClass('hidden');
    
    if (!dash.classList.contains("hidden")) updateDashboardUI();
}
function openCommandbar() {
    const combar = $('#commandBar'); // Using jQuery for consistency
    combar.toggleClass('hidden');
    
    if (!combar.hasClass('hidden')) {
        // If opening the bar, also render the routine bar if settings are open
        if (!$('#commandsettings').hasClass('hidden')) {
            renderRoutineBar();
        }
    }
}

function openCommandsettings() {
    const comset = $('#commandsettings');
    comset.toggleClass('hidden');
    
    if (!comset.hasClass('hidden')) {
        // Force a slight delay or use requestAnimationFrame to ensure DOM is ready
        setTimeout(() => {
            renderRoutineBar();
        }, 10);
    }
}

// Map your updateDashboardUI to the render function
window.updateDashboardUI = renderRoutineBar;

function setupDraggable(handle, modeKey) {
    handle.on('mousedown touchstart', function(e) {
        e.preventDefault();
        const container = $('#routine_container');
        const rect = container[0].getBoundingClientRect();

        $(document).on('mousemove.drag touchmove.drag', function(de) {
            const pageX = de.pageX || de.originalEvent.touches[0].pageX;
            const x = pageX - rect.left;
            
            // Convert pixels to 0-24 scale
            let hour = Math.round((x / rect.width) * 24);
            hour = (hour + 24) % 24; // Clamp and wrap

            // 1. Update the state
            updateBoundary(modeKey, hour);
            
            // 2. Refresh UI elements
            const leftPercent = (hour / 24) * 100;
            handle.css('left', `${leftPercent}%`);
            handle.attr('data-time', `${String(hour).padStart(2, '0')}:00`);
            
            updateSegments();

            // 3. Sync Engine: Switch context immediately if the shift affects "now"
            if (!window.isManualOverride) {
                const fresh = getAutoContext();
                if (window.currentContext !== fresh) window.applyContext(fresh);
            }
        });

        $(document).on('mouseup.drag touchend.drag', function() {
            $(document).off('.drag');
            if (typeof showToast === 'function') showToast(`Routine updated: ${modeKey} starts at ${window.routineConfig[modeKey].start}:00`);
        });
    });
}
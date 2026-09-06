// Navigation and state controller:
// single brain, context engine
// Track routine logic, manages framing, 
// what is current mode, display relevant tabs
// 
// --- Constants ---
// const CORE_DEFAULT_TABS = ["work", "personal"];

// ------------------- CONTEXTS -----------------------
const ROUTINE_CONTEXTS = {
    "Morning": { start: 5,  end: 9,  icon: "🌅", theme: "#ff9f43" },
    "Work":    { start: 9,  end: 17, icon: "💻", theme: "#54a0ff" },
    "Gym":    { start: 17,  end: 18, icon: "🏋️", theme: "#80450e" },
    "Evening": { start: 18, end: 22, icon: "🌆", theme: "#5f27cd" },
    "Night":   { start: 22, end: 5,  icon: "🌙", theme: "#222f3e" },
    "Shelf": {icon: "📥", color: "#e67e22"}
};

//     const DefaultTabs = {
//     "Morning": { start: 5,  end: 9,  icon: "🌅", theme: "#ff9f43" },
//     "Work":    { start: 9,  end: 17, icon: "💻", theme: "#54a0ff" },
//     "Gym":    { start: 17,  end: 18, icon: "🏋️", theme: "#80450e" },
//     "Evening": { start: 18, end: 22, icon: "🌆", theme: "#5f27cd" },
//     "Night":   { start: 22, end: 5,  icon: "🌙", theme: "#222f3e" }
// };

const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const cats = ["morning", "work", "gym", "evening", "night"];

window.initRoutineMatrix = function() {    
    let matrix = JSON.parse(localStorage.getItem("routine_matrix"));
    
    if (!matrix) {
        matrix = {};
        days.forEach(d => {
            matrix[d] = {};
            cats.forEach(c => matrix[d][c] = null); // Start empty
        });
        localStorage.setItem("routine_matrix", JSON.stringify(matrix));
    } else {
        // MAINTENANCE: If you added a new category/day, make sure it's in the object
        days.forEach(d => {
            if (!matrix[d]) matrix[d] = {};
            cats.forEach(c => {
                if (matrix[d][c] === undefined) matrix[d][c] = null;
            });
        });
    }
    window.routineMatrix = matrix;
    console.log('Matrix Initialized:', window.routineMatrix);
};

window.renderRoutineGrid = function() {
    const container = document.getElementById('routineGridContainer');
    console.log('container', container);
    if (!container) return;
    
    const now = new Date();
    // JS getDay() is 0 for Sunday. Adjust to match your ["mon", "tue"...] array.
    const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const currentDay = days[dayIndex];
// Get current category from your existing logic
    // Safer version for your grid renderer
    const auto = getAutoContext();
    const currentCatName = (auto.category || "Work").toLowerCase();
    
    let html = `<div class="routine-grid">`;
    console.log('container2', container);
    // Header Row (Days)
    html += `<div class="grid-label"></div>`; // Corner
    days.forEach(d => html += `<div class="grid-header">${d.toUpperCase()}</div>`);

    // Data Rows
    cats.forEach(cat => {
        html += `<div class="grid-label cat-label">${cat}</div>`;
        days.forEach(day => {
            const selectedTabId = window.routineMatrix[day][cat];
            const tab = (window.allTabs || []).find(t => t.id === selectedTabId);
            const label = tab ? tab.name.substring(0, 35) : '---';
            // const isActive = tab ? 'active-cell' : '';
            // Highlight the cell if it matches the current focused tab
    const cellClass = tab ? 'assigned-cell' : 'empty-cell';
    const isCurrentlyViewed = (selectedTabId === window.activeTab) ? 'active-focus' : '';
// Then use: class="grid-cell ${cellClass} ${isCurrentlyViewed}"
            html += `
                <div class="grid-cell ${cellClass} ${isCurrentlyViewed}" onclick="cycleGridCell('${day}', '${cat}')">
                    ${label}
                </div>`;
        });
    });

    html += `</div>`;
    container.innerHTML = html;
};

window.cycleGridCell = function(day, cat) {
    // 1. Find all tabs belonging to this category
    const candidates = (window.allTabs || []).filter(t => t.category && t.category.toLowerCase() === cat.toLowerCase());

    if (candidates.length === 0) {
        console.warn(`No tabs found for category: ${cat}`);
        return alert(`No tabs found in category: ${cat}`);
    }
    const currentId = window.routineMatrix[day][cat];
    const currentIndex = candidates.findIndex(t => t.id === currentId);
    
    // 2. Select next tab (or back to null/empty)
    let nextTab;
    if (currentIndex === candidates.length - 1) {
        nextTab = null; // Reset to empty after last tab
    } else {
        nextTab = candidates[currentIndex + 1];
    }

    // 3. Update Matrix & LocalStorage
    window.routineMatrix[day][cat] = nextTab ? nextTab.id : null;
    localStorage.setItem("routine_matrix", JSON.stringify(window.routineMatrix));

    // 4. Update Tab Order (Visual Priority)
    if (nextTab) {
        // Increment order so it floats to the top of its category
        nextTab.order = (nextTab.order || 0) + 1;
        localStorage.setItem("master_tabs", JSON.stringify(window.allTabs));
    }

    renderRoutineGrid();
    if (window.pushFullSync) window.pushFullSync();
};

// Global config sourced from Storage or Defaults
window.routineConfig = JSON.parse(localStorage.getItem('routine_config')) || ROUTINE_CONTEXTS;

// --- Global State ---
// 1. Try to get existing tabs
let masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

// 2. If no tabs exist (New User / Cleared Data), seed the structural timeline categories 
if (masterTabs.length === 0) {
    const baseTime = Date.now();
    
    // Define the blueprint for your standard daily tracking structure
    const defaultCategories = [
        { name: "Morning Routine", category: "Morning", type: "list" },
        { name: "Studio Tasks",    category: "Work",    type: "list" },
        { name: "Gym2 - weights",  category: "Gym",     type: "checkin" }, // Auto-boots with your checkin layout matrices!
        { name: "Evening Routine", category: "Evening", type: "list" },
        { name: "Night Review",    category: "Night",   type: "list" }
    ];

    // Map blueprints into fully qualified master_tab object schemas
    masterTabs = defaultCategories.map((tabBlueprint, index) => {
        return {
            id: `tab_${baseTime}_${index}`, // Buffered unique timestamp string keys
            name: tabBlueprint.name,
            category: tabBlueprint.category,
            order: index,
            type: tabBlueprint.type
        };
    });

    // Save newly initialized arrays down to LocalStorage
    localStorage.setItem('master_tabs', JSON.stringify(masterTabs));
    
    // Set the very first item ("Morning Routine") as active so the UI loads cleanly
    localStorage.setItem('activeTab', masterTabs[0].id);
    window.activeTab = masterTabs[0].id;
} else {
    // Standard initialization anchor if tabs already live in memory
    window.activeTab = localStorage.getItem('activeTab') || masterTabs[0].id;
}

// 
window.allTabs = masterTabs;
window.editingTabId = null;
window.isManualOverride = false; // Prevents auto-switching if the user manually picks a tab



/**
 * 1. GET THE AUTO CONTEXT
 * Logic to handle the 24-hour wrap-around for 'Night'
 */

window.getAutoContext = function (overrideContext = null) {
    const now = new Date();
    const hour = now.getHours();
    const dayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const currentDay = days[dayIndex];

    // JS getDay(): 0 is Sunday, 1 is Monday...
    // Adjust to match your ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

    // Ensure we start with a String
    let activeCatName = "Night"; 

    if (overrideContext && typeof overrideContext === 'string') {
        activeCatName = overrideContext;
    } else if (overrideContext && typeof overrideContext === 'object') {
        // Defensive: if the whole object was passed, extract the category
        activeCatName = overrideContext.category || "Night";
    } else {
        // Normal clock-based logic
        for (const [name, limits] of Object.entries(ROUTINE_CONTEXTS)) {
            if (limits.start < limits.end) {
                if (hour >= limits.start && hour < limits.end) activeCatName = name;
            } else {
                if (hour >= limits.start || hour < limits.end) activeCatName = name;
            }
        }
    }



console.log('getautocontext');
    // Matrix check: Use the tab assigned in the grid, fallback to the category name
// Now we know activeCatName is a string, so .toLowerCase() is safe
    const catKey = activeCatName.toLowerCase();
    const matrixTabId = window.routineMatrix?.[currentDay]?.[catKey];

    // 3. Return the Tab ID if assigned, otherwise the Category name
    return {
        category: activeCatName, // e.g., "Work"
        tabId: matrixTabId
        // matrixTabId || activeCatName.charAt(0).toUpperCase() + activeCatName.slice(1);
    }
}
// Initialize Context: Start with the clock
window.currentContext = window.getAutoContext();

// Initialize global variables used by script.js
window.activeTab = localStorage.getItem("activeTab") || 'work';
window.activeTabList = `${window.activeTab}List`; //ta bort
window.activeTabPurgeList = `${window.activeTab}PurgeList`;


/**
 * 2. MASTER APPLY FUNCTION
 * Handles Header, Command Bar, and Tab Visibility
 * @return {Array|void} Returns data array if context is an isolated data panel
 */
window.applyContext = function(contextName, manual = false) {
    // DEFENSIVE: If an object was passed, extract the category string
    if (typeof contextName === 'object' && contextName.category) {
        contextName = contextName.category;
    }

    // Now it's safe to check .startsWith
    if (typeof contextName === 'string' && contextName.startsWith('tab_')) {
        const tab = getTabData(contextName);
        contextName = tab.category;
    }

    // 2. DEFINE TARGET: This fixes the ReferenceError
    // We pass contextName to get the priority tab for the selected mode
    const target = getAutoContext(contextName);
    
  // 1. Update the State
    window.currentContext = contextName;
    if (manual) window.isManualOverride = true;
    
    const contextData = ROUTINE_CONTEXTS[contextName];
    // If it's still not found, fallback to Work to avoid the ❓
    if (!contextData) {
        console.warn("Invalid context requested:", contextName);
        if (contextName !== "Work") window.applyContext("Work", manual);
        return;
    }

    // Update Header Label
    const label = $('#active_context_label');
    label.html(`${contextData.icon} ${contextName}`);
    label.toggleClass('manual-mode', window.isManualOverride);

    // Update Command Bar Icons (Bottom)
    $('.context-btn').removeClass('active');
    $(`.context-btn[data-context="${contextName}"]`).addClass('active');

    // ----------------------------------------------------
    // BRANCHING ARCHITECTURE MATRIX
    // ----------------------------------------------------
    const masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

    if (contextName === 'Shelf') {
        // Hide ALL tabs on the main top navigation bar since we are in shelf view
        $('.tab').toggle(false);
        
        // Return ONLY the shelved tabs back to the caller (renderShelfPanel)
        return masterTabs.filter(tab => !!tab.shelved);
    }

    // NORMAL CATEGORY ROUTINES (Morning, Work, Gym, etc.)
    let firstVisibleTabId = null;
    let currentTabVisible = false;

    $('.tab').each(function() {
        const tabId = $(this).attr('data-tab-id');
        const tabData = getTabData(tabId);
        
        // Hide if the tab is shelved. If not shelved, check the category.
        const isVisible = !tabData.shelved && (
            !tabData.category || 
            tabData.category === contextName || 
            tabData.category === "undefined"
        );
        // -----------------------------------------------
        $(this).toggle(isVisible);

        // 2. Priority Highlight Logic
        // This ensures the "Matrix Priority" glow moves when you switch categories
        $(this).toggleClass('matrix-priority', tabId === target.tabId);
        
        // 3. Active Tab Logic
        $(this).toggleClass('active', tabId === window.activeTab);

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
            const target = getAutoContext();
            
            // 1. Handle Category Sync (Filtering)
            if (window.currentContext !== target.category) {
                window.applyContext(target.category);
            }

            // 2. Handle Specific Tab Sync (Focusing)
            if (target.tabId && window.activeTab !== target.tabId) {
                console.log("Matrix focusing tab:", target.tabId);
                switchTab(target.tabId);
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
    
    // Check if the tab is subscribed/remote
    const isRemote = !!tab.remoteOwnerId; //
    
    
    // Add the standard "tab" class, and conditionally add "is-remote"
    // tabEl.className = `tab ${isRemote ? 'is-remote' : ''}`; //
    // Check if this tab is the one assigned in the matrix RIGHT NOW
    // Look for priority based on whatever context is currently being viewed
    const viewTarget = getAutoContext(window.currentContext);
    const isMatrixPriority = (tab.id === viewTarget.tabId);

    tabEl.className = `tab ${isRemote ? 'is-remote' : ''} ${isMatrixPriority ? 'matrix-priority' : ''}`;
    
    // Add active class if it's the current global active tab
    if (tab.id === window.activeTab) {
        tabEl.classList.add("active");
    }

    tabEl.setAttribute("data-tab-id", tab.id);
    tabEl.setAttribute("data-category", tab.category);

    const span = document.createElement("span");
    span.className = "tab-label";
    
    // Optional: Keep the label as is, or prepend a small indicator if desired
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
        enterTaskInput.placeholder = ` Enter task for ${tabData.name}`;
    }

    // 4. Data Refresh: Trigger main list update in script.js
    if (typeof window.displayData === 'function') window.displayData();
}

/**
 * Helper to get a tab object from memory.
 */
// current category or active tab category, latter probably..
function getTabData(tabId) {
    // allTabs= look in master_tabs for tabId, then get tablist entry for that tabId
    return window.allTabs.find(t => t.id === tabId) || 
           { id: tabId, name: "New Tab", category: 'Work', type: 'list' };
}
/**
 * Helper to set a tab object from memory.
 * replace all localstorage calls, simplify
 */
function setTabData(tabId) {
    // allTabs= look in master_tabs for tabId, then get tablist for that tabId
    return window.allTabs.find(t => t.id === tabId) || 
           { id: tabId, name: "New Tab", category: 'Work', type: 'list' };
}

// --- Tab Settings Card Logic ---
function openTabSettings(tabId = null) {
    console.log('tab edit', tabId);
    window.editingTabId = tabId;

    const tab = getTabData(tabId);
    const isRemote = tab && !!tab.remoteOwnerId;
    const card = $('#tab_settings_card');
    
    // if (tabId) {
        // Disable inputs if the tab is remote
        $('#tab_name_input').prop('disabled', isRemote);
        $('#tab_mode_select').prop('disabled', isRemote);
        $('.category-icon-picker').css('pointer-events', isRemote ? 'none' : 'auto');
        $('#tab_name_input').val(tab.name);
        $('#tab_mode_select').val(tab.type || 'list');
        // existing tab read category
        selectCategoryIcon(tab.category);
        // new tab, suggest current context category
        //     selectCategoryIcon(window.currentContext || 'Work');
        
        if (isRemote) {
            console.log(' edit', tabId);
            $('#sheet_title').text('Tab is remote, Guest Settings (ReadOnly)');
            $('#save_tab_btn').hide(); // Hide save button for subscribers
            // $('#delete_tab_btn').hide();
        } else {
            console.log('local tab edit', tabId);
            $('#sheet_title').text(tabId ? 'Edit Tab (local)' : 'New Tab');
            $('#save_tab_btn').show();

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
    // if (CORE_DEFAULT_TABS.includes(tabId)) return alert("Default tabs cannot be deleted.");
    const tab = getTabData(tabId);
    if (confirm(`Delete "${tab.name}" and all its tasks?`)) finalizeTabDeletion(tabId);
};



// Start
document.addEventListener("DOMContentLoaded", () => {
    // RUN MIGRATION CHECK
    if (localStorage.getItem('tabList')) {
        migrateLegacyTabs();
    }
    initRoutineMatrix();
    initTabs();

    // Fix: Handle the object return
    const initialTarget = getAutoContext();
    window.currentContext = initialTarget.category;
    
    // If matrix has a specific tab for right now, use it; otherwise use last active
    if (initialTarget.tabId) {
        window.activeTab = initialTarget.tabId;
    }

    renderRoutineGrid();
    initEventListeners();
    startRoutineHeartbeat();

    // Final check: Apply the current string context
    window.applyContext(window.currentContext);
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
    
    if (!syncDash.hasClass('hidden')) updateDashboardUI();
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
function openFocusmatrix() {
    const syncDash = $('#routineMatrix'); // Using jQuery for consistency
    syncDash.toggleClass('hidden');
    
    if (!syncDash.hasClass('hidden')) updateDashboardUI();
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
                if (window.currentContext !== fresh.category) window.applyContext(fresh.category);
            }
        });

        $(document).on('mouseup.drag touchend.drag', function() {
            $(document).off('.drag');
            if (typeof showToast === 'function') showToast(`Routine updated: ${modeKey} starts at ${window.routineConfig[modeKey].start}:00`);
        });
    });
}

/**
 * Global single function to handle shelving and unshelving tabs
 * @param {string} tabId - Target tab identifier
 */
window.toggleShelveStatus = function(tabId) {
    const targetTabId = tabId || window.activeTab;
    if (!targetTabId) return;

    console.log("toggleshelvestatus", targetTabId)
    let masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');
    const targetIdx = masterTabs.findIndex(t => t.id === targetTabId);

    if (targetIdx !== -1) {
        // 1. Flip flag status
        const isNowShelved = !masterTabs[targetIdx].shelved;
        masterTabs[targetIdx].shelved = isNowShelved;
        localStorage.setItem('master_tabs', JSON.stringify(masterTabs));

        // 2. Force evaluate active context viewport layout
        // If we just shelved the active tab, applyContext will automatically pivot tab focus safely.
        window.applyContext(window.currentContext);
        
        if (typeof window.renderTaskList === 'function') window.renderTaskList();
        if (typeof window.pushFullSync === 'function') window.pushFullSync();
    }
    displayData();
};

function renderShelfPanel() {
    const shelfContainer = $('#shelf_tiles_container');
    shelfContainer.empty();

    // Reuses the MASTER context pipeline to pull only shelved tabs!
    const shelvedTabs = window.applyContext('Shelf') || [];

    if (shelvedTabs.length === 0) {
        shelfContainer.html(`<div class="shelf-empty">The shelf is empty. Pack away tabs to return to in the future here.</div>`);
        return;
    }

    shelvedTabs.forEach(tab => {
        // Use your general purpose data helper with strict 'List' suffix support
        const items = getTabStorageData(tab.id, tab.type);
        const totalCount = items.length;
        
        // Calculate completions based on view layout properties
        const completedCount = tab.type === 'checkin' 
            ? items.filter(i => (i.clicks || 0) > 0).length 
            : items.filter(i => i.checked === true).length;

        const tile = $(`
            <div class="checkin-tile" data-id="${tab.id}">
            
                <div class="checkin-text">${tab.name}</div>                
                
                <div class="checkin-subline">
                    <div class="goal-container">
                        <span class="goal-display">${completedCount}/${totalCount}</span>
                    </div>
                        <span class="checkin-count">${ROUTINE_CONTEXTS[tab.category].icon}/${tab.type === 'checkin' ? '📊' : '✅'}</span>
                </div>
            </div>
        `);



        // Click a tile to toggle its status back to active visibility
        tile.on('click', function() { 
            window.toggleShelveStatus(tab.id); 
        });
        
        shelfContainer.append(tile);
    });
    updateDashboardUI();
}
// PANEL CONTROLLER
// [key]:{title,shortcut,size,position}
// vertical alignment first, horizontal alignment second
const UI_PANEL_CONFIG = {
    edit_panel: {
        title: "Edit Panel",
        shortcut: "dblclck", // Triggered via your unified schema routing
        width: "50%", height: "40%",
        position: "bottom-center",
        animateDirection: "w3-animate-left",
        renderSource: (itemData, type) => renderUnifiedForm(itemData, type)
    },
    history_panel: {
        title: "History Panel",
        shortcut: "f",
        width: "90%", height: "30%",
        position: "bottom-right",
        animateDirection: "w3-animate-bottom",
        renderSource: () => renderPurgeListPanel()
    },
    sync_panel: {
        title: "Cross device syncing ",
        shortcut: "d",
        width: "50%", height: "30%",
        position: "bottom-right",
        animateDirection: "w3-animate-bottom",
        renderSource: () => renderSyncPanel()
    }
};

/**
 * Master Controller to dynamically present any application module
 * @param {string} panelKey - The key from UI_PANEL_CONFIG
 * @param {...args} injectionData - Optional context variables (like task details for editing)
 */
window.togglePanelDisplay = function(panelKey, ...injectionData) {
    const config = UI_PANEL_CONFIG[panelKey];
    if (!config) return;
    

    const panelDOM = $(`#universal_panel_wrapper`);
    // If clicking the same panel shortcut while it's open, shut it down cleanly
    if (panelDOM.attr('data-active-panel') === panelKey && panelDOM.hasClass('open')) {
        panelDOM.removeClass('open');
        return;
    }

    // 1. Inject content dynamically using the config's callback pointer
    const contentContainer = panelDOM.find('.panel-body-content');
    contentContainer.empty();
    contentContainer.append(config.renderSource(...injectionData));

    // 2. Map structural dimensions dynamically
    panelDOM.css({
        'width': config.width,
        'height': config.height
    });

    // 3. Reset position attributes & apply fresh alignment classes
    panelDOM.removeClass(function (index, className) {
        return (className.match(/(^|\s)align-\S+/g) || []).join(' ');
    }).addClass(`align-${config.position}`);

    // 4. Update Header Title Contextually
    panelDOM.find('.panel-header-title').text(config.title);

    // 5. Fire smooth animation transition
    panelDOM.attr('data-active-panel', panelKey).addClass('open');
};

/**
 * Master Keydown shortcut listener
 * @param {string} panelKey - The key from UI_PANEL_CONFIG
 * @param {...args} injectionData - Optional context variables (like task details for editing)
 */

$(document).ready(function() {
    // Master Orchestration Hook
    $(document).on('keydown', function(e) {
        if ($(e.target).is('input, textarea, [contenteditable]')) return;
        
        const pressedKey = (e.key || "").toLowerCase();

        if (pressedKey === 'x') {
            e.preventDefault();
            if (typeof openCommandbar === 'function') openCommandbar();
            return;
        }

        if (pressedKey === 'h') {
            e.preventDefault();
            if (typeof showHistory === 'function') showHistory();
            return;
        }

        // 3. UNIVERSAL CONFIG-DRIVEN MATRIX SHORTCUTS (Works everywhere!)
        if (typeof UI_PANEL_CONFIG !== 'undefined') {
            const matchedPanelKey = Object.keys(UI_PANEL_CONFIG).find(
                key => UI_PANEL_CONFIG[key].shortcut === pressedKey
            );

        if (matchedPanelKey) {
            e.preventDefault();
            
            // Fire the targeted universal panel display shift
            if (typeof window.togglePanelDisplay === 'function') {
                window.togglePanelDisplay(matchedPanelKey);
            }
        }
    }
    });
});

// click on visual buttons listener
$(document).ready(function() {
    
    // Catch clicks on ANY panel trigger button dynamically
    $(document).on('click', '.panel-trigger-btn', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevents layout bubbling conflicts

        // Pull the config key string (e.g., "tab_shelf")
        const targetPanelKey = $(this).attr('data-panel'); 
        
        if (targetPanelKey) {
            console.log(`Button triggered display pass for: ${targetPanelKey}`);
            
            // Execute the master panel layout transition
            if (typeof window.togglePanelDisplay === 'function') {
                window.togglePanelDisplay(targetPanelKey);
            }
        }
    });

});

// Global edit delegated double-click router for individual list items & check-in tiles
$(document).on('dblclick', '.sortable-item, .checkin-tile, .todo-item', function(e) {
    // Prevent text highlighting or accidental sub-element triggers during fast double-tapping
    e.preventDefault();
    e.stopPropagation();

    // 1. Extract the unique ID embedded in the element's data attributes
    const itemId = $(this).attr('data-id');
    if (!itemId) {
        console.warn("Cannot initialize edit sequence: Element missing 'data-id' attribute.");
        return;
    }

    // 2. Pull the active tab's layout array from storage
    // (Tasks are scoped inside their active routine navigation tab)
    const activeTabId = window.activeTab;
    if (!activeTabId) return;

    const currentTasks = getTabStorageData(activeTabId, getTabData(activeTabId)?.type) || [];
    
    // 3. Locate the single pinpoint data object matching our target ID
    const targetedTaskData = currentTasks.find(item => item.id === itemId);

    if (targetedTaskData) {
        console.log(`Routing Task Model to Edit Panel: ${itemId}`, targetedTaskData);
        
        // 4. Force reveal the panel, passing the targeted task dataset and context mode
        if (typeof window.togglePanelDisplay === 'function') {
            window.togglePanelDisplay('edit_panel', targetedTaskData, 'task');
        }
    } else {
        console.error(`Task object matching ID ${itemId} could not be located in local storage arrays.`);
    }
});

function renderSyncPanel() {
    const shelfView = $('<div class="shelf-panel-view"></div>');
    const tileGrid = $('<div id="shelf_tiles_container" class="">Locally stored on this device only in free version</div>');
    shelfView.append(tileGrid);
    
    // 3. CRITICAL: Return the completed fragment straight back to togglePanelDisplay
    return shelfView;
}

/**
 * Global single function to handle shelving and unshelving tabs
 * @param {string} tabId - Target tab identifier
 */

function renderUnifiedForm(itemData, mode) {
    console.log("render unified EDIT")
    // 1. Build the form structure template shell
    const formFragment = $(`
        <div class="unified-edit-form">
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="edit_field_name" class="form-control">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="edit_field_desc" class="form-control"></textarea>
            </div>
            <div class="slider-group" style="display: none;">
                <label>Progress Matrix (Current Value)</label>
                <input type="range" id="edit_field_slider" class="form-slider">
                <div class="metric-display"><span id="lbl_current">0</span> / <span id="lbl_goal">0</span></div>
            </div>
            <div class="meta-group" style="margin-top: 15px; font-size: 0.75rem; color: #666;">
                <div id="edit_meta_created"></div>
                <div id="edit_meta_updated"></div>
            </div>
            <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px;">
                <button id="btn_save_edit" class="btn btn-primary">Save Changes</button>
                <button id="btn_delete_edit" class="btn btn-danger">Delete</button>
            </div>
        </div>
    `);

    // 2. Hydrate the elements dynamically based on data arguments
    const isTab = (mode === 'tab');
    formFragment.find('#edit_field_name').val(isTab ? itemData.name : itemData.text);
    formFragment.find('#edit_field_desc').val(itemData.description || '');

    if (!isTab) {
        formFragment.find('#edit_meta_created').text(`Created: ${itemData.createdAt || 'N/A'}`);
        formFragment.find('#edit_meta_updated').text(`Last Updated: ${itemData.updatedAt || 'N/A'}`);
        
        // Check if it's a numeric tracking tile (e.g., "Pushups 45/100")
        const metricMatch = itemData.text && itemData.text.match(/(\d+)\/(\d+)/);
        if (metricMatch) {
            const currentVal = parseInt(metricMatch[1], 10);
            const goalVal = parseInt(metricMatch[2], 10);
            
            // Strip metrics from raw text input display for cleaner formatting
            formFragment.find('#edit_field_name').val(itemData.text.replace(/\d+\/\d+/, "").trim());
            
            // Set slider properties
            formFragment.find('#edit_field_slider').attr({ 'max': goalVal, 'value': currentVal });
            formFragment.find('#lbl_current').text(currentVal);
            formFragment.find('#lbl_goal').text(goalVal);
            formFragment.find('.slider-group').show();

            // Sync text label with slider adjustments in real time
            formFragment.find('#edit_field_slider').on('input', function() {
                formFragment.find('#lbl_current').text($(this).val());
            });
        }
    } else {
        formFragment.find('.meta-group').hide();
    }

    // 3. Bind Actions
    formFragment.find('#btn_save_edit').on('click', function() {
        saveUnifiedDataModifications(itemData.id, mode, formFragment);
    });

    formFragment.find('#btn_delete_edit').on('click', function() {
        executeUnifiedDeletion(itemData.id, mode);
    });

    return formFragment;
}

function saveUnifiedDataModifications(id, mode, fragment) {
    const newName = fragment.find('#edit_field_name').val().trim();
    const newDesc = fragment.find('#edit_field_desc').val().trim();

    if (!newName) {
        alert("The item name field cannot be empty.");
        return;
    }

    if (mode === 'tab') {
        // --- TAB CONFIGURATION DATA PERSISTENCE ---
        let masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');
        const idx = masterTabs.findIndex(t => t.id === id);
        if (idx !== -1) {
            masterTabs[idx].name = newName;
            masterTabs[idx].description = newDesc;
            localStorage.setItem('master_tabs', JSON.stringify(masterTabs));
        }
    } else {
        // --- FIXED: TASK / TILE DATA PERSISTENCE ---
        const activeTabId = window.activeTab;
        if (!activeTabId) return;

        // 1. Fetch the complete structural Tab object instead of just the raw type string string
        const activeTabObject = typeof window.getTabData === 'function' ? window.getTabData(activeTabId) : null;
        const currentTabType = activeTabObject ? activeTabObject.type : null;
        
        // 2. Safely read your working task layout database
        let currentTasks = window.getTabStorageData(activeTabId, currentTabType) || [];
        
        const idx = currentTasks.findIndex(item => item.id === id);
        if (idx !== -1) {
            // Update the object properties precisely
            currentTasks[idx].description = newDesc;
            currentTasks[idx].updatedAt = new Date().toLocaleString();

            // Handle slider evaluations if metrics are active
            if (fragment.find('.slider-group').is(':visible')) {
                const currentSliderVal = fragment.find('#edit_field_slider').val();
                const goalMetricValue = fragment.find('#lbl_goal').text();
                
                currentTasks[idx].text = `${newName} ${currentSliderVal}/${goalMetricValue}`;
                currentTasks[idx].clicks = parseInt(currentSliderVal, 10);
            } else {
                currentTasks[idx].text = newName;
            }

            // 3. CRITICAL INTERACTION FIX: Pass the actual active tab type configuration safely
            // If your custom storage requires the complete object structure, pass activeTabObject instead of currentTabType
            window.setTabStorageData(activeTabId, currentTasks, currentTabType);
            console.log("Task saved and committed to local storage cleanly:", currentTasks);
        }
    }

    // --- REFRESH DISPLAY VIEWPORTS ---
    $('#universal_panel_wrapper').removeClass('open');
    
    if (typeof window.renderTaskList === 'function') window.renderTaskList();
    if (typeof window.pushFullSync === 'function') window.pushFullSync();
}

// --- Global State ---
let masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

if (masterTabs.length === 0) {
    const baseTime = Date.now();
    const defaultTabs = [
        { name: "Morning", category: "Morning", type: "list", displayStyle: "list", taskMode: "singular" },
        { name: "Work", category: "Work", type: "list", displayStyle: "list", taskMode: "singular" },
        { name: "Exercise", category: "Gym", type: "checkin", displayStyle: "tiles", taskMode: "recurring" },
        { name: "Evening", category: "Evening", type: "list", displayStyle: "list", taskMode: "singular" },
        { name: "Night", category: "Night", type: "list", displayStyle: "list", taskMode: "singular" }
    ];

    masterTabs = defaultTabs.map((tabBlueprint, index) => ({
        id: `tab_${baseTime}_${index}`,
        name: tabBlueprint.name,
        category: tabBlueprint.category,
        order: index,
        type: tabBlueprint.type,
        displayStyle: tabBlueprint.displayStyle,
        taskMode: tabBlueprint.taskMode
    }));

    localStorage.setItem('master_tabs', JSON.stringify(masterTabs));
}

window.allTabs = masterTabs;
window.editingTabId = null;

window.activeTab = localStorage.getItem('activeTab') || (window.allTabs[0] ? window.allTabs[0].id : null);
if (window.activeTab) localStorage.setItem('activeTab', window.activeTab);

function handleSaveTab() {
    const name = $('#tab_name_input').val().trim();
    const category = $('.cat-opt.selected').data('val');
    const type = $('#tab_mode_select').val();
    const displayStyle = $('#displayStyleToggle').is(':checked') ? 'tiles' : 'list';
    const taskMode = $('#recurringToggle').is(':checked') ? 'recurring' : 'singular';

    if (!name) return alert("Please provide a name and select an icon/category.");

    // Refresh memory from storage to be safe
    window.allTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

    if (window.editingTabId) {
        const index = window.allTabs.findIndex(t => t.id === window.editingTabId);
        if (index !== -1) {
            window.allTabs[index] = { ...window.allTabs[index], name, category, type, displayStyle, taskMode };
        }
    } else {
        const newId = "tab_" + Date.now();
        window.allTabs.push({ id: newId, name, category, type, displayStyle, taskMode });
        window.activeTab = newId; 
    }

    // Update Memory and Storage
    localStorage.setItem('master_tabs', JSON.stringify(window.allTabs));
    
    // Update UI
    closeTabSettings();
    initTabs();
    
    if (typeof showToast === 'function') showToast("Tab Saved!");
}

/**
 * 4. EVENT LISTENERS
 * Checks every 30 seconds if the hour has shifted
 */
function initEventListeners() {
    // Save Button
    $('#save_tab_btn').off('click').on('click', handleSaveTab);

    // Category and panel buttons are handled elsewhere. No auto-context switching needed in this simplified version.

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
    switchTab(window.activeTab);
}

/**
 * Creates the DOM element for a single tab.
 * @param {Object} tab - The tab object from master_tabs.
 */
function createTabElement(tab) {
    const tabEl = document.createElement("div");
    
    // Check if the tab is subscribed/remote
    const isRemote = !!tab.remoteOwnerId; //
    
    
    tabEl.className = `tab ${isRemote ? 'is-remote' : ''}`;
    
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
    if (!tabId) return;
        
    // 1. Sync Memory & Storage
    localStorage.setItem("activeTab", tabId);
    window.activeTab = tabId;
    // window.activeTabList = `${tabId}List`;
    // window.activeTabPurgeList = `${tabId}PurgeList`;

    // Update the universal tab metadata context object
    window.tabData = typeof getTabData === 'function' 
        ? getTabData(tabId) 
        : { id: tabId, type: 'list', name: 'Task' };
    
    // 2. UI: Update Active Styles
    document.querySelectorAll(".tab").forEach(el => {
        if (el.getAttribute('data-tab-id') === tabId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // 3. UI: Positioning & Placeholder ??
    const selectedTab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (selectedTab) {
        selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    const enterTaskInput = document.getElementById("enter_task");
    if (enterTaskInput) {
        // Fix: Point directly to the updated global window.tabData string reference
        enterTaskInput.placeholder = ` Enter task for ${window.tabData.name || 'this tab'}`;
    }

    // 4. Data Refresh: Trigger main list update in script.js
    if (typeof window.displayData === 'function') {
        window.displayData(); // Automatically triggers renderTaskList() & renderPurgeList()
    } else {
        if (typeof window.renderTaskList === 'function') window.renderTaskList();
        if (typeof window.renderPurgeList === 'function') window.renderPurgeList();
    }
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
        $('#displayStyleToggle').prop('checked', (tab.displayStyle || 'list') === 'tiles');
        $('#recurringToggle').prop('checked', (tab.taskMode || 'singular') === 'recurring');
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

    // 2. Memory Update
    window.allTabs = window.allTabs.filter(t => t.id !== tabId);
    localStorage.setItem('master_tabs', JSON.stringify(window.allTabs));

    // 3. Smart UI Reset
    // Fallback to the first available remaining tab after deletion.
    const visibleTabs = window.allTabs;
    
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
    initTabs();
    initEventListeners();
});

function openCommandbar() {
    const combar = $('#commandBar');
    combar.toggleClass('hidden');
}

// function openCommandsettings() {
//     const comset = $('#commandsettings');
//     comset.toggleClass('hidden');
// }


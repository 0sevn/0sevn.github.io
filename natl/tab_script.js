// PANEL CONTROLLER// [key]:{title,shortcut,size,position}// vertical alignment first, horizontal alignment second
const UI_PANEL_CONFIG = {
    edit_panel: {
        title: "Edit Panel",
        shortcut: "dblclck", // Triggered via your unified schema routing
        width: "75%", height: "40%",
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

/** * Master Controller to dynamically present any panel
 * @param {string} panelKey - The key from UI_PANEL_CONFIG
 * @param {...args} injectionData - Optional context variables (like task details for editing) */
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

function renderSyncPanel() {
    const shelfView = $(`
        <div class="shelf-panel-view">

        </div>`);
    const tileGrid = $(
        `
        <div id="shelf_tiles_container" class="">Locally storage in free version
        <div style="border: 1px solid #ddd; border-radius: 10px;">
            <button class="icon export" id="exportHistory" onclick="exportHistory()">Export history</button > 
            <a id="exportHistoryLink" style="display: none;">Export</a>
            <br>
            <!-- <label for="FileInputLabel"><b>Import</b></label> -->
            <input type="file" id="jsonFileInput" name="jsonFileInput"accept=".json" class="icon import"></input>
          </div>
        </div>`
    );
    
    shelfView.append(tileGrid);
    
    // 3. CRITICAL: Return the completed fragment straight back to togglePanelDisplay
    return shelfView;
}
/** * Master Keydown shortcut listener
 * @param {string} panelKey - The key from UI_PANEL_CONFIG
 * @param {...args} injectionData - Optional context variables (like task details for editing) */
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
            // console.log(`Button triggered display pass for: ${targetPanelKey}`);
            
            // Execute the master panel layout transition
            if (typeof window.togglePanelDisplay === 'function') {
                window.togglePanelDisplay(targetPanelKey);
            }
        }
    });

});

// Global edit delegated double-click router for // list items & check-in tiles
$(document).on('dblclick', '.sortable-item, .checkin-tile, .todo-item', function(e) {
    // Prevent text highlighting or accidental sub-element triggers during fast double-tapping
    e.preventDefault();
    e.stopPropagation();
    // 1. Extract the unique ID embedded in the element's data attributes
    const itemId = $(this).attr('data-id');
    if (!itemId) {
        // console.warn("Cannot initialize edit sequence: Element missing 'data-id' attribute.");
        return;
    }

    // 2. Pull the active tab's layout array from storage
    const activeTabId = window.activeTab;
    if (!activeTabId) return;

    const currentTasks = getTabStorageData(activeTabId, getTabData(activeTabId)?.type) || [];
    
    // 3. Locate the single pinpoint data object matching our target ID
    const targetedTaskData = currentTasks.find(item => item.id === itemId);

    if (targetedTaskData) {
        // console.log(`Routing Task Model to Edit Panel: ${itemId}`, targetedTaskData);
        
        // 4. Force reveal the panel, passing the targeted task dataset and context mode
        if (typeof window.togglePanelDisplay === 'function') {
            window.togglePanelDisplay('edit_panel', targetedTaskData, 'task');
        }
    } else {
        // console.error(`Task object matching ID ${itemId} could not be located in local storage arrays.`);
    }
});

// =====================================================================
// MASTER TAB STORAGE API// --- Global State ---// Default tabs
window.masterTabs = JSON.parse(localStorage.getItem("master_tabs") || "[]");
window.editingTabId = null;

if (window.masterTabs.length === 0) {
    const baseTime = Date.now();
    const defaultTabs = [
        { name: "Morning", category: "Morning", type: "list", displayStyle: "list", taskMode: "singular" },
        { name: "Work", category: "Work", type: "list", displayStyle: "list", taskMode: "singular" },
        { name: "Exercise", category: "Gym", type: "checkin", displayStyle: "tiles", taskMode: "recurring" },
        { name: "Evening", category: "Evening", type: "list", displayStyle: "list", taskMode: "singular" },
        { name: "Night", category: "Night", type: "list", displayStyle: "list", taskMode: "singular" }
    ];

    window.masterTabs = defaultTabs.map((tabBlueprint, index) => ({
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
function getMasterTabs() {
    return window.masterTabs;
}

function setMasterTabs(masterTabs) {
    window.masterTabs = masterTabs;
    localStorage.setItem("master_tabs", JSON.stringify(masterTabs));
}

function getTabData(tabId) {
    return getMasterTabs().find(tab => tab.id === tabId) || null;
}

function setTabData(tabId, updates) {
    const masterTabs = getMasterTabs();

    const index = masterTabs.findIndex(tab => tab.id === tabId);
    if (index === -1) return null;

    masterTabs[index] = {
        ...masterTabs[index],
        ...updates
    };

    setMasterTabs(masterTabs);
    return masterTabs[index];
}

// Global Bridges
window.openNewTabCreator = () => openTabSettings(null);
function openTabSettings(tabId = null) {
    window.editingTabId = tabId;
    const tab = getTabData(tabId);
    // const isRemote = tab && !!tab.remoteOwnerId;
    const card = $('#tab_settings_card');
    
        // $('#tab_name_input').prop('disabled', isRemote);
        // $('#tab_mode_select').prop('disabled', isRemote);
        // $('.category-icon-picker').css('pointer-events', isRemote ? 'none' : 'auto');
    if (tabId) {
        $('#tab_name_input').val(tab.name);
        $('#tab_mode_select').val(tab.type || 'list');
        $('#displayStyleToggle').prop('checked', (tab.displayStyle || 'list') === 'tiles');
        $('#recurringToggle').prop('checked', (tab.taskMode || 'singular') === 'recurring');
    }
            $('#sheet_title').text(tabId ? 'Edit Tab' : 'New Tab');
            $('#save_tab_btn').show();        
    card.addClass('active');
}
function closeTabSettings() {
    $('#tab_settings_card').removeClass('active');
    window.editingTabId = null;
}
function handleSaveTab() {
    const name = $('#tab_name_input').val().trim();
    const type = $('#tab_mode_select').val();
    const displayStyle = $('#displayStyleToggle').is(':checked') ? 'tiles' : 'list';
    const taskMode = $('#recurringToggle').is(':checked') ? 'recurring' : 'singular';

    if (!name) return alert("Please provide a name");

    // Refresh memory from storage to be safe
    window.masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');

    if (window.editingTabId) {
        const index = window.masterTabs.findIndex(t => t.id === window.editingTabId);
        if (index !== -1) {
            window.masterTabs[index] = { ...window.masterTabs[index], name, type, displayStyle, taskMode };
        }
    } else {
        const newId = "tab_" + Date.now();
        window.masterTabs.push({ id: newId, name, type, displayStyle, taskMode });
        window.activeTab = newId; 
    }

    // Update Memory and Storage
    localStorage.setItem('master_tabs', JSON.stringify(window.masterTabs));
    
    // Update UI
    closeTabSettings();
    initTabs();
    
    if (typeof showToast === 'function') showToast("Tab Saved!");
}
function finalizeTabDeletion() {
    const id = window.activeTab;
    const masterTabs = getMasterTabs().filter(tab => tab.id !== id);
        setMasterTabs(masterTabs);
        const storage = JSON.parse(localStorage.getItem("flowea_tab_data") || "{}");

        delete storage[id];

        localStorage.setItem("flowea_tab_data", JSON.stringify(storage));

        if (window.activeTab === id) {
            window.activeTab =masterTabs.length? masterTabs[0].id: null;

            localStorage.setItem("activeTab",window.activeTab || "");
        }
    closeTabSettings()
    initTabs();

    if (typeof showToast === 'function') showToast("Tab and data deleted");
}

/** * Global single function to handle shelving and unshelving tabs
 * @param {string} tabId - Target tab identifier */
function renderUnifiedForm(itemData, mode) {
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
        
         const updates = {
            name: newName,
            description: newDesc,
            type: $("#tab_mode_select").val() || "list"
        };

        setTabData(id, updates);
    } else {
        const tab = getTabData(window.activeTab);
        const tasks = getTabStorageData(tab.id);
        const index = tasks.findIndex(task => task.id === id);
        if (index === -1) return;

        tasks[index].description = newDesc;
        tasks[index].updatedAt = new Date().toLocaleString();

        // Handle slider evaluations if metrics are active
        if (fragment.find('.slider-group').is(':visible')) {
            const currentSliderVal = fragment.find('#edit_field_slider').val();
            const goalMetricValue = fragment.find('#lbl_goal').text();
            
            tasks[index].text =`${newName} ${currentSliderVal}/${goalMetricValue}`;
            tasks[index].clicks = Number(currentSliderVal);
        } else {
            tasks[index].text = newName;
        }

        setTabStorageData(tab.id, tasks);
    }

    // // --- REFRESH DISPLAY VIEWPORTS ---
    refreshApplication();
}

function executeUnifiedDeletion(id, mode) {

    if (!confirm("Delete this item?"))
        return;

    if (mode === "tab") {
        const masterTabs = getMasterTabs().filter(tab => tab.id !== id);
        setMasterTabs(masterTabs);
        const storage = JSON.parse(localStorage.getItem("flowea_tab_data") || "{}");

        delete storage[id];

        localStorage.setItem("flowea_tab_data", JSON.stringify(storage));

        if (window.activeTab === id) {
            window.activeTab =masterTabs.length? masterTabs[0].id: null;

            localStorage.setItem("activeTab",window.activeTab || "");
        }

    } else {
        const tab = getTabData(window.activeTab);
        const tasks = getTabStorageData(tab.id).filter(task => task.id !== id);
        setTabStorageData(tab.id, tasks);
    }
    refreshApplication();
}

// Start
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initEventListeners();
});
//  * Initializes the Tab UI from the master data.
function initTabs() {
    window.activeTab = localStorage.getItem('activeTab') || (window.masterTabs[0] ? window.masterTabs[0].id : null);
    if (window.activeTab) localStorage.setItem('activeTab', window.activeTab);

    // 1. Ensure we have the latest data from memory
    const container = document.getElementById("tabsContainer");
    if (!container) return;
    container.innerHTML = "";

    // 2. Render all tabs
    window.masterTabs.forEach(tab => {
        container.appendChild(createTabElement(tab));
    });

    // 3. Set the initial active tab
    switchTab(window.activeTab);
}
/** * Creates the DOM element, looped for every single tab. * @param {Object} tab - The tab object from master_tabs. */
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
    tabEl.appendChild(span);

    tabEl.onclick = () => switchTab(tab.id);
    // Double-tap/click to open settings
    tabEl.ondblclick = (e) => {
        e.stopPropagation();
        openTabSettings(tab.id);
    };
    return tabEl;
}

function initEventListeners() {
    // Save Button
    $('#save_tab_btn').off('click').on('click', handleSaveTab);
    $('#delete_tab_btn').off('click').on('click', finalizeTabDeletion);
}
//  * Manages the transition between tabs.
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

function openCommandbar() {
    const combar = $('#commandBar');
    combar.toggleClass('hidden');
}

function refreshApplication() {
    $("#universal_panel_wrapper").removeClass("open");
    initTabs();
    if (typeof displayData === "function")
        displayData();
    if (typeof renderTaskList === "function")
        renderTaskList();
    if (typeof renderPurgeList === "function")
        renderPurgeList();
    if (typeof pushFullSync === "function")
        pushFullSync();
}
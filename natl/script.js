// ==========================================
// 🧠 GLOBAL APP STATE & CORNERSTONE ENGINE
// ==========================================
// UID
let userId = null;

// Initialize UI
window.displayData = function() {
    window.renderTaskList();
    renderPurgeList();
    updateHealthBar();
};

// Ensure activeTab is never null and matches current system data
window.activeTab = localStorage.getItem('activeTab') || (window.allTabs && window.allTabs[0] ? window.allTabs[0].id : null);
window.tabData = typeof getTabData === 'function' ? getTabData(window.activeTab) : { id: window.activeTab, type: 'list' };

//
// ----------- RENDERING -------------- of what? tabs?
// Synchronize DOM elements on initial load if tab metadata has been customized
document.querySelectorAll(".tab").forEach(tab => {
    const tabId = tab.getAttribute("data-tab-id");
    const storedName = localStorage.getItem(`tabName_${tabId}`);
    if (storedName) {
        const label = tab.querySelector(".tab-label");
        if (label) label.textContent = storedName;
    }
});

/**
 * UNIFIED SMART COMPATIBILITY STORAGE ENGINE (The Bridge)
 * Solves duplicate key initializations by funnelling all 
 * raw and suffixed calls into a single standardized key layout structure.
 */

function getTabStorageData(tabId, listType = "active") {

    const store = JSON.parse(
        localStorage.getItem("flowea_tab_data") || "{}"
    );

    if (!store[tabId]) {
        store[tabId] = {
            activeList: [],
            purgeList: []
        };
    }

    return listType === "purge"
        ? store[tabId].purgeList
        : store[tabId].activeList;
}

window.setTabStorageData = function(tabId, dataArray, typeOrList) {
    if (!tabId) return;

    // Handle parameter misalignment adjustments out-of-order gracefully
    let finalArray = dataArray;
    let finalType = typeOrList;
    if (typeof dataArray === 'string' && Array.isArray(typeOrList)) {
        finalArray = typeOrList;
        finalType = dataArray;
    }

    const safeArray = Array.isArray(finalArray) ? finalArray : [];
    const isPurge = (finalType === 'purge' || finalType === 'purgeList');
    const targetField = isPurge ? 'purgeList' : 'activeList';
    
    // Force the destination key to utilize the standard unified naming pattern
    const standardKey = isPurge ? `${tabId}PurgeList` : `${tabId}List`;

    try {
        // 1. Update the New Unified State Object
        const masterStore = JSON.parse(localStorage.getItem('flowea_tab_data') || '{}');
        if (!masterStore[tabId]) {
            masterStore[tabId] = { activeList: [], purgeList: [] };
        }
        masterStore[tabId][targetField] = safeArray;
        localStorage.setItem('flowea_tab_data', JSON.stringify(masterStore));

        // 2. Commit to the single standard legacy string key
        // localStorage.setItem(standardKey, JSON.stringify(safeArray));
        
        // 3. CLEAN UP & PREVENT DUPLICATES: 
        // If an old unsuffixed duplicate key exists, clear it out so it stops taking up memory
        if (!isPurge && localStorage.getItem(tabId) !== null) {
            localStorage.removeItem(tabId);
        }
        
    } catch (e) {
        console.error(`Bridge failed writing storage for Tab: ${tabId}`, e);
    }
};

// ==========================================
// 🎨 VIEW CONTROLLER & ROUTER ENGINE
// ==========================================
window.renderTaskList = function() {
    const weekHeader = $("#week_header").empty();
    weekHeader.append('Wk '+getWeekNumber(new Date()));

    const activeTabId = window.activeTab; //current tabID from master_tabs
    const tabData = typeof getTabData === 'function' ? getTabData(activeTabId) : window.tabData; // Helper, get tabData from tabID from master_tabs - make one for set data next
    const container = $("#todo_list").empty();
    if (!container.length || !tabData) return;

    // Remove legacy classes to clean canvas state
    container.removeClass('checkin-grid');

    switch (tabData.type) {          
        case 'checkin':
            renderGridView(container, tabData);
            // console.log("current tab is checkin", activeTab)
            break;
        case 'list':
        default:
            renderListView(container, tabData);
            // console.log("current tab is standard list", activeTab)
            break;
    }
    togglePurgeButton();
}

// ==========================================
// 📊 BRANCH A: CHECK-IN MODE (TRACKING GRID)
// ==========================================
// --- CHECK-IN MODE ---
function renderGridView(container, tabData) {
    let todoList = window.getTabStorageData(tabData.id, tabData.type);
    container.addClass('checkin-grid');
    
    // const WORKOUTS = {
    //     gym: {
    //         title: "Command Bar",
    //         shortcut: "x",
    //         width: "80%", height: "auto",
    //         position: "bottom-center",
    //         animateDirection: "w3-animate-left"
    //     },
    //     rehab: {
    //         title: "Edit Panel",
    //         shortcut: "dblclck", // Triggered via your unified schema routing
    //         width: "70%", height: "40%",
    //         position: "bottom-center",
    //         animateDirection: "w3-animate-left"
    //     },
    //     yoga: {
    //         title: "Edit Panel",
    //         shortcut: "dblclck", // Triggered via your unified schema routing
    //         width: "70%", height: "40%",
    //         position: "bottom-center",
    //         animateDirection: "w3-animate-left"
    //     },
    //     meditation: {
    //         title: "Edit Panel",
    //         shortcut: "dblclck", // Triggered via your unified schema routing
    //         width: "70%", height: "40%",
    //         position: "bottom-center",
    //         animateDirection: "w3-animate-left"
    //     }
    // };

        // console.log("tabData.name", tabData.name)
        // presets
        if (todoList.length === 0) {
            let defaults = [""];
            switch (tabData.name) {
                case 'Gym':
                    // console.log("tabData.name", tabData.name)
                    defaults = ["Lat Pull 40/97", "Row 45/97", "Chest Press 45/97", "Shoulder Press 45/97", "Leg Extension 45/97", "Leg Curl 45/97", "Hip Add, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Zercher 45/97", "Leg raise/Crunches 45/97" ];
                    break;
                case 'Rehab':
                    // console.log("tabData.name", tabData.name)
                    defaults = ["Ankle mobility","Hip thrusts", "Tummy tucks", "Spinal torsion", "Neck mobility", "Wrist lubrication", "Tendon activation"];
                    break;
                case 'Yoga':
                    // console.log("tabData.nam", tabData.name)
                    defaults = ["Sun salutation"];
                    break;
                case 'Meditation':
                default:
                    // console.log("tabData.nam", tabData.name)
                    defaults = ["Body scan"];
                    break;
            }

            const seeded = defaults.map(name => ({
                id: new Date().toISOString() + Math.random(),
                text: name,
                clicks: 0
            }));


            setTabStorageData(tabData.id, tabData.type, seeded);
            todoList = seeded;

            if (typeof window.checkBoardCompletion === 'function') {
                window.checkBoardCompletion();
            }
        }

        todoList.forEach((item) => {
            const bb = 100; // Fixed Goal, change to dynamic slider <300kg?
            const goalMatch = item.text.match(/(\d+)\/(\d+)/);
            let aa = goalMatch ? goalMatch[1] : "0";
            const displayName = item.text.replace(/\d+\/\d+/, "").trim();

            const tile = $(`
                <li class="checkin-tile" data-id="${item.id}" data-clicks="${Math.min(item.clicks || 0, 3)}">
                    <div class="checkin-text">${displayName}</div>
                    <div class="checkin-subline">
                        <div class="goal-container">
                            <span class="goal-display">${aa}/${bb}</span>
                        </div>
                        <span class="checkin-count">${item.clicks || 0}</span>
                    </div>
                </li>
            `);

            let clickTimer = null;
            let isEditing = false; // Flag to block single clicks while slider is active

            // Single 'click' handler to manage the state
            tile.on('click', function(e) {
                if (isEditing) return; // Ignore single clicks while slider is visible

                if (clickTimer) {
                    // --- SUCCESSFUL DOUBLE CLICK ---
                    clearTimeout(clickTimer);
                    clickTimer = null;
                    enterEditMode();
                } else {
                    // --- POTENTIAL SINGLE CLICK ---
                    clickTimer = setTimeout(() => {
                        // If we reach here, no second click happened
                        item.clicks = (item.clicks || 0) + 1;
                        
                        // Update UI locally
                        tile.find('.checkin-count').text(item.clicks);
                        tile.attr('data-clicks', Math.min(item.clicks, 3));

                        // FIX: Replaced storageKey with general purpose helper inside the click callback
                        window.setTabStorageData(tabData.id, todoList, tabData.type);

                        updateHealthBar();
                        if (window.checkBoardCompletion) window.checkBoardCompletion();
                        togglePurgeButton();
                        clickTimer = null;
                    }, 250); // 250ms is the standard gap
                }
            });

            function enterEditMode() {
                isEditing = true;
                const textElement = tile.find('.checkin-text');
                const goalDisplay = tile.find('.goal-display');

                textElement.html(`
                    <div class="goal-slider">
                        <input type="range" class="s-aa" min="0" max="${bb}" value="${aa}">
                    </div>
                `);

                const slider = textElement.find('input');
                slider.focus();

                // Prevent clicking inside the slider from doing anything to the tile
                slider.on('click dblclick mousedown', e => e.stopPropagation());

                slider.on('input', function() {
                    const newVal = $(this).val();
                    aa = newVal;
                    goalDisplay.text(`${newVal}/${bb}`);
                    item.text = `${displayName} ${newVal}/${bb}`;
                    // setTabStorageData(tabData.id, tabData.type, todoList);
                    window.setTabStorageData(tabData.id, todoList, tabData.type);
                });

                slider.on('blur', () => {
                    // Restore UI
                    textElement.text(displayName);
                    // Tiny timeout before re-enabling clicks so the "exit click" doesn't trigger an increment
                    setTimeout(() => { isEditing = false; }, 100);
                });
            }

            container.append(tile);
        });
            
    if (typeof window.checkBoardCompletion === 'function') {
            window.checkBoardCompletion();
    }
}

// ==========================================
// 📝 BRANCH B: STANDARD CHECKLIST VIEWS
// ==========================================
function renderListView(container, tabData) {
    const tasks = window.getTabStorageData(tabData.id, tabData.type);
    container.empty();
    
    if (tasks.length === 0) return;

    const isTileView = tabData.displayStyle === 'tiles';
    // const isTileView = 1;
    const isRecurringMode = tabData.taskMode === 'recurring';
    // const isRecurringMode = 1;
    

    tasks.forEach((task) => {
        const displayDate = new Date(task.createdAt || task.id).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });

        const editDisplayState = (typeof editButtonsVisible !== 'undefined' && editButtonsVisible) ? 'inline-block' : 'none';
// const editDisplayState = true;
        const taskBodyHtml = isRecurringMode ? `
            <div class="task-summary">
                <span class="task-text">${linkify(task.text)}</span>
                <p class="time">${displayDate}</p>
            </div>
            <div class="recurring-action-row">
                <button type="button" class="counter-btn">+1</button>
                <span class="count-display">${task.clicks || 0}</span>
            </div>
        ` : `
            <span>
                <input type="checkbox" class="task-checkbox" ${task.checked ? 'checked' : ''}>
                <span class="task-text">${linkify(task.text)}</span>
                <p class="time">${displayDate}</p>
            </span>
        `;

        const newListItem = $(`
            <li data-id="${task.id}" class="sortable-item ${isTileView ? 'task-tile' : ''}" draggable="true">
                <div class="swipe-container">
                    <button type="button" style="background: rgba(48, 151, 48, 0.69); width: 100px; border: none">✅</button>
                    <div class="task-content">
                        ${taskBodyHtml}
                        <div class="edit_tasks" style="display: ${editDisplayState};">
                            <input type="submit" class="icon delete" value=" " title="Delete task" style="padding-right:0%;">
                        </div>
                    </div>
                    <button type="button" style="background: rgb(199, 74, 74); width: 100px; border: none">❌</button>
                </div>
            </li>
        `);

        container.append(newListItem);

        const swiper = newListItem.find(".swipe-container")[0];
        requestAnimationFrame(() => {
            if (swiper) swiper.scrollLeft = 99;
        });

        if (swiper) {
            swiper.addEventListener("scroll", function(e) {
                const li = e.target.closest('.sortable-item');
                if (!li) return;

                const taskId = li.getAttribute('data-id');
                const scroll_div = e.currentTarget;
                const scroll_center = scroll_div.scrollWidth / 2;
                const viewport_center = scroll_div.clientWidth / 2;
                const current = scroll_div.scrollLeft + viewport_center;
                const dx = current - scroll_center;

                if (dx > 99) {
                    scroll_div.style.backgroundColor = "red";
                    setTimeout(() => {
                        li.style.transform = "translateX(-90%)";
                        li.style.opacity = "0";
                        setTimeout(() => { window.deleteTaskById(taskId); }, 100);
                    }, 600);
                } else if (dx < -99) {
                    scroll_div.style.backgroundColor = "green";
                    setTimeout(() => {
                        if (!isRecurringMode) {
                            const cb = li.querySelector('input[type="checkbox"]');
                            if (cb) cb.checked = true;
                        }
                        li.style.transform = "translateX(90%)";
                        li.style.opacity = "1";
                        setTimeout(() => {
                            scroll_div.scrollTo({ left: 99, behavior: 'instant' });
                            window.purgeSpecificTask(taskId);
                        }, 100);
                    }, 300);
                } else {
                    scroll_div.style.backgroundColor = "";
                }
            });
        }

        if (isRecurringMode) {
            newListItem.find('.counter-btn').on('click', function(e) {
                e.stopPropagation();
                incrementTaskCount(task.id);
            });
        } else {
            newListItem.find('.task-checkbox').on('change', function() {
                const isChecked = $(this).is(':checked');
                const currentTasks = window.getTabStorageData(tabData.id, tabData.type);
                const targetIdx = currentTasks.findIndex(t => t.id === task.id);
                
                if (targetIdx !== -1) {
                    currentTasks[targetIdx].checked = isChecked;
                    window.setTabStorageData(tabData.id, currentTasks, tabData.type);
                    updateHealthBar();
                    togglePurgeButton();
                    if (window.pushFullSync) window.pushFullSync();
                }
            });
        }

        newListItem.find('.delete').on('click', function(e) {
            e.stopPropagation();
            window.deleteTaskById(task.id);
        });
    });
}

// ========================================================
// 🗄️ UNIFIED WORKSPACE ARCHIVE & PANEL HISTORICAL ENGINE
// ========================================================
window.renderPurgeListPanel = function() {
    const currentTabId = window.activeTab;
    
    // 1. Structural fallback if no workspace is active
    if (!currentTabId) {
        return $('<div style="padding:20px; color:#aaa;">No active workspace selected.</div>');
    }

    // 2. Safely parse datasets through your Central Compatibility Storage Engine
    const purgeList = typeof window.getTabStorageData === 'function'
        ? window.getTabStorageData(currentTabId, 'purge')
        : JSON.parse(localStorage.getItem(`${currentTabId}PurgeList`) || '[]');

    // 3. Construct an isolated dynamic layout wrapper with a distinct identity class
    const fragment = $(`
        <div class="history-panel-scroller" style="padding: 20px; overflow-y: auto; height: 100%; box-sizing: border-box;">
            <p style="margin-top: 0; margin-bottom: 20px; font-size: 0.85rem; color: #aaa;">
                
            </p>
            <ul id="purge_list" class="purge-history-list" style="list-style: none; padding: 0; margin: 0;"></ul>
        </div>
    `);

    const plistElement = fragment.find("#purge_list");

    // 4. Populate the timeline list context or handle empty state scenarios
    if (purgeList.length === 0) {
        plistElement.append('<li style="color: #666; font-style: italic; font-size: 13px; padding: 10px 0;">No history found for this workspace.</li>');
    } else {
        // Enforce top-down chronological layout sorting (Newest items absolute top)
        const sortedPurgeList = [...purgeList].sort((a, b) => {
            const dateA = a.purgedAt ? new Date(a.purgedAt) : new Date(0);
            const dateB = b.purgedAt ? new Date(b.purgedAt) : new Date(0);
            return dateB - dateA;
        });

        // Group checklist logs into separate chronological weekly timeline buckets
        const weeklyGroups = {};
        sortedPurgeList.forEach(item => {
            const dateObj = item.purgedAt ? new Date(item.purgedAt) : new Date();
            const purgedWeek = item.purgedWeek || (typeof getWeekNumber === 'function' ? getWeekNumber(dateObj) : 1);
            const year = dateObj.getFullYear();
            const groupKey = `wk-${purgedWeek}-${year}`;

            if (!weeklyGroups[groupKey]) {
                weeklyGroups[groupKey] = { weekNum: purgedWeek, year: year, items: [] };
            }
            weeklyGroups[groupKey].items.push(item);
        });

        // Append week clusters top-down directly into the virtual list fragment node
        Object.keys(weeklyGroups).forEach(key => {
            const group = weeklyGroups[key];
            
            // Append weekly group partitioning boundary line
            plistElement.append(`
                <li class="week-header" style="font-weight: bold; color: #2196f3; margin-top: 15px; margin-bottom: 8px; font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 3px;">
                    Week ${group.weekNum} - ${group.year}
                </li>
            `);

            // Append each archived entry item underneath its corresponding week block
            group.items.forEach(item => {
                const displayTime = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
                const countInfo = item.count ? `<span style="font-size: 11px; color: #7bed9f;">${item.count}×</span>` : '';
                const newPurgeItem = $(`
                    <li style="margin-bottom: 6px; padding-left: 5px; list-style: none;">
                        <span style="font-size: 13px; color: #bbb; display: flex; justify-content: space-between; align-items: baseline; gap: 10px;">
                            <span class="history-item-text" style="word-break: break-all;">${item.text} ${countInfo}</span>
                            <span class="time" style="font-size: 11px; color: #666; white-space: nowrap;">${displayTime}</span>
                        </span>
                    </li>
                `);
                plistElement.append(newPurgeItem);
            });
        });
    }

    // ========================================================
    // ⚡ OVERLAY INTERACTION & RE-REFRESH INTERCEPTOR HANDSHAKE
    // ========================================================
    // Detect if the master dynamic panel configuration is open and running the history panel view
    const panelDOM = $(`#universal_panel_wrapper`);
    if (panelDOM.length && panelDOM.hasClass('open') && panelDOM.attr('data-active-panel') === 'history_panel') {
        const contentContainer = panelDOM.find('.panel-body-content');
        if (contentContainer.length) {
            // console.log(`Live sync triggered: Hot-swapping history context body data for tab ID: ${currentTabId}`);
            
            // Re-render the internal HTML content directly using our clean memory fragment layout
            contentContainer.html(fragment.html());
        }
    }

    // Always return the isolated parent component container for the initial layout engine mounts
    return fragment;
};

// Updates automatically when tab/context changes. above does not, requires page refresh..
// Keep this mapping signature intact in script.js so existing click actions don't throw errors
// Keep this configuration hook inside script.js updated
// ==========================================
// 🗄️ HISTORICAL WORKSPACE ARCHIVE VIEWS
// ==========================================
window.renderPurgeList = function() {
    // 1. Check if the dynamic universal panel wrapper is open and visible on screen
    const panelWrapper = document.getElementById('universal_panel_wrapper');
    
    if (panelWrapper && !panelWrapper.classList.contains('hidden')) {
        // Find the internal body viewport where panel templates are injected
        const panelBody = panelWrapper.querySelector('.panel-body-content');
        
        if (panelBody) {
            // Check if the history scroller fragment is the one currently active
            const hasHistoryScroller = panelBody.querySelector('.history-panel-scroller');
            
            if (hasHistoryScroller) {
                // console.log("Tab shift or purge action detected: Refreshing active history panel content...");
                
                // Generate a fresh HTML fragment snapshot for the newly activated tab context
                const freshHistoryFragment = renderPurgeListPanel();
                
                // Swap the old content inside the panel wrapper with the fresh dataset instantly
                $(panelBody).html(freshHistoryFragment);
                return; // Exit out early since the open panel has been completely synchronized
            }
        }
    }

    // 2. Fallback: If you still have a static #purge_list in the background DOM view layout
    const staticList = document.getElementById('purge_list');
    if (staticList) {
        const freshHistoryFragment = renderPurgeListPanel();
        // Pluck out the updated checklist items and update the static display safely
        $('#purge_list').html(freshHistoryFragment.find('#purge_list').html());
    }
};

// ==========================================
// 🛠️ DATA ENGINE UTILITIES & STATE MUTATORS
// ==========================================
// ----------- TASK FUNCTIONS -------------
function togglePurgeButton() {
    const activeTab = window.activeTab;
    const tabData = typeof getTabData === 'function' ? getTabData(activeTab) : { id: activeTab, type: 'checkin' };
    // const tabData = typeof getTabData === 'function' ? getTabData(activeTab) : { id: activeTab, type: 'list' };

    const isRecurringMode = tabData.taskMode === 'recurring' || tabData.type === 'checkin';
    if (isRecurringMode) {
        const todoList = window.getTabStorageData(tabData.id, tabData.type);
        const hasClicks = todoList.some(task => (task.clicks || 0) > 0);
        $('#purge').prop('disabled', !hasClicks);
    } else {
        const anyChecked = $('#todo_list input[type="checkbox"]:checked').length > 0;
        $('#purge').prop('disabled', !anyChecked);
    }
}

function enterTask() {
    const text = $('#enter_task').val().trim();
    if (!text) return;

    const activeTabId = window.activeTab;
    const tabData = typeof getTabData === 'function' ? getTabData(activeTabId) : window.tabData;
    const isoTime = new Date().toISOString(); // simple unique id based on createdAT timestamp

    // Create a new master_tab object
    const newTask = {
        id: isoTime,
        text: text,
        checked: false,
        clicks: 0,
        createdBy: window.userId,
        createdAt: new Date().toISOString()
    };

    const todoList = window.getTabStorageData(tabData.id, tabData.type);
    todoList.push(newTask);

    window.setTabStorageData(tabData.id, todoList, tabData.type);
    localStorage.setItem("LastSync", isoTime); //set last sync as last created task time
    

    $('#enter_task').val('');
    updateHealthBar();
    window.renderTaskList();

//     Since ISO timestamps are lexically sortable, you can sort tasks by ID directly:
        // todoList.sort((a, b) => a.id.localeCompare(b.id)); // ascending
        // todoList.sort((a, b) => b.id.localeCompare(a.id)); // descending
        // Or if you ever switch to numeric timestamps:

        // todoList.sort((a, b) => new Date(b.id) - new Date(a.id));


        
    // VERIFY THIS LINE IS HERE:
    if (typeof window.pushFullSync === 'function') window.pushFullSync();
}

//when checkbox or task edit happens 
function updateTaskInStorage(index, newText, checked = false) {
    const activeTabId = window.activeTab;
    const tabData = typeof getTabData === 'function' ? getTabData(activeTabId) : window.tabData;
    const todoList = window.getTabStorageData(activeTabId, tabData.type);
    if (!Array.isArray(todoList) || index < 0 || index >= todoList.length) return;

    todoList[index].text = newText;
    if (typeof checked === 'boolean') todoList[index].checked = checked;
    todoList[index].updatedAt = new Date().toISOString();

    window.setTabStorageData(activeTabId, todoList, tabData.type);
    localStorage.setItem("LastSync", new Date().toISOString());
    if (typeof window.pushFullSync === 'function') window.pushFullSync();
}

// Targeted deletion adapted for unified compatibility storage
window.deleteTaskById = function(taskId) {
    const activeTabId = window.activeTab;
    const tabData = typeof getTabData === 'function' ? getTabData(activeTabId) : window.tabData;
    
    let todoList = window.getTabStorageData(activeTabId, tabData.type);
    const taskIndex = todoList.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const deletedTask = todoList.splice(taskIndex, 1)[0];
    window.setTabStorageData(activeTabId, todoList, tabData.type);
    
    window.renderTaskList();
    updateHealthBar();

    const undoDelete = () => {
        let currentTodo = window.getTabStorageData(activeTabId, tabData.type);
        currentTodo.push(deletedTask);
        window.setTabStorageData(activeTabId, currentTodo, tabData.type);
        window.renderTaskList();
        updateHealthBar();
        if (window.pushFullSync) window.pushFullSync();
    };

    showToast("Task deleted", undoDelete);
    if (window.pushFullSync) window.pushFullSync();
}

// Targeted task purging adapted for unified compatibility storage
function purgeSpecificTask(id) {
    const currentTabId = window.activeTab;
    if (!currentTabId) return;

    const tabData = typeof getTabData === 'function' ? getTabData(currentTabId) : window.tabData;
    const currentTabType = tabData.type || 'list';

    let todoList = window.getTabStorageData(currentTabId, currentTabType);
    let purgeList = window.getTabStorageData(currentTabId, 'purge');

    const taskIndex = todoList.findIndex(t => t.id === id);
    if (taskIndex > -1) {
        const task = todoList[taskIndex];
        const isRecurringMode = tabData.taskMode === 'recurring' || currentTabType === 'checkin';

        if (isRecurringMode) {
            const historyEntry = {
                id: new Date().getTime() + Math.random(),
                text: task.text,
                purgedAt: new Date().toISOString(),
                purgedWeek: getWeekNumber(new Date()),
                originalTask: task.text,
                count: task.clicks || 0
            };

            purgeList.unshift(historyEntry);
            todoList[taskIndex] = { ...task, clicks: 0 };
        } else {
            const deletedTask = todoList.splice(taskIndex, 1)[0];
            deletedTask.purgedAt = new Date().toISOString();
            deletedTask.purgedWeek = getWeekNumber(new Date(deletedTask.purgedAt));
            purgeList.unshift(deletedTask);
        }

        window.setTabStorageData(currentTabId, todoList, currentTabType);
        window.setTabStorageData(currentTabId, purgeList, 'purge');
        
        updateHealthBar();
        window.renderTaskList();
        renderPurgeList();
        
        if (typeof purgeMessages !== 'undefined' && purgeMessages.length > 0) {
            showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)]);
        }
        if (window.pushFullSync) window.pushFullSync();
    }
};

function incrementTaskCount(taskId) {
        const currentTabId = window.activeTab;
        if (!currentTabId) return;

        const tabData = typeof getTabData === 'function' ? getTabData(currentTabId) : window.tabData;
        const currentTabType = tabData.type || 'list';
        let todoList = window.getTabStorageData(currentTabId, currentTabType);
        const targetIdx = todoList.findIndex(t => t.id === taskId);
        if (targetIdx === -1) return;

        todoList[targetIdx].clicks = (todoList[targetIdx].clicks || 0) + 1;
        window.setTabStorageData(currentTabId, todoList, currentTabType);
        updateHealthBar();
        togglePurgeButton();
        if (typeof window.renderTaskList === 'function') window.renderTaskList();
        if (window.pushFullSync) window.pushFullSync();
}

window.saveNewOrder = function() {
    const currentTabId = window.activeTab;
    if (!currentTabId) return;

    const tabData = window.tabData || {};
    const currentTabType = tabData.type || 'todo';

    // 1. Query the master database state array
    let currentTasks = window.getTabStorageData(currentTabId, currentTabType);
    if (!currentTasks || currentTasks.length === 0) return;

    // 2. Scan the current DOM elements inside your container list view
    const reorderedTasks = [];
    document.querySelectorAll('.sortable-list .sortable-item').forEach(item => {
        // Grab the tracking identification key embedded on the item node wrapper
        const itemId = item.getAttribute('data-id');
        
        // Match it against our true task datasets
        const match = currentTasks.find(t => String(t.id) === String(itemId));
        if (match) {
            reorderedTasks.push(match);
        }
    });

    // 3. Fallback processing protection: Append any unlisted elements to prevent data loss
    currentTasks.forEach(originalTask => {
        if (!reorderedTasks.some(t => t.id === originalTask.id)) {
            reorderedTasks.push(originalTask);
        }
    });

    // 4. Save the cleanly sorted array through the bridge helper
    window.setTabStorageData(currentTabId, reorderedTasks, currentTabType);
    
    // console.log(`Reordering successfully committed for tab: ${currentTabId}`);

    // 5. Fire off updates to keep health balances and layout configurations unified
    if (typeof updateHealthBar === 'function') updateHealthBar();
    if (window.pushFullSync) window.pushFullSync();
};


// purge button click
function purgeList() {
    const currentTabId = window.activeTab;
    if (!currentTabId) return;

    // 1. Fetch current tab object metadata cleanly
    const tabData = typeof window.getTabData === 'function' 
        ? window.getTabData(currentTabId) 
        : (window.tabData || { id: currentTabId, type: 'todo' });
        
    const currentTabType = tabData.type || 'todo';

    // 2. Clear out session timer for metric check-in grids specifically
    localStorage.removeItem(`startTime_${currentTabId}`);
    if (typeof window.checkBoardCompletion === 'function') window.checkBoardCompletion();

    // 3. Query Active & Purged arrays via the Compatibility Bridge Engine
    let todoList = window.getTabStorageData(currentTabId, currentTabType);
    let purgeHistory = window.getTabStorageData(currentTabId, 'purge');

    const now = new Date().toISOString();
    let purgedAnything = false;
    let tasksToRestore = [];
    let idsToClearFromHistory = [];

    const isRecurringMode = tabData.taskMode === 'recurring' || currentTabType === 'checkin';

    if (isRecurringMode) {
        const updatedTodoList = todoList.map(task => {
            if ((task.clicks || 0) > 0) {
                const historyEntry = {
                    id: new Date().getTime() + Math.random(),
                    text: task.text,
                    purgedAt: now,
                    purgedWeek: typeof getWeekNumber === 'function' ? getWeekNumber(new Date(now)) : 1,
                    originalTask: task.text,
                    count: task.clicks
                };

                purgeHistory.unshift(historyEntry);
                tasksToRestore.push({ id: task.id, previousClicks: task.clicks });
                idsToClearFromHistory.push(historyEntry.id);
                purgedAnything = true;
                return { ...task, clicks: 0 };
            }
            return task;
        });

        if (purgedAnything) {
            window.setTabStorageData(currentTabId, updatedTodoList, currentTabType);
            window.setTabStorageData(currentTabId, purgeHistory, 'purge');

            showToast("Progress archived & counters reset!", () => {
                let liveTodo = window.getTabStorageData(currentTabId, currentTabType);
                let livePurge = window.getTabStorageData(currentTabId, 'purge');

                liveTodo = liveTodo.map(task => {
                    const match = tasksToRestore.find(r => r.id === task.id);
                    return match ? { ...task, clicks: match.previousClicks } : task;
                });

                livePurge = livePurge.filter(p => !idsToClearFromHistory.includes(p.id));

                window.setTabStorageData(currentTabId, liveTodo, currentTabType);
                window.setTabStorageData(currentTabId, livePurge, 'purge');

                executeUIUpdateSequence();
            });

            executeUIUpdateSequence();
        } else {
            showToast("Nothing to purge (all counts are 0)");
        }
    } else {
        const idsToPurge = [];
        $('#todo_list input[type="checkbox"]:checked').each(function () {
            const taskId = $(this).closest('li').data('id');
            if (taskId) idsToPurge.push(taskId);
        });

        if (idsToPurge.length === 0) {
            showToast("No completed tasks checked to purge.");
            return;
        }

        const tasksToPurge = todoList.filter(task => idsToPurge.includes(task.id));
        const remainingTasks = todoList.filter(task => !idsToPurge.includes(task.id));

        const purgedWithMetadata = tasksToPurge.map(task => ({
            ...task,
            purgedAt: now,
            purgedWeek: typeof getWeekNumber === 'function' ? getWeekNumber(new Date(now)) : 1
        }));

        const updatedPurgeHistory = [...purgedWithMetadata, ...purgeHistory];

        window.setTabStorageData(currentTabId, remainingTasks, currentTabType);
        window.setTabStorageData(currentTabId, updatedPurgeHistory, 'purge');

        const undoStandardPurge = () => {
            let liveTodo = window.getTabStorageData(currentTabId, currentTabType);
            let livePurge = window.getTabStorageData(currentTabId, 'purge');

            const restoredTasks = tasksToPurge.map(t => ({ ...t, checked: false }));
            liveTodo = [...liveTodo, ...restoredTasks];

            livePurge = livePurge.filter(p => !idsToPurge.includes(p.id));

            window.setTabStorageData(currentTabId, liveTodo, currentTabType);
            window.setTabStorageData(currentTabId, livePurge, 'purge');

            executeUIUpdateSequence();
        };

        const randomMsg = (typeof purgeMessages !== 'undefined' && purgeMessages.length > 0)
            ? purgeMessages[Math.floor(Math.random() * purgeMessages.length)]
            : "Tasks safely cleared!";

        showToast(randomMsg, undoStandardPurge);
        executeUIUpdateSequence();
    }
    
    function executeUIUpdateSequence() {
        if (typeof updateHealthBar === 'function') updateHealthBar();
        if (typeof renderTaskList === 'function') renderTaskList();
        if (typeof renderPurgeList === 'function') renderPurgeList();
        if (typeof window.displayData === 'function') window.displayData();
        if (window.pushFullSync) window.pushFullSync();
    }
}


// ----------- UTILITIES --------------

function getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / 86400000);
    return Math.ceil((days + start.getDay() + 1) / 7);
}


function updateHealthBar() {
    const healthBar = document.getElementById('health_bar');
    if (!healthBar) return;

    const currentTabId = window.activeTab;
    const tabData = typeof getTabData === 'function' ? getTabData(currentTabId) : window.tabData;
    const todoList = window.getTabStorageData(currentTabId, tabData.type);
    
    let totalItems = todoList.length;
    let unfinishedTasks = 0;
    let calculatedWidth = 0;

    if (tabData.type === 'checkin') {
        unfinishedTasks = todoList.filter(item => !((item.clicks || 0) > 0)).length;
        const remainingRatio = (totalItems - unfinishedTasks) / totalItems;
        calculatedWidth = totalItems === 0 ? 0 : (100 - Math.pow(remainingRatio, 2) * 100);
    } else {
        unfinishedTasks = todoList.filter(item => !item.checked).length;
        calculatedWidth = (100) * (1 - Math.exp(-unfinishedTasks / 5.5));
    }

    let healthPercent = totalItems === 0 ? 3 : Math.max(3, calculatedWidth);
    healthBar.style.width = `${healthPercent}%`;

    if (unfinishedTasks > 5) {
        healthBar.style.backgroundColor = '#e74c3c';
        healthBar.style.boxShadow = '0 0 8px #e74c3c';
    } else if (unfinishedTasks > 3 && unfinishedTasks < 6) {
        healthBar.style.backgroundColor = '#f1c40f';
        healthBar.style.boxShadow = 'none';
    } else if (unfinishedTasks > 0 && unfinishedTasks < 4) {
        healthBar.style.backgroundColor = '#3498db';
        healthBar.style.boxShadow = 'none';
    } else {
        healthBar.style.backgroundColor = '#2ecc71';
        healthBar.style.boxShadow = 'none';
    }
}

function setHealthbarVisibility(show) {
    const healthBar = document.getElementById('health_bar');
    if (!healthBar) return;
    healthBar.style.display = show ? '' : 'none';
    localStorage.setItem('showHealthbar', show ? 'true' : 'false');
}

// ==========================================
// 🔔 ALERTS, TOASTS & STATIC MESSAGE BANKS
// ==========================================
function showToast(message, undoCallback = null) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    // Clear previous content
    toast.innerHTML = '';
    
    // Add message text
    const textSpan = document.createElement('span');
    textSpan.textContent = message + " ";
    toast.appendChild(textSpan);

    // Add Undo link if a callback is provided
    if (undoCallback) {
        const undoLink = document.createElement('a');
        undoLink.href = "#";
        undoLink.textContent = "Undo";
        undoLink.style.color = "#3498db";
        undoLink.style.marginLeft = "10px";
        undoLink.style.textDecoration = "underline";
        undoLink.onclick = (e) => {
            e.preventDefault();
            undoCallback();
            toast.style.opacity = "0"; // Hide toast immediately after undo
        };
        toast.appendChild(undoLink);
    }

    toast.style.visibility = "visible";
    toast.style.opacity = "1";
    toast.style.top = "20px";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.bottom = "5px";
        setTimeout(() => (toast.style.visibility = "hidden"), 500);
    }, 5000); // Increased to 5s to give user time to click undo
}

const purgeMessages = [
    "Letting go of completed tasks feels good. 🎉",
    "Cleared with purpose. ✨",
    "You’re crushing it. 🚀",
    "Nothing like a clean slate. 🌿",
    "You made space for new ideas. 🧠",
    "Progress feels good, doesn’t it? 😌",
    "Done and dusted. 💨",
    "Refreshed and recharged. 🔋",
];


// ==========================================
// ⌨️ INTERACTION PORTALS & EVENT KEY-BINDINGS
// ==========================================
// ----------- EVENT BINDINGS -------------
// general function handling events
$(function () {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') document.body.classList.add('light-mode');

    $('#add').on('click', enterTask);
    $('#purge').on('click', purgeList);
    $('#enter_task').on('keypress', e => { if (e.which === 13) enterTask(); });

    const themeToggleInput = document.getElementById('themeToggle');
    if (themeToggleInput) {
        const savedTheme = localStorage.getItem('theme') === 'light';
        themeToggleInput.checked = savedTheme;
        themeToggleInput.addEventListener('change', function(e) {
            if (e.target.checked !== document.body.classList.contains('light-mode')) {
                toggleTheme();
            }
        });
    }

    const healthbarToggleInput = document.getElementById('healthbarToggle');
    const savedHealthbarDisplay = localStorage.getItem('showHealthbar');
    const defaultHealthbarVisible = savedHealthbarDisplay === null ? true : savedHealthbarDisplay === 'true';
    setHealthbarVisibility(defaultHealthbarVisible);

    if (healthbarToggleInput) {
        healthbarToggleInput.checked = defaultHealthbarVisible;
        healthbarToggleInput.addEventListener('change', function(e) {
            setHealthbarVisibility(e.target.checked);
        });
    }



    // Cloud sync features removed for local-only app.

    // text edit on dbl clk
    $('#todo_list').on('dblclick', '.task-text', function () {
        const taskSpan = $(this);
        const currentText = taskSpan.text();
        const input = $('<input type="text" class="task-edit-input">').val(currentText);

        taskSpan.replaceWith(input);
        input.focus().select();

        input.on('blur', function () {
        const newText = input.val().trim() || currentText;
        const index = input.closest('li').index();

        const newSpan = $('<span class="task-text">').text(newText);
        input.replaceWith(newSpan);

        updateTaskInStorage(index, newText); // Save to localStorage
        });

        input.on('keydown', function (e) {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.val(currentText);
            input.blur();
        }
        });
    });

    displayData();
    updateHealthBar();
});


    // ----------- OTHER -------------
    function showHistory() {
        // console.log('show history');
        const dash = document.getElementById("historyCard");
        if (!dash) return;
        dash.classList.toggle("hidden");
    }

    function showCommandbar() {
        const togglePanel = document.getElementById("commandBar");
        // console.log('toggle commandbar');
        if (!togglePanel) return;
        togglePanel.classList.toggle("hidden");
    }

    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'z' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            toggleTheme();
        }
    });

// Toggle light/dark mode
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    // Change icon image
    const themeToggleIcon = document.querySelector('.darklight_mode');
    if (themeToggleIcon) {
        themeToggleIcon.style.backgroundImage = isLight
            ? 'url(img/dark_mode.png)'
            : 'url(img/light_mode.png)';
    }
}


//Exports the contents of local storage to a file in JSON format
//https://stackoverflow.com/questions/61586888/javascript-export-local-storage
function exportHistory() {  
    // console.log("System Export: Started"); 

    // 1. Initialize the bundle with core settings and the tab manifest
    const backupBundle = {
        timestamp: new Date().toISOString(),
        master_tabs: JSON.parse(localStorage.getItem('master_tabs') || '[]'),
        tabData: {}
    };

    // 2. Iterate through all tabs to collect their specific lists
    backupBundle.master_tabs.forEach(tab => {
        const tabId = tab.id;
        backupBundle.tabData[tabId] = {
            activeList: JSON.parse(localStorage.getItem(`${tabId}List`) || '[]'),
            purgeList: JSON.parse(localStorage.getItem(`${tabId}PurgeList`) || '[]')
        };
    });

    // 3. Convert the whole bundle to a pretty-printed JSON string
    const fullSnapshot = JSON.stringify(backupBundle, null, 2);
    const filetime = new Date().toISOString().split('T')[0]; // Simple YYYY-MM-DD

    // 4. Create the download link
    const blob = new Blob([fullSnapshot], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `FloWea_Full_Backup_${filetime}.json`;
    document.body.appendChild(a);
    a.click();
    
    // 5. Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // console.log("System Export: Finished. Snapshot saved.");    
}

//import to local storage**/
// ✅ DELEGATED TRANSITION FIX: Listens globally for the change event
$(document).on('change', '#jsonFileInput', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);

            // 1. Validation: Ensure it's a full backup file
            if (!backup.master_tabs || !backup.tabData) {
                throw new Error("Invalid file format. This is not a FloWea Full Backup.");
            }
            else if (confirm("This will delete all current tasks and tabs and replace them with the backup. Continue?")) {
                localStorage.clear();
                // ... rest of the logic
            
                // 2. The Destructive Wipe
                // We clear everything to ensure a clean slate for the restoration
                localStorage.clear();

                // 3. Restore Global Settings
                localStorage.setItem('master_tabs', JSON.stringify(backup.master_tabs));

                // 4. Restore Individual Tab Content
                Object.keys(backup.tabData).forEach(tabId => {
                    const data = backup.tabData[tabId];
                    localStorage.setItem(`${tabId}List`, JSON.stringify(data.activeList));
                    localStorage.setItem(`${tabId}PurgeList`, JSON.stringify(data.purgeList));
                });

                // 5. Hard Reset Global State
                window.allTabs = backup.master_tabs;
                window.isManualOverride = false;
                
                // Set a default active tab if one isn't set
                const firstTabId = window.allTabs.length > 0 ? window.allTabs[0].id : 'work';
                window.activeTab = firstTabId;
                localStorage.setItem("activeTab", firstTabId);

                // Cleanly stows away your panel overlay since the workspace is resetting
                $('#universal_panel_wrapper').removeClass('open');

                if (typeof initTabs === 'function') initTabs();           // Redraw tab buttons
                if (typeof window.displayData === 'function') window.displayData(); // Redraw the task lists

                alert("Restoration Successful! Your workspace has been updated.");
            }

        } catch (error) {
            console.error('Restoration Failed:', error);
            alert("Error: " + error.message);
        }
    };
    reader.readAsText(file);
});

// Sync specific functions
window.updateDashboardUI = function() {
    const display = document.getElementById('userUidDisplay');
    if (window.userId && display) {
        display.textContent = window.userId;
        if (window.generateSyncQR) window.generateSyncQR(window.userId);
    }

    const syncDetails = document.getElementById('syncDetails');
    
    // 🎯 THE SAFEGUARD FIX: If the Sync Panel isn't open/rendered, exit gracefully!
    if (!syncDetails) return;

    const isEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';
    
    if (isEnabled) {
        syncDetails.classList.remove('hidden');
        // Render the tab list whenever the dashboard is updated
        if (window.renderTabSyncSettings) window.renderTabSyncSettings();
    } else {
        syncDetails.classList.add('hidden');
    }
};

// Minimal change: One listener on the parent container
document.getElementById('todo_list').addEventListener('click', function(e) {
    // Find the closest list item (the task row)
    const li = e.target.closest('.sortable-item');
    
    if (li) {
        const checkbox = li.querySelector('input[type="checkbox"]');
        if (checkbox) {
            // If the user didn't click the checkbox directly, toggle it
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // Toggle the visual class
            li.classList.toggle('checked', checkbox.checked);
        }
    }
});

window.checkBoardCompletion = function() {
    const currentTabId = window.activeTab;
    const tabData = typeof getTabData === 'function' ? getTabData(currentTabId) : window.tabData;
    const todoList = window.getTabStorageData(currentTabId, tabData.type) || [];
    const container = $("#todo_list");

    // Only trigger if there are actually tasks in the list
    if (todoList.length === 0) {
        container.removeClass("board-complete");
        return;
    }

    // 1. Check if any work has started at all
    const anyClicks = todoList.some(item => (item.clicks || 0) > 0);
    // Check if every single item has at least 3 clicks
    const allFinished = todoList.every(item => (item.clicks || 0) >= 3);

    // 2. Timer Logic: Start the timer on the very first click
    let startTime = localStorage.getItem(`startTime_${currentTabId}`);
    if (anyClicks && !startTime) {
        startTime = new Date().getTime();
        localStorage.setItem(`startTime_${currentTabId}`, startTime);
    }

    if (allFinished) {
        // If it was already finished, don't trigger the toast again
        if (container.hasClass("board-complete")) return;

        container.addClass("board-complete");

        // 3. Calculate Elapsed Time
        const endTime = new Date().getTime();
        const durationMs = endTime - parseInt(startTime);
        
        const totalMinutes = Math.floor(durationMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // 4. Show the Toast
        let timeMsg = hours > 0 
            ? `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minutes`
            : `${minutes} minutes`;
            
        showToast(`Congratulations! Completed in ${timeMsg}!`);
        
        // Optional: Clear start time so it can reset tomorrow/next reset
        // localStorage.removeItem(`startTime_${activeTab}`);
    } else {
        container.removeClass("board-complete");
    }
}

// make hyperlinks clickable
function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
        const div = document.createElement('div');
        div.textContent = url;
        const safeUrl = div.innerHTML;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
    });
}
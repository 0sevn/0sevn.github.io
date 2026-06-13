// ==========================================
// 🧠 GLOBAL APP STATE & CORNERSTONE ENGINE
// ==========================================
// UID
let userId = null;
// New Global State
let isCloudSyncActive = localStorage.getItem('cloudSyncEnabled') === 'true';

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
 * SIMPLIFIED UNIFIED COMPATIBILITY STORAGE ENGINE (The Bridge)
 * Safely accesses task and purge sets without key splitting or collisions.
 */
// window.getTabStorageData = function(tabId, typeOrList) {
//     if (!tabId) return [];
//     const isPurge = (typeOrList === 'purge' || typeOrList === 'purgeList');
//     const key = isPurge ? `${tabId}PurgeList` : `${tabId}List`;
//     try {
//         return JSON.parse(localStorage.getItem(key) || '[]');
//     } catch (e) {
//         console.error(`Error parsing storage for key ${key}:`, e);
//         return [];
//     }
// };

// window.setTabStorageData = function(tabId, data, typeOrList) {
//     if (!tabId) return;
//     const isPurge = (typeOrList === 'purge' || typeOrList === 'purgeList');
//     const key = isPurge ? `${tabId}PurgeList` : `${tabId}List`;
//     localStorage.setItem(key, JSON.stringify(data || []));
//     localStorage.setItem("LastSync", new Date().toISOString());
// };

// // functions for constants, variables
// Ensure activeTab is never null
window.activeTab = localStorage.getItem('activeTab') || (window.allTabs[0] ? window.allTabs[0].id : null);
window.tabData = getTabData(activeTab);
/**
 * SMART COMPATIBILITY STORAGE ENGINE (The Bridge)
 * Place these two functions at the very top of your global utility script.
 * Automatically handles parameter re-ordering and schema alignment.
 */

/**
 * SMART COMPATIBILITY STORAGE ENGINE (The Bridge)
 * Solves duplicate key initializations by funnelling all 
 * raw and suffixed calls into a single standardized key layout structure.
 */

window.getTabStorageData = function(tabId, typeOrList) {
    if (!tabId) return [];

    // 1. Force all variations to route to the standardized "List" suffix key
    const isPurge = (typeOrList === 'purge' || typeOrList === 'purgeList');
    const standardKey = isPurge ? `${tabId}PurgeList` : `${tabId}List`;

    try {
        // 2. Look inside the unified master state dictionary first (New clean layout)
        const masterStore = JSON.parse(localStorage.getItem('flowea_tab_data') || '{}');
        if (masterStore[tabId]) {
            const targetField = isPurge ? 'purgeList' : 'activeList';
            if (Array.isArray(masterStore[tabId][targetField])) {
                return masterStore[tabId][targetField];
            }
        }

        // 3. Fallback: Read from the unified legacy key
        let legacyData = localStorage.getItem(standardKey);
        
        // If nothing is found under the standard key, check if it was saved under the raw unsuffixed ID
        if (!legacyData && !isPurge) {
            legacyData = localStorage.getItem(tabId);
        }
        
        if (legacyData) {
            const parsed = JSON.parse(legacyData);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') return [parsed]; 
        }
    } catch (e) {
        console.error(`Bridge failed reading storage for Tab: ${tabId}`, e);
    }

    return [];
};

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
        localStorage.setItem(standardKey, JSON.stringify(safeArray));
        
        // 3. CLEAN UP & PREVENT DUPLICATES: 
        // If an old unsuffixed duplicate key exists, clear it out so it stops taking up memory
        if (!isPurge && localStorage.getItem(tabId) !== null) {
            localStorage.removeItem(tabId);
        }
        
    } catch (e) {
        console.error(`Bridge failed writing storage for Tab: ${tabId}`, e);
    }
};

// window.tabData = getTabData(window.activeTab);
// window.todoList = JSON.parse(localStorage.getItem(window.activeTab) || '[]');
// console.log("tabData BEFORE", tabData)
// render based on tab type
// type list or checkinmode
// router function
window.renderTaskList = function() {
    const weekHeader = $("#week_header").empty();
    weekHeader.append('Wk '+getWeekNumber(new Date()));

    const activeTabId = window.activeTab; //current tabID from master_tabs
    const tabData = getTabData(activeTabId); // Helper, get tabData from tabID from master_tabs - make one for set data next
    const container = $("#todo_list").empty();
    if (!container.length || !tabData) return;

    // tab_script.js defines activeTab as the ID (e.g. "work" or "173931...")
    // const currentTabName = localStorage.getItem(`tabName_000000${activeTab}`) || activeTab;
    // console.log("check/in mode currentTabName", currentTabName);

    // Remove legacy classes to clean canvas state
    container.removeClass('checkin-grid');

    switch (tabData.type) {          
        case 'checkin':
            renderGridView(container, tabData);
            console.log("current tab is checkin", activeTab)
            break;

        case 'list':
        default:
            renderListView(container, tabData);
            console.log("current tab is standard list", activeTab)
            break;
    }
    togglePurgeButton();
}
// --- CHECK-IN MODE ---
function renderGridView(container, tabData) {
    // const storageKey = getTabStorageData(tabData.id, tabData.type);
    // const todoList = JSON.parse(localStorage.getItem(storageKey) || '[]');
    // const todoList = JSON.parse(localStorage.getItem(activeTab) || '[]');
    let todoList = getTabStorageData(tabData.id, tabData.type);
        container.addClass('checkin-grid');
        
        // Seed defaults if empty
                    // const defaults = ["Water", "Gym", "Read", "Meditation"];"Stretch flexors 45/97"
            // Choose program, begin, rehab, stretch, gain
            // morning stretch 30min
            // sun salutation 10min
            // light, medium, hard
            // generate workout, random upper/lower body, push/pull, strength/explosivity/endurance, conditioning
            // daily block planner, stretch 30min, breakfast 30min, work 45minx8, eat, workout, sleep8h
            // const defaults = ["Back Low row/Lats Pull 89/97","Zercher 45/97", "Smith Squat 100/100", "Dead Lift 90/120", "Bench Press 50/80", "Shoulder Press 60/97", "Triceps/Biceps 45/97", "Toe raise, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Leg raise/Crunches 45/97" ];
            
            //monthly house keeping
            // defaults = ["Back Low row/Lats Pull 89/97","Zercher 45/97", "Smith Squat 100/100", "Dead Lift 90/120", "Bench Press 50/80", "Shoulder Press 60/97", "Triceps/Biceps 45/97", "Toe raise, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Leg raise/Crunches 45/97" ];
            
            // ["Lat Pull 40/97", "Row 45/97", "Chest Press 45/97", "Shoulder Press 45/97", "Leg Extension 45/97", "Leg Curl 45/97", "Hip Add, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Zercher 45/97", "Leg raise/Crunches 45/97" ];
            
            // console.log("tabData.name", tabData.name)
            // presets
        if (todoList.length === 0) {
            let defaults = [""];
            
            // const currentTabName = localStorage.getItem(`${activeTab}`) || activeTab;
            // Route based on TYPE
            switch (tabData.name) {
                case 'Gym1 - machines':
                    console.log("tabData.name", tabData.name)
                    defaults = ["Lat Pull 40/97", "Row 45/97", "Chest Press 45/97", "Shoulder Press 45/97", "Leg Extension 45/97", "Leg Curl 45/97", "Hip Add, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Zercher 45/97", "Leg raise/Crunches 45/97" ];
                    break;

                case 'Gym - Lugn lördag':
                    console.log("tabData.name", tabData.name)
                    defaults = ["Lat pull downs 10/97", "Back low row 10/97", "Tricep extensions 10/97", "Bicep curls 10/100", "Plankan 1min" ];
                    break;
                    
                case 'House':
                    console.log("tabData.nam", tabData.name)
                    defaults = ["JB 48 kr", "Nordea Lån 580kr", "For el 80", "Mat"];
                    break;

                case 'Studio Tam':
                default:
                    console.log("tabData.nam", tabData.name)
                    defaults = ["L'o'n", "Abonemang telefon", "bankgiro", "fakturering","bokf;ring"];
                    break;
            }
            const seeded = defaults.map(name => ({
                id: new Date().toISOString() + Math.random(),
                text: name,
                clicks: 0
            }));
            // Use general purpose setter helper to save initial seeds
            setTabStorageData(tabData.id, tabData.type, seeded);
            // return window.renderTaskList();
            // FIX: Assign the seeded data to our local variable so the loop below can render it immediately.
            // DO NOT call window.renderTaskList() here anymore.
            todoList = seeded;
            // FIX 1: Run completion check immediately for newly seeded boards 
        // to handle cases where 0/0 conditions satisfy completion criteria.
        if (typeof window.checkBoardCompletion === 'function') {
            window.checkBoardCompletion();
        }
        }

        todoList.forEach((item) => {
            const bb = 100; // Fixed Goal
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

                // We use a single 'click' handler to manage the state
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
                            setTabStorageData(tabData.id, tabData.type, todoList);
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
                        // FIX: Replaced storageKey with general purpose helper inside the input callback
                        setTabStorageData(tabData.id, tabData.type, todoList);
                    });

                    slider.on('blur', () => {
                        // Restore UI
                        textElement.text(displayName);
                        
                        // Crucial: Use a tiny timeout before re-enabling clicks 
                        // so the "exit click" doesn't trigger an increment
                        setTimeout(() => { isEditing = false; }, 100);
                    });
                }

                container.append(tile);
            });
            
            // FIX 2: Ensure fallback safe checking at the very end of the rendering pass
    if (typeof window.checkBoardCompletion === 'function') {
        window.checkBoardCompletion();
    } else if (typeof checkBoardCompletion === 'function') {
        checkBoardCompletion(); // Local scope fallback execution
    }
}

// call string with variable, add List
//   const tasks = JSON.parse(localStorage.getItem(`${tabData.id}List`) || '[]');
function renderListView(container, tabData) {
    // 1. Fetch using the general-purpose storage helper
    const tasks = getTabStorageData(tabData.id, tabData.type);
    
    // Clear out the element wrapper
    container.empty();
    
    if (tasks.length === 0) {
        // container.html(`<div class="empty-state">No tasks in ${tabData.name}</div>`);
        return;
    }

    // 2. Loop through task records and construct interactive DOM nodes
    tasks.forEach((task) => {
        // Format the id timestamp safely into just day and month (e.g., "31 May")
        const displayDate = new Date(task.id).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });

        // Determine fallback display state for contextual editing tool controls
        const editDisplayState = (typeof editButtonsVisible !== 'undefined' && editButtonsVisible) ? 'inline-block' : 'none';

        // Construct the item layout template structure
        const newListItem = $(`
            <li data-id="${task.id}" class="sortable-item" draggable="true">
                <div class="swipe-container">
                    <button style="background: rgba(48, 151, 48, 0.69); width: 100px; border: none">✅</button>
                    <div class="task-content">
                        <span>
                            <input type="checkbox" class="task-checkbox" ${task.checked ? 'checked' : ''}>
                            <span class="task-text">${linkify(task.text)}</span>
                            <p class="time">${displayDate}</p>
                        </span>
                        <div class="edit_tasks" style="display: ${editDisplayState};">
                            <input type="submit" class="icon delete" value=" " title="Delete task" style="padding-right:0%;">
                        </div>
                    </div>
                    <button style="background: rgb(199, 74, 74); width: 100px; border: none">❌</button>
                </div>
            </li>
        `);

        // Append the item right into the wrapper list
        container.append(newListItem);

        // 3. Setup Swipe Gestures Logic
        const swiper = newListItem.find(".swipe-container")[0];
        
        // Hide standard mobile side gutters using optimized display ticks
        requestAnimationFrame(() => {
            if (swiper) swiper.scrollLeft = 99; 
        });

        // Attach Swipe Event Listener
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

                // Threshold tracking action checks

                if (dx > 99) {                
                    scroll_div.style.backgroundColor = "red";
                    setTimeout(() => {
                        li.style.transform = "translateX(-90%)";
                        li.style.opacity = "0";
                        setTimeout(() => {
                            // Unified delete execution
                            if (window.deleteTaskById) {
                                window.deleteTaskById(taskId);
                            } else {
                                // Fallback to standard delete callback action if by-id is missing
                                deleteTask.call($(li).find('.delete')[0]);
                            }
                        }, 100);
                    }, 600);

                } else if (dx < -99) {
                    scroll_div.style.backgroundColor = "green";
                    setTimeout(() => {
                        const cb = li.querySelector('input[type="checkbox"]');
                        if (cb) cb.checked = true; 
                        
                        li.style.transform = "translateX(90%)";
                        li.style.opacity = "1"; // Keep visible during transformation window
                        
                        setTimeout(() => {
                            scroll_div.scrollTo({ left: 99, behavior: 'instant' });
                            if (window.purgeSpecificTask) {
                                window.purgeSpecificTask(taskId);
                            } else if (window.purgeList) {
                                window.purgeList(); // Fallback cascade anchor
                            }
                        }, 100);
                    }, 300);

                } else {
                    scroll_div.style.backgroundColor = ""; // Clear background state color at midpoint
                }
            });
        }

        // 4. Manual Event Click Actions (Checkbox Toggles + Inline Deletions)
        newListItem.find('.task-checkbox').on('change', function() {
            const isChecked = $(this).is(':checked');
            // Locate local layout tracking index references
            const currentTasks = getTabStorageData(tabData.id, tabData.type);
            const targetIdx = currentTasks.findIndex(t => t.id === task.id);
            
            if (targetIdx !== -1) {
                currentTasks[targetIdx].checked = isChecked;
                setTabStorageData(tabData.id, tabData.type, currentTasks);
                updateHealthBar();
                togglePurgeButton();
                if (window.pushFullSync) window.pushFullSync();
            }
        });

        newListItem.find('.delete').on('click', function(e) {
            e.stopPropagation();
            deleteTask.call(this); // Calls standard execution mapping to filter out task keys
        });
    });
}

function renderPurgeList() {
    const purgeList = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');
    const plistElement = $("#purge_list").empty();

    // Sort newest first using ISO timestamps
    // purgeList.sort((a, b) => b.purgedAt.localeCompare(a.purgedAt));

    const renderedWeeks = new Set();

    purgeList.forEach(item => {
        const purgedWeek = item.purgedWeek || getWeekNumber(new Date(item.purgedAt));
        const year = new Date(item.purgedAt).getFullYear();

        if (!renderedWeeks.has(purgedWeek)) {
            plistElement.append(`<li class="week-header week-${purgedWeek}">Week ${purgedWeek} - ${year}</li>`);
            renderedWeeks.add(purgedWeek);
        }

        const newPurgeItem = $(`
            <li><span style="font-size:13px; color:light-grey;">
                ${item.text} <p class="time">${item.createdAt}</p>
            </span></li>
        `);
        $(`.week-${purgedWeek}`).after(newPurgeItem);
    });
    
}

// ----------- TASK FUNCTIONS -------------
function togglePurgeButton() {
    // on/off
    // const currentTabName = localStorage.getItem(`tabName_${activeTab}`) || activeTab;
    // window.activeTab = localStorage.getItem('activeTab') || (window.allTabs[0] ? window.allTabs[0].id : null);
    const activeTab = window.activeTab;
    // console.log("activeTab", activeTab)
    // const tabData = getTabData(activeTab); 
    const tabData = typeof getTabData === 'function' ? getTabData(activeTab) : { id: activeTab, type: 'checkin' };
    // const tabData = window.tabData; // Helper we built earlier
    // console.log("tabData type", tabData.type)
    
    if (tabData.type === 'checkin') {
        // console.log("togglePurgeButton in x Tab")
        // For 'x' tab: Enable if any tile has clicks > 0
        // const todoList = JSON.parse(localStorage.getItem(activeTab) || '[]');
        const todoList = getTabStorageData(tabData.id, tabData.type);
        const hasClicks = todoList.some(task => (task.clicks || 0) > 0);
        // todoList[3].clicks
        console.log("togglePurgeButton in checkin tab", hasClicks)
        $('#purge').prop('disabled', !hasClicks);
    } else {
        // Standard mode: Enable if any checkbox is checked
        const anyChecked = $('#todo_list input[type="checkbox"]:checked').length > 0;
        $('#purge').prop('disabled', !anyChecked);
        console.log("togglePurgeButton in standard Tab")
    }
}



function enterTask() {
    const text = $('#enter_task').val().trim();
    if (!text) return;

    const activeTabId = window.activeTab;
    const tabData = getTabData(activeTabId);

    const isoTime = new Date().toISOString(); // simple unique id based on createdAT timestamp

    //will be createdAt until edit/change registers updatedAt
    const timestamp = new Date(isoTime).toLocaleString('en-GB', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

            // Create a new master_tab object
            const newTask = {
                id: isoTime,
                text: text,
                checked: false,
                createdBy: window.userId, // <--- Add this line
                createdAt: new Date().toISOString()
            };

    // const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    // Pull, push, and save effortlessly
    const todoList = getTabStorageData(tabData.id, tabData.type);
    todoList.push(newTask);

    setTabStorageData(tabData.id, tabData.type, todoList);
    localStorage.setItem("LastSync", isoTime); //set last sync as last created task time
    

    $('#enter_task').val('');
    updateHealthBar();
    // renderTaskList();
    window.renderTaskList();

//     Since ISO timestamps are lexically sortable, you can sort tasks by ID directly:
        // todoList.sort((a, b) => a.id.localeCompare(b.id)); // ascending
        // todoList.sort((a, b) => b.id.localeCompare(a.id)); // descending
        // Or if you ever switch to numeric timestamps:

        // todoList.sort((a, b) => new Date(b.id) - new Date(a.id));

    // Add this line at the very end of the function
    // VERIFY THIS LINE IS HERE:
    if (typeof window.pushFullSync === 'function') {
        window.pushFullSync();
    } else {
        console.warn("Sync function not yet initialized");
    }
}

//when checkbox or task edit happens 
function updateTaskInStorage(index, newText, checked = false) {
    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    todoList[index].text = newText;
    if (typeof checked === 'boolean') todoList[index].checked = checked;
    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    localStorage.setItem("LastSync", new Date().toISOString());
    if (window.pushFullSync) window.pushFullSync();
}

function deleteTask() {
    const listItem = $(this).closest('li');
    const taskId = listItem.data('id');
    
    let todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const taskIndex = todoList.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return;

    // Save the task for undoing before removing it
    const deletedTask = todoList[taskIndex];
    todoList.splice(taskIndex, 1);

    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    renderTaskList();
    updateHealthBar();

    const undoDelete = () => {
        let currentTodo = JSON.parse(localStorage.getItem(activeTabList) || '[]');
        currentTodo.push(deletedTask); // Put it back
        localStorage.setItem(activeTabList, JSON.stringify(currentTodo));
        renderTaskList();
        updateHealthBar();
        if (window.pushFullSync) window.pushFullSync();
    };

    showToast("Task deleted", undoDelete);
    if (window.pushFullSync) window.pushFullSync();
}

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
    
    // Scopes to pass down into the undo closure safely
    let tasksToRestore = [];
    let idsToClearFromHistory = [];

    if (currentTabType === 'checkin') {
        // --- 📊 TRACKING MODE: CHECK-IN GRID PURGE ---
        const updatedTodoList = todoList.map(task => {
            if ((task.clicks || 0) > 0) {
                const historyEntry = {
                    id: new Date().getTime() + Math.random(),
                    text: `${task.text} (${task.clicks} sets)`,
                    purgedAt: now,
                    purgedWeek: typeof getWeekNumber === 'function' ? getWeekNumber(new Date(now)) : 1,
                    originalTask: task.text,
                    count: task.clicks
                };
                
                purgeHistory.unshift(historyEntry);
                
                // Track for Undo context operations
                tasksToRestore.push({ id: task.id, previousClicks: task.clicks });
                idsToClearFromHistory.push(historyEntry.id);
                
                purgedAnything = true;
                return { ...task, clicks: 0 }; // Reset the counter block
            }
            return task;
        });

        if (purgedAnything) {
            // Commit changes using the Bridge
            window.setTabStorageData(currentTabId, updatedTodoList, currentTabType);
            window.setTabStorageData(currentTabId, purgeHistory, 'purge');
            
            showToast("Progress archived & counters reset!", () => {
                // Execute Undo check-in block
                let liveTodo = window.getTabStorageData(currentTabId, currentTabType);
                let livePurge = window.getTabStorageData(currentTabId, 'purge');

                // Re-hydrate counters to their pre-archived numbers
                liveTodo = liveTodo.map(task => {
                    const match = tasksToRestore.find(r => r.id === task.id);
                    return match ? { ...task, clicks: match.previousClicks } : task;
                });

                // Strip the entries out of history
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
        // --- 📝 STANDARD MODE: CHECKBOX CHECKLIST PURGE ---
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

        // Commit via bridge
        window.setTabStorageData(currentTabId, remainingTasks, currentTabType);
        window.setTabStorageData(currentTabId, updatedPurgeHistory, 'purge');

        // Define Undo action using structural layout array merging
        const undoStandardPurge = () => {
            let liveTodo = window.getTabStorageData(currentTabId, currentTabType);
            let livePurge = window.getTabStorageData(currentTabId, 'purge');

            // Map targets back to active state arrays and uncheck them cleanly
            const restoredTasks = tasksToPurge.map(t => ({ ...t, checked: false }));
            liveTodo = [...liveTodo, ...restoredTasks];

            // Filter out the history array objects
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
    
    // Global rendering refresher pipeline helper
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

    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const currentTabName = localStorage.getItem(`tabName_${activeTab}`) || activeTab;
const tabData = window.tabData;
    const count = todoList.length;
    
    let totalItems = todoList.length;
    let activeItems;
    let calculatedWidth;

    if (tabData.type === 'checkin') {
        // --- Health Logic for Check-in Tab ---
        // A task "depletes" health if it has 1 or more clicks (it's active/started)
        // find tasks, filter those with clicks or 0, get length of if there are more than 0
        unfinishedTasks = todoList.filter(item => !(item.clicks || 0) > 0).length;
        const remainingRatio = (totalItems-unfinishedTasks) / totalItems;
        console.log("x tasks",unfinishedTasks)
        calculatedWidth = 100-Math.pow(remainingRatio, 2) * 100;
    }
    else {
        // --- Standard Health Logic ---
        // get opposite of checked tasks, 
        unfinishedTasks = todoList.filter(item => (!item.checked)).length;
        console.log("standard tasks",unfinishedTasks)
        // DIMINISHING RETURNS FORMULA
        // This makes the bar grow fast at first, but slow down as it gets bigger
        calculatedWidth = (100) * (1 - Math.exp(-unfinishedTasks / 5.5));
    }

    // Explicitly clamp the percentage between 0 and 100
    let healthPercent;
    if (totalItems === 0) {
        // empty
        healthPercent = 3;
    } else {
        // percentage
        healthPercent = Math.max(3, calculatedWidth);
    }

    // Apply as a percentage string
    healthBar.style.width = `${healthPercent}%`;

    // const finalWidth = Math.max(3, calculatedWidth);    
    // healthBar.style.width = finalWidth + '%';

    // COLOR LOGIC: Turn red if > 5 tasks
    if (unfinishedTasks > 5) {
        healthBar.style.backgroundColor = '#e74c3c'; // Danger Red
        healthBar.style.boxShadow = '0 0 8px #e74c3c'; // Optional "Glow"
    } else if (unfinishedTasks > 3 && unfinishedTasks < 6 ) {
        healthBar.style.backgroundColor = '#f1c40f';
        healthBar.style.boxShadow = 'none';
    }
    else if (unfinishedTasks > 0 && unfinishedTasks < 4 ) {
        healthBar.style.backgroundColor = '#3498db'; // Healthy Blue (or your theme color)
        healthBar.style.boxShadow = 'none';
    }
    else {
            healthBar.style.backgroundColor = '#2ecc71';
        }

    // document.querySelector('.healthbar').style.setProperty('--healthbar-size', newSize + '%');
    // document.querySelector('.healthbar').style.setProperty('--health-color', unfinishedTasks > 4 ? '#e25a5aaf' : '#6ae25aaf');

    localStorage.setItem("LastSync", new Date().toISOString());

    // console.log("count" + count);
    // console.log("unfinishedTasks" + unfinishedTasks);
    // // console.log("completionPercentage " + completionPercentage);
}


// Updated in script.js
function showToast(message, undoCallback = null) {
    const toast = document.getElementById("toast");
    
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

// ----------- EVENT BINDINGS -------------

$(function () {
    const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') document.body.classList.add('light-mode');

    $('#add').on('click', enterTask);
    $('#purge').on('click', purgeList);

    $('#enter_task').on('keypress', e => {
        if (e.which === 13) enterTask();
    });

// DASHBOARD

// 2. Sync Toggle Listener
// 1. Locate the checkbox in the Dashboard
const syncToggle = document.getElementById('cloudSyncToggle');

// 2. Confirm the element exists before adding the listener
if (syncToggle) {
    // Set initial state based on saved preference
    const isEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';
    syncToggle.checked = isEnabled;

    syncToggle.addEventListener('change', function(e) {
        isCloudSyncActive = e.target.checked;
        localStorage.setItem('cloudSyncEnabled', isCloudSyncActive);
        
        if (isCloudSyncActive) {
            document.getElementById('syncDetails').classList.remove('hidden');
            // This calls the Firebase function we just created
            window.initializeFirebaseSync(); 
        } else {
            document.getElementById('syncDetails').classList.add('hidden');
            updateStatusHUD('Local Only', 'gray');
        }
    });
    // If it was already enabled, initialize on load
        if (isEnabled) window.initializeFirebaseSync();
}

window.generateSyncQR = function(uid) {
    const qrContainer = document.getElementById('syncQrCode');
    if (!qrContainer) return;
    qrContainer.innerHTML = "";
    const syncUrl = `${window.location.origin}${window.location.pathname}?syncId=${uid}`;
    new QRCode(qrContainer, {
        text: syncUrl,
        width: 160,
        height: 160,
        colorDark: "#ffffff",
        colorLight: "#2a2a2a"
    });
};


// 4. Copy UID Helper
window.copyUid = () => {
    const uid = document.getElementById('userUidDisplay').textContent;
    navigator.clipboard.writeText(uid);
    showToast("ID Copied to Clipboard");
};

//Pull functions
// Inside document.addEventListener('DOMContentLoaded', () => { ... })

const urlParams = new URLSearchParams(window.location.search);
const syncIdParam = urlParams.get('syncId');

if (syncIdParam) {
    // If we find a syncId, we ask the user to confirm the override
    const confirmSync = confirm("Found a Sync ID! Do you want to overwrite this device's data with the remote version?");
    if (confirmSync) {
        // Enable cloud sync automatically
        localStorage.setItem('cloudSyncEnabled', 'true');
        // Trigger the pull
        window.pullFullSync(syncIdParam);
    } else {
        // Clean the URL so the prompt doesn't keep appearing
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

window.handleManualSync = function() {
    const remoteUid = document.getElementById('manualSyncInput').value.trim();
    
    if (remoteUid && remoteUid.length > 20) {
        console.log('remoteUid ', remoteUid)
// console.log('syncId'+ remoteId)
        const confirmSync = confirm("This will overwrite all local tasks and tabs with data from the remote device. Proceed?");
        if (confirmSync) {
            // Explicitly set the master ID
            localStorage.setItem('syncId', remoteUid);
            localStorage.setItem('cloudSyncEnabled', 'true');

            alert("Linking to ID: " + remoteUid + ". The page will now refresh.");
            // Force a clean reload. On reboot, index.html will see the new 'syncId'
            window.location.reload(); 
        } else {
        alert("Please enter a valid Sync ID.");
        }
    } else {
        alert("Please enter a valid Sync ID.");
    }

    if (remoteUid === window.userId) {
        alert("This is your current device ID!");
        return;
    }
            // if (window.pullFullSync) {
            //     window.pullFullSync(remoteId);
            // } else {
            //     alert("Sync engine not ready. Please try again in a moment.");
            // }
};

    $('#todo_list').on('change', '.task-checkbox', function () {
        const index = $(this).closest('li').index();
        updateTaskInStorage(index, $(this).siblings('.task-text').text(), this.checked);
        updateHealthBar();
        togglePurgeButton();
        // $(this).closest('li').toggleClass('bold', !this.checked);
    });

    $('#todo_list').on('click', '.delete', deleteTask);

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
let editButtonsVisible = localStorage.getItem('editButtonsVisible') === 'true';

function showTaskEdit() {
    editButtonsVisible = !editButtonsVisible;
    localStorage.setItem('editButtonsVisible', editButtonsVisible); // persist state
    
    // const anyVisible = [...document.querySelectorAll(".edit_tasks")]
    //   .some(el => el.style.display !== 'none');

    // document.querySelectorAll(".edit_tasks").forEach(el => {
    //     el.style.display = anyVisible ? "none" : "inline-block";
    // });
    document.querySelectorAll('.edit_tasks').forEach(taskDiv => {
        taskDiv.style.display = editButtonsVisible ? 'inline-block' : 'none';
    });
}

// REPLACE WITH HTML POP UP & OVERS
function showHelp() {
    document.getElementById("helpCard").style.display = "block";
}

function closeHelp() {
    document.getElementById("helpCard").style.display = "none";
}

function showHistory() {
    const visibleHist = document.getElementById("historyCard").style.display;
    console.log('show history');
    // displayData();
    const dash = document.getElementById("historyCard");
        dash.classList.toggle("hidden");
        if (!dash.classList.contains("hidden")) updateDashboardUI();
} 
function showCommandbar() {
    const togglePanel = document.getElementById("commandBar");
    console.log('toggle commandbar');
    // displayData();
    togglePanel.classList.toggle("hidden");
        if (!togglePanel.classList.contains("hidden")) updateDashboardUI();
} 

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
    console.log("System Export: Started"); 

    // 1. Initialize the bundle with core settings and the tab manifest
    const backupBundle = {
        timestamp: new Date().toISOString(),
        routine_config: JSON.parse(localStorage.getItem('routine_config')),
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
    console.log("System Export: Finished. Snapshot saved.");    
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
                if (backup.routine_config) {
                    localStorage.setItem('routine_config', JSON.stringify(backup.routine_config));
                    window.routineConfig = backup.routine_config;
                }

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
                if (typeof renderRoutineBar === 'function') renderRoutineBar();   // Redraw routine segments
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

// --- MOVE THIS TO THE BOTTOM OF script.js (Outside the $(function) block) ---
window.updateStatusHUD = function(text, color) {
    const dot = document.getElementById('syncStatusDot');
    const label = document.getElementById('syncStatusText');
    if (dot && label) {
        dot.style.backgroundColor = color;
        label.textContent = text;
    }
}

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


// Not used anywhere??
// lost function in cloud sync??
window.toggleTabLock = function(tabId) {
    const key = `tabLocked_${tabId}`;
    const isLocked = localStorage.getItem(key) === 'true';
    
    // Toggle the value
    localStorage.setItem(key, !isLocked);
    
    // Refresh the dashboard UI and trigger a sync to update the cloud
    renderTabSyncSettings();
    if (window.pushFullSync) window.pushFullSync(true); 
};

// Duplicate function
// Toggle whether a tab is pushed to the cloud
window.toggleTabLock = function(id) {
    const current = localStorage.getItem(`tabLocked_${id}`) === 'true';
    localStorage.setItem(`tabLocked_${id}`, !current);
    
    // Refresh UI and trigger a sync to update cloud state
    window.renderTabSyncSettings();
    if (window.pushFullSync) window.pushFullSync();
};

window.renderTabSyncSettings = function() {
    // master_tabs is an array of objects: [{id: '123', name: 'Work', ...}, ...]
    const tabList = JSON.parse(localStorage.getItem("master_tabs") || '[]');
    const container = document.getElementById('tabSyncList');
    if (!container) return;
    
    container.innerHTML = tabList.map(tab => {
        const id = tab.id;
        const name = localStorage.getItem(`tabName_${id}`) || tab.name || id;
        const isLocked = localStorage.getItem(`tabLocked_${id}`) === 'true';
        const isRemote = !!tab.remoteOwnerId;

        // If it's a remote tab, we show who owns it instead of a sync toggle
        const syncControl = isRemote 
            ? `<span class="remote-badge">Shared by: ${tab.remoteOwnerId.substring(0,5)}...</span>`
            : `<button onclick="toggleTabLock('${id}')" class="sync-toggle-btn ${isLocked ? 'locked' : 'synced'}">
                ${isLocked ? '🏠 Local Only' : '☁️ Cloud Sync'}
               </button>`;

        return `
            <div class="tab-sync-item" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 10px;">
                <span style="flex-grow: 1;">${name}</span>
                
                ${syncControl}

                <button onclick="copyTabShareCode('${id}')" class="copy-btn" title="Copy Share Code">
                    🔗 Copy Link
                </button>
            </div>
        `;
    }).join('');
};



// Generate and copy the USERID|TABID string
window.copyTabShareCode = function(tabId) {
    if (!window.userId) {
        alert("Please enable Cloud Sync first to get a User ID.");
        return;
    }
    const shareCode = `${window.userId}|${tabId}`;
    
    navigator.clipboard.writeText(shareCode).then(() => {
        // Visual feedback
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = "Share Code Copied!";
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);
        } else {
            alert("Copied: " + shareCode);
        }
    });
};

// //
// This function is not used anywhere...
// //
// window.refreshUIFromSync = function() {
//     console.log("Real-time update received!");
    
//     // 1. Refresh global pointers
//     activeTab = localStorage.getItem("activeTab") || 'work';
//     activeTabList = activeTab + "List";
//     activeTabPurgeList = activeTab + "PurgeList";

//     // 2. Redraw UI components
//     // createTabs(); 
//     initTabs()
//     window.displayData();
//     renderRoutineBar();
//     updateHealthBar();
    
//     // 3. Visual confirmation
//     const dot = document.getElementById('syncStatusDot');
//     if (dot) {
//         dot.style.transform = 'scale(1.5)';
//         setTimeout(() => dot.style.transform = 'scale(1)', 4000);
//     }
// };

// Minimal change: One listener on the parent container
document.getElementById('todo_list').addEventListener('click', function(e) {
    // Find the closest list item (the task row)
    const li = e.target.closest('.sortable-item');
    
    if (li) {
        const checkbox = li.querySelector('input[type="checkbox"]');
        
        // If the user didn't click the checkbox directly, toggle it
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            
            // Manually trigger the 'change' event so your 
            // existing logic (like saveData) still runs
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Toggle the visual class
        li.classList.toggle('checked', checkbox.checked);
    }
});

// Targeted deletion adapted for unified compatibility storage
function deleteTaskById(id) {
    const currentTabId = window.activeTab;
    if (!currentTabId) return;

    // 1. Grab current active tab descriptor context safely
    const tabData = window.tabData || {};
    const currentTabType = tabData.type || 'todo';

    // 2. Query data cleanly through your smart bridge engine
    let todoList = typeof window.getTabStorageData === 'function'
        ? window.getTabStorageData(currentTabId, currentTabType)
        : JSON.parse(localStorage.getItem(`${currentTabId}List`) || '[]');

    // Keep track of the item before filtering out if you want to use undo actions later
    const deletedTask = todoList.find(task => task.id === id);
    
    // 3. Filter out the specific targeted task object instance
    todoList = todoList.filter(task => task.id !== id);

    // 4. Commit array back using your smart bridge to avoid duplicate key pollution
    if (typeof window.setTabStorageData === 'function') {
        window.setTabStorageData(currentTabId, todoList, currentTabType);
    } else {
        localStorage.setItem(`${currentTabId}List`, JSON.stringify(todoList));
    }

        // const undoDelete = () => {
    //     let currentTodo = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    //     currentTodo.push(deletedTask); // Put it back
    //     localStorage.setItem(activeTabList, JSON.stringify(currentTodo));
    //     renderTaskList();
    //     updateHealthBar();
    //     if (window.pushFullSync) window.pushFullSync();
    // };


    // showToast("Task deleted", undoDelete);

    // 5. Global State Sync and Dashboard updates
    if (typeof updateHealthBar === 'function') updateHealthBar();
    if (typeof renderTaskList === 'function') renderTaskList();
    if (typeof window.displayData === 'function') window.displayData();

    showToast("Task deleted");
    
    // 6. Broadcast structural changes out to cloud instances
    if (window.pushFullSync) window.pushFullSync();
}

// Targeted purging
// Targeted task purging adapted for unified compatibility storage
function purgeSpecificTask(id) {
    const currentTabId = window.activeTab;
    if (!currentTabId) return;

    // 1. Grab current active tab descriptor context safely
    const tabData = window.tabData || {};
    const currentTabType = tabData.type || 'todo';

    // 2. Query both Active and Purge datasets cleanly through your bridge engine
    let todoList = typeof window.getTabStorageData === 'function'
        ? window.getTabStorageData(currentTabId, currentTabType)
        : JSON.parse(localStorage.getItem(`${currentTabId}List`) || '[]');

    let purgeList = typeof window.getTabStorageData === 'function'
        ? window.getTabStorageData(currentTabId, 'purge')
        : JSON.parse(localStorage.getItem(`${currentTabId}PurgeList`) || '[]');

    // 3. Locate the target item index
    const taskIndex = todoList.findIndex(t => t.id === id);
    if (taskIndex > -1) {
        // Splice out the targeted task element
        const task = todoList.splice(taskIndex, 1)[0];
        
        // Apply your original archival metadata timestamps
        task.purgedAt = new Date().toISOString();
        if (typeof getWeekNumber === 'function') {
            task.purgedWeek = getWeekNumber(new Date(task.purgedAt));
        }
        
        // Prepend (unshift) into the historical purge log track
        purgeList.unshift(task);

        // 4. Commit both arrays back using the smart bridge to avoid duplicate key splitting
        if (typeof window.setTabStorageData === 'function') {
            window.setTabStorageData(currentTabId, todoList, currentTabType);
            window.setTabStorageData(currentTabId, purgeList, 'purge');
        } else {
            localStorage.setItem(`${currentTabId}List`, JSON.stringify(todoList));
            localStorage.setItem(`${currentTabId}PurgeList`, JSON.stringify(purgeList));
        }
        
        // 5. Global State Sync and Dashboard updates
        if (typeof updateHealthBar === 'function') updateHealthBar();
        if (typeof renderTaskList === 'function') renderTaskList();
        if (typeof renderPurgeList === 'function') renderPurgeList();
        if (typeof window.displayData === 'function') window.displayData();
        
        // Render toast messages safely
        if (typeof purgeMessages !== 'undefined' && purgeMessages.length > 0) {
            showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)]);
        } else {
            showToast("Task archived.");
        }
        
        // 6. Broadcast changes to remote cloud databases
        if (window.pushFullSync) window.pushFullSync();
    }
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
    
    console.log(`Reordering successfully committed for tab: ${currentTabId}`);

    // 5. Fire off updates to keep health balances and layout configurations unified
    if (typeof updateHealthBar === 'function') updateHealthBar();
    if (window.pushFullSync) window.pushFullSync();
};


function renderStats() {
    const chart = document.getElementById('barChart');
    if (!chart) return;

    const activeTasks = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const purgedTasks = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentTabName = localStorage.getItem(`tabName_${activeTab}`) || activeTab;

    let created, done, left;

    if (tabData.type === 'checkin') {
        // --- Stats for Check-in Tab ---
        // 'Created' is the sum of current clicks + all historical clicks this week
        const historicalClicks = purgedTasks
            .filter(t => getWeekNumber(new Date(t.purgedAt)) === currentWeek)
            .reduce((sum, t) => sum + (t.count || 0), 0);
        
        const currentClicks = activeTasks.reduce((sum, t) => sum + (t.clicks || 0), 0);

        created = historicalClicks + currentClicks; 
        done = historicalClicks;
        left = currentClicks; // In this mode, 'Left' represents pending clicks
    } else {
        // --- Stats for Standard Tabs ---
        created = [...activeTasks, ...purgedTasks].filter(t => 
            getWeekNumber(new Date(t.id)) === currentWeek).length;
        done = purgedTasks.filter(t => 
            getWeekNumber(new Date(t.purgedAt)) === currentWeek).length;
        left = activeTasks.length;
    }

    const maxVal = Math.max(created, done, left, 1);
    const statsData = [
        { label: 'Total', val: created, cls: 'created' },
        { label: 'Purged', val: done, cls: 'completed' },
        { label: 'Current', val: left, cls: 'remaining' }
    ];

    chart.innerHTML = statsData.map(stat => `
        <div class="bar-wrapper">
            <div class="bar ${stat.cls}" id="bar-${stat.label}" style="height: 0%"></div>
            <span class="bar-label"><strong>${stat.val}</strong><br>${stat.label}</span>
        </div>
    `).join('');

    requestAnimationFrame(() => {
        statsData.forEach(stat => {
            const bar = document.getElementById(`bar-${stat.label}`);
            if (bar) bar.style.height = Math.max((stat.val / maxVal) * 100, 2) + '%';
        });
    });
}

let currentStatsInterval = 'wk';

window.setStatsInterval = function(interval) {
    currentStatsInterval = interval;
    renderStats();
};

function isInInterval(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    if (currentStatsInterval === 'wk') return getWeekNumber(d) === getWeekNumber(now);
    if (currentStatsInterval === 'mo') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (currentStatsInterval === 'yr') return d.getFullYear() === now.getFullYear();
    return false;
}

window.checkBoardCompletion = function() {
    // Your calculation code to check if all tasks are completed/clicked...
    console.log("Board status evaluated!");
    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
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
    let startTime = localStorage.getItem(`startTime_${activeTab}`);
    if (anyClicks && !startTime) {
        startTime = new Date().getTime();
        localStorage.setItem(`startTime_${activeTab}`, startTime);
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

function renderDiagnosticsPanel() {
    // 1. Build a self-contained layout housing the expected container IDs
    const fragment = $(`
        <div class="diagnostics-panel-scroller" style="padding: 20px; overflow-y: auto; height: 100%; box-sizing: border-box; color: #ddd;">
            <p style="margin-top: 0; margin-bottom: 20px; font-size: 0.85rem; color: #aaa;">
                🔍 Live LocalStorage Registry State & State Verification Metrics:
            </p>
            
            <div id="display_config" style="margin-bottom: 25px;"></div>
            <div id="display_data"></div>
        </div>
    `);

    // Helper to generate collapsible details elements natively matching your legacy styling
    function createCollapsibleItem(title, dataValue) {
        const itemDets = document.createElement('details');
        itemDets.style.margin = "5px 0";
        itemDets.style.background = "#222";
        itemDets.style.borderRadius = "4px";
        itemDets.style.padding = "5px";
        
        const summary = document.createElement('summary');
        summary.style.cursor = "pointer";
        summary.style.fontWeight = "bold";
        summary.style.fontSize = "12px";
        summary.textContent = title;
        itemDets.appendChild(summary);

        const pre = document.createElement('pre');
        pre.style.background = "#151515";
        pre.style.color = "#4caf50";
        pre.style.padding = "8px";
        pre.style.fontSize = "11px";
        pre.style.margin = "5px 0 0 0";
        pre.style.whiteSpace = "pre-wrap";
        pre.style.wordBreak = "break-all";
        pre.style.maxHeight = "150px";
        pre.style.overflowY = "auto";
        pre.textContent = typeof dataValue === 'string' ? dataValue : JSON.stringify(dataValue, null, 2);

        itemDets.appendChild(pre);
        return itemDets;
    }

    // 2. Execute hydration sequence using a brief timeout to allow insertion validation
    setTimeout(() => {
        const configContainer = document.getElementById('display_config');
        const dataContainer = document.getElementById('display_data');
        
        if (!configContainer || !dataContainer) return;

        // --- SECTION A: SYSTEM CORE CONFIGURATION KEYS ---
        const systemKeys = [
            'LastSync',
            'routine_config', 
            'activeTab', 
            'lastLocalPushTime', 
            'cloudSyncEnabled', 
            'master_tabs', 
            'userId',
            'flowea_tab_data' // Include your unified data dictionary key for transparency
        ];

        configContainer.innerHTML = '<h4 style="margin: 0 0 10px 0; color: #2196f3; font-size: 1rem; border-bottom: 1px solid #333; padding-bottom: 5px;">System Config</h4>';
        
        systemKeys.forEach(key => {
            const row = document.createElement('div'); 
            row.style.marginBottom = "8px";
            
            const value = localStorage.getItem(key) || (window[key] ? JSON.stringify(window[key]) : 'null');
            
            row.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-weight: bold; font-size: 0.85rem; color: #aaa;">${key}:</span>
                    <pre style="
                        background: #222; 
                        color: #eee;
                        padding: 8px; 
                        font-size: 11px; 
                        white-space: pre-wrap;
                        word-break: break-all;
                        max-height: 120px;
                        margin: 0; 
                        overflow-y: auto;
                        border-radius: 4px;
                        border-left: 3px solid #666;
                    ">${value}</pre>
                </div>
            `;
            configContainer.appendChild(row);
        });

        // --- SECTION B: STRUCTURAL TAB POINTERS & CONTENT LOOKUPS ---
        dataContainer.innerHTML = '<h4 style="margin: 20px 0 10px 0; color: #e91e63; font-size: 1rem; border-bottom: 1px solid #333; padding-bottom: 5px;">Tab Data Storage</h4>';
        const masterTabs = JSON.parse(localStorage.getItem('master_tabs') || '[]');
        
        masterTabs.forEach(tab => {
            const isShared = !!tab.remoteOwnerId;
            const shareTag = isShared ? `<span style="color:#ffa500;"> [SHARED from ${tab.remoteOwnerId.slice(0,5)}...]</span>` : '';

            const tabFolder = document.createElement('details');
            tabFolder.style.margin = "10px 0";
            tabFolder.style.background = "#1b1b1b";
            tabFolder.style.border = "1px solid #333";
            tabFolder.style.borderRadius = "4px";
            tabFolder.style.padding = "8px";
            
            tabFolder.innerHTML = `<summary style="cursor:pointer; font-size:0.9rem;"><strong>Tab: ${tab.name || tab.id}</strong> ${shareTag} <span style="font-size:0.75rem; color:#666;">(${tab.id})</span></summary>`;
            
            const tabContent = document.createElement('div');
            tabContent.style.paddingLeft = "15px";
            tabContent.style.marginTop = "8px";

            // 🎯 BRIDGE ALIGNMENT OPTIMIZATION: 
            // Instead of pulling only raw suffixed string entries, we check through your centralized 
            // window.getTabStorageData tool, ensuring accurate reporting across old and new paradigms.
            const activeTasks = window.getTabStorageData ? window.getTabStorageData(tab.id, 'active') : JSON.parse(localStorage.getItem(`${tab.id}List`) || '[]');
            const purgedTasks = window.getTabStorageData ? window.getTabStorageData(tab.id, 'purge') : JSON.parse(localStorage.getItem(`${tab.id}PurgeList`) || '[]');

            tabContent.appendChild(createCollapsibleItem('Active List (Live Objects)', activeTasks));
            tabContent.appendChild(createCollapsibleItem('Purge History (Archived Tasks)', purgedTasks));

            tabFolder.appendChild(tabContent);
            dataContainer.appendChild(tabFolder);
        });
    }, 50);

    return fragment;
}

window.importSharedTab = async function() {
    const code = prompt("Paste the Share Code (ID|TabID):");
    if (!code || !code.includes('|')) return;

    const [ownerId, tabId] = code.split('|');

    // 1. Check if we already have this tab
    if (window.allTabs.some(t => t.id === tabId)) {
        return alert("You already have this tab in your list.");
    }

    // 2. Create the Pointer Tab
    const newTab = {
        id: tabId,
        name: "Syncing...", // Will be updated by the watcher
        icon: "🔗",
        mode: "Work",
        remoteOwnerId: ownerId, // This is the magic key
        order: window.allTabs.length
    };

    window.allTabs.push(newTab);
    localStorage.setItem('master_tabs', JSON.stringify(window.allTabs));
    
    alert("Tab added! The app will now sync this specific tab from the owner.");
    location.reload();
};

window.generateTabShareCode = function() {
    if (!window.userId || !window.editingTabId) {
        alert("Please enable Cloud Sync first.");
        return;
    }
    
    // Format: USER_ID|TAB_ID
    const code = `${window.userId}|${window.editingTabId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
        const display = document.getElementById('share_code_display');
        display.textContent = "Code copied to clipboard!";
        setTimeout(() => { display.textContent = code; }, 2000);
    });
};


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
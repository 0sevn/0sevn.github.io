function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
        const div = document.createElement('div');
        div.textContent = url;
        const safeUrl = div.innerHTML;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
    });
}

let userId = null;

window.displayData = function() {
    renderTaskList();
    renderPurgeList();
    updateHealthBar();
}

// ----------- RENDERING --------------
document.querySelectorAll(".tab").forEach(tab => {
  const tabId = tab.getAttribute("data-tab-id");
  const storedName = localStorage.getItem(`tabName_${tabId}`);
  if (storedName) {
    const label = tab.querySelector(".tab-label");
    if (label) label.textContent = storedName;
  }
});
function renderTaskList() {
    const weekHeader = $("#week_header").empty();
    weekHeader.append('Wk '+getWeekNumber(new Date()));

    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const listElement = $("#todo_list").empty();

    // 2. Determine if the current activeTab is named 'x'
    // tab_script.js defines activeTab as the ID (e.g. "work" or "173931...")
    const currentTabName = localStorage.getItem(`tabName_${activeTab}`) || activeTab;
    
    if (currentTabName === 'x') {
        // --- CHECK-IN MODE ---
        console.log("check/in mode")
        listElement.addClass('checkin-grid');
        
        // Seed defaults if empty
        if (todoList.length === 0) {
            // const defaults = ["Water", "Gym", "Read", "Meditation"];"Stretch flexors 45/97"
            // Choose program, begin, rehab, stretch, gain
            // const defaults = ["Back Low row/Lats Pull 89/97","Zercher 45/97", "Smith Squat 100/100", "Dead Lift 90/120", "Bench Press 50/80", "Shoulder Press 60/97", "Triceps/Biceps 45/97", "Toe raise, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Leg raise/Crunches 45/97" ];
            const defaults = ["Lat Pull 40/97", "Row 45/97", "Chest Press 45/97", "Shoulder Press 45/97", "Leg Extension 45/97", "Leg Curl 45/97", "Hip Add, Ab 45/97", "Chest fly 45/97", "Leg Press 45/97", "Incline back 45/97", "Zercher 45/97", "Leg raise/Crunches 45/97" ];
            const seeded = defaults.map(name => ({
                id: new Date().toISOString() + Math.random(),
                text: name,
                clicks: 0
            }));
            localStorage.setItem(activeTabList, JSON.stringify(seeded));
            return renderTaskList(); // Re-run once with data
        }

        todoList.forEach((item) => {
            // We cap the data-clicks at 3 for the CSS logic
            const colorLevel = Math.min(item.clicks || 0, 3);

            // Regex to find "number/number" patterns
            const goalMatch = item.text.match(/(\d+\/\d+)/);
            const goalText = goalMatch ? goalMatch[0] : "";
            // Clean the name by removing the goal pattern from the main label
            const displayName = item.text.replace(/(\d+\/\d+)/, "").trim();
            
            const tile = $(`
                <li class="checkin-tile" data-id="${item.id}" data-clicks="${colorLevel}">
                    <div class="checkin-main">
                        <div class="checkin-text">${displayName}</div>
                        <div class="checkin-subline">
                            <span class="checkin-goal">${goalText}kg</span>
                            <span class="checkin-count">${item.clicks || 0}</span>
                        </div>
                    </div>
                </li>
            `);
            // Handle Increment Click
            tile.on('click', () => {
                const wasZero = (item.clicks || 0) === 0;
                item.clicks = (item.clicks || 0) + 1;
                localStorage.setItem(activeTabList, JSON.stringify(todoList));
                
                // UI Updates
                tile.find('.checkin-count').text(item.clicks);
                
                // If it went from 0 to 1, we update the health bar immediately
                if (wasZero) {
                    updateHealthBar();
                }
                renderTaskList();
                if (window.pushFullSync) window.pushFullSync();
            });

            listElement.append(tile);
        });

    } else {
        // --- STANDARD MODE ---
        listElement.removeClass('checkin-grid');
        
        if (todoList.length === 0) {
            listElement.append('<p class="empty-msg">No tasks for this week yet.</p>');
        } else {
                // todoList.sort((a, b) => b.id.localeCompare(a.id)); // sort newest first
                todoList.forEach((item) => {
                    // Format id timestamp to just day and month (e.g., "31 May")
                    const displayDate = new Date(item.id).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short'
                    });

                    const newListItem = $(`
                        <li data-id="${item.id}" class="sortable-item" draggable="true">
                            
                        <div class="swipe-container" id="swipe">
                        <button style="background: rgba(48, 151, 48, 0.69); width: 100px; border: none">✅</button>
                            <div class="task-content">
                                <span>
                                    <input type="checkbox" class="task-checkbox" ${item.checked ? 'checked' : ''}>
                                    <span class="task-text">${linkify(item.text)}</span>
                                    <p class="time">${displayDate}</p>
                                </span>
                                <div class="edit_tasks" id="edit_tasks" style="display:${editButtonsVisible ? 'inline-block' : 'none'};">
                                    <!--input type="submit" class="icon edit" value="" title="Edit task"-->
                                    <input type="submit" class="icon delete" value=" " title="Delete task" style="padding-right:0%;">
                                </div>
                            </div>
                            
                        <button style="background: rgb(199, 74, 74); width: 100px; border: none">❌</button>
                        </div>
                            
                        </li>
                    `);
                    listElement.append(newListItem);
                    
                        // const swiper = document.getElementById("swipe");
                        // FIX 2: Attach listener to the specific container of THIS item
                        const swiper = newListItem.find(".swipe-container")[0];
                        // Force the swiper to start in the middle (hiding the buttons)
                        // 99px to hide gap gap on mobile
                        requestAnimationFrame(() => {
                            swiper.scrollLeft = 99; 
                    });

                    swiper.addEventListener("scroll", function(e) {
                        const li = e.target.closest('.sortable-item');
                        if (!li) return; // Exit if we didn't scroll a task

                        const taskId = li.getAttribute('data-id');
                        const scroll_div = e.currentTarget;
                        const scroll_center = scroll_div.scrollWidth / 2;
                        const viewport_center = scroll_div.clientWidth / 2;
                        const current = scroll_div.scrollLeft + viewport_center;
                        const dx = current - scroll_center;
                        console.log(dx);

                        // Threshold logic
                        if (dx > 99) {                
                            scroll_div.style.backgroundColor = "red";
                            // console.log("red");
                                setTimeout(() => {
                                    li.style.transform = "translateX(-90%)";
                                    li.style.opacity = "0";
                                    setTimeout(() => {
                                        // Your existing delete logic here
                                        deleteTaskById(taskId);
                                        // deleteTask();
                                        // saveData();
                                    }, 100); // 1 second delay
                                }, 600); // 1 second delay
                                

                        } else if (dx < -99) {
                            scroll_div.style.backgroundColor = "green";
                            // console.log("green");
                            // purgeList();
                            // togglePurgeButton();
                            setTimeout(() => {
                                const cb = li.querySelector('input[type="checkbox"]');
                                if (cb) cb.checked = true; // Mark as done so purge picks it up
                                li.style.transform = "translateX(90%)";
                                li.style.opacity = "10";
                                // Call your existing purge function
                                setTimeout(() => {
                                    // Your existing delete logic here
                                    // purgeList();
                                    // togglePurgeButton(); 
                                    scroll_div.scrollTo({ left: 99, behavior: 'instant' });
                                    purgeSpecificTask(taskId);
                                    // saveData();
                                }, 100); // 1 second delay
                            }, 300); // Shorter delay for purge to feel "snappy"

                        } else {
                            scroll_div.style.backgroundColor = ""; // reset when in middle
                            // console.log("middle");
                        }
                    });
                });

    
        }
    }
    togglePurgeButton();
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
                ${item.text} <p class="time">${item.timestamp}</p>
            </span></li>
        `);
        $(`.week-${purgedWeek}`).after(newPurgeItem);
    });
}

// ----------- TASK FUNCTIONS -------------
function togglePurgeButton() {
    const currentTabName = localStorage.getItem(`tabName_${activeTab}`) || activeTab;

    if (currentTabName === 'x') {
        console.log("togglePurgeButton in x Tab")
        // For 'x' tab: Enable if any tile has clicks > 0
        const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
        const hasClicks = todoList.some(task => (task.clicks || 0) > 0);
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

    const isoTime = new Date().toISOString(); // simple unique id based on createdAT timestamp

    //will be createdAt until edit/change registers updatedAt
    const timestamp = new Date(isoTime).toLocaleString('en-GB', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    

    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    todoList.push({ id: isoTime, text, timestamp, checked: false });

    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    localStorage.setItem("LastSync", isoTime); //set last sync as last created task time

    $('#enter_task').val('');
    updateHealthBar();
    renderTaskList();

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
    let todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    let purgeHistory = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');

    const currentTabName = localStorage.getItem(`tabName_${activeTab}`) || activeTab;
    const now = new Date().toISOString();
    let purgedAnything = false;

if (currentTabName === 'x') {
    // FIX: Ensure purgeList is actually an array
        let rawPurgeData = localStorage.getItem(activeTabPurgeList);
        let purgeList = [];
        
        try {
            const parsed = JSON.parse(rawPurgeData);
            if (Array.isArray(parsed)) {
                purgeList = parsed;
            }
        } catch (e) {
            console.error("Purge list corrupted, resetting to empty array");
        }
        // --- Special Purge Logic for 'x' Tab ---
        todoList.forEach(task => {
            if (task.clicks > 0) {
                // Create a historical record
                const historyEntry = {
                    id: new Date().getTime() + Math.random(),
                    text: `${task.text} (${task.clicks} sets)`,
                    purgedAt: now,
                    purgedWeek: getWeekNumber(new Date(now)),
                    originalTask: task.text,
                    count: task.clicks
                };
                
                purgeList.unshift(historyEntry);
                task.clicks = 0; // Reset the counter
                purgedAnything = true;
            }
        });

        if (purgedAnything) {
            localStorage.setItem(activeTabList, JSON.stringify(todoList));
            localStorage.setItem(activeTabPurgeList, JSON.stringify(purgeList));
            
            showToast("Progress archived & counters reset!");
            renderTaskList();
            renderPurgeList();
            if (window.pushFullSync) window.pushFullSync();
        } else {
            showToast("Nothing to purge (all counts are 0)");
        }
    } else {


    // --- YOUR ORIGINAL PURGE LOGIC HERE ---
    // (The logic that filters for item.completed === true)
    const idsToPurge = [];
    $('#todo_list input[type="checkbox"]:checked').each(function () {
        idsToPurge.push($(this).closest('li').data('id'));
    });

    const tasksToPurge = todoList.filter(task => idsToPurge.includes(task.id));
    const remainingTasks = todoList.filter(task => !idsToPurge.includes(task.id));

    // Execute Purge
    localStorage.setItem(activeTabList, JSON.stringify(remainingTasks));
    
    const purgedWithMetadata = tasksToPurge.map(task => ({
        ...task,
        purgedAt: new Date().toISOString(),
        purgedWeek: getWeekNumber(new Date())
    }));
    
    localStorage.setItem(activeTabPurgeList, JSON.stringify([...purgedWithMetadata, ...purgeHistory]));

    renderTaskList();
    renderPurgeList();
    updateHealthBar();

    }



    // Define the Undo action
    const undoPurge = () => {
        // Refresh data to ensure we have latest state
        let currentTodo = JSON.parse(localStorage.getItem(activeTabList) || '[]');
        let currentPurge = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');

        // Move tasks back to active list and uncheck them
        const restoredTasks = tasksToPurge.map(t => ({ ...t, checked: false }));
        localStorage.setItem(activeTabList, JSON.stringify([...currentTodo, ...restoredTasks]));

        // Remove them from purge list
        const filteredPurge = currentPurge.filter(p => !idsToPurge.includes(p.id));
        localStorage.setItem(activeTabPurgeList, JSON.stringify(filteredPurge));

        displayData();
        if (window.pushFullSync) window.pushFullSync();
    };

    showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)], undoPurge);
    if (window.pushFullSync) window.pushFullSync();
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

    const count = todoList.length;
    
    let totalItems = todoList.length;
    let activeItems;
    let calculatedWidth;

    if (currentTabName === 'x') {
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
        // 5 tasks ≈ 60% width, 10 tasks ≈ 80% width, 20 tasks ≈ 90% width
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
    toast.style.bottom = "50px";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.bottom = "30px";
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
// New Global State
let isCloudSyncActive = localStorage.getItem('cloudSyncEnabled') === 'true';

// 1. Dashboard Toggle (Key 'D')
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'd' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const dash = document.getElementById("syncDashboard");
        dash.classList.toggle("hidden");
        if (!dash.classList.contains("hidden")) updateDashboardUI();
    }
});
// 1. Dashboard Toggle (Key 'D')
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'a' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const dash = document.getElementById("leftDashboard");
        dash.classList.toggle("hidden");
        if (!dash.classList.contains("hidden")) updateDashboardUI();
    }
});
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const dash = document.getElementById("historyCard");
        dash.classList.toggle("hidden");
        if (!dash.classList.contains("hidden")) updateDashboardUI();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key.toLowerCase() === 's') {
        const statsDash = document.getElementById("statsDashboard");
        statsDash.classList.toggle("hidden");
        if (!statsDash.classList.contains("hidden")) renderStats();
    }
});
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

// Example toggle logic for the 'F' key
window.addEventListener('keydown', (e) => {
if (e.key.toLowerCase() === 'w' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    const dash = document.getElementById('favBar');
    dash.classList.toggle('hidden');
    if (dash.classList.contains('hidden')) {
        window.updateDashboardUI();
    }
}
});

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
    // $('#todo_list').on('click', '.edit', function () {
    //     const taskText = $(this).siblings('span').find('.task-text');
    //     taskText.attr('contenteditable', 'true').focus();

    //     taskText.on('keydown', function (e) {
    //         if (e.key === 'Enter') {
    //             e.preventDefault();
    //             taskText.attr('contenteditable', 'false');
    //             const index = $(this).closest('li').index();
    //             updateTaskInStorage(index, taskText.text());
    //         }
    //     });

    //     taskText.on('blur', function () {
    //         taskText.attr('contenteditable', 'false');
    //         const index = $(this).closest('li').index();
    //         updateTaskInStorage(index, taskText.text());
    //     });
    // });

    // $("#sort_list").sortable({
    //     axis: "y",
    //     cursor: "move",
    //     opacity: 0.5,
    //     update: function () {
    //         const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    //         const newOrder = $('#todo_list li').map(function () {
    //             return $(this).attr('id');
    //         }).get();

    //         newOrder.forEach((id, i) => {
    //             const idx = parseInt(id.split('-')[1], 10);
    //             if (todoList[idx]) todoList[idx].id = i + 1;
    //         });

    //         localStorage.setItem(activeTabList, JSON.stringify(todoList));
    //     }
    // });

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
// function showTaskEdit() {
//     const showTask = document.getElementById("edit_tasks").style.display;
//     document.querySelectorAll(".edit_tasks").forEach(taskDiv => {
//     if (showTask === 'none') {
//       document.getElementById("edit_tasks").style.display = "inline-block";
//       console.log("showTask")
//     } else if (showTask === 'inline-block') {
//       document.getElementById("edit_tasks").style.display = "none";
//     }
//     });
// }

// REPLACE WITH HTML POP UP & OVERS
function showHelp() {
    document.getElementById("helpCard").style.display = "block";
    // console.log('activetablist', activeTabList);
    // displayData();
}

function closeHelp() {
    document.getElementById("helpCard").style.display = "none";
    // document.getElementById("favBar").style.display = "none";
}

function showHistory() {
    const visibleHist = document.getElementById("historyCard").style.display;
    // displayData();
    const dash = document.getElementById("historyCard");
        dash.classList.toggle("hidden");
        if (!dash.classList.contains("hidden")) updateDashboardUI();
} 

function showSync() {
    const visibleSync = document.getElementById("syncControls").style.display;
    // displayData();
    if (visibleSync === 'none') {
      document.getElementById("syncControls").style.display = "block";
    } else if (visibleSync === 'block') {
      document.getElementById("syncControls").style.display = "none";
    }
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
    console.log("started"); 
    const purgeHistory = JSON.stringify(localStorage.getItem(activeTabPurgeList) , null, 2); //indentation in json format, human readable
    var filetime = new Date().toLocaleString();

    const blob = new Blob([purgeHistory], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    console.log(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab+'_working_history_' + filetime + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("finished");    
}

//import to local storage**/
document.getElementById('jsonFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0]; // Get the selected file

    if (file) {
        const reader = new FileReader();

        // Define what happens when the file is loaded
        reader.onload = function(e) {

            try {
                // Parse the file content as JSON
                const jsonContent = JSON.parse(e.target.result);
                // Store JSON content in local storage
                localStorage.setItem(activeTabPurgeList, jsonContent);

                // Clear the current list before appending new items
                // $('#todo_list').empty();
                console.log('JSON data successfully stored in local storage:', jsonContent);
                alert('JSON data has been stored in local storage.');
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Invalid JSON file. Please try again.');
            }
        };

        // Read the file as a text (which should be JSON)
        reader.readAsText(file);
    } else {
        console.log('No file selected.');
    }
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

window.updateDashboardUI = function() {
    const display = document.getElementById('userUidDisplay');
    if (window.userId && display) {
        display.textContent = window.userId;
        if (window.generateSyncQR) window.generateSyncQR(window.userId);
    }

    const syncDetails = document.getElementById('syncDetails');
    const isEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';
    
    if (isEnabled) {
        syncDetails.classList.remove('hidden');
        // NEW: Render the tab list whenever the dashboard is updated
        if (window.renderTabSyncSettings) window.renderTabSyncSettings();
    } else {
        syncDetails.classList.add('hidden');
    }
};

window.toggleTabLock = function(tabId) {
    const key = `tabLocked_${tabId}`;
    const isLocked = localStorage.getItem(key) === 'true';
    
    // Toggle the value
    localStorage.setItem(key, !isLocked);
    
    // Refresh the dashboard UI and trigger a sync to update the cloud
    renderTabSyncSettings();
    if (window.pushFullSync) window.pushFullSync(true); 
};

window.renderTabSyncSettings = function() {
    const tabList = JSON.parse(localStorage.getItem("tabList") || '["work", "personal"]');
    const container = document.getElementById('tabSyncList');
    if (!container) return;
    
    container.innerHTML = tabList.map(id => {
        const name = localStorage.getItem(`tabName_${id}`) || id;
        const isLocked = localStorage.getItem(`tabLocked_${id}`) === 'true';
        return `
            <div class="tab-sync-item">
                <span>${name}</span>
                <button onclick="toggleTabLock('${id}')" class="${isLocked ? 'locked' : 'synced'}">
                    ${isLocked ? '🏠 Local Only' : '☁️ Cloud Sync'}
                </button>
            </div>
        `;
    }).join('');
};

window.refreshUIFromSync = function() {
    console.log("Real-time update received!");
    
    // 1. Refresh global pointers
    activeTab = localStorage.getItem("activeTab") || 'work';
    activeTabList = activeTab + "List";
    activeTabPurgeList = activeTab + "PurgeList";

    // 2. Redraw UI components
    // createTabs(); 
    initTabs()
    displayData(); 
    updateHealthBar();
    
    // 3. Visual confirmation
    const dot = document.getElementById('syncStatusDot');
    if (dot) {
        dot.style.transform = 'scale(1.5)';
        setTimeout(() => dot.style.transform = 'scale(1)', 400);
    }
};

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

// Targeted deletion
function deleteTaskById(id) {
    let todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    todoList = todoList.filter(task => task.id !== id);
    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    updateHealthBar();
    renderTaskList();

    // const undoDelete = () => {
    //     let currentTodo = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    //     currentTodo.push(deletedTask); // Put it back
    //     localStorage.setItem(activeTabList, JSON.stringify(currentTodo));
    //     renderTaskList();
    //     updateHealthBar();
    //     if (window.pushFullSync) window.pushFullSync();
    // };


    // showToast("Task deleted", undoDelete);
    showToast("Task deleted");
    if (window.pushFullSync) window.pushFullSync();
}

// Targeted purging
function purgeSpecificTask(id) {
    let todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    let purgeList = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');

    const taskIndex = todoList.findIndex(t => t.id === id);
    if (taskIndex > -1) {
        const task = todoList.splice(taskIndex, 1)[0];
        task.purgedAt = new Date().toISOString();
        task.purgedWeek = getWeekNumber(new Date(task.purgedAt));
        purgeList.unshift(task);

        localStorage.setItem(activeTabList, JSON.stringify(todoList));
        localStorage.setItem(activeTabPurgeList, JSON.stringify(purgeList));
        
        updateHealthBar();
        renderTaskList();
        renderPurgeList();
        showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)]);
        if (window.pushFullSync) window.pushFullSync();
    }
}

// Add to script.js
window.saveNewOrder = function() {
    // 1. Get the current list from storage
    const currentList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    
    // 2. Map through the actual DOM elements to see the new order
    const newOrderIds = $('#todo_list li').map(function() {
        return $(this).data('id'); // This matches the data-id="${item.id}" we set in render
    }).get();

    // 3. Rebuild the list based on the new order of IDs
    const reorderedList = newOrderIds.map(id => {
        return currentList.find(task => task.id === id);
    }).filter(task => task !== undefined); // Safety check

    // 4. Save back to localStorage and Sync to Cloud
    localStorage.setItem(activeTabList, JSON.stringify(reorderedList));
    
    // 5. Optional: Provide visual feedback or sync
    if (window.pushFullSync) window.pushFullSync();
    console.log("New task order saved!");
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

    if (currentTabName === 'x') {
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
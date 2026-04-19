// ```javascript
// Firestore settings
// Task and purge list rendering
// 
// functions refactored to react components??...
//
import { 
    db, // If you need direct db access for advanced queries
    auth, // If you need direct auth access
    getSyncUid,
    addTaskToFirestore, // For enterTask
    updateTaskInFirestore, // For checkTask, editTask
    deleteTaskFromFirestore, // For deleteTask
    // downloadAndMergeTasksFromFirestore // Will be used for initial full sync
} from './sync-firestore.js';
// We need to import displayData to ensure the UI updates after a real-time sync.
import {activeTab, activeTabList, activeTabPurgeList } from './tab_script.js';

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
        const div = document.createElement('div');
        div.textContent = url;
        const safeUrl = div.innerHTML;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
    });
}

export function displayData() {
    renderTaskList();
    updateHealthBar();

    const header = document.getElementById("historyHeader");
        if (header) {
        header.textContent = activeTab === "checkins"
            ? "Check-in Summary"
            : "Purged Task History";
    }
    if (activeTab === "checkins") {
        header.textContent = "Check-in Summary";
        renderCheckinSummary();
    } else {
        header.textContent = "Purged Task History";
        renderPurgeList();
    }
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
    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const listElement = $("#todo_list").empty();

    // todoList.sort((a, b) => b.id.localeCompare(a.id)); // sort newest first

    todoList.forEach((item) => {
        // Format id timestamp to just day and month (e.g., "31 May")
        const displayDate = new Date(item.id).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });

        const newListItem = $(`
            <li data-id="${item.id}">
                <span>
                    <input type="checkbox" class="task-checkbox" ${item.checked ? 'checked' : ''}>
                    <span class="task-text">${linkify(item.text)}</span>
                    <p class="time">${displayDate}</p>
                </span>
                <div class="edit_tasks" id="edit_tasks" style="display:${editButtonsVisible ? 'inline-block' : 'none'};margin:0px;padding:0px;">
                <!--input type="submit" class="icon edit" value="" title="Edit task"-->
                <input type="submit" class="icon delete" value=" " title="Delete task">
                </div>
            </li>
        `);
        listElement.append(newListItem);
    });

    togglePurgeButton();
}

// function renderPurgeList() {

function renderPurgeList() {
    renderGenericPurgeList({
        storageKey: activeTabPurgeList,
        containerSelector: "#purge_list",
        itemFormatter: defaultPurgeFormatter
    });
}
function renderCheckinSummary() {
    renderGenericPurgeList({
        storageKey: "checkinPurgeList",
        containerSelector: "#purge_list", // same container if toggling views
        itemFormatter: checkinSummaryFormatter
    });
}
function renderGenericPurgeList({
    storageKey,
    containerSelector,
    itemFormatter
}) {
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const container = $(containerSelector).empty();

    const renderedWeeks = new Set();
    const weeklyTotals = {};

    list.forEach(item => {
        const rawDate = item.purgedAt || item.endedAt;
        if (!rawDate) return; // skip if no valid date
        const week = item.purgedWeek || item.week || getWeekNumber(new Date(rawDate));
        const year = new Date(rawDate).getFullYear();
        const weekKey = `week-${week}-${year}`;

        // Insert header if not yet added
        if (!renderedWeeks.has(weekKey)) {
            const header = $(`<li class="week-header ${weekKey}">Week ${week} - ${year}</li>`);
            const sublist = $(`<ul class="week-items" data-week="${weekKey}"></ul>`);
            container.append(header).append(sublist);
            renderedWeeks.add(weekKey);
            weeklyTotals[weekKey] = 0;
        }

        if ('duration' in item) {
            weeklyTotals[weekKey] += item.duration;
        }

        const itemHtml = itemFormatter(item);
        container.find(`ul[data-week="${weekKey}"]`).append(itemHtml);

    });

    // Inject total time summary after all items per week (only for checkins)
    if (storageKey === "checkinPurgeList") {
        Object.entries(weeklyTotals).forEach(([weekKey, totalMs]) => {
            const minutes = Math.floor(totalMs / 60000);
            const seconds = Math.floor((totalMs % 60000) / 1000);
            const timeText = `🕒 Total: ${minutes}:${seconds.toString().padStart(2, '0')}`;

            $(`.${weekKey}`).after(`
                <li class="week-total" style="color:gray; font-style:italic; font-size:13px;">
                    ${timeText}
                </li>
            `);
        });
    }
}




function checkinSummaryFormatter(item) {
    const minutes = Math.floor(item.duration / 60000);
    const seconds = Math.floor((item.duration % 60000) / 1000);
    const displayTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return $(`
        <li>
            <span style="font-size:13px; color:light-grey;">
                ${item.text} — ${displayTime}
                <p class="time">${new Date(item.endedAt).toLocaleString()}</p>
            </span>
        </li>
    `);
}
function defaultPurgeFormatter(item) {
    return $(`
        <li><span style="font-size:13px; color:light-grey;">
            ${item.text} <p class="time">${item.timestamp}</p>
        </span></li>
    `);
}

// ----------- TASK FUNCTIONS -------------
// enable/disable purge button depending on if there are checked check boxes or not
function togglePurgeButton() {
    const anyChecked = $('#todo_list input[type="checkbox"]:checked').length > 0;
    $('#purge').prop('disabled', !anyChecked);
}

// Ensure db, getSyncUid, activeTab, and localStorage are accessible in this scope.
// You might need to make enterTask async if it's called from an async context,
// or use .then/.catch as shown previously for deleteDoc if it's called from a sync context.
async function enterTask() { // Make function async to use await
    const text = $('#enter_task').val().trim();
    if (!text) return;

    const isoTime = new Date().toISOString(); // Using ISO string as unique ID and timestamp

//###checkins add function conditional
if (activeTab === "checkins") {
        const checkinList = JSON.parse(localStorage.getItem(activeTabList) || '[]');

        const newCheckin = {
            id: isoTime,
            text: text,
            events: [], // For start/end tracking
            cycles: 0
        };

        checkinList.push(newCheckin);
        localStorage.setItem(activeTabList, JSON.stringify(checkinList));

        $('#enter_task').val('');
        renderCheckins();
        return;
    }

    const task = {
        id: isoTime,
        text: text,
        checked: false,
        // The 'timestamp' property is effectively covered by 'id' being an ISO string.
        // If you need a separate user-friendly display timestamp, keep your existing 'timestamp' field.
        // For sync logic, 'id' (isoTime) will serve as the primary timestamp for last-write-wins.
    };

    // Update local storage first (optimistic UI update)
    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    todoList.push(task);
    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    localStorage.setItem("LastSync", isoTime); // Update LastSync with this task's creation time

    $('#enter_task').val('');
    updateHealthBar();
    renderTaskList();

    // --- Firestore Integration: Add the new task to its subcollection ---
    const syncUid = getSyncUid();
    const syncConfirmed = localStorage.getItem("syncConfirmed") === "true";

    if (syncUid && syncConfirmed) {
        try {
            // Determine the current tab's base name (e.g., 'work', 'personal')
            // This assumes activeTabList might be "workList", "personalList", etc.
            // If activeTab already holds the base name, just use activeTab.
            const tabName = activeTabList.replace('List', '').replace('PurgeList', ''); // Adjust if activeTab already holds this

            // Construct the reference to the specific task document in Firestore
            // The document ID will be the task's unique 'id' (isoTime)
            const taskDocRef = doc(db, "users", syncUid, "tabsData", tabName, "tasks", task.id);
            
            // Set the document in Firestore. If it already exists, it will be overwritten (safe for new task creation).
            await setDoc(taskDocRef, task);
            console.log(`Task ${task.id} added to Firestore in ${tabName} tasks collection.`);
        } catch (error) {
            console.error("Error adding new task to Firestore:", error);
            // Optionally, inform the user if the Firestore sync failed
        }
    }
    // ------------------------------------------------------------------
}
//### helper function, should it be in display data?
function renderCheckins() {
    const checkinList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const listElement = $("#todo_list").empty();
    const now = new Date();

    checkinList.forEach((item, index) => {
        const lastEvent = item.events[item.events.length - 1];
        const isActive = lastEvent && lastEvent.type === 'start';

        let sessionDuration = 0; // Current active session duration
        let cumulativeDuration = 0; // All completed sessions

        for (let i = 0; i < item.events.length; i += 2) {
            const startEvent = item.events[i];
            const endEvent = item.events[i + 1];

            if (startEvent && startEvent.type === 'start') {
                const startTime = new Date(startEvent.timestamp);
                if (endEvent && endEvent.type === 'end') {
                    const endTime = new Date(endEvent.timestamp);
                    cumulativeDuration += endTime - startTime;
                } else if (isActive) {
                    sessionDuration = now - startTime;
                }
            }
        }

        const totalDurationMs = cumulativeDuration + sessionDuration;
        const totalMinutes = Math.floor(totalDurationMs / 60000);
        const totalSeconds = Math.floor((totalDurationMs % 60000) / 1000);

        const icon = isActive ? '⏸️' : '▶️';
        const durationText = `${icon} ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;

        const button = $(`
            <button class="checkin-button ${isActive ? 'active-checkin' : ''}" data-index="${index}">
                ${item.text} (${item.cycles} cycles) — ${durationText}
            </button>
        `);
        listElement.append($('<li>').append(button));
    });
}
setInterval(() => {
    if (activeTab === "checkins") {
        renderCheckins();
    }
}, 1000); // refresh every 1 second

// Simplified checkTask, assuming it gets the listItem directly or is part of a handler
function checkTask(listItem) { // Pass the jQuery list item directly
    const taskId = listItem.data('id');
    const isChecked = listItem.find('.task-checkbox').prop('checked');

    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const taskIndex = todoList.findIndex(task => task.id === taskId);

    if (taskIndex > -1) {
        todoList[taskIndex].checked = isChecked;
        todoList[taskIndex].timestamp = new Date().toISOString(); // Update timestamp on modification
        localStorage.setItem(activeTabList, JSON.stringify(todoList));
        updateHealthBar(); // Assuming this is needed
        renderTaskList(); // Re-render to reflect changes
        
        // --- Firestore Integration ---
        const tabName = activeTab; // Get current tab name (e.g., 'work', 'personal')
        updateTaskInFirestore(tabName, taskId, { checked: isChecked });
        // -----------------------------
    }
}

//when checkbox or task edit happens 
function updateTaskInStorage(index, newText, checked = false) {
    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    todoList[index].text = newText;
    if (typeof checked === 'boolean') todoList[index].checked = checked;
    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    localStorage.setItem("LastSync", new Date().toISOString());
}

function deleteTask() {
    const listItem = $(this).closest('li');
    const index = $('#todo_list li').index(listItem);
    // const idStr = listItem.attr('id').replace('item-', '');
    // const id = parseInt(idStr, 10);

    const todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    todoList.splice(index, 1);
    // todoList = todoList.filter(task => task.id !== id);
    localStorage.setItem(activeTabList, JSON.stringify(todoList));
    updateHealthBar();
    renderTaskList();
}

// Function that moves checked items to history
// function purgeList() {
//     let todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
//     let purgeList = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');

//     // Collect task IDs to purge
//     const idsToPurge = [];

//     $('#todo_list input[type="checkbox"]:checked').each(function () {
//         const li = $(this).closest('li');
//         const id = li.data('id'); // now uses ISO string
//         idsToPurge.push(id);
//     });

//     // Filter out tasks to keep
//     const remainingTasks = todoList.filter(task => !idsToPurge.includes(task.id));
//     // Extract tasks to purge
//     const purgedTasks = todoList.filter(task => idsToPurge.includes(task.id));

//     // Sort in reverse to prevent shifting issues when splicing
//     // indicesToPurge.sort((a, b) => b - a);

//     purgedTasks.forEach(task => {
//         task.purgedAt = new Date().toISOString();
//         task.purgedWeek = getWeekNumber(new Date(task.purgedAt));
//         purgeList.unshift(task);
//     });

//     localStorage.setItem(activeTabList, JSON.stringify(remainingTasks));
//     localStorage.setItem(activeTabPurgeList, JSON.stringify(purgeList));

//     updateHealthBar();
//     renderTaskList();
//     renderPurgeList();

//     showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)]);
// }

// This function would be called when the purge button is clicked
async function purgeList() { // Make function async
    const listKey = activeTabList;
    const purgeKey = activeTabPurgeList;
    
    let activeTasks = JSON.parse(localStorage.getItem(listKey) || "[]");
    let purgedTasks = JSON.parse(localStorage.getItem(purgeKey) || "[]");

    const tasksToMove = activeTasks.filter(task => task.checked);
    activeTasks = activeTasks.filter(task => !task.checked);

    // Update localStorage first (optimistic UI update)
    localStorage.setItem(listKey, JSON.stringify(activeTasks));
    localStorage.setItem(purgeKey, JSON.stringify(purgedTasks.concat(tasksToMove)));

    displayData(); // Refresh main list and health bar (assuming displayData does this)
    // renderPurgeList(); // Make sure purge list is updated

    // --- Firestore Integration ---
    const syncUid = getSyncUid();
    const syncConfirmed = localStorage.getItem("syncConfirmed") === "true";
    const tabName = activeTab; // Get current tab name

    if (syncUid && syncConfirmed) {
        try {
            for (const task of tasksToMove) {
                // 1. Delete from 'tasks' collection
                await deleteTaskFromFirestore(tabName, task.id, false); // false = not purge list

                // 2. Add/Set in 'purgedTasks' collection
                // Ensure the task has an updated timestamp for the purge list
                const purgedTaskData = { ...task, timestamp: new Date().toISOString() };
                const purgedCollectionRef = collection(db, "users", syncUid, "tabsData", tabName, "purgedTasks");
                await setDoc(doc(purgedCollectionRef, purgedTaskData.id), purgedTaskData);
                
                console.log(`Task ${task.id} moved to Firestore purged tasks (${tabName}).`);
            }
            showToast("Purged " + tasksToMove.length + " tasks and synced.");
        } catch (error) {
            console.error("Error during purge sync to Firestore:", error);
            showToast("Purge completed locally, but sync failed.");
        }
    } else {
        showToast("Purged " + tasksToMove.length + " tasks.");
        showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)]);
    }
    // -----------------------------
}
// ----------- UTILITIES --------------

function getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / 86400000);
    return Math.ceil((days + start.getDay() + 1) / 7);
}

function updateHealthBar() {
    const tasks = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    const count = tasks.filter(t => !t.checked).length;
    const newSize = 10 + count * 36;

    document.querySelector('.healthbar').style.setProperty('--healthbar-size', newSize + 'px');
    document.querySelector('.healthbar').style.setProperty('--health-color', count > 4 ? '#e25a5aaf' : '#6ae25aaf');

    localStorage.setItem("LastSync", new Date().toISOString());
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.style.visibility = "visible";
    toast.style.opacity = "1";
    toast.style.bottom = "50px";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.bottom = "30px";
        setTimeout(() => (toast.style.visibility = "hidden"), 500);
    }, 3000);
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
    $('#showTaskEdit').on('click', showTaskEdit);
    $('#toggleTheme').on('click', toggleTheme);
    $('#showHistory').on('click', showHistory);

    $('#showSync').on('click', showSync);
    $('#showHelp').on('click', showHelp); //show/hide help
    $('#closeHelp').on('click', closeHelp); //show/hide help

    $(document).on('click', '.checkin-button', function () {
        const index = $(this).data('index');
        const checkinList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
        const now = new Date().toISOString();
        const entry = checkinList[index];

        const lastEvent = entry.events[entry.events.length - 1];
        if (!lastEvent || lastEvent.type === 'end') {
            entry.events.push({ type: 'start', timestamp: now });
        } else {
            entry.events.push({ type: 'end', timestamp: now });
            entry.cycles = Math.floor(entry.events.length / 2);

             // NEW: Calculate duration and add to checkinPurgeList
            const startTime = new Date(lastEvent.timestamp);
            const endTime = new Date(now);
            const duration = endTime - startTime;

            const purgeList = JSON.parse(localStorage.getItem("checkinPurgeList") || '[]');
            purgeList.unshift({
                text: entry.text,
                duration,
                endedAt: now,
                week: getWeekNumber(endTime)
            });
            localStorage.setItem("checkinPurgeList", JSON.stringify(purgeList));
        }

        localStorage.setItem(activeTabList, JSON.stringify(checkinList));
        renderCheckins(); // Refresh only this tab type
    });

    // $('#todo_list').on('change', '.task-checkbox', function () {
    //     const index = $(this).closest('li').index();
    //     updateTaskInStorage(index, $(this).siblings('.task-text').text(), this.checked);
    //     updateHealthBar();
    //     togglePurgeButton();
    //     // $(this).closest('li').toggleClass('bold', !this.checked);
    // });
    // Ensure your event listener calls this correctly, e.g.:
    $(document).on('change', '.task-checkbox', function() {
        checkTask($(this).closest('li')); // Pass the li element
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
});


// ----------- OTHER -------------
let editButtonsVisible = localStorage.getItem('editButtonsVisible') === 'true';
function showTaskEdit() {
    editButtonsVisible = !editButtonsVisible;
    localStorage.setItem('editButtonsVisible', editButtonsVisible); // persist state

    document.querySelectorAll('.edit_tasks').forEach(taskDiv => {
        taskDiv.style.display = editButtonsVisible ? 'inline-block' : 'none';
    });
}

function showHelp() {
    document.getElementById("helpCard").style.display = "block";
}

function closeHelp() {
    document.getElementById("helpCard").style.display = "none";
}

function showHistory() {
    const visibleHist = document.getElementById("historyCard").style.display;
    // displayData();
    if (visibleHist === 'none') {
      document.getElementById("historyCard").style.display = "block";
    } else if (visibleHist === 'block') {
      document.getElementById("historyCard").style.display = "none";
    }
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
function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => {
        const div = document.createElement('div');
        div.textContent = url;
        const safeUrl = div.innerHTML;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
    });
}

function displayData() {
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
    const anyChecked = $('#todo_list input[type="checkbox"]:checked').length > 0;
    $('#purge').prop('disabled', !anyChecked);
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

function purgeList() {
    let todoList = JSON.parse(localStorage.getItem(activeTabList) || '[]');
    let purgeList = JSON.parse(localStorage.getItem(activeTabPurgeList) || '[]');

    // Collect task IDs to purge
    const idsToPurge = [];

    $('#todo_list input[type="checkbox"]:checked').each(function () {
        const li = $(this).closest('li');
        const id = li.data('id'); // now uses ISO string
        idsToPurge.push(id);
    });

    // Filter out tasks to keep
    const remainingTasks = todoList.filter(task => !idsToPurge.includes(task.id));
    // Extract tasks to purge
    const purgedTasks = todoList.filter(task => idsToPurge.includes(task.id));

    // Sort in reverse to prevent shifting issues when splicing
    // indicesToPurge.sort((a, b) => b - a);

    purgedTasks.forEach(task => {
        task.purgedAt = new Date().toISOString();
        task.purgedWeek = getWeekNumber(new Date(task.purgedAt));
        purgeList.unshift(task);
    });

    localStorage.setItem(activeTabList, JSON.stringify(remainingTasks));
    localStorage.setItem(activeTabPurgeList, JSON.stringify(purgeList));

    updateHealthBar();
    renderTaskList();
    renderPurgeList();

    showToast(purgeMessages[Math.floor(Math.random() * purgeMessages.length)]);
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

    $('#todo_list').on('change', '.task-checkbox', function () {
        const index = $(this).closest('li').index();
        updateTaskInStorage(index, $(this).siblings('.task-text').text(), this.checked);
        updateHealthBar();
        togglePurgeButton();
        $(this).closest('li').toggleClass('bold', !this.checked);
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

function showHelp() {
    document.getElementById("helpCard").style.display = "block";
    // console.log('activetablist', activeTabList);
    // displayData();
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
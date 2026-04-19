// --- Constants ---
const CORE_DEFAULT_TABS = ["work", "personal"]; // Define your core, non-deletable tabs
let tabCounter = parseInt(localStorage.getItem("tabCounter") || 0); // Start custom tab counter at 0 or higher if you have a naming convention. If defaultTabs.length is used, it will be 0 here anyway.


// ----------- GLOBAL TAB STATE MANAGEMENT --------------
// These variables will be updated by switchTab()
let activeTab = 'work';
let activeTabList = activeTab + 'List';
let activeTabPurgeList = activeTab + 'PurgeList';

// displayData

function switchTab(tabId) {
  localStorage.setItem("activeTab", tabId);
  
   // Update global state variables
    activeTab = tabId;
    activeTabList = `${tabId}List`;
    activeTabPurgeList = `${tabId}PurgeList`;

    // Remove 'active' class from all tabs
    document.querySelectorAll(".tab").forEach(tabEl => {
      tabEl.classList.remove("active");
    });

    // Add 'active' class to the selected tab
    const selectedTab = document.querySelector(`[data-tab-id="${tabId}"]`);
     if (selectedTab) { // Ensure the tab element exists before trying to add class
        selectedTab.classList.add("active");
        // Inside your tab click/activation function:
selectedTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Update the placeholder for the task input
    const tabName = localStorage.getItem(`tabName_${tabId}`) || tabId;
    const enterTaskInput = document.getElementById("enter_task");
    if (enterTaskInput) { // Check if element exists
        enterTaskInput.placeholder = `Enter task for ${tabName}`;
    }

    // Handle delete button visibility (assuming a single global delete button for now)
    const deleteButton = document.getElementById("delete_tab");
    if (deleteButton) {
        if (CORE_DEFAULT_TABS.includes(tabId)) {
            deleteButton.style.display = "none"; // Hide delete button for default tabs
        } else {
            deleteButton.style.display = "inline-block"; // Show delete button for custom tabs
        }
    }

    displayData();
}

// --- On Load: Initialize Tabs from LocalStorage ---
function initTabs() {
  let tabList = JSON.parse(localStorage.getItem("tabList"));

// If no tabList exists in localStorage (first load), initialize with default tabs
if (!tabList || tabList.length === 0) {
    tabList = [...CORE_DEFAULT_TABS]; // Use a copy of default tabs
    localStorage.setItem("tabList", JSON.stringify(tabList));

    // Initialize localStorage for default tabs
    CORE_DEFAULT_TABS.forEach(id => {
        if (!localStorage.getItem(`tabName_${id}`)) {
            localStorage.setItem(`tabName_${id}`, id.charAt(0).toUpperCase() + id.slice(1)); // Capitalize first letter (Work, Personal)
        }
        if (!localStorage.getItem(`${id}List`)) {
            localStorage.setItem(`${id}List`, JSON.stringify([]));
        }
        if (!localStorage.getItem(`${id}PurgeList`)) {
            localStorage.setItem(`${id}PurgeList`, JSON.stringify([]));
        }
    });
}

  const container = document.getElementById("tabsContainer");
  // Clear existing tabs (if reloading)
  container.innerHTML = "";

  // Re-render each saved tab
  tabList.forEach(tabId => {
    const name = localStorage.getItem(`tabName_${tabId}`) || tabId;
    const tabEl = createTabElement(tabId, name);
    container.appendChild(tabEl);
  });

// const addTabButton = document.getElementById("add_tab"); // Give your add tab button an ID
//     if (addTabButton) {
//         container.appendChild(addTabButton); // Ensure it's always at the end
//     }

  // Activate the last active tab or default
  const lastActiveTab = localStorage.getItem("activeTab") || "work";
  switchTab(lastActiveTab);
}

// --- Create Tab Element ---
function createTabElement(tabId, tabName) {
  const tab = document.createElement("div");
  tab.className = "tab";
  tab.setAttribute("data-id", tabId);
  tab.dataset.tabId = tabId;

  const span = document.createElement("span");
  span.className = "tab-label";
  span.textContent = tabName;
  span.ondblclick = (e) => renameTab(e, tabId);
  tab.appendChild(span);

  tab.onclick = () => switchTab(tabId);

  return tab;
}

// --- Add New Tab ---
function addNewTab() {
  const tabList = JSON.parse(localStorage.getItem("tabList") || "[]");
  const newTabId = `customTab${tabCounter}`;
  const defaultName = `New Tab ${tabCounter}`;

  localStorage.setItem(`tabName_${newTabId}`, defaultName);
  localStorage.setItem(`${newTabId}List`, JSON.stringify([]));
  localStorage.setItem(`${newTabId}PurgeList`, JSON.stringify([]));

  tabCounter++;
  localStorage.setItem("tabCounter", tabCounter);

  // Update tab list
  tabList.push(newTabId);
  localStorage.setItem("tabList", JSON.stringify(tabList));

  // Create and insert new tab
  const newTab = createTabElement(newTabId, defaultName);
  const container = document.getElementById("tabsContainer");
  const addTabButton = document.getElementById("add_tab");
  if (addTabButton && container.contains(addTabButton)) {
        container.insertBefore(newTab, addTabButton);
      } else {
        container.appendChild(newTab); // Fallback if button isn't already inside
      }

  switchTab(newTabId);
}

function renameTab(event, tabId) {
  const tabEl = event.target.closest(".tab");
  if (!tabEl.classList.contains("active")) return;

  const span = event.target;
  const currentName = span.textContent;
  const input = document.createElement("input");
  input.value = currentName;
  input.className = "tab-rename-input";
  // input.style.width = "80px";
  span.replaceWith(input);
  input.focus();
  input.select(); // This line selects all the text in the input field

  input.addEventListener("blur", () => finishEdit(input, tabId, currentName));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") {
      input.value = currentName;
      input.blur();
    }
  });
}

function finishEdit(input, tabId, fallback) {
  const newName = input.value.trim() || fallback;
  const span = document.createElement("span");
  span.className = "tab-label";
  span.textContent = newName;
  span.ondblclick = (e) => renameTab(e, tabId); // Re-attach dblclick listener
  input.replaceWith(span);
  localStorage.setItem(`tabName_${tabId}`, newName);
}
// --- Delete Tab ---
function deleteTab() {
  const tabId = localStorage.getItem("activeTab");

 // Prevent deletion of core default tabs
  if (CORE_DEFAULT_TABS.includes(tabId)) {
      alert("Default tabs cannot be deleted.");
      return;
  }

    const tabName = localStorage.getItem(`tabName_${tabId}`) || tabId;
    if (!confirm(`Delete tab "${tabName}" and all its tasks?`)) {
        return;
    }

// Proceed with deletion after confirmation
    const tabElement = document.querySelector(`.tab[data-id="${tabId}"]`);
    if (tabElement) {
        tabElement.classList.add("removing");
        setTimeout(() => {
            tabElement.remove(); // Remove from DOM after animation
            finalizeTabDeletion(tabId); // Proceed with data cleanup
        }, 300); // match transition time
    } else {
        // Fallback if element not found (shouldn't happen if selectedTab exists)
        finalizeTabDeletion(tabId);
    }
}

// Helper function to encapsulate data deletion and re-initialization
function finalizeTabDeletion(tabId) {
    // Remove tab metadata and tasks from localStorage
    localStorage.removeItem(`tabName_${tabId}`);
    localStorage.removeItem(`${tabId}List`);
    localStorage.removeItem(`${tabId}PurgeList`);

// Update tab list in localStorage
  let tabList = JSON.parse(localStorage.getItem("tabList") || "[]");
  const updatedTabList = tabList.filter(id => id !== tabId);
  localStorage.setItem("tabList", JSON.stringify(updatedTabList));

// Switch to a fallback tab (e.g., "work")
  switchTab("work");

// Refresh tabs to reflect the deletion
  initTabs(); // Redraw tabs
}

// Ensure initTabs is called when the DOM is ready
document.addEventListener("DOMContentLoaded", initTabs);


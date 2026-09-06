const menuItems = document.querySelectorAll('.page-list');
let currentPosition = 0;

const findItemHighlight = (e) => {
	console.log('triggered', e.target);
	// alert('triggered', e.target);
	cleanElements();
	updateMenuItem(e.target);
};

const cleanElements = () => {
	menuItems.forEach((item) => {
		item.classList.remove('yellow-highlight', 'selected', 'highlight-menu');
	});
};

const updateMenuItem = (item) => {
	item.classList.add('yellow-highlight', 'selected', 'highlight-menu');
};

const updatePosition = (key) => {
	if (key == 'ArrowUp' && currentPosition > 0) {
		currentPosition -= 1;
	}
	if (key == 'ArrowDown' && currentPosition < menuItems.length - 1) {
		currentPosition += 1;
	}
};

window.addEventListener('keyup', (e) => {
	updatePosition(e.key);
	cleanElements();
	updateMenuItem(menuItems[currentPosition]);
});

window.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' || event.key === 'enter') {
		if (menuItems[currentPosition]) {
			// Trigger the link by simulating a click
			menuItems[currentPosition].click();
		}
	}
});

menuItems.forEach((item) => {
	item.addEventListener('mouseover', findItemHighlight);
});

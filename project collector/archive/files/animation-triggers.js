const animatedElement = document.getElementById('list-item-command');
const items = Array.from(document.querySelectorAll('.project-item')).reverse(); // Reverse to start with last item
let currentIndex = 0;

function showNextItem() {
	if (currentIndex < items.length) {
		const currentItem = items[currentIndex];
		currentItem.classList.add('visible'); // Make the item visible

		// Shift all previously visible items down
		for (let i = 0; i < currentIndex; i++) {
			items[i].style.transform = `translateY(${(currentIndex - i) * 170}px)`; // Adjust based on your item height
		}

		currentIndex++; // Move to the next item

		// Schedule the next item to appear
		setTimeout(showNextItem, 1000); // Adjust delay as needed
	}
}

// Add event listener for the animationend event
animatedElement.addEventListener('animationend', (event) => {
	console.log('Animation ended:', event);
	// You can add any logic here, like changing styles or triggering another action
	// Start the sequence
	showNextItem();
});

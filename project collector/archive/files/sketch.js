let asciiFrames = [];
let currentFrame = 0;
let cellWidth, cellHeight; // Dimensions of each ASCII cell
let cols, rows; // Number of columns and rows in the ASCII frame
let containerWidth, containerHeight; // Dimensions of the canvas container

function preload() {
	// Get the current page path and decide the JSON file to load
	let path = window.location.pathname;
	let jsonFile = '';

	if (path === '/') {
		jsonFile = '/scripts/main.json';
	} else if (path === '/projects') {
		jsonFile = '/scripts/projects.json';
	} else if (path === '/contact') {
		jsonFile = '/scripts/contact.json';
	}

	// Display loading message in the container
	const loadingDiv = document.querySelector('.ascii-container #p5_loading');
	if (loadingDiv) {
		loadingDiv.textContent = 'Loading ASCII Art...'; // Customize your loading message
	}

	// Load the appropriate JSON file
	loadJSON(jsonFile, (data) => {
		asciiFrames = data;
		adjustScaling(asciiFrames[0]); // Adjust scaling based on the first frame

		// Hide the loading message once the JSON is loaded
		if (loadingDiv) {
			loadingDiv.style.display = 'none';
		}
	});
}

function setup() {
	// Delay canvas creation to ensure .ascii-container is fully styled
	setTimeout(() => {
		initializeCanvas();
	}, 100);
}

function initializeCanvas() {
	// Get the dimensions of the .ascii-container
	const container = document.querySelector('.ascii-container');
	containerWidth = container.offsetWidth;
	containerHeight = container.offsetHeight;

	// Create a canvas with the dimensions of the container
	let canvas = createCanvas(containerWidth, containerHeight);
	canvas.parent(container);

	// Adjust scaling for ASCII frames
	if (asciiFrames.length > 0) {
		adjustScaling(asciiFrames[0]);
	}

	textFont('monospace');
	frameRate(20); // Set frame rate
}

function draw() {
	if (containerWidth !== width || containerHeight !== height) {
		// Reinitialize canvas if container size changes
		initializeCanvas();
	}

	background(0);

	if (asciiFrames.length > 0) {
		let asciiArt = asciiFrames[currentFrame];
		displayInteractiveASCII(asciiArt);

		// Advance to the next frame
		currentFrame = (currentFrame + 1) % asciiFrames.length;
	}
}

function adjustScaling(asciiArt) {
	let lines = asciiArt.split('\n');
	rows = lines.length; // Number of rows in the ASCII frame
	cols = Math.max(...lines.map((line) => line.length)); // Number of columns in the ASCII frame

	// Calculate cell dimensions to fit the canvas
	cellWidth = width / cols;
	cellHeight = height / rows;
}

function displayInteractiveASCII(asciiArt) {
	let lines = asciiArt.split('\n');
	let xOffset = 10;
	let yOffset = 10;

	for (let row = 0; row < lines.length; row++) {
		for (let col = 0; col < lines[row].length; col++) {
			let x = col * cellWidth + xOffset;
			let y = row * cellHeight + yOffset;

			let char = lines[row][col];

			// Check if the mouse is over this character
			let isMouseOver =
				mouseX > x &&
				mouseX < x + cellWidth &&
				mouseY > y - cellHeight &&
				mouseY < y;

			if (isMouseOver) {
				fill(random(100, 255), random(100, 255), random(100, 255)); // Dynamic color
				textSize(12 * 3); // Enlarge character
				text(char, x, y);
				textSize(12); // Reset text size for next characters
			} else {
				fill(200); // Default color
				text(char, x, y);
			}
		}
	}
}

function windowResized() {
	// Reinitialize the canvas on window resize
	initializeCanvas();
}

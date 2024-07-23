// index.js
function TagCloud(container, texts, options = {}) {
    console.log("test: TagCloud constructor");
  
    // Validate parameters
    if (!(container instanceof HTMLElement)) {
      console.error("Invalid container element passed to TagCloud");
      return;
    }
  
    if (!Array.isArray(texts) || texts.length === 0) {
      console.error("Invalid texts array passed to TagCloud");
      return;
    }
  
    // Default options
    const defaultOptions = {
      fontSize: '14px',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      gridLayout: false,
      ...options
    };
  
    // Apply the grid layout class if specified
    if (defaultOptions.gridLayout) {
      container.classList.add('tagcloud-grid');
    } else {
      container.classList.remove('tagcloud-grid');
    }
  
    // Append each text as a span element to the container
    texts.forEach(text => {
      const span = document.createElement('span');
      span.textContent = text;
      span.className = 'tagcloud--item';
  
      // Apply styles
      span.style.fontSize = defaultOptions.fontSize;
      span.style.color = defaultOptions.color;
      span.style.fontFamily = defaultOptions.fontFamily;
  
      container.appendChild(span);
    });
  }
  
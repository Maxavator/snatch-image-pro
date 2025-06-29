// Safari Extension Content Script
class ImageDownloaderContent {
    constructor() {
        this.images = [];
        this.setupMessageHandlers();
    }

    setupMessageHandlers() {
        if (typeof safari !== 'undefined' && safari.self && safari.self.addEventListener) {
            // Safari content script messaging
            safari.self.addEventListener('message', (event) => {
                this.handleMessage(event.name, event.message);
            }, false);
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Chrome extension fallback
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message.type, message.data);
                return true; // Async response
            });
        }
    }

    async handleMessage(type, data) {
        try {
            switch (type) {
                case 'scanImages':
                    return this.scanImages(data);
                
                case 'extractImages':
                    return this.extractAllImages();
                
                case 'getImageDetails':
                    return this.getImageDetails(data.src);
                
                case 'highlightImages':
                    this.highlightImages(data.sources);
                    break;
                
                case 'removeHighlights':
                    this.removeImageHighlights();
                    break;
                
                default:
                    console.warn('Unknown message type:', type);
            }
        } catch (error) {
            console.error('Content script error:', error);
            throw error;
        }
    }

    extractAllImages() {
        const images = [];
        
        // Extract IMG elements
        const imgElements = document.querySelectorAll('img');
        imgElements.forEach((img, index) => {
            const imageData = this.extractImageData(img, index, 'img');
            if (imageData) {
                images.push(imageData);
            }
        });
        
        // Extract CSS background images
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el, index) => {
            const imageData = this.extractBackgroundImage(el, imgElements.length + index);
            if (imageData) {
                images.push(imageData);
            }
        });
        
        // Extract SVG images
        const svgElements = document.querySelectorAll('svg image, image');
        svgElements.forEach((svg, index) => {
            const imageData = this.extractSvgImage(svg, imgElements.length + allElements.length + index);
            if (imageData) {
                images.push(imageData);
            }
        });
        
        this.images = images;
        return images;
    }

    extractImageData(img, index, type = 'img') {
        try {
            // Skip if image is too small or hidden
            const rect = img.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return null;
            
            // Get the best quality source
            let src = img.src || img.dataset.src || img.dataset.lazySrc || img.dataset.original;
            
            // Handle srcset for better quality
            if (img.srcset) {
                const srcsetEntries = img.srcset.split(',').map(entry => {
                    const parts = entry.trim().split(' ');
                    return {
                        url: parts[0],
                        descriptor: parts[1] || '1x'
                    };
                });
                
                // Get highest resolution version
                const highestRes = srcsetEntries.reduce((prev, current) => {
                    const prevRes = this.parseDescriptor(prev.descriptor);
                    const currentRes = this.parseDescriptor(current.descriptor);
                    return currentRes > prevRes ? current : prev;
                });
                
                if (highestRes) {
                    src = highestRes.url;
                }
            }
            
            if (!src || !this.isValidImageUrl(src)) return null;
            
            // Convert relative URLs to absolute
            src = new URL(src, window.location.href).href;
            
            return {
                src: src,
                alt: img.alt || img.title || '',
                width: img.naturalWidth || rect.width,
                height: img.naturalHeight || rect.height,
                index: index,
                type: type,
                element: img,
                visible: this.isElementVisible(img),
                fileSize: null, // Will be determined later if needed
                format: this.getImageFormat(src)
            };
        } catch (error) {
            console.warn('Error extracting image data:', error);
            return null;
        }
    }

    extractBackgroundImage(element, index) {
        try {
            const style = window.getComputedStyle(element);
            const bgImage = style.backgroundImage;
            
            if (!bgImage || bgImage === 'none' || !bgImage.includes('url(')) {
                return null;
            }
            
            const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
            if (!match || !match[1]) return null;
            
            let src = match[1];
            if (!this.isValidImageUrl(src)) return null;
            
            // Convert relative URLs to absolute
            src = new URL(src, window.location.href).href;
            
            const rect = element.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return null;
            
            return {
                src: src,
                alt: element.title || element.getAttribute('aria-label') || 'Background image',
                width: rect.width,
                height: rect.height,
                index: index,
                type: 'background',
                element: element,
                visible: this.isElementVisible(element),
                fileSize: null,
                format: this.getImageFormat(src),
                isBackground: true
            };
        } catch (error) {
            console.warn('Error extracting background image:', error);
            return null;
        }
    }

    extractSvgImage(svgImage, index) {
        try {
            let src = svgImage.href || svgImage.getAttribute('xlink:href') || svgImage.getAttribute('href');
            if (!src || !this.isValidImageUrl(src)) return null;
            
            // Convert relative URLs to absolute
            src = new URL(src, window.location.href).href;
            
            const rect = svgImage.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return null;
            
            return {
                src: src,
                alt: svgImage.getAttribute('alt') || 'SVG image',
                width: rect.width,
                height: rect.height,
                index: index,
                type: 'svg',
                element: svgImage,
                visible: this.isElementVisible(svgImage),
                fileSize: null,
                format: this.getImageFormat(src)
            };
        } catch (error) {
            console.warn('Error extracting SVG image:', error);
            return null;
        }
    }

    parseDescriptor(descriptor) {
        if (descriptor.endsWith('x')) {
            return parseFloat(descriptor);
        } else if (descriptor.endsWith('w')) {
            return parseInt(descriptor);
        }
        return 1;
    }

    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Handle data URLs
        if (url.startsWith('data:image/')) return true;
        
        // Handle blob URLs
        if (url.startsWith('blob:')) return true;
        
        // Check for valid URL format
        try {
            new URL(url, window.location.href);
        } catch {
            return false;
        }
        
        // Check for common image file extensions
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|tif)(\?.*)?$/i;
        return imageExtensions.test(url) || url.includes('image') || url.includes('photo') || url.includes('picture');
    }

    getImageFormat(url) {
        if (url.startsWith('data:image/')) {
            const match = url.match(/data:image\/([^;]+)/);
            return match ? match[1] : 'unknown';
        }
        
        const match = url.match(/\.([a-z]{2,4})(\?.*)?$/i);
        return match ? match[1].toLowerCase() : 'unknown';
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth &&
            rect.bottom > 0 &&
            rect.right > 0
        );
    }

    async getImageDetails(src) {
        try {
            // Try to get more detailed information about the image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            return new Promise((resolve, reject) => {
                img.onload = () => {
                    resolve({
                        src: src,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        loaded: true
                    });
                };
                
                img.onerror = () => {
                    resolve({
                        src: src,
                        naturalWidth: 0,
                        naturalHeight: 0,
                        loaded: false,
                        error: 'Failed to load image'
                    });
                };
                
                img.src = src;
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    resolve({
                        src: src,
                        naturalWidth: 0,
                        naturalHeight: 0,
                        loaded: false,
                        error: 'Timeout loading image'
                    });
                }, 5000);
            });
        } catch (error) {
            return {
                src: src,
                naturalWidth: 0,
                naturalHeight: 0,
                loaded: false,
                error: error.message
            };
        }
    }

    highlightImages(imageSources) {
        this.removeImageHighlights();
        
        const style = document.createElement('style');
        style.id = 'image-downloader-highlights';
        style.textContent = `
            .image-downloader-highlight {
                outline: 3px solid #007bff !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 10px rgba(0, 123, 255, 0.5) !important;
            }
        `;
        document.head.appendChild(style);
        
        this.images.forEach(img => {
            if (imageSources.includes(img.src) && img.element) {
                img.element.classList.add('image-downloader-highlight');
            }
        });
    }

    removeImageHighlights() {
        // Remove highlight classes
        const highlighted = document.querySelectorAll('.image-downloader-highlight');
        highlighted.forEach(el => el.classList.remove('image-downloader-highlight'));
        
        // Remove highlight styles
        const style = document.getElementById('image-downloader-highlights');
        if (style) {
            style.remove();
        }
    }

    // Utility method to scan for lazy-loaded images
    observeLazyImages() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src && !img.src) {
                            img.src = img.dataset.src;
                        }
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                observer.observe(img);
            });
        }
    }

    // Method to detect dynamically added images
    observeNewImages() {
        if ('MutationObserver' in window) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if the node itself is an image
                            if (node.tagName === 'IMG') {
                                // Process new image
                                const newImage = this.extractImageData(node, this.images.length);
                                if (newImage) {
                                    this.images.push(newImage);
                                }
                            }
                            
                            // Check for images within the node
                            const imgs = node.querySelectorAll('img');
                            imgs.forEach(img => {
                                const newImage = this.extractImageData(img, this.images.length);
                                if (newImage) {
                                    this.images.push(newImage);
                                }
                            });
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Initialize observers
    init() {
        this.observeLazyImages();
        this.observeNewImages();
        
        // Initial scan
        this.extractAllImages();
    }
}

// Initialize content script
const imageDownloaderContent = new ImageDownloaderContent();
imageDownloaderContent.init();

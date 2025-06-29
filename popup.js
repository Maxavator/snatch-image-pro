class ImageDownloaderPopup {
    constructor() {
        this.images = [];
        this.filteredImages = [];
        this.selectedImages = new Set();
        this.settings = {};
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.checkDemoMode();
        this.scanImages();
    }

    initializeElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            errorMessage: document.getElementById('errorMessage'),
            noImages: document.getElementById('noImages'),
            imageGrid: document.getElementById('imageGrid'),
            searchInput: document.getElementById('searchInput'),
            minWidth: document.getElementById('minWidth'),
            minHeight: document.getElementById('minHeight'),
            selectAll: document.getElementById('selectAll'),
            downloadSelected: document.getElementById('downloadSelected'),
            imageCount: document.getElementById('imageCount'),
            selectedCount: document.getElementById('selectedCount'),
            optionsBtn: document.getElementById('optionsBtn'),
            demoBanner: document.getElementById('demoBanner')
        };
    }

    checkDemoMode() {
        // Show demo banner if not running in Safari extension context
        if (typeof safari === 'undefined' || !safari.extension) {
            this.elements.demoBanner.classList.remove('hidden');
        }
    }

    bindEvents() {
        this.elements.searchInput.addEventListener('input', () => this.filterImages());
        this.elements.minWidth.addEventListener('change', () => this.filterImages());
        this.elements.minHeight.addEventListener('change', () => this.filterImages());
        this.elements.selectAll.addEventListener('click', () => this.selectAllImages());
        this.elements.downloadSelected.addEventListener('click', () => this.downloadSelectedImages());
        this.elements.optionsBtn.addEventListener('click', () => this.openOptions());
    }

    async loadSettings() {
        try {
            // Safari extension storage API
            if (typeof safari !== 'undefined' && safari.extension) {
                // Use Safari's settings API
                this.settings = {
                    minWidth: safari.extension.settings.minWidth || 0,
                    minHeight: safari.extension.settings.minHeight || 0,
                    downloadPath: safari.extension.settings.downloadPath || '',
                    openAfterDownload: safari.extension.settings.openAfterDownload || false
                };
            } else {
                // Fallback for development/testing
                this.settings = {
                    minWidth: 0,
                    minHeight: 0,
                    downloadPath: '',
                    openAfterDownload: false
                };
            }
        } catch (error) {
            console.warn('Could not load settings:', error);
            this.settings = {
                minWidth: 0,
                minHeight: 0,
                downloadPath: '',
                openAfterDownload: false
            };
        }
    }

    async scanImages() {
        try {
            this.showLoading();
            
            // Check if running in Safari extension context
            if (typeof safari !== 'undefined' && safari.extension) {
                // Safari extension mode
                const tabs = await this.getCurrentTab();
                if (!tabs || tabs.length === 0) {
                    throw new Error('No active tab found');
                }

                const tab = tabs[0];
                const results = await this.executeScript(tab.id, {
                    code: this.getImageScanningCode()
                });

                if (results && results[0] && results[0].result) {
                    this.images = results[0].result.filter(img => img.src && img.src.startsWith('http'));
                    this.filterImages();
                } else {
                    this.images = [];
                    this.showNoImages();
                }
            } else {
                // Demo mode - show sample images for testing
                this.loadDemoImages();
            }

        } catch (error) {
            console.error('Error scanning images:', error);
            // Fallback to demo mode if extension APIs fail
            this.loadDemoImages();
        }
    }

    loadDemoImages() {
        // Demo images for testing the interface
        this.images = [
            {
                src: 'https://picsum.photos/400/300?random=1',
                alt: 'Sample Image 1',
                width: 400,
                height: 300,
                index: 0,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/600/400?random=2',
                alt: 'Sample Image 2',
                width: 600,
                height: 400,
                index: 1,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/800/600?random=3',
                alt: 'Sample Image 3',
                width: 800,
                height: 600,
                index: 2,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/300/400?random=4',
                alt: 'Portrait Image',
                width: 300,
                height: 400,
                index: 3,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/500/300?random=5',
                alt: 'Landscape Image',
                width: 500,
                height: 300,
                index: 4,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/200/200?random=6',
                alt: 'Square Image',
                width: 200,
                height: 200,
                index: 5,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/1200/800?random=7',
                alt: 'Large Image',
                width: 1200,
                height: 800,
                index: 6,
                type: 'img'
            },
            {
                src: 'https://picsum.photos/150/150?random=8',
                alt: 'Small Image',
                width: 150,
                height: 150,
                index: 7,
                type: 'img'
            }
        ];
        
        // Simulate loading delay
        setTimeout(() => {
            this.filterImages();
        }, 800);
    }

    getImageScanningCode() {
        return `
            (function() {
                const images = [];
                const imageElements = document.querySelectorAll('img');
                
                imageElements.forEach((img, index) => {
                    // Skip if image is too small or hidden
                    if (img.offsetWidth < 10 || img.offsetHeight < 10) return;
                    
                    // Get actual dimensions
                    const rect = img.getBoundingClientRect();
                    
                    images.push({
                        src: img.src || img.dataset.src || img.dataset.lazySrc,
                        alt: img.alt || '',
                        width: img.naturalWidth || rect.width,
                        height: img.naturalHeight || rect.height,
                        index: index
                    });
                });
                
                // Also scan for background images
                const allElements = document.querySelectorAll('*');
                allElements.forEach((el, index) => {
                    const style = window.getComputedStyle(el);
                    const bgImage = style.backgroundImage;
                    
                    if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
                        const match = bgImage.match(/url\\(["']?([^"')]+)["']?\\)/);
                        if (match && match[1]) {
                            const rect = el.getBoundingClientRect();
                            if (rect.width >= 10 && rect.height >= 10) {
                                images.push({
                                    src: match[1],
                                    alt: el.title || el.getAttribute('aria-label') || 'Background image',
                                    width: rect.width,
                                    height: rect.height,
                                    index: imageElements.length + index,
                                    isBackground: true
                                });
                            }
                        }
                    }
                });
                
                return images;
            })();
        `;
    }

    async getCurrentTab() {
        if (typeof safari !== 'undefined' && safari.application) {
            // Safari API
            return [safari.application.activeBrowserWindow.activeTab];
        } else if (typeof chrome !== 'undefined' && chrome.tabs) {
            // Chrome API fallback
            return new Promise((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, resolve);
            });
        }
        throw new Error('Browser API not available');
    }

    async executeScript(tabId, details) {
        if (typeof safari !== 'undefined' && safari.extension) {
            // Safari API - send message to content script
            return new Promise((resolve) => {
                safari.extension.dispatchMessage('executeScript', details);
                // In a real Safari extension, we'd listen for the response
                // For now, simulate a response
                setTimeout(() => {
                    resolve([{ result: [] }]);
                }, 1000);
            });
        } else if (typeof chrome !== 'undefined' && chrome.scripting) {
            // Chrome API fallback
            return chrome.scripting.executeScript({
                target: { tabId },
                func: new Function('return ' + details.code)()
            });
        }
        throw new Error('Script execution not available');
    }

    filterImages() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        const minWidth = parseInt(this.elements.minWidth.value) || 0;
        const minHeight = parseInt(this.elements.minHeight.value) || 0;

        this.filteredImages = this.images.filter(img => {
            // Size filter
            if (img.width < minWidth || img.height < minHeight) return false;
            
            // Search filter
            if (searchTerm && !img.src.toLowerCase().includes(searchTerm) && 
                !img.alt.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            return true;
        });

        this.renderImages();
        this.updateStatus();
    }

    renderImages() {
        const grid = this.elements.imageGrid;
        grid.innerHTML = '';

        if (this.filteredImages.length === 0) {
            this.showNoImages();
            return;
        }

        this.hideAllStates();

        this.filteredImages.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.dataset.index = index;

            const isSelected = this.selectedImages.has(img.src);
            if (isSelected) {
                item.classList.add('selected');
            }

            item.innerHTML = `
                <img src="${img.src}" alt="${img.alt}" loading="lazy">
                <div class="checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''}>
                </div>
                <div class="overlay">
                    <button class="download-btn">Download</button>
                </div>
                <div class="image-info">
                    ${img.width}×${img.height}
                </div>
            `;

            // Handle checkbox change
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleImageSelection(img.src, e.target.checked);
            });

            // Handle item click
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    this.downloadImage(img);
                } else if (e.target.tagName !== 'INPUT') {
                    this.toggleImageSelection(img.src);
                }
            });

            grid.appendChild(item);
        });
    }

    toggleImageSelection(src, forceState = null) {
        const shouldSelect = forceState !== null ? forceState : !this.selectedImages.has(src);
        
        if (shouldSelect) {
            this.selectedImages.add(src);
        } else {
            this.selectedImages.delete(src);
        }

        this.updateSelectionUI();
        this.updateStatus();
    }

    updateSelectionUI() {
        const items = this.elements.imageGrid.querySelectorAll('.image-item');
        items.forEach(item => {
            const img = item.querySelector('img');
            const checkbox = item.querySelector('input[type="checkbox"]');
            const isSelected = this.selectedImages.has(img.src);
            
            checkbox.checked = isSelected;
            item.classList.toggle('selected', isSelected);
        });

        this.elements.downloadSelected.disabled = this.selectedImages.size === 0;
    }

    selectAllImages() {
        const allSelected = this.selectedImages.size === this.filteredImages.length;
        
        if (allSelected) {
            this.selectedImages.clear();
        } else {
            this.filteredImages.forEach(img => {
                this.selectedImages.add(img.src);
            });
        }

        this.updateSelectionUI();
        this.updateStatus();
    }

    async downloadImage(img) {
        try {
            if (typeof safari !== 'undefined' && safari.extension) {
                // Safari download API
                safari.extension.dispatchMessage('downloadImage', {
                    url: img.src,
                    filename: this.generateFilename(img)
                });
            } else {
                // Demo mode - simulate download
                this.simulateDownload(img);
            }
        } catch (error) {
            console.error('Download failed:', error);
            this.showError('Download failed: ' + error.message);
        }
    }

    simulateDownload(img) {
        // Create a temporary notification for demo
        const notification = document.createElement('div');
        notification.className = 'download-notification';
        notification.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" stroke-width="2"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Downloading ${this.generateFilename(img)}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // In demo mode, also open in new tab for actual download
        window.open(img.src, '_blank');
    }

    async downloadSelectedImages() {
        if (this.selectedImages.size === 0) return;

        const selectedImageData = this.filteredImages.filter(img => 
            this.selectedImages.has(img.src)
        );

        for (const img of selectedImageData) {
            await this.downloadImage(img);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    generateFilename(img) {
        const url = new URL(img.src);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || 'image';
        
        // If no extension, try to determine from content-type or default to .jpg
        if (!filename.includes('.')) {
            return filename + '.jpg';
        }
        
        return filename;
    }

    updateStatus() {
        this.elements.imageCount.textContent = `${this.filteredImages.length} images found`;
        this.elements.selectedCount.textContent = `${this.selectedImages.size} selected`;
    }

    showLoading() {
        this.hideAllStates();
        this.elements.loading.classList.remove('hidden');
    }

    showError(message) {
        this.hideAllStates();
        this.elements.errorMessage.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    showNoImages() {
        this.hideAllStates();
        this.elements.noImages.classList.remove('hidden');
    }

    hideAllStates() {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.add('hidden');
        this.elements.noImages.classList.add('hidden');
    }

    openOptions() {
        if (typeof safari !== 'undefined' && safari.extension) {
            safari.extension.dispatchMessage('openOptions');
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.openOptionsPage();
        } else {
            // Fallback - open in new tab
            window.open('options.html', '_blank');
        }
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ImageDownloaderPopup();
});

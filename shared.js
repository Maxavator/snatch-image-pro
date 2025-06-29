// Shared utilities and constants for Image Downloader Safari Extension

const ImageDownloaderShared = {
    // Extension constants
    EXTENSION_NAME: 'Image Snatch Pro',
    VERSION: '1.0.0',
    
    // Default settings
    DEFAULT_SETTINGS: {
        downloadPath: '',
        filenamePattern: 'original',
        openAfterDownload: false,
        avoidDuplicates: true,
        defaultMinWidth: 0,
        defaultMinHeight: 0,
        allowedFormats: ['jpg', 'png', 'gif', 'webp'],
        includeBackgrounds: true,
        maxConcurrentDownloads: 3,
        downloadDelay: 100,
        enableNotifications: true
    },

    // File format configurations
    IMAGE_FORMATS: {
        jpg: { extensions: ['jpg', 'jpeg'], mimeType: 'image/jpeg' },
        png: { extensions: ['png'], mimeType: 'image/png' },
        gif: { extensions: ['gif'], mimeType: 'image/gif' },
        webp: { extensions: ['webp'], mimeType: 'image/webp' },
        svg: { extensions: ['svg'], mimeType: 'image/svg+xml' },
        bmp: { extensions: ['bmp'], mimeType: 'image/bmp' },
        ico: { extensions: ['ico'], mimeType: 'image/x-icon' },
        tiff: { extensions: ['tiff', 'tif'], mimeType: 'image/tiff' }
    },

    // Utility functions
    utils: {
        // Format file size in human readable format
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // Generate filename based on pattern
        generateFilename(originalUrl, pattern = 'original', counter = 0) {
            const url = new URL(originalUrl);
            const pathname = url.pathname;
            const originalFilename = pathname.split('/').pop() || 'image';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const domain = url.hostname.replace(/^www\./, '');
            
            let filename = originalFilename;
            
            // Ensure extension
            if (!filename.includes('.')) {
                filename += '.jpg';
            }
            
            const lastDotIndex = filename.lastIndexOf('.');
            const name = filename.substring(0, lastDotIndex);
            const extension = filename.substring(lastDotIndex);
            
            switch (pattern) {
                case 'timestamp':
                    filename = `${timestamp}_${name}${extension}`;
                    break;
                case 'counter':
                    filename = counter > 0 ? `${name}_${counter}${extension}` : filename;
                    break;
                case 'domain':
                    filename = `${domain}_${name}${extension}`;
                    break;
                case 'original':
                default:
                    filename = counter > 0 ? `${name}_${counter}${extension}` : filename;
                    break;
            }
            
            // Sanitize filename
            return this.sanitizeFilename(filename);
        },

        // Sanitize filename for filesystem
        sanitizeFilename(filename) {
            // Remove or replace invalid characters
            return filename
                .replace(/[<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 255); // Limit length
        },

        // Check if URL is a valid image
        isValidImageUrl(url) {
            if (!url || typeof url !== 'string') return false;
            
            // Handle data URLs
            if (url.startsWith('data:image/')) return true;
            
            // Handle blob URLs
            if (url.startsWith('blob:')) return true;
            
            // Check for valid URL format
            try {
                new URL(url);
            } catch {
                return false;
            }
            
            // Check for image file extensions
            const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|tif)(\?.*)?$/i;
            return imageExtensions.test(url) || 
                   url.includes('image') || 
                   url.includes('photo') || 
                   url.includes('picture');
        },

        // Get image format from URL
        getImageFormat(url) {
            if (url.startsWith('data:image/')) {
                const match = url.match(/data:image\/([^;]+)/);
                return match ? match[1].toLowerCase() : 'unknown';
            }
            
            const match = url.match(/\.([a-z]{2,4})(\?.*)?$/i);
            return match ? match[1].toLowerCase() : 'unknown';
        },

        // Debounce function
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Deep clone object
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const copy = {};
                Object.keys(obj).forEach(key => {
                    copy[key] = this.deepClone(obj[key]);
                });
                return copy;
            }
        },

        // Check if element is visible
        isElementVisible(element) {
            if (!element) return false;
            
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
        },

        // Get image dimensions from URL
        async getImageDimensions(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        aspectRatio: img.naturalWidth / img.naturalHeight
                    });
                };
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                img.src = url;
            });
        },

        // Convert bytes to human readable format
        bytesToSize(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) return '0 Byte';
            const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
    },

    // Message handling utilities
    messaging: {
        // Send message to background script
        sendToBackground(type, data = {}) {
            if (typeof safari !== 'undefined' && safari.extension) {
                safari.extension.dispatchMessage(type, data);
            } else if (typeof chrome !== 'undefined' && chrome.runtime) {
                return chrome.runtime.sendMessage({ type, data });
            } else {
                console.warn('No messaging API available');
                return Promise.resolve();
            }
        },

        // Send message to content script
        sendToContent(tabId, type, data = {}) {
            if (typeof safari !== 'undefined' && safari.application) {
                const tab = safari.application.activeBrowserWindow.activeTab;
                tab.page.dispatchMessage(type, data);
            } else if (typeof chrome !== 'undefined' && chrome.tabs) {
                return chrome.tabs.sendMessage(tabId, { type, data });
            } else {
                console.warn('No messaging API available');
                return Promise.resolve();
            }
        }
    },

    // Storage utilities
    storage: {
        // Get settings from storage
        async getSettings() {
            try {
                if (typeof safari !== 'undefined' && safari.extension && safari.extension.settings) {
                    const settings = {};
                    Object.keys(ImageDownloaderShared.DEFAULT_SETTINGS).forEach(key => {
                        const value = safari.extension.settings[key];
                        settings[key] = value !== undefined ? value : ImageDownloaderShared.DEFAULT_SETTINGS[key];
                    });
                    return settings;
                } else if (typeof chrome !== 'undefined' && chrome.storage) {
                    return new Promise((resolve) => {
                        chrome.storage.sync.get(ImageDownloaderShared.DEFAULT_SETTINGS, resolve);
                    });
                } else {
                    // Fallback to localStorage
                    const stored = localStorage.getItem('imageDownloaderSettings');
                    return stored ? JSON.parse(stored) : ImageDownloaderShared.DEFAULT_SETTINGS;
                }
            } catch (error) {
                console.warn('Could not load settings:', error);
                return ImageDownloaderShared.DEFAULT_SETTINGS;
            }
        },

        // Save settings to storage
        async saveSettings(settings) {
            try {
                if (typeof safari !== 'undefined' && safari.extension && safari.extension.settings) {
                    Object.keys(settings).forEach(key => {
                        safari.extension.settings[key] = settings[key];
                    });
                } else if (typeof chrome !== 'undefined' && chrome.storage) {
                    return new Promise((resolve) => {
                        chrome.storage.sync.set(settings, resolve);
                    });
                } else {
                    // Fallback to localStorage
                    localStorage.setItem('imageDownloaderSettings', JSON.stringify(settings));
                }
            } catch (error) {
                console.error('Could not save settings:', error);
                throw error;
            }
        }
    },

    // Error handling utilities
    errors: {
        // Handle and format errors
        handleError(error, context = '') {
            const errorMessage = error.message || 'Unknown error occurred';
            const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
            
            console.error(fullMessage, error);
            
            return {
                message: fullMessage,
                type: error.name || 'Error',
                timestamp: new Date().toISOString(),
                context: context
            };
        },

        // Create user-friendly error messages
        getUserFriendlyError(error) {
            const commonErrors = {
                'NetworkError': 'Network connection failed. Please check your internet connection.',
                'SecurityError': 'Access denied due to security restrictions.',
                'TimeoutError': 'Operation timed out. Please try again.',
                'QuotaExceededError': 'Storage quota exceeded. Please free up some space.',
                'NotFoundError': 'Requested resource not found.',
                'PermissionDeniedError': 'Permission denied. Please check extension permissions.'
            };
            
            return commonErrors[error.name] || error.message || 'An unexpected error occurred.';
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDownloaderShared;
} else if (typeof window !== 'undefined') {
    window.ImageDownloaderShared = ImageDownloaderShared;
}

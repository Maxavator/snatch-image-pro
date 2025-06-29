// Safari Extension Background Script
class ImageDownloaderBackground {
    constructor() {
        this.setupMessageHandlers();
        this.setupDownloadHandlers();
    }

    setupMessageHandlers() {
        if (typeof safari !== 'undefined' && safari.extension) {
            // Safari extension message handling
            safari.extension.addEventListener('message', (event) => {
                this.handleMessage(event.name, event.message, event.target);
            }, false);
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Chrome extension fallback
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.handleMessage(message.type, message.data, sender);
                return true; // Async response
            });
        }
    }

    setupDownloadHandlers() {
        // Handle download events and progress
        if (typeof chrome !== 'undefined' && chrome.downloads) {
            chrome.downloads.onChanged.addListener((downloadDelta) => {
                if (downloadDelta.state && downloadDelta.state.current === 'complete') {
                    this.onDownloadComplete(downloadDelta.id);
                }
            });
        }
    }

    async handleMessage(type, data, sender) {
        try {
            switch (type) {
                case 'downloadImage':
                    await this.downloadImage(data.url, data.filename);
                    break;
                
                case 'openOptions':
                    this.openOptionsPage();
                    break;
                
                case 'executeScript':
                    return await this.executeContentScript(sender, data);
                
                case 'browseDownloadPath':
                    this.browseDownloadPath();
                    break;
                
                case 'getSettings':
                    return await this.getSettings();
                
                case 'saveSettings':
                    await this.saveSettings(data);
                    break;
                
                default:
                    console.warn('Unknown message type:', type);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            throw error;
        }
    }

    async downloadImage(url, filename) {
        try {
            if (typeof safari !== 'undefined' && safari.extension) {
                // Safari download - would need to use native Swift code
                // For now, open in new tab as fallback
                this.openImageInNewTab(url);
            } else if (typeof chrome !== 'undefined' && chrome.downloads) {
                // Chrome downloads API
                const downloadId = await new Promise((resolve, reject) => {
                    chrome.downloads.download({
                        url: url,
                        filename: filename,
                        saveAs: false
                    }, (id) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(id);
                        }
                    });
                });
                
                return downloadId;
            } else {
                // Fallback - create download link
                this.createDownloadLink(url, filename);
            }
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }

    openImageInNewTab(url) {
        if (typeof safari !== 'undefined' && safari.application) {
            safari.application.activeBrowserWindow.openTab().url = url;
        } else if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: url });
        } else {
            // Last resort - won't work in extension context
            window.open(url, '_blank');
        }
    }

    createDownloadLink(url, filename) {
        // This is a fallback method that won't work in background script
        // but could work if injected into content script
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    openOptionsPage() {
        if (typeof safari !== 'undefined' && safari.extension) {
            // Safari - would need to implement options page opening
            // For now, send message to show options
            safari.extension.dispatchMessage('showOptions');
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.openOptionsPage();
        }
    }

    async executeContentScript(sender, scriptData) {
        try {
            if (typeof safari !== 'undefined') {
                // Safari - content script execution would be handled differently
                // Return mock data for now
                return this.getMockImages();
            } else if (typeof chrome !== 'undefined' && chrome.scripting) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    func: new Function('return ' + scriptData.code)
                });
                return results;
            }
        } catch (error) {
            console.error('Script execution failed:', error);
            throw error;
        }
    }

    getMockImages() {
        // Mock data for development/testing
        return [{
            result: [
                {
                    src: 'https://via.placeholder.com/400x300/007bff/white?text=Sample+Image+1',
                    alt: 'Sample Image 1',
                    width: 400,
                    height: 300,
                    index: 0
                },
                {
                    src: 'https://via.placeholder.com/600x400/28a745/white?text=Sample+Image+2',
                    alt: 'Sample Image 2',
                    width: 600,
                    height: 400,
                    index: 1
                },
                {
                    src: 'https://via.placeholder.com/800x600/dc3545/white?text=Sample+Image+3',
                    alt: 'Sample Image 3',
                    width: 800,
                    height: 600,
                    index: 2
                }
            ]
        }];
    }

    browseDownloadPath() {
        // Safari would handle this through native file picker
        // Send message to native app component
        if (typeof safari !== 'undefined' && safari.extension) {
            safari.extension.dispatchMessage('nativeFilePicker');
        }
    }

    async getSettings() {
        // Return current settings from storage
        const defaultSettings = {
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
        };

        if (typeof safari !== 'undefined' && safari.extension && safari.extension.settings) {
            const settings = {};
            Object.keys(defaultSettings).forEach(key => {
                const value = safari.extension.settings[key];
                settings[key] = value !== undefined ? value : defaultSettings[key];
            });
            return settings;
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.sync.get(defaultSettings, resolve);
            });
        }

        return defaultSettings;
    }

    async saveSettings(settings) {
        if (typeof safari !== 'undefined' && safari.extension && safari.extension.settings) {
            Object.keys(settings).forEach(key => {
                safari.extension.settings[key] = settings[key];
            });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.sync.set(settings, resolve);
            });
        }
    }

    onDownloadComplete(downloadId) {
        // Handle download completion
        if (typeof chrome !== 'undefined' && chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon-48.png',
                title: 'Image Downloaded',
                message: 'Image download completed successfully'
            });
        }
    }

    // Utility methods for URL processing
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // Check if URL is valid
        try {
            new URL(url);
        } catch {
            return false;
        }

        // Check for image file extensions
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
        return imageExtensions.test(url) || url.includes('data:image/');
    }

    generateUniqueFilename(originalFilename, counter = 0) {
        if (counter === 0) return originalFilename;
        
        const lastDotIndex = originalFilename.lastIndexOf('.');
        if (lastDotIndex === -1) {
            return `${originalFilename}_${counter}`;
        }
        
        const name = originalFilename.substring(0, lastDotIndex);
        const extension = originalFilename.substring(lastDotIndex);
        return `${name}_${counter}${extension}`;
    }
}

// Initialize background script
new ImageDownloaderBackground();

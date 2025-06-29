class ImageDownloaderOptions {
    constructor() {
        this.settings = this.getDefaultSettings();
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
    }

    getDefaultSettings() {
        return {
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
    }

    initializeElements() {
        this.elements = {
            downloadPath: document.getElementById('downloadPath'),
            browseBtn: document.getElementById('browseBtn'),
            filenamePattern: document.getElementById('filenamePattern'),
            openAfterDownload: document.getElementById('openAfterDownload'),
            avoidDuplicates: document.getElementById('avoidDuplicates'),
            defaultMinWidth: document.getElementById('defaultMinWidth'),
            defaultMinHeight: document.getElementById('defaultMinHeight'),
            formatCheckboxes: document.querySelectorAll('input[name="format"]'),
            includeBackgrounds: document.getElementById('includeBackgrounds'),
            maxConcurrentDownloads: document.getElementById('maxConcurrentDownloads'),
            downloadDelay: document.getElementById('downloadDelay'),
            enableNotifications: document.getElementById('enableNotifications'),
            resetBtn: document.getElementById('resetBtn'),
            saveBtn: document.getElementById('saveBtn'),
            notification: document.getElementById('notification')
        };
    }

    bindEvents() {
        // Browse button for download path
        this.elements.browseBtn.addEventListener('click', () => this.browseDownloadPath());
        
        // Range inputs with value display
        this.elements.maxConcurrentDownloads.addEventListener('input', (e) => {
            const value = e.target.value;
            e.target.parentNode.querySelector('.range-value').textContent = `${value} downloads`;
        });
        
        this.elements.downloadDelay.addEventListener('input', (e) => {
            const value = e.target.value;
            e.target.parentNode.querySelector('.range-value').textContent = `${value}ms`;
        });
        
        // Save and reset buttons
        this.elements.saveBtn.addEventListener('click', () => this.saveSettings());
        this.elements.resetBtn.addEventListener('click', () => this.resetSettings());
        
        // Auto-save on input changes
        this.bindAutoSave();
    }

    bindAutoSave() {
        const inputs = [
            this.elements.filenamePattern,
            this.elements.openAfterDownload,
            this.elements.avoidDuplicates,
            this.elements.defaultMinWidth,
            this.elements.defaultMinHeight,
            this.elements.includeBackgrounds,
            this.elements.maxConcurrentDownloads,
            this.elements.downloadDelay,
            this.elements.enableNotifications,
            ...this.elements.formatCheckboxes
        ];

        inputs.forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    // Debounce auto-save
                    clearTimeout(this.autoSaveTimeout);
                    this.autoSaveTimeout = setTimeout(() => {
                        this.saveSettings(false); // Don't show notification for auto-save
                    }, 1000);
                });
            }
        });
    }

    async loadSettings() {
        try {
            let savedSettings = {};
            
            if (typeof safari !== 'undefined' && safari.extension && safari.extension.settings) {
                // Safari extension settings API
                Object.keys(this.settings).forEach(key => {
                    const value = safari.extension.settings[key];
                    if (value !== undefined) {
                        savedSettings[key] = value;
                    }
                });
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                // Chrome storage API fallback
                const result = await new Promise((resolve) => {
                    chrome.storage.sync.get(this.settings, resolve);
                });
                savedSettings = result;
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem('imageDownloaderSettings');
                if (stored) {
                    savedSettings = JSON.parse(stored);
                }
            }

            // Merge with defaults
            this.settings = { ...this.settings, ...savedSettings };
            this.updateUI();

        } catch (error) {
            console.warn('Could not load settings:', error);
            this.updateUI();
        }
    }

    updateUI() {
        // Update form fields with current settings
        this.elements.downloadPath.value = this.settings.downloadPath || '';
        this.elements.filenamePattern.value = this.settings.filenamePattern;
        this.elements.openAfterDownload.checked = this.settings.openAfterDownload;
        this.elements.avoidDuplicates.checked = this.settings.avoidDuplicates;
        this.elements.defaultMinWidth.value = this.settings.defaultMinWidth;
        this.elements.defaultMinHeight.value = this.settings.defaultMinHeight;
        this.elements.includeBackgrounds.checked = this.settings.includeBackgrounds;
        this.elements.maxConcurrentDownloads.value = this.settings.maxConcurrentDownloads;
        this.elements.downloadDelay.value = this.settings.downloadDelay;
        this.elements.enableNotifications.checked = this.settings.enableNotifications;

        // Update range value displays
        this.elements.maxConcurrentDownloads.parentNode.querySelector('.range-value').textContent = 
            `${this.settings.maxConcurrentDownloads} downloads`;
        this.elements.downloadDelay.parentNode.querySelector('.range-value').textContent = 
            `${this.settings.downloadDelay}ms`;

        // Update format checkboxes
        this.elements.formatCheckboxes.forEach(checkbox => {
            checkbox.checked = this.settings.allowedFormats.includes(checkbox.value);
        });
    }

    async saveSettings(showNotification = true) {
        try {
            // Collect current form values
            const newSettings = {
                downloadPath: this.elements.downloadPath.value,
                filenamePattern: this.elements.filenamePattern.value,
                openAfterDownload: this.elements.openAfterDownload.checked,
                avoidDuplicates: this.elements.avoidDuplicates.checked,
                defaultMinWidth: parseInt(this.elements.defaultMinWidth.value) || 0,
                defaultMinHeight: parseInt(this.elements.defaultMinHeight.value) || 0,
                allowedFormats: Array.from(this.elements.formatCheckboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value),
                includeBackgrounds: this.elements.includeBackgrounds.checked,
                maxConcurrentDownloads: parseInt(this.elements.maxConcurrentDownloads.value),
                downloadDelay: parseInt(this.elements.downloadDelay.value),
                enableNotifications: this.elements.enableNotifications.checked
            };

            this.settings = newSettings;

            // Save to appropriate storage
            if (typeof safari !== 'undefined' && safari.extension && safari.extension.settings) {
                // Safari extension settings
                Object.keys(newSettings).forEach(key => {
                    safari.extension.settings[key] = newSettings[key];
                });
            } else if (typeof chrome !== 'undefined' && chrome.storage) {
                // Chrome storage API
                await new Promise((resolve) => {
                    chrome.storage.sync.set(newSettings, resolve);
                });
            } else {
                // Fallback to localStorage
                localStorage.setItem('imageDownloaderSettings', JSON.stringify(newSettings));
            }

            if (showNotification) {
                this.showNotification('Settings saved successfully!');
            }

        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.settings = this.getDefaultSettings();
            this.updateUI();
            this.saveSettings();
        }
    }

    async browseDownloadPath() {
        try {
            if (typeof safari !== 'undefined' && safari.extension) {
                // Safari file picker - send message to native app
                safari.extension.dispatchMessage('browseDownloadPath');
                // In a real Safari extension, this would trigger a native file picker
                // For now, show a placeholder message
                alert('File picker would open here in a real Safari extension');
            } else {
                // Fallback - show input dialog
                const path = prompt('Enter download path:', this.settings.downloadPath);
                if (path !== null) {
                    this.elements.downloadPath.value = path;
                }
            }
        } catch (error) {
            console.error('Browse path failed:', error);
        }
    }

    showNotification(message, type = 'success') {
        const notification = this.elements.notification;
        const span = notification.querySelector('span');
        
        span.textContent = message;
        notification.classList.remove('hidden');
        
        // Change color for error
        if (type === 'error') {
            notification.style.backgroundColor = '#dc3545';
        } else {
            notification.style.backgroundColor = '#28a745';
        }

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Initialize options page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ImageDownloaderOptions();
});

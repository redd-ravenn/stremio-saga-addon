class AddonConfigurator {
    constructor() {
        this.form = document.getElementById('mainForm');
        this.installButton = document.getElementById('installButton');
        this.copyButton = document.getElementById('copyButton');
        this.popup = document.getElementById('popup');
        this.languageSelect = document.getElementById('language');
        this.apiKeyInput = document.getElementById('tmdbApiKey');
        this.showRatingCheckbox = document.getElementById('showRating');
        this.showTaglineCheckbox = document.getElementById('showTagline');

        this.initializeForm();
    }

    async initializeForm() {
        this.populateLanguageDropdown();
        
        this.loadConfigFromUrl();
        
        this.initializeEventListeners();
        this.updateButtonsState();
    }

    populateLanguageDropdown() {
        this.languageSelect.innerHTML = `
            <option value="" disabled selected>Select your preferred language</option>
        `;

        const sortedLanguages = languages
            .filter(lang => lang.name || ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'].includes(lang.iso_639_1))
            .sort((a, b) => a.english_name.localeCompare(b.english_name));

        const fragment = document.createDocumentFragment();
        
        sortedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.iso_639_1;
            option.textContent = lang.name 
                ? `${lang.english_name} (${lang.name})` 
                : lang.english_name;
            fragment.appendChild(option);
        });

        this.languageSelect.appendChild(fragment);
    }

    updateButtonsState() {
        const isValid = this.validateForm(false);
        this.installButton.disabled = !isValid;
        this.copyButton.disabled = !isValid;
        
        [this.installButton, this.copyButton].forEach(button => {
            button.style.opacity = isValid ? '1' : '0.5';
            button.style.cursor = isValid ? 'pointer' : 'not-allowed';
        });
    }

    getConfigLink(protocol = 'https') {
        const config = Object.fromEntries(new FormData(this.form));
        const baseUrl = protocol === 'stremio' ? 'stremio://' : 'https://';
        return `${baseUrl}${window.location.host}/${encodeURIComponent(JSON.stringify(config))}/manifest.json`;
    }

    showPopup(message, type) {
        this.popup.textContent = message;
        this.popup.className = `popup ${type}`;
        this.popup.style.display = 'block';
        this.popup.style.opacity = '1';
        this.popup.style.transform = 'translateX(-50%) translateY(0)';

        setTimeout(() => {
            this.popup.style.opacity = '0';
            this.popup.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                this.popup.style.display = 'none';
            }, 300);
        }, 3000);
    }

    validateForm(showError = true) {
        const tmdbApiKey = this.apiKeyInput.value.trim();
        const language = this.languageSelect.value.trim();
        
        if (!tmdbApiKey || !language) {
            if (showError) {
                this.showPopup('Please fill in both TMDB API Key and Language fields.', 'error');
            }
            return false;
        }
        return true;
    }

    async copyToClipboard() {
        if (!this.validateForm()) return;

        try {
            const link = this.getConfigLink();
            await navigator.clipboard.writeText(link);
            this.showPopup('Link copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy the link:', err);
            this.showPopup('Failed to copy the link.', 'error');
        }
    }

    installAddon() {
        if (!this.validateForm()) return;
        window.location.href = this.getConfigLink('stremio');
    }

    initializeEventListeners() {
        this.installButton.addEventListener('click', () => this.installAddon());
        this.copyButton.addEventListener('click', () => this.copyToClipboard());
        
        this.apiKeyInput.addEventListener('input', () => this.updateButtonsState());
        this.languageSelect.addEventListener('change', () => this.updateButtonsState());
    }

    loadConfigFromUrl() {
        try {
            const pathSegments = window.location.pathname.split('/');
            const encodedConfig = pathSegments.find(segment => {
                try {
                    return segment.includes('tmdbApiKey');
                } catch {
                    return false;
                }
            });
            
            if (encodedConfig) {
                const config = JSON.parse(decodeURIComponent(encodedConfig));
                
                requestAnimationFrame(() => {
                    if (config.language) {
                        this.languageSelect.value = config.language;
                    }
                    if (config.tmdbApiKey) {
                        this.apiKeyInput.value = config.tmdbApiKey;
                    }
                    if (config.showRating === 'on') {
                        this.showRatingCheckbox.checked = true;
                    }
                    if (config.showTagline === 'on') {
                        this.showTaglineCheckbox.checked = true;
                    }
                    this.updateButtonsState();
                });
            }
        } catch (error) {
            console.error('Error parsing URL config:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AddonConfigurator();
}); 
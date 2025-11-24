const Engine = {
    // --- 1. EXISTING REGISTRY ---
    themes: [
        { id: 'simple', name: 'Simple Digital', accentColor: '#333333', image: '' },
        { id: 'breathe', name: 'Deep Breathing', accentColor: '#666666', image: '' }
    ],

    state: {
        activeThemeId: 'simple',
        themeSettings: {}
    },
    
    // --- NEW: SESSION STATE ---
    session: {
        active: false,
        startTime: null,
        interval: null
    },

    currentThemeObj: null,

    dom: {
        stage: document.getElementById('stage'),
        cssLink: document.getElementById('theme-stylesheet'),
        libraryDrawer: document.getElementById('library-drawer'),
        settingsDrawer: document.getElementById('settings-panel'),
        themeGrid: document.getElementById('theme-grid'),
        settingsContent: document.getElementById('settings-content'),
        
        // NEW DOM ELEMENTS
        sessionHandle: document.getElementById('session-handle'),
        sessionPanel: document.getElementById('session-panel'),
        sessionTimer: document.getElementById('session-timer'),
        sessionBtn: document.getElementById('btn-session-toggle'),
        sessionText: document.getElementById('session-status-text')
    },

    init: function() {
        this.loadState();
        
        // Existing Listeners
        document.getElementById('btn-library').addEventListener('click', () => {
            this.dom.libraryDrawer.classList.add('active');
            this.dom.settingsDrawer.classList.remove('active');
            this.closeSessionPanel(); // Close bottom panel if open
        });
        document.getElementById('btn-close-library').addEventListener('click', () => this.dom.libraryDrawer.classList.remove('active'));

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.dom.settingsDrawer.classList.add('active');
            this.dom.libraryDrawer.classList.remove('active');
            this.closeSessionPanel(); // Close bottom panel if open
        });
        document.getElementById('btn-close-settings').addEventListener('click', () => this.dom.settingsDrawer.classList.remove('active'));

        // --- NEW: SESSION LISTENERS ---
        
        // 1. Click Handle to toggle Panel
        this.dom.sessionHandle.addEventListener('click', () => {
            this.dom.sessionPanel.classList.toggle('active');
            // Close other drawers
            this.dom.libraryDrawer.classList.remove('active');
            this.dom.settingsDrawer.classList.remove('active');
        });

        // 2. Click Main Button to Start/Stop
        this.dom.sessionBtn.addEventListener('click', () => {
            this.toggleSession();
        });

        this.buildLibraryUI();
        this.loadTheme(this.state.activeThemeId);
        this.startClock();
    },

    // --- NEW: SESSION LOGIC ---
    
    toggleSession: function() {
        if (!this.session.active) {
            // START SESSION
            this.session.active = true;
            this.session.startTime = Date.now();
            
            // UI Updates
            this.dom.sessionBtn.innerText = "Stop Session";
            this.dom.sessionBtn.classList.add('stop-mode');
            this.dom.sessionHandle.classList.add('meditating'); // Turns Green
            this.dom.sessionText.innerText = "In Progress";
            
            // Auto-close the panel so you can meditate
            setTimeout(() => {
                this.dom.sessionPanel.classList.remove('active');
            }, 500);

        } else {
            // STOP SESSION
            this.session.active = false;
            this.session.startTime = null;
            
            // UI Updates
            this.dom.sessionBtn.innerText = "Begin Meditation";
            this.dom.sessionBtn.classList.remove('stop-mode');
            this.dom.sessionHandle.classList.remove('meditating'); // Removes Green
            this.dom.sessionText.innerText = "Start Session";
            this.dom.sessionTimer.innerText = "00:00:00";
        }
    },

    closeSessionPanel: function() {
        this.dom.sessionPanel.classList.remove('active');
    },

    // --- HELPER: FORMAT TIME ---
    getFormattedDuration: function() {
        if (!this.session.startTime) return "00:00:00";
        
        const diff = Date.now() - this.session.startTime;
        const seconds = Math.floor((diff / 1000) % 60);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const hours = Math.floor((diff / (1000 * 60 * 60)));

        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    },

    // --- EXISTING LOGIC ---

    buildLibraryUI: function() {
        const container = this.dom.themeGrid;
        container.innerHTML = ''; 
        this.themes.forEach(theme => {
            const tile = document.createElement('div');
            tile.className = 'theme-tile';
            if (theme.id === this.state.activeThemeId) tile.classList.add('active');

            const text = document.createElement('span');
            text.className = 'tile-text';
            text.innerText = theme.name;
            const dot = document.createElement('div');
            dot.className = 'tile-dot';
            
            tile.appendChild(text);
            tile.appendChild(dot);
            tile.addEventListener('click', () => {
                this.loadTheme(theme.id);
                this.buildLibraryUI(); 
            });
            container.appendChild(tile);
        });
    },

    loadTheme: function(themeId) {
        if (this.currentThemeObj && this.currentThemeObj.destroy) this.currentThemeObj.destroy();
        this.state.activeThemeId = themeId;
        this.saveState();
        this.dom.cssLink.href = `themes/${themeId}/theme.css`;
        const oldScript = document.getElementById('theme-script');
        if (oldScript) oldScript.remove();
        const script = document.createElement('script');
        script.src = `themes/${themeId}/theme.js`;
        script.id = 'theme-script';
        script.onload = () => {
            if (window.ActiveTheme) {
                this.currentThemeObj = window.ActiveTheme;
                const saved = this.state.themeSettings[themeId] || {};
                this.currentThemeObj.init(this.dom.stage, saved);
                this.buildSettingsUI(themeId);
                this.tick();
            }
        };
        document.body.appendChild(script);
    },

    buildSettingsUI: function(themeId) {
        const container = this.dom.settingsContent;
        container.innerHTML = '';
        if (!this.currentThemeObj || !this.currentThemeObj.settingsConfig) {
            container.innerHTML = '<div style="color:#444; font-size:10px; text-transform:uppercase;">No Configuration</div>';
            return;
        }
        const config = this.currentThemeObj.settingsConfig;
        for (const [key, setting] of Object.entries(config)) {
            if (setting.type === 'range') {
                const wrapper = document.createElement('div');
                wrapper.className = 'setting-item';
                const label = document.createElement('span');
                label.className = 'setting-label';
                label.innerText = setting.label;
                wrapper.appendChild(label);
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = setting.min;
                slider.max = setting.max;
                slider.value = this.state.themeSettings[themeId]?.[key] || setting.default;
                slider.oninput = (e) => this.updateSetting(themeId, key, e.target.value);
                wrapper.appendChild(slider);
                container.appendChild(wrapper);
            }
        }
    },

    updateSetting: function(themeId, key, value) {
        if (!this.state.themeSettings[themeId]) this.state.themeSettings[themeId] = {};
        this.state.themeSettings[themeId][key] = value;
        this.saveState();
        if (this.currentThemeObj.onSettingsChange) this.currentThemeObj.onSettingsChange(key, value);
    },

    saveState: function() {
        localStorage.setItem('meditation_os_state', JSON.stringify(this.state));
    },

    loadState: function() {
        const saved = localStorage.getItem('meditation_os_state');
        if (saved) this.state = { ...this.state, ...JSON.parse(saved) };
    },

    startClock: function() { setInterval(() => this.tick(), 1000); },

    // UPDATED TICK FUNCTION
    tick: function() {
        // 1. Update Clock Theme
        if (this.currentThemeObj) {
            const now = new Date();
            this.currentThemeObj.update({
                h: String(now.getHours()).padStart(2, '0'),
                m: String(now.getMinutes()).padStart(2, '0'),
                s: String(now.getSeconds()).padStart(2, '0')
            });
        }

        // 2. Update Session Timer (If active)
        if (this.session.active) {
            this.dom.sessionTimer.innerText = this.getFormattedDuration();
        }
    }
};

Engine.init();
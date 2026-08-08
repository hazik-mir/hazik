/**
 * HAZIK.IN - Minecraft Bedrock Client Store
 * Production Ready Application
 * Created by: hazik-mir
 * 
 * Features:
 * - Dynamic client loading from clients.info
 * - Real-time search
 * - Modal detail view
 * - Image carousel
 * - Keyboard shortcuts
 * - Responsive design
 * - Error handling
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    CLIENTS_FILE: 'clients.info',
    CAROUSEL_INTERVAL: 5000,
    DISCORD_SERVER_LINK: 'https://discord.gg/Vqh2PgJHNN', // Main server
    REPORT_DISCORD_LINK: 'https://discord.gg/gGFcU8NTjC', // Report issues here
    REPORT_EMAIL: 'contact@hazik.in',
    REPORT_EMAIL_ALT: 'hazikmir01@gmail.com',
    LOCAL_STORAGE_KEY: 'hazik_settings',
};

// ============================================
// APPLICATION STATE
// ============================================

const appState = {
    clients: [],
    filteredClients: [],
    currentHeroIndex: 0,
    currentModalClient: null,
    currentCarouselIndex: 0,
    carouselInterval: null,
    isLoading: true,
    hasError: false,
    searchQuery: '',
    currentPlatform: 'all',
    availablePlatforms: [],
};

// ============================================
// DOM ELEMENTS
// ============================================

const dom = {
    navbar: document.getElementById('navbar'),
    searchInput: document.getElementById('searchInput'),
    settingsBtn: document.getElementById('settingsBtn'),
    aboutBtn: document.getElementById('aboutBtn'),
    loadingSkeleton: document.getElementById('loadingSkeleton'),
    errorContainer: document.getElementById('errorContainer'),
    contentContainer: document.getElementById('contentContainer'),
    heroSection: document.getElementById('heroSection'),
    heroBg: document.getElementById('heroBg'),
    heroIcon: document.getElementById('heroIcon'),
    heroTitle: document.getElementById('heroTitle'),
    heroVersion: document.getElementById('heroVersion'),
    heroDescription: document.getElementById('heroDescription'),
    heroDownloadBtn: document.getElementById('heroDownloadBtn'),
    heroWebsiteBtn: document.getElementById('heroWebsiteBtn'),
    carouselIndicators: document.getElementById('carouselIndicators'),
    clientsGrid: document.getElementById('clientsGrid'),
    detailModal: document.getElementById('detailModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalClose: document.getElementById('modalClose'),
    modalIcon: document.getElementById('modalIcon'),
    modalTitle: document.getElementById('modalTitle'),
    modalVersion: document.getElementById('modalVersion'),
    modalCredits: document.getElementById('modalCredits'),
    modalDescription: document.getElementById('modalDescription'),
    carouselImages: document.getElementById('carouselImages'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    modalDownloadBtn: document.getElementById('modalDownloadBtn'),
    modalWebsiteBtn: document.getElementById('modalWebsiteBtn'),
    modalReportBtn: document.getElementById('modalReportBtn'),
    settingsModal: document.getElementById('settingsModal'),
    settingsBackdrop: document.getElementById('settingsBackdrop'),
    settingsClose: document.getElementById('settingsClose'),
    discordLinkInput: document.getElementById('discordLinkInput'),
    aboutModal: document.getElementById('aboutModal'),
    aboutBackdrop: document.getElementById('aboutBackdrop'),
    aboutClose: document.getElementById('aboutClose'),
    reportModal: document.getElementById('reportModal'),
    reportBackdrop: document.getElementById('reportBackdrop'),
    reportClose: document.getElementById('reportClose'),
    reportEmailBtn: document.getElementById('reportEmailBtn'),
    reportDiscordBtn: document.getElementById('reportDiscordBtn'),
    requestClientBtn: document.getElementById('requestClientBtn'),
    modalDownloadOptions: document.getElementById('modalDownloadOptions'),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Fetches and parses the clients.info file
 * @returns {Promise<Array>} Array of parsed clients
 */
async function fetchClients() {
    try {
        // Try different file paths in case of relative path issues
        const paths = [
            CONFIG.CLIENTS_FILE,
            './' + CONFIG.CLIENTS_FILE,
            '/' + CONFIG.CLIENTS_FILE,
        ];

        let response;
        let lastError;

        for (const path of paths) {
            try {
                response = await fetch(path, { 
                    cache: 'no-cache',
                    headers: {
                        'Accept': 'text/plain'
                    }
                });
                if (response.ok) {
                    const text = await response.text();
                    console.log('Successfully fetched clients.info');
                    return parseClientsFile(text);
                }
            } catch (e) {
                lastError = e;
                continue;
            }
        }

        // If all paths failed
        throw new Error(`Failed to load clients.info from any path. Last error: ${lastError?.message}`);
    } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
    }
}

/**
 * Parses clients.info file content with flexible formatting
 * Format:
 * !name="value"
 * !version="value"
 * ...
 * ---
 * Next client...
 */
function parseClientsFile(content) {
    if (!content || content.trim() === '') {
        throw new Error('clients.info is empty or missing');
    }

    const clients = [];
    
    // Split by --- separator
    const clientBlocks = content.split(/---+/).map(block => block.trim()).filter(Boolean);

    console.log(`%c✓ Found ${clientBlocks.length} client blocks`, 'color: green; font-weight: bold');

    for (let blockIndex = 0; blockIndex < clientBlocks.length; blockIndex++) {
        const block = clientBlocks[blockIndex];
        const lines = block.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        if (lines.length === 0) continue;

        const client = {};
        let blockName = `Block ${blockIndex + 1}`;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            // Parse labeled fields: !key"label"="value"
            let match = line.match(/^!(\w+)"([^"]+)"="(.*)$/);
            if (match) {
                const key = match[1].toLowerCase();
                const label = match[2];
                const value = match[3];
                
                if (key === 'downloadlink') {
                    if (!client.downloads) client.downloads = {};
                    client.downloads[label] = value;
                }
                continue;
            }
            
            // Parse regular fields: !key="value"
            match = line.match(/^!(\w+)="(.*)$/);
            if (!match) {
                console.warn(`⚠ Skipping invalid line in ${blockName} (line ${lineIndex + 1}): ${line}`);
                continue;
            }

            const key = match[1].toLowerCase();
            let value = match[2];
            
            // Remove trailing quote if present
            if (value.endsWith('"')) {
                value = value.slice(0, -1);
            }

            if (key === 'coverimages') {
                // Handle comma-separated images
                client[key] = value
                    .split(/",\s*"/)
                    .map(img => img.replace(/^"|"$/g, '').trim())
                    .filter(Boolean);
            } else if (key === 'platform') {
                // Handle comma-separated platforms
                client[key] = value
                    .split(',')
                    .map(p => p.trim().toLowerCase())
                    .filter(Boolean);
            } else if (key === 'downloadlink') {
                // Set as default download link
                client[key] = value;
                if (!client.downloads) client.downloads = {};
                client.downloads['Download'] = value;
            } else {
                client[key] = value;
            }
        }

        // Validate required fields
        const hasRequiredFields = client.name && client.version && client.icon && client.downloadlink;
        
        if (hasRequiredFields) {
            // Set defaults for optional fields
            if (!client.description) client.description = 'No description provided';
            if (!client.credits) client.credits = 'Unknown Developer';
            if (!client.officiallink) client.officiallink = '#';
            if (!client.platform || client.platform.length === 0) client.platform = ['bedrock']; // Default to bedrock if not specified
            if (!client.coverimages || client.coverimages.length === 0) {
                client.coverimages = [client.icon];
            }
            clients.push(client);
            console.log(`%c✓ Added: ${client.name} [${client.platform.join(', ')}]`, 'color: green');
        } else {
            console.error(`%c✗ FAILED to add client in block ${blockIndex + 1}`, 'color: red; font-weight: bold');
            console.error(`  - name: ${client.name || '❌ MISSING'}`);
            console.error(`  - version: ${client.version || '❌ MISSING'}`);
            console.error(`  - icon: ${client.icon || '❌ MISSING'}`);
            console.error(`  - downloadlink: ${client.downloadlink || '❌ MISSING'}`);
            console.error(`  All fields found: ${JSON.stringify(Object.keys(client))}`);
        }
    }

    if (clients.length === 0) {
        const error = 'No valid clients found in clients.info. Check browser console (F12) for details.';
        console.error(`%c${error}`, 'color: red; font-size: 14px; font-weight: bold');
        throw new Error(error);
    }

    console.log(`%c✓ Successfully parsed ${clients.length} clients!`, 'color: green; font-size: 14px; font-weight: bold');
    console.table(clients.map(c => ({ name: c.name, version: c.version, platforms: c.platform.join(', ') })));
    return clients;
}

/**
 * Display error screen
 */
function showError(title = 'ERROR 2094', subtitle = 'Please complain to the developer.') {
    dom.loadingSkeleton.classList.add('hidden');
    dom.contentContainer.classList.add('hidden');
    
    const errorHTML = `
        <div class="error-container">
            <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h1 class="error-title">${title}</h1>
            <p class="error-subtitle">${subtitle}</p>
            <p class="error-hint"><strong>💡 Hint:</strong> Press F12 to open Browser Console → See error details</p>
            <button class="error-retry-btn" onclick="location.reload()">Retry</button>
        </div>
    `;
    
    dom.errorContainer.innerHTML = errorHTML;
    dom.errorContainer.classList.remove('hidden');
    appState.hasError = true;
}

/**
 * Initialize the application
 */
async function initializeApp() {
    try {
        // Load settings from localStorage
        loadSettings();

        // Fetch and parse clients
        appState.clients = await fetchClients();
        appState.filteredClients = [...appState.clients];

        // Extract and render platforms
        extractAvailablePlatforms();
        renderPlatformTabs();

        // Hide loading skeleton
        dom.loadingSkeleton.classList.add('hidden');
        dom.contentContainer.classList.remove('hidden');

        // Render hero and grid
        renderHero();
        renderClientsGrid();
        setupEventListeners();

        // Start carousel
        startCarousel();

        appState.isLoading = false;
    } catch (error) {
        console.error('Initialization error:', error);
        showError('ERROR 2094', 'Please complain to the developer.');
    }
}

// ============================================
// PLATFORM FILTERING FUNCTIONS
// ============================================

/**
 * Extract all available platforms from clients
 */
function extractAvailablePlatforms() {
    const platforms = new Set();
    
    for (const client of appState.clients) {
        if (client.platform && Array.isArray(client.platform)) {
            client.platform.forEach(p => platforms.add(p));
        }
    }
    
    appState.availablePlatforms = Array.from(platforms).sort();
    console.log('Available platforms:', appState.availablePlatforms);
}

/**
 * Render platform tabs
 */
function renderPlatformTabs() {
    const tabsContainer = document.getElementById('platformTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    const platforms = ['all', ...appState.availablePlatforms];
    
    platforms.forEach(platform => {
        const tab = document.createElement('button');
        tab.className = `platform-tab ${platform === appState.currentPlatform ? 'active' : ''}`;
        
        // Format platform name
        if (platform === 'all') {
            tab.textContent = 'All Clients';
        } else {
            tab.textContent = platform.charAt(0).toUpperCase() + platform.slice(1) + ' Clients';
        }
        
        tab.onclick = () => filterByPlatform(platform);
        tabsContainer.appendChild(tab);
    });
}

/**
 * Filter clients by platform
 */
function filterByPlatform(platform) {
    appState.currentPlatform = platform;
    
    // Update active tab
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter clients
    if (platform === 'all') {
        appState.filteredClients = [...appState.clients];
    } else {
        appState.filteredClients = appState.clients.filter(client => {
            return client.platform && client.platform.includes(platform);
        });
    }
    
    // Apply search filter on top of platform filter
    if (appState.searchQuery) {
        performSearch(appState.searchQuery);
    } else {
        renderHero();
        renderClientsGrid();
    }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

/**
 * Render hero section
 */
function renderHero() {
    if (appState.filteredClients.length === 0) return;

    const client = appState.filteredClients[appState.currentHeroIndex];

    // Update background
    const coverImage = client.coverimages[0] || client.icon;
    dom.heroBg.style.backgroundImage = `url('${coverImage}')`;

    // Update content
    dom.heroIcon.src = client.icon;
    dom.heroIcon.alt = client.name;
    dom.heroTitle.textContent = client.name;
    dom.heroVersion.textContent = `Version ${client.version}`;
    dom.heroDescription.textContent = client.description;

    // Update buttons
    dom.heroDownloadBtn.onclick = () => downloadClient(client);
    dom.heroWebsiteBtn.onclick = () => window.open(client.officiallink, '_blank');

    // Update carousel indicators
    renderCarouselIndicators();
}

/**
 * Render carousel indicators
 */
function renderCarouselIndicators() {
    dom.carouselIndicators.innerHTML = '';

    for (let i = 0; i < Math.min(appState.filteredClients.length, 5); i++) {
        const indicator = document.createElement('div');
        indicator.className = `carousel-indicator ${i === appState.currentHeroIndex ? 'active' : ''}`;
        indicator.onclick = () => {
            appState.currentHeroIndex = i;
            clearInterval(appState.carouselInterval);
            renderHero();
            startCarousel();
        };
        dom.carouselIndicators.appendChild(indicator);
    }
}

/**
 * Render clients grid
 */
function renderClientsGrid() {
    dom.clientsGrid.innerHTML = '';

    if (appState.filteredClients.length === 0) {
        dom.clientsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-tertiary);">
                <p>No clients found matching your search.</p>
            </div>
        `;
        return;
    }

    appState.filteredClients.forEach((client, index) => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
            <img src="${client.icon}" alt="${client.name}" class="client-icon">
            <h3 class="client-name">${escapeHTML(client.name)}</h3>
            <p class="client-version">v${escapeHTML(client.version)}</p>
            <p class="client-credits">${escapeHTML(client.credits)}</p>
            <p class="client-description">${escapeHTML(client.description)}</p>
        `;
        card.onclick = () => openDetailModal(client);
        dom.clientsGrid.appendChild(card);

        // Lazy loading animation
        setTimeout(() => {
            card.style.animation = 'fadeInUp 0.5s ease-out forwards';
        }, index * 50);
    });
}

/**
 * Open detail modal for a client
 */
function openDetailModal(client) {
    appState.currentModalClient = client;
    appState.currentCarouselIndex = 0;

    // Update modal content
    dom.modalIcon.src = client.icon;
    dom.modalIcon.alt = client.name;
    dom.modalTitle.textContent = client.name;
    dom.modalVersion.textContent = `Version ${client.version}`;
    dom.modalCredits.textContent = `By ${client.credits}`;
    dom.modalDescription.textContent = client.description;

    // Render carousel
    renderModalCarousel();

    // Render download buttons
    renderDownloadOptions(client);

    // Update buttons
    dom.modalWebsiteBtn.onclick = () => window.open(client.officiallink, '_blank');
    dom.modalReportBtn.onclick = () => openReportModal();

    // Show modal
    dom.detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Render multiple download buttons
 */
function renderDownloadOptions(client) {
    dom.modalDownloadOptions.innerHTML = '';
    
    if (!client.downloads || Object.keys(client.downloads).length === 0) {
        // Fallback to default download link
        if (client.downloadlink) {
            const btn = document.createElement('button');
            btn.className = 'download-btn';
            btn.innerHTML = '<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download';
            btn.onclick = () => window.open(client.downloadlink, '_blank');
            dom.modalDownloadOptions.appendChild(btn);
        }
        return;
    }
    
    // Show all download options
    for (const [label, url] of Object.entries(client.downloads)) {
        const btn = document.createElement('button');
        btn.className = 'download-btn';
        btn.innerHTML = `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> ${label}`;
        btn.onclick = () => window.open(url, '_blank');
        dom.modalDownloadOptions.appendChild(btn);
    }
}

/**
 * Close detail modal
 */
function closeDetailModal() {
    dom.detailModal.classList.add('hidden');
    document.body.style.overflow = '';
    appState.currentModalClient = null;
}

/**
 * Render modal carousel
 */
function renderModalCarousel() {
    const client = appState.currentModalClient;
    dom.carouselImages.innerHTML = '';

    client.coverimages.forEach((image) => {
        const img = document.createElement('img');
        img.src = image;
        img.alt = client.name;
        img.className = 'carousel-image';
        dom.carouselImages.appendChild(img);
    });

    updateCarouselPosition();
}

/**
 * Update carousel position
 */
function updateCarouselPosition() {
    const offset = appState.currentCarouselIndex * -100;
    dom.carouselImages.style.transform = `translateX(${offset}%)`;
}

/**
 * Go to next carousel image
 */
function nextImage() {
    const maxIndex = appState.currentModalClient.coverimages.length - 1;
    appState.currentCarouselIndex = (appState.currentCarouselIndex + 1) % (maxIndex + 1);
    updateCarouselPosition();
}

/**
 * Go to previous carousel image
 */
function prevImage() {
    const maxIndex = appState.currentModalClient.coverimages.length - 1;
    appState.currentCarouselIndex = (appState.currentCarouselIndex - 1 + maxIndex + 1) % (maxIndex + 1);
    updateCarouselPosition();
}

/**
 * Open settings modal
 */
function openSettingsModal() {
    dom.discordLinkInput.value = CONFIG.DISCORD_REPORT_LINK;
    dom.settingsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
    // Save settings
    CONFIG.DISCORD_REPORT_LINK = dom.discordLinkInput.value;
    saveSettings();
    
    dom.settingsModal.classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Open about modal
 */
function openAboutModal() {
    dom.aboutModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Close about modal
 */
function closeAboutModal() {
    dom.aboutModal.classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Open report modal
 */
function openReportModal() {
    dom.reportModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/**
 * Close report modal
 */
function closeReportModal() {
    dom.reportModal.classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Report via email
 */
function reportViaEmail() {
    const client = appState.currentModalClient;
    if (!client) return;

    const subject = encodeURIComponent(`Report: ${client.name} v${client.version}`);
    const body = encodeURIComponent(
        `Issue Report for: ${client.name} v${client.version}\n\n` +
        `Please describe the issue:\n\n\n` +
        `---\n` +
        `Client: ${client.name}\n` +
        `Version: ${client.version}\n` +
        `Developer: ${client.credits}\n` +
        `Download Link: ${client.downloadlink}`
    );

    window.location.href = `mailto:${CONFIG.REPORT_EMAIL}?subject=${subject}&body=${body}`;
    closeReportModal();
}

/**
 * Report via Discord
 */
function reportViaDiscord() {
    window.open(CONFIG.REPORT_DISCORD_LINK, '_blank');
    closeReportModal();
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

/**
 * Perform search with query and platform filter
 */
function performSearch(query) {
    appState.searchQuery = query.toLowerCase();
    filterClientsByPlatformAndSearch();
}

/**
 * Filter clients by platform and search query
 */
function filterClientsByPlatformAndSearch() {
    let filtered = appState.clients;

    // Filter by platform
    if (appState.currentPlatform !== 'all') {
        filtered = filtered.filter(client => {
            return client.platform && client.platform.includes(appState.currentPlatform);
        });
    }

    // Filter by search query
    if (appState.searchQuery) {
        filtered = filtered.filter(client => {
            const searchableText = `
                ${client.name}
                ${client.description}
                ${client.version}
                ${client.credits}
            `.toLowerCase();

            return searchableText.includes(appState.searchQuery);
        });
    }

    appState.filteredClients = filtered;

    // Reset hero index if out of bounds
    if (appState.currentHeroIndex >= appState.filteredClients.length) {
        appState.currentHeroIndex = 0;
    }

    renderHero();
    renderClientsGrid();
    updateSectionTitle();
}

// ============================================
// CAROUSEL FUNCTIONALITY
// ============================================

/**
 * Start auto-rotating carousel
 */
function startCarousel() {
    clearInterval(appState.carouselInterval);
    appState.carouselInterval = setInterval(() => {
        appState.currentHeroIndex = (appState.currentHeroIndex + 1) % appState.filteredClients.length;
        renderHero();
    }, CONFIG.CAROUSEL_INTERVAL);
}

// ============================================
// DOWNLOAD & UTILITIES
// ============================================

/**
 * Download a client
 */
function downloadClient(client) {
    window.open(client.downloadlink, '_blank');
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// SETTINGS MANAGEMENT
// ============================================

/**
 * Save settings to localStorage
 */
function saveSettings() {
    const settings = {
        discordLink: CONFIG.DISCORD_REPORT_LINK,
    };
    localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const stored = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
    if (stored) {
        try {
            const settings = JSON.parse(stored);
            CONFIG.DISCORD_REPORT_LINK = settings.discordLink || '';
        } catch (error) {
            console.error('Error parsing settings:', error);
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Platform Tabs
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const platform = tab.getAttribute('data-platform');
            
            // Remove active class from all tabs
            document.querySelectorAll('.platform-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Filter clients
            filterByPlatform(platform);
        });
    });

    // Search
    dom.searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            dom.searchInput.focus();
        }

        // ESC to close modal
        if (e.key === 'Escape') {
            if (!dom.reportModal.classList.contains('hidden')) {
                closeReportModal();
            } else if (!dom.detailModal.classList.contains('hidden')) {
                closeDetailModal();
            } else if (!dom.settingsModal.classList.contains('hidden')) {
                closeSettingsModal();
            } else if (!dom.aboutModal.classList.contains('hidden')) {
                closeAboutModal();
            }
        }

        // Arrow keys for carousel
        if (!dom.detailModal.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
        }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            dom.navbar.classList.add('scrolled');
        } else {
            dom.navbar.classList.remove('scrolled');
        }
    });

    // Settings
    dom.settingsBtn.addEventListener('click', openSettingsModal);
    dom.settingsClose.addEventListener('click', closeSettingsModal);
    dom.settingsBackdrop.addEventListener('click', closeSettingsModal);

    // About
    dom.aboutBtn.addEventListener('click', openAboutModal);
    dom.aboutClose.addEventListener('click', closeAboutModal);
    dom.aboutBackdrop.addEventListener('click', closeAboutModal);

    // Report
    dom.reportClose.addEventListener('click', closeReportModal);
    dom.reportBackdrop.addEventListener('click', closeReportModal);
    dom.reportEmailBtn.addEventListener('click', reportViaEmail);
    dom.reportDiscordBtn.addEventListener('click', reportViaDiscord);

    // Request Client Button
    dom.requestClientBtn.addEventListener('click', openReportModal);

    // Modal close
    dom.modalClose.addEventListener('click', closeDetailModal);
    dom.modalBackdrop.addEventListener('click', closeDetailModal);

    // Carousel navigation
    dom.prevBtn.addEventListener('click', prevImage);
    dom.nextBtn.addEventListener('click', nextImage);

    // Touch/swipe support for mobile
    let touchStartX = 0;
    dom.carouselImages?.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, false);

    dom.carouselImages?.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) {
            nextImage();
        } else if (touchEndX - touchStartX > 50) {
            prevImage();
        }
    }, false);

    // Footer links
    document.getElementById('privacyLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Privacy Policy\n\nHazik.in does not collect any personal information from users. All client data is loaded from the clients.info file.');
    });

    document.getElementById('footerPrivacy')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Privacy Policy\n\nHazik.in does not collect any personal information from users. All client data is loaded from the clients.info file.');
    });

    document.getElementById('footerAbout')?.addEventListener('click', (e) => {
        e.preventDefault();
        openAboutModal();
    });

    document.getElementById('footerSettings')?.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Auto-reload when clients.info changes (development feature)
if (navigator.userAgent.includes('Firefox') || navigator.userAgent.includes('Chrome')) {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch(CONFIG.CLIENTS_FILE);
            const text = await response.text();
            const newClients = parseClientsFile(text);
            
            // Check if clients have changed
            if (JSON.stringify(newClients) !== JSON.stringify(appState.clients)) {
                console.log('clients.info updated, reloading...');
                appState.clients = newClients;
                appState.filteredClients = [...appState.clients];
                renderHero();
                renderClientsGrid();
            }
        } catch (error) {
            // File might not exist or error occurred, ignore
        }
    }, 5000);
}

// ===== WORKFLOW CANVAS (PLUTO INTEGRATION) =====
function initWorkflowCanvas() {
    const workflowContainer = document.getElementById('workflow-canvas-container');
    const workflowCanvas = document.getElementById('workflow-canvas');
    const workflowViewport = document.getElementById('workflow-viewport');
    
    if (!workflowContainer || !workflowCanvas || !workflowViewport) {
        console.warn('Workflow canvas elements not found');
        return;
    }

    setupWorkflowEventListeners();
    updateWorkflowViewBox();
    
    // Load existing workflow from local storage
    loadWorkflowFromData(HorizonSync.workflowState);
}

function setupWorkflowEventListeners() {
    const workflowContainer = document.getElementById('workflow-canvas-container');
    
    // Workflow toolbar buttons
    document.getElementById('add-workflow-card')?.addEventListener('click', () => {
        addWorkflowCard({ type: 'process', title: 'New Process', content: 'Details...' });
    });
    
    document.getElementById('add-team-card')?.addEventListener('click', () => {
        // This could eventually open a modal to select a team
        addWorkflowCard({ type: 'team', title: 'New Team', content: 'Team details...' });
    });
    
    document.getElementById('connect-workflow-mode')?.addEventListener('click', () => {
        setWorkflowMode(HorizonSync.workflowState.currentMode === 'connect' ? 'pan' : 'connect');
    });
    
    document.getElementById('delete-workflow-connection-mode')?.addEventListener('click', () => {
        setWorkflowMode(HorizonSync.workflowState.currentMode === 'delete-connect' ? 'pan' : 'delete-connect');
    });
    
    document.getElementById('toggle-workflow-grid')?.addEventListener('click', () => {
        HorizonSync.workflowState.isGridVisible = !HorizonSync.workflowState.isGridVisible;
        workflowContainer.classList.toggle('grid-hidden', !HorizonSync.workflowState.isGridVisible);
        updateWorkflowViewBox();
    });
    
    document.getElementById('export-workflow')?.addEventListener('click', exportWorkflow);
    document.getElementById('import-workflow')?.addEventListener('click', () => {
        document.getElementById('import-workflow-input')?.click();
    });
    
    document.getElementById('clear-workflow')?.addEventListener('click', () => {
        showConfirmationModal('Clear Workflow?', 'This will clear all workflow cards and connections.', () => clearWorkflow(true));
    });
    
    // Import workflow file
    document.getElementById('import-workflow-input')?.addEventListener('change', importWorkflow);
    
    // Canvas pan and zoom
    if (workflowContainer) {
        let isPanning = false;
        let startPanX, startPanY;
        
        workflowContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.workflow-card') || e.target.closest('#workflow-toolbar')) return;
            isPanning = true;
            workflowContainer.classList.add('panning');
            startPanX = e.clientX - HorizonSync.workflowState.panX;
            startPanY = e.clientY - HorizonSync.workflowState.panY;
        });
        
        workflowContainer.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            e.preventDefault();
            HorizonSync.workflowState.panX = e.clientX - startPanX;
            HorizonSync.workflowState.panY = e.clientY - startPanY;
            updateWorkflowViewBox();
        });
        
        function stopWorkflowPanning() {
            if (isPanning) {
                isPanning = false;
                workflowContainer.classList.remove('panning');
                saveWorkflowState();
            }
        }
        
        workflowContainer.addEventListener('mouseup', stopWorkflowPanning);
        workflowContainer.addEventListener('mouseleave', stopWorkflowPanning);
        
        // Zoom with mouse wheel
        workflowContainer.addEventListener('wheel', (e) => {
            if (e.target.closest('.workflow-card-content')) return;
            e.preventDefault();
            
            const zoomIntensity = 0.1;
            const wheel = e.deltaY < 0 ? 1 : -1;
            const zoom = Math.exp(wheel * zoomIntensity);
            
            const rect = workflowContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const newScale = Math.max(0.1, Math.min(HorizonSync.workflowState.scale * zoom, 3));
            
            HorizonSync.workflowState.panX = mouseX - (mouseX - HorizonSync.workflowState.panX) * (newScale / HorizonSync.workflowState.scale);
            HorizonSync.workflowState.panY = mouseY - (mouseY - HorizonSync.workflowState.panY) * (newScale / HorizonSync.workflowState.scale);
            HorizonSync.workflowState.scale = newScale;
            
            updateWorkflowViewBox();
            saveWorkflowState();
        });
    }
}

function updateWorkflowViewBox() {
    const viewport = document.getElementById('workflow-viewport');
    if (viewport) {
        viewport.setAttribute('transform', 
            `translate(${HorizonSync.workflowState.panX}, ${HorizonSync.workflowState.panY}) scale(${HorizonSync.workflowState.scale})`
        );
    }
}

function addWorkflowCard(options) {
    const { type = 'process', title = '', content = '', x = null, y = null } = options;
    const workflowCardsLayer = document.getElementById('workflow-cards-layer');
    if (!workflowCardsLayer) return;
    
    const cardData = {
        id: HorizonSync.workflowState.nextCardId++,
        type: type,
        x: x !== null ? x : (window.innerWidth / 2 - HorizonSync.workflowState.panX) / HorizonSync.workflowState.scale - 100,
        y: y !== null ? y : (window.innerHeight / 2 - HorizonSync.workflowState.panY) / HorizonSync.workflowState.scale - 60,
        width: type === 'team' ? 250 : 200,
        height: type === 'team' ? 120 : 100,
        title: title,
        content: content
    };
    
    HorizonSync.workflowState.cards.push(cardData);
    createWorkflowCardElement(cardData);
    updateWorkflowInsights();
    saveWorkflowState();
}

function addWorkflowTeamCard(location) {
    const title = `${location.city}`;
    const content = `${location.role} Team • ${location.teamSize} members<br>Work Hours: ${location.workHours.start}:00 - ${location.workHours.end}:00`;
    addWorkflowCard({
        type: 'team', 
        title: title, 
        content: content,
        x: Math.random() * 400 + 100, 
        y: Math.random() * 200 + 100
    });
}

function createWorkflowCardElement(cardData) {
    const workflowCardsLayer = document.getElementById('workflow-cards-layer');
    if (!workflowCardsLayer) return;
    
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('id', `workflow-card-${cardData.id}`);
    foreignObject.setAttribute('x', cardData.x);
    foreignObject.setAttribute('y', cardData.y);
    foreignObject.setAttribute('width', cardData.width);
    foreignObject.setAttribute('height', cardData.height);
    
    const cardDiv = document.createElement('div');
    cardDiv.className = `workflow-card ${cardData.type}-card`;
    cardDiv.style.width = `${cardData.width}px`;
    cardDiv.style.height = `${cardData.height}px`;
    cardDiv.dataset.id = cardData.id;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'workflow-card-header';

    const titleH4 = document.createElement('h4');
    titleH4.className = 'workflow-card-title';
    titleH4.setAttribute('contenteditable', 'true');
    titleH4.setAttribute('placeholder', 'Card Title');
    titleH4.innerHTML = cardData.title;

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'workflow-card-controls';
    
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="ti ti-x"></i>';
    deleteButton.title = 'Delete Card';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteWorkflowCard(cardData.id);
    });
    
    controlsDiv.appendChild(deleteButton);
    headerDiv.appendChild(titleH4);
    headerDiv.appendChild(controlsDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'workflow-card-content';
    contentDiv.setAttribute('contenteditable', 'true');
    contentDiv.setAttribute('placeholder', 'Add details...');
    contentDiv.innerHTML = cardData.content;
    
    // [FIX] Stop mousedown on editable fields to prevent drag from starting
    titleH4.addEventListener('mousedown', (e) => e.stopPropagation());
    contentDiv.addEventListener('mousedown', (e) => e.stopPropagation());

    titleH4.addEventListener('blur', () => {
        cardData.title = titleH4.innerHTML;
        saveWorkflowState();
    });
    contentDiv.addEventListener('blur', () => {
        cardData.content = contentDiv.innerHTML;
        saveWorkflowState();
    });
    
    cardDiv.appendChild(headerDiv);
    cardDiv.appendChild(contentDiv);
    
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'workflow-card-resize-handle';
    cardDiv.appendChild(resizeHandle);
    
    cardDiv.addEventListener('click', (e) => {
        if (e.target.closest('.workflow-card-title, .workflow-card-content, .workflow-card-controls')) return;
        
        if (HorizonSync.workflowState.currentMode === 'connect') {
            handleWorkflowCardConnect(cardData.id, cardDiv);
        } else {
            selectWorkflowCard(cardData.id, cardDiv);
        }
        
        e.stopPropagation();
    });
    
    foreignObject.appendChild(cardDiv);
    workflowCardsLayer.appendChild(foreignObject);
    
    if (typeof interact !== 'undefined') {
        interact(cardDiv)
            .draggable({
                // [FIX] Drag is enabled on the whole card; propagation stops on text fields
                listeners: {
                    start (event) {
                        event.target.classList.add('dragging');
                    },
                    move(event) {
                        cardData.x += event.dx / HorizonSync.workflowState.scale;
                        cardData.y += event.dy / HorizonSync.workflowState.scale;
                        
                        foreignObject.setAttribute('x', cardData.x);
                        foreignObject.setAttribute('y', cardData.y);
                        
                        updateWorkflowConnectionsForCard(cardData.id);
                    },
                    end(event) {
                        event.target.classList.remove('dragging');
                        saveWorkflowState();
                    }
                }
            })
            .resizable({
                edges: { bottom: true, right: true },
                listeners: {
                    move(event) {
                        cardData.width = event.rect.width;
                        cardData.height = event.rect.height;
                        
                        Object.assign(event.target.style, {
                            width: `${cardData.width}px`,
                            height: `${cardData.height}px`
                        });

                        foreignObject.setAttribute('width', cardData.width);
                        foreignObject.setAttribute('height', cardData.height);
                        
                        updateWorkflowConnectionsForCard(cardData.id);
                    },
                    end() {
                        saveWorkflowState();
                    }
                },
                modifiers: [
                    interact.modifiers.restrictSize({
                        min: { width: 180, height: 100 }
                    })
                ]
            });
    }
    
    return foreignObject;
}

function selectWorkflowCard(cardId, cardElement) {
    if (HorizonSync.workflowState.selectedCardId) {
        const prevCard = document.querySelector(`#workflow-card-${HorizonSync.workflowState.selectedCardId} .workflow-card`);
        if (prevCard) prevCard.classList.remove('selected');
    }
    
    HorizonSync.workflowState.selectedCardId = cardId;
    const targetCard = cardElement || document.querySelector(`#workflow-card-${cardId} .workflow-card`);
    if (targetCard) targetCard.classList.add('selected');
}

function deleteWorkflowCard(cardId) {
    showConfirmationModal('Delete Card?', 'This will permanently delete this workflow card.', () => {
        HorizonSync.workflowState.cards = HorizonSync.workflowState.cards.filter(card => card.id !== cardId);
        
        HorizonSync.workflowState.connections = HorizonSync.workflowState.connections.filter(conn => {
            if (conn.startCardId === cardId || conn.endCardId === cardId) {
                const lineElement = document.getElementById(`workflow-conn-${conn.id}`);
                if (lineElement) lineElement.remove();
                return false;
            }
            return true;
        });
        
        const cardElement = document.getElementById(`workflow-card-${cardId}`);
        if (cardElement) cardElement.remove();
        
        if (HorizonSync.workflowState.selectedCardId === cardId) {
            HorizonSync.workflowState.selectedCardId = null;
        }
        
        updateWorkflowInsights();
        saveWorkflowState();
    });
}

function handleWorkflowCardConnect(cardId, cardElement) {
    if (HorizonSync.workflowState.connectStartCardId === null) {
        HorizonSync.workflowState.connectStartCardId = cardId;
        cardElement.style.outline = '2px solid var(--color-primary)';
    } else {
        if (cardId !== HorizonSync.workflowState.connectStartCardId) {
            addWorkflowConnection(HorizonSync.workflowState.connectStartCardId, cardId);
        }
        
        const startCard = document.querySelector(`#workflow-card-${HorizonSync.workflowState.connectStartCardId} .workflow-card`);
        if (startCard) startCard.style.outline = '';
        HorizonSync.workflowState.connectStartCardId = null;
    }
}

function addWorkflowConnection(startId, endId) {
    if (startId === endId) return;
    
    const exists = HorizonSync.workflowState.connections.some(conn => 
        (conn.startCardId === startId && conn.endCardId === endId) ||
        (conn.startCardId === endId && conn.endCardId === startId)
    );
    
    if (exists) return;
    
    const connectionData = {
        id: HorizonSync.workflowState.nextConnectionId++,
        startCardId: startId,
        endCardId: endId
    };
    
    HorizonSync.workflowState.connections.push(connectionData);
    createWorkflowConnectionLine(connectionData);
    updateWorkflowInsights();
    saveWorkflowState();
}

function createWorkflowConnectionLine(connData) {
    const workflowConnectionsLayer = document.getElementById('workflow-connections-layer');
    if (!workflowConnectionsLayer) return;
    
    const startCard = HorizonSync.workflowState.cards.find(card => card.id === connData.startCardId);
    const endCard = HorizonSync.workflowState.cards.find(card => card.id === connData.endCardId);
    
    if (!startCard || !endCard) return;
    
    const startX = startCard.x + startCard.width / 2;
    const startY = startCard.y + startCard.height / 2;
    const endX = endCard.x + endCard.width / 2;
    const endY = endCard.y + endCard.height / 2;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('id', `workflow-conn-${connData.id}`);
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.classList.add('workflow-connection-line');
    line.dataset.connId = connData.id;
    
    line.addEventListener('click', (e) => {
        if (HorizonSync.workflowState.currentMode === 'delete-connect') {
            e.stopPropagation();
            deleteWorkflowConnection(connData.id);
        }
    });
    
    workflowConnectionsLayer.appendChild(line);
    return line;
}

function updateWorkflowConnectionsForCard(cardId) {
    HorizonSync.workflowState.connections.forEach(connData => {
        if (connData.startCardId === cardId || connData.endCardId === cardId) {
            const line = document.getElementById(`workflow-conn-${connData.id}`);
            if (line) {
                const startCard = HorizonSync.workflowState.cards.find(card => card.id === connData.startCardId);
                const endCard = HorizonSync.workflowState.cards.find(card => card.id === connData.endCardId);
                
                if (startCard && endCard) {
                    const startX = startCard.x + startCard.width / 2;
                    const startY = startCard.y + startCard.height / 2;
                    const endX = endCard.x + endCard.width / 2;
                    const endY = endCard.y + endCard.height / 2;
                    
                    line.setAttribute('x1', startX);
                    line.setAttribute('y1', startY);
                    line.setAttribute('x2', endX);
                    line.setAttribute('y2', endY);
                }
            }
        }
    });
}

function deleteWorkflowConnection(connId) {
    HorizonSync.workflowState.connections = HorizonSync.workflowState.connections.filter(conn => conn.id !== connId);
    
    const lineElement = document.getElementById(`workflow-conn-${connId}`);
    if (lineElement) lineElement.remove();
    
    updateWorkflowInsights();
    saveWorkflowState();
}

function setWorkflowMode(mode) {
    HorizonSync.workflowState.currentMode = mode;
    
    const connectBtn = document.getElementById('connect-workflow-mode');
    const deleteBtn = document.getElementById('delete-workflow-connection-mode');
    
    if (connectBtn) connectBtn.classList.toggle('active', mode === 'connect');
    if (deleteBtn) deleteBtn.classList.toggle('active', mode === 'delete-connect');
    
    const lines = document.querySelectorAll('.workflow-connection-line');
    lines.forEach(line => {
        line.classList.toggle('highlight-delete', mode === 'delete-connect');
    });
    
    if (mode !== 'connect' && HorizonSync.workflowState.connectStartCardId !== null) {
        const startCard = document.querySelector(`#workflow-card-${HorizonSync.workflowState.connectStartCardId} .workflow-card`);
        if (startCard) startCard.style.outline = '';
        HorizonSync.workflowState.connectStartCardId = null;
    }
    
    const container = document.getElementById('workflow-canvas-container');
    if (container) {
        if (mode === 'connect') {
            container.style.cursor = 'crosshair';
        } else if (mode === 'delete-connect') {
            container.style.cursor = 'default';
        } else {
            container.style.cursor = 'grab';
        }
    }
}

function updateWorkflowCanvas() {
    if (HorizonSync.state.currentSection !== 'workflow') return;
    updateWorkflowInsights();
}

function updateWorkflowInsights() {
    const cardsCount = HorizonSync.workflowState.cards.length;
    const connectionsCount = HorizonSync.workflowState.connections.length;
    const teamCardsCount = HorizonSync.workflowState.cards.filter(card => card.type === 'team').length;
    
    document.getElementById('workflow-cards-count').textContent = cardsCount;
    document.getElementById('workflow-connections-count').textContent = connectionsCount;
    document.getElementById('workflow-teams-count').textContent = teamCardsCount;
}

function exportWorkflow() {
    try {
        const workflowData = {
            cards: HorizonSync.workflowState.cards,
            connections: HorizonSync.workflowState.connections,
            nextCardId: HorizonSync.workflowState.nextCardId,
            nextConnectionId: HorizonSync.workflowState.nextConnectionId,
            panX: HorizonSync.workflowState.panX,
            panY: HorizonSync.workflowState.panY,
            scale: HorizonSync.workflowState.scale,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(workflowData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `horizonsync-workflow-${moment().format('YYYY-MM-DD')}.json`;
        link.click();
        
        showToast('Workflow exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export workflow', 'error');
    }
}

function importWorkflow(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const workflowData = JSON.parse(event.target.result);
            
            showConfirmationModal('Import Workflow?', 'This will replace the current workflow canvas.', () => {
                loadWorkflowFromData(workflowData);
            });
            
        } catch (error) {
            console.error('Import error:', error);
            showToast('Failed to import workflow. Please check file format.', 'error');
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
}

function loadWorkflowFromData(workflowData) {
    if (!workflowData || typeof workflowData !== 'object') {
        showToast('Invalid workflow data', 'error');
        return;
    }
    
    clearWorkflow(false);
    
    HorizonSync.workflowState.cards = workflowData.cards || [];
    HorizonSync.workflowState.connections = workflowData.connections || [];
    HorizonSync.workflowState.nextCardId = workflowData.nextCardId || 1;
    HorizonSync.workflowState.nextConnectionId = workflowData.nextConnectionId || 1;
    HorizonSync.workflowState.panX = workflowData.panX || 0;
    HorizonSync.workflowState.panY = workflowData.panY || 0;
    HorizonSync.workflowState.scale = workflowData.scale || 1;
    
    HorizonSync.workflowState.cards.forEach(cardData => {
        createWorkflowCardElement(cardData);
    });
    
    HorizonSync.workflowState.connections.forEach(connData => {
        createWorkflowConnectionLine(connData);
    });

    updateWorkflowInsights();
}

function saveWorkflowState() {
    saveData();
}

function clearWorkflow(save = true) {
    const workflowCardsLayer = document.getElementById('workflow-cards-layer');
    const workflowConnectionsLayer = document.getElementById('workflow-connections-layer');

    if(workflowCardsLayer) workflowCardsLayer.innerHTML = '';
    if(workflowConnectionsLayer) workflowConnectionsLayer.innerHTML = '';
    
    HorizonSync.workflowState.cards = [];
    HorizonSync.workflowState.connections = [];
    HorizonSync.workflowState.nextCardId = 1;
    HorizonSync.workflowState.nextConnectionId = 1;
    
    updateWorkflowInsights();
    if(save) {
        saveWorkflowState();
    }
}

// ===== GLOBAL STATE MANAGEMENT =====
const HorizonSync = {
    // Application state
    state: {
        teamLocations: [],
        events: [],
        currentSection: 'dashboard',
        settings: {
            theme: 'light',
            language: 'en',
            timeFormat: '12',
            notifications: true,
            aiSuggestions: true
        },
        ui: {
            isMobileNavOpen: false,
            activeModals: [],
            timers: {
                clockUpdater: null,
                aiTyping: null
            }
        }
    },

    // Translation system
    translations: {
        en: {
            appTitle: "HorizonSync",
            tagline: "Turn time zones into your competitive advantage",
            dashboard: "Dashboard",
            workflow: "Workflow Canvas",
            navigation: "Navigation",
            addTeamMember: "Add Team",
            settings: "Settings",
            coverageHours: "Coverage Hours",
            teamLocations: "Team Locations",
            handoffEfficiency: "Handoff Efficiency",
            productivityScore: "Productivity Score",
            globalTeamClocks: "Global Team Clocks",
            addLocation: "Add Location",
            aiWorkflowAssistant: "AI Workflow Assistant",
            aiReady: "AI Ready",
            aiPlaceholder: "Ask about team optimization, hiring locations, or workflow improvements...",
            quickSuggestions: "Quick suggestions:",
            suggestion1: "24-hour coverage",
            suggestion2: "Next hire location",
            suggestion3: "Optimize handoffs",
            workflowCanvas: "Workflow Canvas",
            workflowDescription: "Visual team workflow mapping and process optimization",
            workflowInsights: "Workflow Insights",
            workflowCards: "Process Cards",
            workflowConnections: "Connections",
            workflowTeams: "Team Cards",
            workflowTip: "Tip: Connect team cards to show handoff processes and workflow dependencies",
            addTeamMemberTitle: "Add Team Member",
            location: "Location",
            locationPlaceholder: "Search for city or timezone...",
            role: "Role/Department",
            teamSize: "Team Size",
            workHours: "Work Hours",
            appearance: "Appearance",
            theme: "Theme",
            language: "Language",
            timeFormat: "Time Format",
            preferences: "Preferences",
            notifications: "Notifications",
            aiSuggestions: "AI Suggestions",
            data: "Data",
            exportData: "Export Data",
            importData: "Import Data",
            clearData: "Clear All Data",
            cancel: "Cancel",
            add: "Add",
            save: "Save",
            delete: "Delete",
            edit: "Edit",
            close: "Close"
        },
        fr: {
            appTitle: "HorizonSync",
            tagline: "Transformez les fuseaux horaires en avantage concurrentiel",
            dashboard: "Tableau de bord",
            workflow: "Canevas de flux de travail",
            navigation: "Navigation",
            addTeamMember: "Ajouter une équipe",
            settings: "Paramètres",
            coverageHours: "Heures de couverture",
            teamLocations: "Emplacements des équipes",
            handoffEfficiency: "Efficacité du transfert",
            productivityScore: "Score de productivité",
            globalTeamClocks: "Horloges d'équipe mondiales",
            addLocation: "Ajouter un emplacement",
            aiWorkflowAssistant: "Assistant de flux de travail IA",
            aiReady: "IA prête",
            aiPlaceholder: "Posez des questions sur l'optimisation d'équipe, les lieux de recrutement ou l'amélioration des flux de travail...",
            quickSuggestions: "Suggestions rapides :",
            suggestion1: "Couverture 24 heures",
            suggestion2: "Prochain lieu de recrutement",
            suggestion3: "Optimiser les transferts",
            workflowCanvas: "Canevas de flux de travail",
            workflowDescription: "Cartographie visuelle des flux de travail d'équipe et optimisation des processus",
            workflowInsights: "Aperçus du flux de travail",
            workflowCards: "Cartes de processus",
            workflowConnections: "Connexions",
            workflowTeams: "Cartes d'équipe",
            workflowTip: "Astuce : Connectez les cartes d'équipe pour montrer les processus de transfert et les dépendances du flux de travail",
            addTeamMemberTitle: "Ajouter un membre d'équipe",
            location: "Emplacement",
            locationPlaceholder: "Rechercher une ville ou un fuseau horaire...",
            role: "Rôle/Département",
            teamSize: "Taille de l'équipe",
            workHours: "Heures de travail",
            appearance: "Apparence",
            theme: "Thème",
            language: "Langue",
            timeFormat: "Format de l'heure",
            preferences: "Préférences",
            notifications: "Notifications",
            aiSuggestions: "Suggestions de l'IA",
            data: "Données",
            exportData: "Exporter les données",
            importData: "Importer les données",
            clearData: "Effacer toutes les données",
            cancel: "Annuler",
            add: "Ajouter",
            save: "Enregistrer",
            delete: "Supprimer",
            edit: "Modifier",
            close: "Fermer"
        },
        de: {
            appTitle: "HorizonSync",
            tagline: "Verwandeln Sie Zeitzonen in Ihren Wettbewerbsvorteil",
            dashboard: "Dashboard",
            workflow: "Workflow-Canvas",
            navigation: "Navigation",
            addTeamMember: "Team hinzufügen",
            settings: "Einstellungen",
            coverageHours: "Abdeckungsstunden",
            teamLocations: "Team-Standorte",
            handoffEfficiency: "Übergabeeffizienz",
            productivityScore: "Produktivitätsbewertung",
            globalTeamClocks: "Globale Team-Uhren",
            addLocation: "Standort hinzufügen",
            aiWorkflowAssistant: "KI-Workflow-Assistent",
            aiReady: "KI bereit",
            aiPlaceholder: "Fragen Sie nach Teamoptimierung, Einstellungsorten oder Workflow-Verbesserungen...",
            quickSuggestions: "Schnelle Vorschläge:",
            suggestion1: "24-Stunden-Abdeckung",
            suggestion2: "Nächster Einstellungsort",
            suggestion3: "Übergaben optimieren",
            workflowCanvas: "Workflow-Canvas",
            workflowDescription: "Visuelle Team-Workflow-Zuordnung und Prozessoptimierung",
            workflowInsights: "Workflow-Einblicke",
            workflowCards: "Prozesskarten",
            workflowConnections: "Verbindungen",
            workflowTeams: "Teamkarten",
            workflowTip: "Tipp: Verbinden Sie Teamkarten, um Übergabeprozesse und Workflow-Abhängigkeiten anzuzeigen",
            addTeamMemberTitle: "Teammitglied hinzufügen",
            location: "Standort",
            locationPlaceholder: "Suche nach Stadt oder Zeitzone...",
            role: "Rolle/Abteilung",
            teamSize: "Teamgröße",
            workHours: "Arbeitszeiten",
            appearance: "Erscheinungsbild",
            theme: "Thema",
            language: "Sprache",
            timeFormat: "Zeitformat",
            preferences: "Präferenzen",
            notifications: "Benachrichtigungen",
            aiSuggestions: "KI-Vorschläge",
            data: "Daten",
            exportData: "Daten exportieren",
            importData: "Daten importieren",
            clearData: "Alle Daten löschen",
            cancel: "Abbrechen",
            add: "Hinzufügen",
            save: "Speichern",
            delete: "Löschen",
            edit: "Bearbeiten",
            close: "Schließen"
        },
        ja: {
            appTitle: "HorizonSync",
            tagline: "タイムゾーンを競争優位に変える",
            dashboard: "ダッシュボード",
            workflow: "ワークフローキャンバス",
            navigation: "ナビゲーション",
            addTeamMember: "チームを追加",
            settings: "設定",
            coverageHours: "カバー時間",
            teamLocations: "チームの場所",
            handoffEfficiency: "引き継ぎ効率",
            productivityScore: "生産性スコア",
            globalTeamClocks: "グローバルチームクロック",
            addLocation: "場所を追加",
            aiWorkflowAssistant: "AIワークフローアシスタント",
            aiReady: "AI準備完了",
            aiPlaceholder: "チームの最適化、採用地、ワークフローの改善について質問してください...",
            quickSuggestions: "クイック提案:",
            suggestion1: "24時間カバー",
            suggestion2: "次の採用地",
            suggestion3: "引き継ぎの最適化",
            workflowCanvas: "ワークフローキャンバス",
            workflowDescription: "視覚的なチームワークフローマッピングとプロセス最適化",
            workflowInsights: "ワークフローの洞察",
            workflowCards: "プロセスカード",
            workflowConnections: "接続",
            workflowTeams: "チームカード",
            workflowTip: "ヒント：チームカードを接続して、引き継ぎプロセスとワークフローの依存関係を表示します",
            addTeamMemberTitle: "チームメンバーを追加",
            location: "場所",
            locationPlaceholder: "都市またはタイムゾーンを検索...",
            role: "役割/部門",
            teamSize: "チームサイズ",
            workHours: "勤務時間",
            appearance: "外観",
            theme: "テーマ",
            language: "言語",
            timeFormat: "時刻形式",
            preferences: "環境設定",
            notifications: "通知",
            aiSuggestions: "AIの提案",
            data: "データ",
            exportData: "データをエクスポート",
            importData: "データをインポート",
            clearData: "すべてのデータを消去",
            cancel: "キャンセル",
            add: "追加",
            save: "保存",
            delete: "削除",
            edit: "編集",
            close: "閉じる"
        },
        "zh-Hant": {
            appTitle: "HorizonSync",
            tagline: "將時區轉化為您的競爭優勢",
            dashboard: "儀表板",
            workflow: "工作流程畫布",
            navigation: "導覽",
            addTeamMember: "新增團隊",
            settings: "設定",
            coverageHours: "覆蓋時數",
            teamLocations: "團隊地點",
            handoffEfficiency: "交接效率",
            productivityScore: "生產力分數",
            globalTeamClocks: "全球團隊時鐘",
            addLocation: "新增地點",
            aiWorkflowAssistant: "AI 工作流程助理",
            aiReady: "AI 已就緒",
            aiPlaceholder: "詢問有關團隊優化、招聘地點或工作流程改進的問題...",
            quickSuggestions: "快速建議：",
            suggestion1: "24 小時覆蓋",
            suggestion2: "下一個招聘地點",
            suggestion3: "優化交接",
            workflowCanvas: "工作流程畫布",
            workflowDescription: "可視化團隊工作流程圖與流程優化",
            workflowInsights: "工作流程洞察",
            workflowCards: "流程卡",
            workflowConnections: "連接",
            workflowTeams: "團隊卡",
            workflowTip: "提示：連接團隊卡以顯示交接流程和工作流程依賴關係",
            addTeamMemberTitle: "新增團隊成員",
            location: "地點",
            locationPlaceholder: "搜尋城市或時區...",
            role: "角色/部門",
            teamSize: "團隊規模",
            workHours: "工作時間",
            appearance: "外觀",
            theme: "主題",
            language: "語言",
            timeFormat: "時間格式",
            preferences: "偏好設定",
            notifications: "通知",
            aiSuggestions: "AI 建議",
            data: "資料",
            exportData: "匯出資料",
            importData: "匯入資料",
            clearData: "清除所有資料",
            cancel: "取消",
            add: "新增",
            save: "儲存",
            delete: "刪除",
            edit: "編輯",
            close: "關閉"
        },
        ar: {
            appTitle: "HorizonSync",
            tagline: "حوّل المناطق الزمنية إلى ميزة تنافسية لك",
            dashboard: "لوحة التحكم",
            workflow: "لوحة سير العمل",
            navigation: "التنقل",
            addTeamMember: "إضافة فريق",
            settings: "الإعدادات",
            coverageHours: "ساعات التغطية",
            teamLocations: "مواقع الفرق",
            handoffEfficiency: "كفاءة التسليم",
            productivityScore: "درجة الإنتاجية",
            globalTeamClocks: "ساعات الفرق العالمية",
            addLocation: "إضافة موقع",
            aiWorkflowAssistant: "مساعد سير العمل بالذكاء الاصطناعي",
            aiReady: "الذكاء الاصطناعي جاهز",
            aiPlaceholder: "اسأل عن تحسين الفريق أو مواقع التوظيف أو تحسينات سير العمل...",
            quickSuggestions: "اقتراحات سريعة:",
            suggestion1: "تغطية 24 ساعة",
            suggestion2: "موقع التوظيف التالي",
            suggestion3: "تحسين عمليات التسليم",
            workflowCanvas: "لوحة سير العمل",
            workflowDescription: "تخطيط سير عمل الفريق المرئي وتحسين العمليات",
            workflowInsights: "رؤى سير العمل",
            workflowCards: "بطاقات العمليات",
            workflowConnections: "الاتصالات",
            workflowTeams: "بطاقات الفرق",
            workflowTip: "نصيحة: قم بتوصيل بطاقات الفرق لإظهار عمليات التسليم وتبعيات سير العمل",
            addTeamMemberTitle: "إضافة عضو فريق",
            location: "الموقع",
            locationPlaceholder: "ابحث عن مدينة أو منطقة زمنية...",
            role: "الدور/القسم",
            teamSize: "حجم الفريق",
            workHours: "ساعات العمل",
            appearance: "المظهر",
            theme: "السمة",
            language: "اللغة",
            timeFormat: "تنسيق الوقت",
            preferences: "التفضيلات",
            notifications: "الإشعارات",
            aiSuggestions: "اقتراحات الذكاء الاصطناعي",
            data: "البيانات",
            exportData: "تصدير البيانات",
            importData: "استيراد البيانات",
            clearData: "مسح كافة البيانات",
            cancel: "إلغاء",
            add: "إضافة",
            save: "حفظ",
            delete: "حذف",
            edit: "تعديل",
            close: "إغلاق"
        }
    },

    // Workflow canvas state (Pluto integration)
    workflowState: {
        cards: [],
        connections: [],
        nextCardId: 1,
        nextConnectionId: 1,
        panX: 0,
        panY: 0,
        scale: 1,
        currentMode: 'pan', // 'pan', 'connect', 'delete-connect'
        connectStartCardId: null,
        isGridVisible: true,
        selectedCardId: null
    },

    // Common timezone data for suggestions
    timezoneData: [
        { value: 'America/New_York', label: 'New York (EST/EDT)', city: 'New York', region: 'Americas' },
        { value: 'America/Los_Angeles', label: 'Los Angeles(PST/PDT)', city: 'Los Angeles', region: 'Americas' },
        { value: 'America/Chicago', label: 'Chicago (CST/CDT)', city: 'Chicago', region: 'Americas' },
        { value: 'Europe/London', label: 'London (GMT/BST)', city: 'London', region: 'Europe' },
        { value: 'Europe/Paris', label: 'Paris (CET/CEST)', city: 'Paris', region: 'Europe' },
        { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', city: 'Berlin', region: 'Europe' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)', city: 'Tokyo', region: 'Asia' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)', city: 'Shanghai', region: 'Asia' },
        { value: 'Asia/Taipei', label: 'Taipei (CST)', city: 'Taipei', region: 'Asia' },
        { value: 'Asia/Singapore', label: 'Singapore (SGT)', city: 'Singapore', region: 'Asia' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', city: 'Sydney', region: 'Oceania' },
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)', city: 'UTC', region: 'UTC' }
    ]
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌍 HorizonSync initializing...');
    
    initializeApp();
    setupEventListeners();
    loadSavedData();
    startTimers();
    
    if (HorizonSync.state.teamLocations.length === 0) {
        initializeDefaultData();
    }
    
    updateUI();
    console.log('✅ HorizonSync initialized successfully');
});

// ===== CORE INITIALIZATION =====
function initializeApp() {
    const userTimezone = moment.tz.guess();
    
    applyTheme(HorizonSync.state.settings.theme);
    applyLanguage(HorizonSync.state.settings.language);
    
    populateHourSelectors();
    populateTimezoneSelectors();
}

function initializeDefaultData() {
    const userTimezone = moment.tz.guess();
    const cityName = userTimezone.split('/').pop().replace(/_/g, ' ');
    
    addTeamLocation({
        timezone: userTimezone,
        city: cityName,
        role: 'development',
        teamSize: 1,
        workHours: { start: 9, end: 18 },
        isLocal: true
    });
    
    showToast('Welcome to HorizonSync! Your local timezone has been added.', 'info');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    setupNavigationListeners();
    setupModalListeners();
    setupFormListeners();
    setupAIListeners();
    setupSettingsListeners();
    setupClockListeners();
}

function setupNavigationListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchSection(this.dataset.section);
        });
    });
    
    document.getElementById('hamburger-btn').addEventListener('click', () => toggleMobileNav(true));
    document.getElementById('close-mobile-nav').addEventListener('click', () => toggleMobileNav(false));
    
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            switchSection(this.dataset.section);
            toggleMobileNav(false);
        });
    });
}

function setupModalListeners() {
    document.getElementById('add-team-btn').addEventListener('click', () => openModal('add-team-modal'));
    document.getElementById('settings-btn').addEventListener('click', () => openModal('settings-modal'));
    
    const addEventBtn = document.getElementById('add-event-btn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => openModal('add-event-modal'));
    }
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.closest('.modal-overlay').id);
        });
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

function setupFormListeners() {
    const addTeamModal = document.getElementById('add-team-modal');
    if(addTeamModal) {
        addTeamModal.querySelector('[data-action="add"]').addEventListener('click', handleAddTeamMember);
        addTeamModal.querySelector('[data-action="cancel"]').addEventListener('click', () => closeModal('add-team-modal'));
    }

    document.getElementById('location-input').addEventListener('input', function() {
        handleLocationSearch(this.value);
    });

    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddEvent();
        });
    }
}

function setupAIListeners() {
    document.getElementById('ai-submit').addEventListener('click', handleAISubmit);
    document.getElementById('ai-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleAISubmit();
    });
    
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.getElementById('ai-input').value = this.dataset.prompt;
            handleAISubmit();
        });
    });
}

function setupSettingsListeners() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setTheme(this.dataset.theme);
        });
    });
    
    document.getElementById('language-select').addEventListener('change', function() {
        setLanguage(this.value);
    });
    
    document.getElementById('time-format-select').addEventListener('change', function() {
        setTimeFormat(this.value);
    });
    
    const notificationsToggle = document.getElementById('notifications-toggle')?.querySelector('input');
    if(notificationsToggle) {
        notificationsToggle.addEventListener('change', function() {
            HorizonSync.state.settings.notifications = this.checked;
            saveData();
        });
    }
    
    const aiToggle = document.getElementById('ai-toggle')?.querySelector('input');
    if(aiToggle) {
        aiToggle.addEventListener('change', function() {
            HorizonSync.state.settings.aiSuggestions = this.checked;
            saveData();
        });
    }
    
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', importData);
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
}

function setupClockListeners() {
    document.getElementById('add-location-btn').addEventListener('click', () => openModal('add-team-modal'));
}

// ===== NAVIGATION FUNCTIONS =====
function switchSection(sectionName) {
    HorizonSync.state.currentSection = sectionName;
    
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionName + '-section').classList.add('active');
    
    document.querySelectorAll('.nav-btn, .mobile-nav-link').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionName);
    });
    
    if (sectionName === 'workflow') {
        initWorkflowCanvas();
    } else {
        updateDashboard();
    }
}

function toggleMobileNav(show) {
    const mobileNav = document.getElementById('mobile-nav');
    HorizonSync.state.ui.isMobileNavOpen = show;
    
    if (show) {
        mobileNav.classList.remove('hidden');
        gsap.fromTo(mobileNav, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    } else {
        gsap.to(mobileNav, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => mobileNav.classList.add('hidden')
        });
    }
}

// ===== MODAL FUNCTIONS =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    HorizonSync.state.ui.activeModals.push(modalId);
    
    gsap.fromTo(modal, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" });
    
    const firstInput = modal.querySelector('input, select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    
    gsap.to(modal, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
            modal.classList.add('hidden');
            HorizonSync.state.ui.activeModals = HorizonSync.state.ui.activeModals.filter(id => id !== modalId);
        }
    });
}

function showConfirmationModal(title, message, onConfirm) {
    if (confirm(`${title}\n${message}`)) {
        onConfirm();
    }
}

// ===== TEAM LOCATION FUNCTIONS =====
function addTeamLocation(locationData) {
    const newLocation = {
        id: generateId(),
        ...locationData,
        isLocal: locationData.isLocal || false,
        createdAt: new Date().toISOString()
    };
    
    HorizonSync.state.teamLocations.push(newLocation);
    saveData();
    updateUI();
    
    showToast(`${newLocation.city} team added successfully!`, 'success');
    return newLocation;
}

function removeTeamLocation(locationId) {
    showConfirmationModal('Remove Location?', 'Are you sure you want to remove this team location?', () => {
        HorizonSync.state.teamLocations = HorizonSync.state.teamLocations.filter(loc => loc.id !== locationId);
        saveData();
        updateUI();
        showToast('Team location removed', 'info');
    });
}

function handleAddTeamMember() {
    const timezone = document.getElementById('location-input').value;
    const role = document.getElementById('role-select').value;
    const teamSize = parseInt(document.getElementById('team-size').value);
    const startHour = parseInt(document.getElementById('start-hour').value);
    const endHour = parseInt(document.getElementById('end-hour').value);
    
    if (!timezone || !moment.tz.zone(timezone)) {
        showToast('Invalid timezone selected', 'error');
        return;
    }
    
    if (HorizonSync.state.teamLocations.some(loc => loc.timezone === timezone)) {
        showToast('This location is already added', 'warning');
        return;
    }
    
    const city = timezone.split('/').pop().replace(/_/g, ' ');
    addTeamLocation({ timezone, city, role, teamSize, workHours: { start: startHour, end: endHour } });
    
    closeModal('add-team-modal');
    document.getElementById('add-team-form').reset();
    document.getElementById('location-suggestions').innerHTML = '';
}

function handleLocationSearch(query) {
    const suggestionsContainer = document.getElementById('location-suggestions');
    if (query.length < 2) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.classList.add('hidden');
        return;
    }
    
    const allMatches = [
        ...HorizonSync.timezoneData.filter(tz => 
            tz.city.toLowerCase().includes(query.toLowerCase()) || 
            tz.label.toLowerCase().includes(query.toLowerCase())
        ),
        ...moment.tz.names()
            .filter(name => name.toLowerCase().includes(query.toLowerCase()) && !name.startsWith('Etc/'))
            .map(name => ({
                value: name,
                label: name.replace(/_/g, ' '),
                city: name.split('/').pop().replace(/_/g, ' '),
                region: name.split('/')[0]
            }))
    ];

    const uniqueMatches = [...new Map(allMatches.map(item => [item.value, item])).values()].slice(0, 10);
    
    if (uniqueMatches.length > 0) {
        suggestionsContainer.innerHTML = uniqueMatches.map(match => `
            <div class="suggestion-item" data-timezone="${match.value}">
                <strong>${match.city}</strong><br><small>${match.region}</small>
            </div>
        `).join('');
        suggestionsContainer.classList.remove('hidden');
        
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                document.getElementById('location-input').value = this.dataset.timezone;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('hidden');
            });
        });
    } else {
        suggestionsContainer.classList.add('hidden');
    }
}

// ===== CLOCK FUNCTIONS =====
function updateClocks() {
    const clocksGrid = document.getElementById('clocks-grid');
    if (!clocksGrid) return;
    
    clocksGrid.innerHTML = '';
    HorizonSync.state.teamLocations.forEach(location => {
        clocksGrid.appendChild(createClockCard(location));
    });
}

function createClockCard(location) {
    const now = moment().tz(location.timezone);
    const timeFormat = HorizonSync.state.settings.timeFormat === '24' ? 'HH:mm' : 'h:mm';
    
    const card = document.createElement('div');
    card.className = `clock-card ${location.isLocal ? 'local' : ''}`;
    card.dataset.locationId = location.id;

    card.innerHTML = `
        <div class="clock-header">
            <div class="location-info">
                <h3 class="city-name">${location.city}</h3>
                <span class="timezone-info">GMT${now.format('Z')}${location.isLocal ? ' • Local' : ''}</span>
            </div>
            <div class="clock-actions">
                <button class="clock-action-btn edit-location-btn" title="Edit"><i class="ti ti-settings"></i></button>
                <button class="clock-action-btn remove-location-btn" title="Remove"><i class="ti ti-trash"></i></button>
            </div>
        </div>
        <div class="time-display">
            <span class="time">${now.format(timeFormat)}</span>
            ${HorizonSync.state.settings.timeFormat === '12' ? `<span class="period">${now.format('A')}</span>` : ''}
        </div>
        <div class="date-display">${now.format('dddd, MMMM D, YYYY')}</div>
        <div class="work-status">
            <div class="status-indicator"></div>
            <span>Work Hours (${location.workHours.start}:00 - ${location.workHours.end}:00)</span>
        </div>
        <div class="team-info">
            <span class="role">${location.role.charAt(0).toUpperCase() + location.role.slice(1)} Team</span>
            <span class="team-size">${location.teamSize} member${location.teamSize !== 1 ? 's' : ''}</span>
        </div>
    `;

    card.querySelector('.edit-location-btn').addEventListener('click', () => editLocation(location.id));
    card.querySelector('.remove-location-btn').addEventListener('click', () => removeTeamLocation(location.id));
    
    updateClockCard(card, location, now, timeFormat);
    return card;
}

function updateClockCard(card, location, now, timeFormat) {
    const isWorkHours = isWithinWorkHours(now, location.workHours);
    card.querySelector('.time').textContent = now.format(timeFormat);
    const period = card.querySelector('.period');
    if (period) period.textContent = now.format('A');
    card.querySelector('.date-display').textContent = now.format('dddd, MMMM D, YYYY');
    card.querySelector('.work-status').classList.toggle('active', isWorkHours);
}

function isWithinWorkHours(momentTime, workHours) {
    return momentTime.hour() >= workHours.start && momentTime.hour() < workHours.end;
}

function updateAllClocks() {
    document.querySelectorAll('.clock-card').forEach(card => {
        const location = HorizonSync.state.teamLocations.find(loc => loc.id === card.dataset.locationId);
        if (location) {
            const now = moment().tz(location.timezone);
            const timeFormat = HorizonSync.state.settings.timeFormat === '24' ? 'HH:mm' : 'h:mm';
            updateClockCard(card, location, now, timeFormat);
        }
    });
}

// ===== AI ASSISTANT FUNCTIONS =====
async function handleAISubmit() {
    const input = document.getElementById('ai-input');
    const responseArea = document.getElementById('ai-response');
    const submitBtn = document.getElementById('ai-submit');
    const userPrompt = input.value.trim();
    if (!userPrompt) return;

    submitBtn.innerHTML = '<i class="ti ti-loader-2" style="animation: spin 1s linear infinite;"></i>';
    submitBtn.disabled = true;
    responseArea.innerHTML = '<div class="loading-spinner"><i class="ti ti-loader-2"></i></div>';
    responseArea.classList.remove('hidden');

    try {
        const context = buildAIContext();
        const response = await callAI(userPrompt, context);
        displayAIResponse(response.response, responseArea);
        input.value = '';
    } catch (error) {
        console.error('AI Error:', error);
        responseArea.innerHTML = `<div class="ai-error">Sorry, an error occurred.</div>`;
    } finally {
        submitBtn.innerHTML = '<i class="ti ti-send"></i>';
        submitBtn.disabled = false;
    }
}

function buildAIContext() {
    return {
        teamStructure: HorizonSync.state.teamLocations,
        currentCoverage: calculateCoverageHours(),
        handoffEfficiency: calculateHandoffEfficiency(),
    };
}

async function callAI(prompt, context) {
    console.log("Calling mock AI with prompt:", prompt, "and context:", context);
    return new Promise(resolve => {
        setTimeout(() => {
            let responseText = `I can help with team optimization. For example, ask: "How can I achieve 24-hour coverage?"`;
            if (prompt.toLowerCase().includes('coverage')) {
                responseText = `Your current coverage is **${context.currentCoverage} hours**. To improve, consider hiring in a European timezone like **London**.`;
            } else if (prompt.toLowerCase().includes('hire')) {
                responseText = `For your next hire, consider **Eastern Europe (e.g., Warsaw)** for great timezone overlap and talent.`;
            } else if (prompt.toLowerCase().includes('handoff')) {
                responseText = `To optimize handoffs, create a **1-2 hour overlap** between teams and use a standardized handoff document.`;
            }
            resolve({ success: true, response: { text: responseText } });
        }, 1200);
    });
}

function displayAIResponse(response, container) {
    container.innerHTML = `<div class="ai-response-content">${response.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
    gsap.fromTo(container, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 });
}

// ... the rest of the file ...
function getSelectedAttendees() {
    return Array.from(document.querySelectorAll('#attendees-selector input:checked')).map(cb => cb.value);
}

// ... all other functions like ANALYTICS, UI UPDATE, SETTINGS, DATA PERSISTENCE, UTILITIES, KEYBOARD SHORTCUTS, ERROR HANDLING go here...
// This is the complete file structure.

// ===== ANALYTICS & CALCULATIONS =====
function calculateCoverageHours() {
    if (HorizonSync.state.teamLocations.length === 0) return 0;
    
    const hoursCovered = new Array(24).fill(false);
    
    HorizonSync.state.teamLocations.forEach(location => {
        const nowInLocationTz = moment.tz(location.timezone);
        for (let localHour = 0; localHour < 24; localHour++) {
            if (localHour >= location.workHours.start && localHour < location.workHours.end) {
                const utcHour = nowInLocationTz.hour(localHour).utc().hour();
                hoursCovered[utcHour] = true;
            }
        }
    });
    
    return hoursCovered.filter(Boolean).length;
}

function calculateHandoffEfficiency() {
    if (HorizonSync.state.teamLocations.length < 2) return 100;
    
    let totalOverlap = 0;
    let pairs = 0;

    for (let i = 0; i < HorizonSync.state.teamLocations.length; i++) {
        for (let j = i + 1; j < HorizonSync.state.teamLocations.length; j++) {
            totalOverlap += calculateOverlapHours(HorizonSync.state.teamLocations[i], HorizonSync.state.teamLocations[j]);
            pairs++;
        }
    }
    
    const averageOverlap = pairs > 0 ? totalOverlap / pairs : 0;
    return Math.min(Math.round((averageOverlap / 2) * 100), 100);
}

function calculateOverlapHours(location1, location2) {
    const hours1 = [];
    for (let h = location1.workHours.start; h < location1.workHours.end; h++) {
        hours1.push(moment.tz(location1.timezone).hour(h).utc().hour());
    }

    const hours2 = [];
    for (let h = location2.workHours.start; h < location2.workHours.end; h++) {
        hours2.push(moment.tz(location2.timezone).hour(h).utc().hour());
    }

    return hours1.filter(h => hours2.includes(h)).length;
}

function calculateProductivityScore() {
    if (HorizonSync.state.teamLocations.length === 0) return 0;
    const coverageScore = (calculateCoverageHours() / 24) * 50;
    const efficiencyScore = (calculateHandoffEfficiency() / 100) * 50;
    return Math.round(coverageScore + efficiencyScore);
}

// ===== UI UPDATE FUNCTIONS =====
function updateUI() {
    updateDashboard();
    updateClocks();
}

function updateDashboard() {
    if (HorizonSync.state.currentSection !== 'dashboard') return;
    updateStats();
}

function updateStats() {
    document.getElementById('coverage-hours').textContent = calculateCoverageHours();
    document.getElementById('team-locations').textContent = HorizonSync.state.teamLocations.length;
    document.getElementById('handoff-score').textContent = calculateHandoffEfficiency() + '%';
    document.getElementById('productivity-score').textContent = calculateProductivityScore() + '%';
}

// ===== SETTINGS & PREFERENCES =====
function setTheme(theme) {
    HorizonSync.state.settings.theme = theme;
    applyTheme(theme);
    saveData();
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function applyTheme(theme) {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
}

function setLanguage(language) {
    HorizonSync.state.settings.language = language;
    applyLanguage(language);
    saveData();
}

function applyLanguage(language) {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = getTranslation(el.dataset.i18n, language);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = getTranslation(el.dataset.i18nPlaceholder, language);
    });
    document.getElementById('language-select').value = language;
}

function setTimeFormat(format) {
    HorizonSync.state.settings.timeFormat = format;
    saveData();
    updateAllClocks();
    document.getElementById('time-format-select').value = format;
}

function getTranslation(key, language = null) {
    const lang = language || HorizonSync.state.settings.language;
    return HorizonSync.translations[lang]?.[key] || HorizonSync.translations.en[key] || key;
}

// ===== DATA PERSISTENCE =====
function saveData() {
    try {
        const dataToSave = {
            teamLocations: HorizonSync.state.teamLocations,
            events: HorizonSync.state.events,
            settings: HorizonSync.state.settings,
            workflow: HorizonSync.workflowState
        };
        localStorage.setItem('horizonsync-data', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Failed to save data:', error);
    }
}

function loadSavedData() {
    try {
        const savedData = localStorage.getItem('horizonsync-data');
        if (savedData) {
            const data = JSON.parse(savedData);
            HorizonSync.state.teamLocations = data.teamLocations || [];
            HorizonSync.state.events = data.events || [];
            HorizonSync.state.settings = { ...HorizonSync.state.settings, ...data.settings };
            if (data.workflow) HorizonSync.workflowState = { ...HorizonSync.workflowState, ...data.workflow };
        }
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

function exportData() {
    try {
        const dataStr = JSON.stringify({ ...HorizonSync.state, workflow: HorizonSync.workflowState }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `horizonsync-data-${moment().format('YYYY-MM-DD')}.json`;
        link.click();
    } catch (error) {
        showToast('Failed to export data', 'error');
    }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                showConfirmationModal('Import Data?', 'This will overwrite current data.', () => {
                    if (importedData.teamLocations) HorizonSync.state.teamLocations = importedData.teamLocations;
                    if (importedData.events) HorizonSync.state.events = importedData.events;
                    if (importedData.settings) HorizonSync.state.settings = { ...HorizonSync.state.settings, ...importedData.settings };
                    if (importedData.workflow) HorizonSync.workflowState = { ...HorizonSync.workflowState, ...importedData.workflow };
                    saveData();
                    window.location.reload();
                });
            } catch (error) {
                showToast('Failed to import data.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    showConfirmationModal('Clear All Data?', 'This is irreversible.', () => {
        localStorage.removeItem('horizonsync-data');
        window.location.reload();
    });
}

// ===== UTILITY FUNCTIONS =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = { success: 'ti-circle-check', error: 'ti-circle-x', warning: 'ti-alert-triangle', info: 'ti-info-circle' };
    toast.innerHTML = `<i class="ti ${iconMap[type]}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    gsap.fromTo(toast, { x: '100%', opacity: 0 }, { x: '0%', opacity: 1, duration: 0.3 });
    setTimeout(() => {
        gsap.to(toast, { x: '100%', opacity: 0, duration: 0.3, onComplete: () => toast.remove() });
    }, 4000);
}

function populateHourSelectors() {
    const startHourSelect = document.getElementById('start-hour');
    const endHourSelect = document.getElementById('end-hour');
    for (let hour = 0; hour < 24; hour++) {
        const optionText = moment().hour(hour).format('HH:00');
        startHourSelect.add(new Option(optionText, hour));
        endHourSelect.add(new Option(moment().hour(hour + 1).format('HH:00'), hour + 1));
    }
    startHourSelect.value = '9';
    endHourSelect.value = '18';
}

function populateTimezoneSelectors() {
    const eventTimezoneSelect = document.getElementById('event-timezone');
    if (eventTimezoneSelect) {
        HorizonSync.timezoneData.forEach(tz => eventTimezoneSelect.add(new Option(tz.label, tz.value)));
    }
}

function startTimers() {
    if (HorizonSync.state.ui.timers.clockUpdater) clearInterval(HorizonSync.state.ui.timers.clockUpdater);
    HorizonSync.state.ui.timers.clockUpdater = setInterval(updateAllClocks, 1000);
    setInterval(updateStats, 60000);
}

// ===== EVENT HANDLERS FOR DYNAMIC ELEMENTS =====
function editLocation(locationId) {
    const location = HorizonSync.state.teamLocations.find(loc => loc.id === locationId);
    if (!location) return;

    const modal = document.getElementById('add-team-modal');
    modal.querySelector('.modal-header h3').textContent = 'Edit Team Member';
    const actionBtn = modal.querySelector('[data-action="add"]');
    actionBtn.textContent = 'Save Changes';
    
    modal.querySelector('#location-input').value = location.timezone;
    modal.querySelector('#role-select').value = location.role;
    modal.querySelector('#team-size').value = location.teamSize;
    modal.querySelector('#start-hour').value = location.workHours.start;
    modal.querySelector('#end-hour').value = location.workHours.end;
    
    const newBtn = actionBtn.cloneNode(true);
    actionBtn.parentNode.replaceChild(newBtn, actionBtn);

    newBtn.addEventListener('click', function handleEdit() {
        location.timezone = modal.querySelector('#location-input').value;
        location.city = location.timezone.split('/').pop().replace(/_/g, ' ');
        location.role = modal.querySelector('#role-select').value;
        location.teamSize = parseInt(modal.querySelector('#team-size').value);
        location.workHours.start = parseInt(modal.querySelector('#start-hour').value);
        location.workHours.end = parseInt(modal.querySelector('#end-hour').value);
        
        saveData();
        updateUI();
        closeModal('add-team-modal');
        
        setTimeout(() => {
            modal.querySelector('.modal-header h3').textContent = 'Add Team Member';
            const originalBtn = newBtn.cloneNode(true);
            originalBtn.textContent = 'Add Team Member';
            newBtn.parentNode.replaceChild(originalBtn, newBtn);
            originalBtn.addEventListener('click', handleAddTeamMember);
        }, 300);
    }, { once: true });

    openModal('add-team-modal');
}

// ===== KEYBOARD SHORTCUTS & ERROR HANDLING =====
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const activeModalId = HorizonSync.state.ui.activeModals.pop();
        if (activeModalId) closeModal(activeModalId);
        if (HorizonSync.state.ui.isMobileNavOpen) toggleMobileNav(false);
    }
});

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('An unexpected error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('A background operation failed.', 'warning');
});

window.addEventListener('beforeunload', saveData);
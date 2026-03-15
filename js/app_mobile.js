// 🛒 CONFIGURACIÓN FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCzJdAwd4C3tPW-1SXwYAGumCEDaMgmw1E",
  authDomain: "proyectorpro-85252.firebaseapp.com",
  projectId: "proyectorpro-85252",
  storageBucket: "proyectorpro-85252.firebasestorage.app",
  messagingSenderId: "1051920296429",
  appId: "1:1051920296429:web:04a02a39801c9cdd789fe4"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 💾 Habilitar Persistencia Offline (Optimizado para Móvil)
db.enablePersistence({ synchronizeTabs: false }) // Desactivamos sync de pestañas para evitar errores de estado interno en móviles
  .catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("[Firebase] Persistencia falló: Puede que la app esté abierta en otra pestaña.");
    } else if (err.code == 'unimplemented') {
        console.warn("[Firebase] Persistencia no soportada por este navegador.");
    } else {
        console.error("[Firebase] Error de persistencia desconocido:", err);
    }
  });

// 🔄 Recuperación de conexión al salir de suspensión (Sleep/Wake)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log("[Mobile] App despertó. Verificando conexiones...");
        firebase.firestore().enableNetwork()
            .then(() => {
                console.log("[Firebase] Red reactivada con éxito.");
                // Forzar refresco de listeners críticos si es necesario
            })
            .catch(err => console.warn("[Firebase] Error reactivando red:", err));
    }
});

// ðŸ›’ ESTADO GLOBAL
window.cart = JSON.parse(localStorage.getItem('mobileCart')) || { bible: [], songs: [] };
window.currentUser = JSON.parse(localStorage.getItem('mobileUser')) || null;
window.bibleState = { 
    view: 'versions', 
    version: null,
    book: null,
    chapter: null,
    selectedVerses: [] 
};
window.cloudSongs = [];
window.cloudAnnouncements = JSON.parse(localStorage.getItem('mobileCloudAnn')) || [];
window.pendingDeletions = JSON.parse(localStorage.getItem('mobilePendingDeletions')) || [];
window.lastLibraryUpdate = parseInt(localStorage.getItem('mobileLastSync')) || 0;
window.localBibles = {}; 
const normalizeText = (t) => t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

function initStatusIndicators() {
    const netInd = document.getElementById('netIndicator');
    const cloudInd = document.getElementById('cloudIndicator');

    const updateNet = () => {
        const isOnline = navigator.onLine;
        if (netInd) {
            netInd.className = `indicator ${isOnline ? 'online' : 'offline'}`;
            netInd.title = `Internet: ${isOnline ? 'Conectado' : 'Desconectado'}`;
            netInd.innerHTML = `<i class="fa-solid fa-${isOnline ? 'wifi' : 'plane-slash'}"></i> Web`;
        }
    };

    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);
    updateNet();

    // Monitor Firebase Connection (Cada 5s)
    setInterval(() => {
        if (cloudInd) {
            const isOnline = navigator.onLine;
            // Para el móvil consideramos "nube activa" si hay internet y Firebase está inicializado
            const cloudActive = isOnline && typeof firebase !== 'undefined' && firebase.apps.length > 0;
            cloudInd.className = `indicator ${cloudActive ? 'online' : 'offline'}`;
            cloudInd.title = `Nube: ${cloudActive ? 'Conectada' : 'Desconectada'}`;
            cloudInd.innerHTML = `<i class="fa-solid fa-cloud"></i> Nube`;
        }
    }, 5000);
}
window.bibleBooksFallback = [
    { id: 1, name: "Génesis", chapters: 50 }, { id: 2, name: "Éxodo", chapters: 40 }, { id: 3, name: "Levítico", chapters: 27 }, { id: 4, name: "Números", chapters: 36 }, { id: 5, name: "Deuteronomio", chapters: 34 },
    { id: 6, name: "Josué", chapters: 24 }, { id: 7, name: "Jueces", chapters: 21 }, { id: 8, name: "Rut", chapters: 4 }, { id: 9, name: "1 Samuel", chapters: 31 }, { id: 10, name: "2 Samuel", chapters: 24 },
    { id: 11, name: "1 Reyes", chapters: 22 }, { id: 12, name: "2 Reyes", chapters: 25 }, { id: 13, name: "1 Crónicas", chapters: 29 }, { id: 14, name: "2 Crónicas", chapters: 36 }, { id: 15, name: "Esdras", chapters: 10 },
    { id: 16, name: "Nehemías", chapters: 13 }, { id: 17, name: "Ester", chapters: 10 }, { id: 18, name: "Job", chapters: 42 }, { id: 19, name: "Salmos", chapters: 150 }, { id: 20, name: "Proverbios", chapters: 31 },
    { id: 21, name: "Eclesiastés", chapters: 12 }, { id: 22, name: "Cantares", chapters: 8 }, { id: 23, name: "Isaías", chapters: 66 }, { id: 24, name: "Jeremías", chapters: 52 }, { id: 25, name: "Lamentaciones", chapters: 5 },
    { id: 26, name: "Ezequiel", chapters: 48 }, { id: 27, name: "Daniel", chapters: 12 }, { id: 28, name: "Oseas", chapters: 14 }, { id: 29, name: "Joel", chapters: 3 }, { id: 30, name: "Amós", chapters: 9 },
    { id: 31, name: "Abdías", chapters: 1 }, { id: 32, name: "Jonás", chapters: 4 }, { id: 33, name: "Miqueas", chapters: 7 }, { id: 34, name: "Nahúm", chapters: 3 }, { id: 35, name: "Habacuc", chapters: 3 },
    { id: 36, name: "Sofonías", chapters: 3 }, { id: 37, name: "Hageo", chapters: 2 }, { id: 38, name: "Zacarías", chapters: 14 }, { id: 39, name: "Malaquías", chapters: 4 }, { id: 40, name: "Mateo", chapters: 28 },
    { id: 41, name: "Marcos", chapters: 16 }, { id: 42, name: "Lucas", chapters: 24 }, { id: 43, name: "Juan", chapters: 21 }, { id: 44, name: "Hechos", chapters: 28 }, { id: 45, name: "Romanos", chapters: 16 },
    { id: 46, name: "1 Corintios", chapters: 16 }, { id: 47, name: "2 Corintios", chapters: 13 }, { id: 48, name: "Gálatas", chapters: 6 }, { id: 49, name: "Efesios", chapters: 6 }, { id: 50, name: "Filipenses", chapters: 4 },
    { id: 51, name: "Colosenses", chapters: 4 }, { id: 52, name: "1 Tesalonicenses", chapters: 5 }, { id: 53, name: "2 Tesalonicenses", chapters: 3 }, { id: 54, name: "1 Timoteo", chapters: 6 }, { id: 55, name: "2 Timoteo", chapters: 4 },
    { id: 56, name: "Tito", chapters: 3 }, { id: 57, name: "Filemón", chapters: 1 }, { id: 58, name: "Hebreos", chapters: 13 }, { id: 59, name: "Santiago", chapters: 5 }, { id: 60, name: "1 Pedro", chapters: 5 },
    { id: 61, name: "2 Pedro", chapters: 3 }, { id: 62, name: "1 Juan", chapters: 5 }, { id: 63, name: "2 Juan", chapters: 1 }, { id: 64, name: "3 Juan", chapters: 1 }, { id: 65, name: "Judas", chapters: 1 },
    { id: 66, name: "Apocalipsis", chapters: 22 }
];

/** ── PERSISTENCIA LOCAL (IndexedDB) ── */
const MobileDB = {
    dbName: 'ProyectorProMobile',
    dbVersion: 1,
    db: null,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = e => reject(e);
            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('bibles')) {
                    db.createObjectStore('bibles');
                }
            };
            request.onsuccess = e => {
                this.db = e.target.result;
                resolve(this.db);
            };
        });
    },

    async saveBible(name, data) {
        if (!this.db) await this.init();
        const tx = this.db.transaction('bibles', 'readwrite');
        tx.objectStore('bibles').put(data, name);
        return new Promise(res => tx.oncomplete = res);
    },

    async getAllBibles() {
        if (!this.db) await this.init();
        return new Promise((resolve) => {
            const tx = this.db.transaction('bibles', 'readonly');
            const store = tx.objectStore('bibles');
            const request = store.getAll();
            const keysRequest = store.getAllKeys();
            
            request.onsuccess = () => {
                const bibles = {};
                keysRequest.onsuccess = () => {
                    keysRequest.result.forEach((key, i) => {
                        bibles[key] = request.result[i];
                    });
                    resolve(bibles);
                };
            };
        });
    }
};

/** ── INICIALIZACIÓN ── */
document.addEventListener('DOMContentLoaded', async () => {
    const splash = document.getElementById('installingScreen');
    const splashStatus = document.getElementById('installStatus');
    const splashProgress = document.getElementById('installProgress');
    const app = document.getElementById('app-mobile');

    // 1. Mostrar Splash solo si es la primera vez o se borraron datos
    const isInitialized = localStorage.getItem('mobile_initialized');
    if (app) app.classList.remove('hidden');
    
    if (!isInitialized && splash) {
        splash.classList.remove('hidden');
        if (splashProgress) splashProgress.style.width = '15%';
        const login = document.getElementById('loginScreen');
        if (login) login.classList.add('hidden'); // Ocultar login mientras carga splash
    } else {
        if (splash) splash.classList.add('hidden');
    }

    // 2. Inicializar almacenamiento local
    try {
        if (splashStatus) splashStatus.textContent = "Cargando biblioteca local...";
        await MobileDB.init();
        window.localBibles = await MobileDB.getAllBibles();
        if (splashProgress) splashProgress.style.width = '30%';
        console.log("[Persistence] Biblias locales restauradas:", Object.keys(window.localBibles));
    } catch (e) {
        console.warn("[Persistence] Error cargando biblias locales:", e);
    }

    // 3. Inicializar Lógica de la App
    if (splashStatus) splashStatus.textContent = "Conectando con la nube...";
    initPanels();
    initSearch();
    initCloudListeners();
    initVerseCacheListener();
    initNotesListener();
    
    if (splashProgress) splashProgress.style.width = '60%';

    // 4. Pequeño delay para asegurar que Firestore conecte y cargue lo esencial
    setTimeout(async () => {
        if (splashStatus) splashStatus.textContent = "Cargando favoritos y preferencias...";
        initSongFavoritesListener();
        renderCart();
        renderCloudLibrary(window.cloudAnnouncements, 'anuncios', 'announcementListCloud');
        
        if (splashProgress) splashProgress.style.width = '90%';

        // 5. Finalizar y mostrar la app
        setTimeout(() => {
            checkUserSession(); // Esto decide si mostrar login o dashboard
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.classList.add('hidden');
                    localStorage.setItem('mobile_initialized', 'true'); // Marcar como inicializado inmediatamente
                }, 500);
            } else {
                localStorage.setItem('mobile_initialized', 'true');
            }
            if (splashProgress) splashProgress.style.width = '100%';
        }, 800);
    }, 1500);

    // Configurar botones globales
    document.getElementById('btnSendToCloud').onclick = handleGlobalSend;
    if (document.getElementById('btnSendManualAnn')) document.getElementById('btnSendManualAnn').onclick = handleManualAnnSend;
    if (document.getElementById('btnCancelAnnEdit')) document.getElementById('btnCancelAnnEdit').onclick = cancelAnnEdit;
    if (document.getElementById('btnSendNote')) document.getElementById('btnSendNote').onclick = handleNoteSend;
    
    const btnAdd = document.getElementById('btnAddFromPreview');
    if (btnAdd) {
        btnAdd.onclick = () => {
            if (window.currentPreviewSong) {
                addItemToCart('songs', window.currentPreviewSong);
                closePreview();
            }
        };
    }

    initSyncFormLogic();
    initStatusIndicators();
});

function initSyncFormLogic() {
    const btnToggleNewAnn = document.getElementById('btnToggleNewAnn');
    const annFormContainer = document.getElementById('annFormContainer');
    const annFormHeader = document.getElementById('annFormHeader');

    if (btnToggleNewAnn && annFormContainer) {
        btnToggleNewAnn.onclick = () => {
            if (annFormContainer.classList.contains('hidden')) {
                cancelAnnEdit();
                annFormContainer.classList.remove('hidden');
                if (annFormHeader) annFormHeader.classList.add('active');
                setTimeout(() => {
                    const titleEl = document.getElementById('manualAnnTitle');
                    if (titleEl) {
                        titleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        titleEl.focus();
                    }
                }, 100);
            } else {
                annFormContainer.classList.add('hidden');
                if (annFormHeader) annFormHeader.classList.remove('active');
            }
        };
    }
    
    if (annFormHeader) {
        annFormHeader.onclick = () => {
            if (annFormContainer) annFormContainer.classList.add('hidden');
            annFormHeader.classList.remove('active');
        };
    }

    const manualInputs = ['manualAnnTitle', 'manualAnnText', 'manualAnnTime'];
    manualInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onblur = () => {
                setTimeout(() => {
                    if (annFormContainer && !annFormContainer.classList.contains('hidden')) {
                        const panelAnuncios = document.querySelector('.panel[data-id="anuncios"]');
                        const formHeader = document.getElementById('annFormHeader');
                        if (panelAnuncios && formHeader) {
                            panelAnuncios.scrollTo({
                                top: formHeader.offsetTop - 10,
                                behavior: 'smooth'
                            });
                        }
                    }
                }, 250);
            };
        }
    });
}

/** ── COMUNICACIÓN CON LA NUBE ── */
function initCloudListeners() {
    console.log("[Mobile] Conectado a la nube.");

    db.collection('biblioteca_biblias').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            window.bibleVersions = data.lista || [];
            window.bibleBooks = data.libros || [];
            if (window.bibleState.view === 'versions') renderBibleVersions();
        }
    });

    db.collection('biblioteca_cantos').doc('master').onSnapshot(async doc => {
        if (!doc.exists) return;
        
        const data = doc.data();
        const numChunks = data.numChunks || 0;
        
        if (numChunks > 0) {
            console.log(`[Sync] Detectados ${numChunks} bloques de canciones...`);
            
            // Usamos un semáforo sencillo para evitar múltiples cargas simultáneas
            if (window.isFetchingChunks) return;
            window.isFetchingChunks = true;

            try {
                // Descargar bloques por grupos de 5 para no saturar la persistencia de Firestore inicial
                let allSongs = [];
                const chunkSize = 5;
                for (let i = 0; i < numChunks; i += chunkSize) {
                    const batch = [];
                    for (let j = i; j < i + chunkSize && j < numChunks; j++) {
                        batch.push(db.collection('biblioteca_cantos').doc(`chunk_${j}`).get());
                    }
                    const snapshots = await Promise.all(batch);
                    snapshots.forEach(s => {
                        if (s.exists) {
                            allSongs = allSongs.concat(s.data().lista || []);
                        }
                    });
                }
                
                // Ordenar alfabéticamente
                allSongs.sort((a,b) => (a.titulo || a.title || "").localeCompare(b.titulo || b.title || ""));
                
                window.cloudSongs = allSongs;
                renderSongLibrary(window.cloudSongs);
                console.log(`[Sync] ${window.cloudSongs.length} canciones reconstruidas con éxito.`);
            } catch (err) {
                console.error("[Sync] Error al reconstruir bloques:", err);
            } finally {
                window.isFetchingChunks = false;
            }
        } else if (data.lista) {
            // Soporte para formato antiguo (un solo doc)
            window.cloudSongs = data.lista;
            renderSongLibrary(window.cloudSongs);
            console.log(`[Sync] ${window.cloudSongs.length} canciones cargadas (Formato antiguo).`);
        }
    });

    db.collection('biblioteca_anuncios').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            // Protección contra reversión: Cooldown de seguridad
            const cooldown = 20000; // 20 segundos
            const diff = Date.now() - window.lastLibraryUpdate;
            if (diff < cooldown) {
                console.log(`[Sync] Cooldown activo (${Math.round((cooldown - diff)/1000)}s). Mezclando solo si es más nuevo.`);
            }

            const cloudRaw = doc.data().lista || [];
            
            // Limpiar pendientes de eliminación si ya no existen en la nube
            if (window.pendingDeletions && window.pendingDeletions.length > 0) {
                const stillInCloud = window.pendingDeletions.filter(id => cloudRaw.find(a => String(a.id) === String(id)));
                if (stillInCloud.length !== window.pendingDeletions.length) {
                    window.pendingDeletions = stillInCloud;
                    localStorage.setItem('mobilePendingDeletions', JSON.stringify(window.pendingDeletions));
                }
            }

            // Filtrar lista de la nube con los que acabamos de borrar localmente
            const cloudList = cloudRaw.filter(a => !window.pendingDeletions.includes(String(a.id)));
            let changed = false;

            // Fusión inteligente: No dejar que datos viejos de la nube pisen ediciones locales recientes
            const mergedList = cloudList.map(cloudItem => {
                const localItem = window.cloudAnnouncements.find(a => String(a.id) === String(cloudItem.id));
                if (localItem && (localItem.updatedAt || 0) > (cloudItem.updatedAt || 0)) {
                    // La versión local es más reciente que la de la nube
                    return localItem;
                }
                if (localItem) {
                    // Si los datos son distintos, marcamos que cambió la UI
                    if (JSON.stringify(localItem) !== JSON.stringify(cloudItem)) changed = true;
                } else {
                    changed = true;
                }
                return cloudItem;
            });

            // Añadir los que están locales pero no en la nube todavía (vía petición pendiente)
            window.cloudAnnouncements.forEach(localItem => {
                // No re-añadir si está marcado para borrar
                if (window.pendingDeletions.includes(String(localItem.id))) return;

                if (!mergedList.find(a => String(a.id) === String(localItem.id))) {
                    mergedList.push(localItem);
                    changed = true;
                }
            });

            if (changed || diff >= cooldown) {
                console.log("[Sync] Biblioteca sincronizada (Con fusiones inteligentes)");
                window.cloudAnnouncements = mergedList;
                localStorage.setItem('mobileCloudAnn', JSON.stringify(window.cloudAnnouncements));
                renderCloudLibrary(window.cloudAnnouncements, 'anuncios', 'announcementListCloud');
            }
        }
    });
}

function initNotesListener() {
    const today = new Date().toISOString().split('T')[0];
    db.collection('notas')
        .where('fecha', '>=', today)
        .onSnapshot(snapshot => {
            const container = document.getElementById('notesListCloud');
            if (!container) return;
            container.innerHTML = '';
            
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state">No hay notas registradas hoy.</div>';
                return;
            }

            const logs = [];
            snapshot.forEach(doc => logs.push(doc.data()));
            logs.sort((a,b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));

            logs.forEach(data => {
                const timeStr = data.timestamp ? new Date(data.timestamp.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';
                const el = document.createElement('div');
                el.className = `cloud-card ${data.categoria || 'tecnica'}`;
                el.style = "margin-bottom: 8px; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.03); border-left: 3px solid var(--ocher-base); font-size: 0.85rem;";
                el.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom: 5px; opacity:0.6; font-size:0.7rem;">
                        <span>${(data.categoria || 'TÉCNICA').toUpperCase()}</span>
                        <span>${timeStr}</span>
                    </div>
                    <div>${data.texto}</div>
                    <div style="font-size:0.75rem; color:var(--ocher-light); margin-top:5px;">— ${data.usuario || 'Líder'}</div>
                `;
                container.appendChild(el);
            });
        });
}

/** ── NAVEGACIÓN Y DESCARGA DE BIBLIA (PRO LOCAL) ── */
function renderBibleVersions() {
    const container = document.getElementById('bibleListCloud');
    if (!container) return;
    
    container.innerHTML = '';
    // Preservar mobile-grid-list para el scroll y aÃ±adir layout de grid
    container.classList.add('mobile-grid-list', 'version-grid');
    container.style = ''; 

    window.bibleVersions.forEach(v => {
        const isDownloaded = !!window.localBibles[v.id];
        const isPrepared = !!v.preparada;
        const el = document.createElement('div');
        el.className = 'version-card';
        
        let statusClass = isDownloaded ? 'status-inst' : (isPrepared ? 'status-dl' : 'status-pending');
        let statusText = isDownloaded ? 'INSTALADA' : (isPrepared ? 'DESCARGAR' : 'NO PREPARADA');
        let statusIcon = isDownloaded ? 'fa-circle-check' : (isPrepared ? 'fa-cloud-arrow-down' : 'fa-triangle-exclamation');

        el.innerHTML = `
            <div class="v-name" title="${v.nombre || v.id}">${v.nombre || v.id}</div>
            <div class="v-status ${statusClass}">
                <i class="fa-solid ${statusIcon} v-icon"></i>
                ${statusText}
            </div>
        `;
        
        el.onclick = () => {
             const searchInput = document.getElementById('bibleSearchGlobal');
             if (searchInput) searchInput.value = '';
             window.bibleState.version = v.id;
             if (!isDownloaded) {
                 showConfirm(`¿Descargar ${v.id} para búsqueda local e instantánea? (Solo una vez)`, () => {
                     downloadFullBible(v.id);
                 });
             } else {
                 showBibleView('books');
             }
        };
        container.appendChild(el);
    });
}

async function downloadFullBible(versionName) {
    const btn = (window.event && window.event.target && (window.event.target.tagName === 'DIV' || window.event.target.classList.contains('v-status'))) ? window.event.target : null;
    const oldHtml = btn ? btn.innerHTML : '';
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Iniciando...';
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    }
    
    try {
        if (!versionName) throw new Error("Nombre de versión no válido.");

        // 1. Obtener lista de libros desde el master
        const masterDoc = await db.collection('biblioteca_biblias').doc('master').get();
        if (!masterDoc.exists) throw new Error("No se pudo conectar con la base de datos de Biblias.");
        
        const data = masterDoc.data();
        const booksList = data.libros || [];
        if (booksList.length === 0) throw new Error("No hay información de libros disponible.");

        const fullText = {};
        const total = booksList.length;
        
        showNotification(`Iniciando descarga de ${versionName}...`, "info", "bible-dl");

        // 2. Descargar libro por libro (Secuencial para evitar saturar el móvil)
        for (let i = 0; i < total; i++) {
            const book = booksList[i];
            
            // Actualizar UI del botón y notificación
            if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i+1}/${total}`;
            if (i % 5 === 0 || i === total - 1) {
                showNotification(`Descargando ${versionName}: libro ${i+1} de ${total}...`, "info", "bible-dl");
            }

            const docPlan = await db.collection('biblias_texto_completo').doc(versionName).collection('libros').doc(String(book.id)).get();
            
            if (docPlan.exists) {
                fullText[book.id] = docPlan.data();
            } else {
                console.warn(`[Bible] Libro ${book.id} (${book.name}) no encontrado en la nube.`);
            }
        }

        if (Object.keys(fullText).length === 0) {
            throw new Error(`La Biblia "${versionName}" no tiene contenido en la nube.`);
        }

        // 3. Guardar localmente
        window.localBibles[versionName] = fullText;
        await MobileDB.saveBible(versionName, fullText);
        
        showNotification(`¡${versionName} descargada con éxito!`, "success", "bible-dl");
        showBibleView('books');
    } catch (e) {
        console.error("Download error:", e);
        // Si es un error de "Assertion failed", avisar que es por caché
        if (e.message.includes("ASSERTION FAILED")) {
            showNotification("Error interno del navegador. Refresca y reintenta.", "error", "bible-dl");
        } else {
            showNotification("Error: " + e.message, "error", "bible-dl");
        }
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
    }
    renderBibleVersions();
}

function renderBibleBooks() {
    const otContainer = document.getElementById('bibleBooksOT');
    const ntContainer = document.getElementById('bibleBooksNT');
    if (!otContainer || !ntContainer) return;
    
    otContainer.innerHTML = '';
    ntContainer.innerHTML = '';

    // Usar libros del master si existen, si no usar el fallback estÃ¡tico
    const list = (window.bibleBooks && window.bibleBooks.length > 0) ? window.bibleBooks : window.bibleBooksFallback;

    list.forEach(b => {
        const el = document.createElement('div');
        el.className = 'pill-item';
        el.textContent = b.name;
        el.onclick = () => {
            window.bibleState.book = b;
            showBibleView('chapters');
        };
        
        // Asumiendo que IDs 1-39 son AT y 40+ NT
        const id = parseInt(b.id);
        if (id <= 39) otContainer.appendChild(el);
        else ntContainer.appendChild(el);
    });
}

function renderBibleChapters() {
    const container = document.getElementById('bibleChaptersCloud');
    container.innerHTML = '';
    const book = window.bibleState.book;
    if (!book) return;
    
    for (let i = 1; i <= book.chapters; i++) {
        const el = document.createElement('div');
        el.className = 'pill-item';
        el.style.minWidth = '45px';
        el.style.textAlign = 'center';
        el.textContent = i;
        el.onclick = () => {
            window.bibleState.chapter = i;
            showBibleView('verses');
            renderChapterVerses();
        };
        container.appendChild(el);
    }
}

async function renderChapterVerses() {
    const state = window.bibleState;
    const container = document.getElementById('bibleVersesTextCloud');
    
    // 1. ¿Está en memoria local?
    const local = window.localBibles[state.version];
    if (local && local[state.book.id]) {
        const bookData = local[state.book.id].content;
        const chap = bookData.find(c => c.c == state.chapter);
        if (chap) {
            renderVersesList(chap.v);
            return;
        }
    }

    // 2. Si no, pedir a la PC (Fallback)
    container.innerHTML = '<div class="loading-state">Pidiendo a PC...</div>';
    await db.collection('peticiones_movil').doc('current').set({
        type: 'GET_VERSES',
        version: state.version,
        bookId: state.book.id,
        chapter: state.chapter,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function initVerseCacheListener() {
    db.collection('cache_capitulo').doc('current').onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        const state = window.bibleState;
        
        if (data.type === 'VERSES' && state.view === 'verses') {
            if (data.bookId == state.book?.id && data.chapter == state.chapter) {
                renderVersesList(data.verses);
            }
        } else if (data.type === 'SEARCH_RESULTS' && state.view === 'verses') {
             // Solo si no estamos haciendo búsqueda local
             if (!window.localBibles[state.version]) renderSearchResults(data.results);
        }
    });
}

/** ── BÚSQUEDA LOCAL ── */
function performLocalSearch(query) {
    const versionName = window.bibleState.version;
    let targetVersion = versionName;
    if (!targetVersion) {
        const downloaded = Object.keys(window.localBibles);
        if (downloaded.length > 0) targetVersion = downloaded[0];
        else return false;
    }

    const local = window.localBibles[targetVersion];
    if (!local) return false;

    const results = [];
    const q = normalizeText(query);
    
    // Buscar en todos los libros descargados
    Object.values(local).forEach(book => {
        if (!book.content) return;
        book.content.forEach(chap => {
            if (!chap.v) return;
            chap.v.forEach(v => {
                if (v.text && normalizeText(v.text).includes(q)) {
                    results.push({
                        cita: `${targetVersion} ${book.n} ${chap.c}:${v.verse}`,
                        texto: v.text
                    });
                }
            });
        });
    });

    if (results.length > 0) {
        renderSearchResults(results.slice(0, 40)); 
        return true;
    }
    return false;
}

function renderVersesList(verses) {
    const container = document.getElementById('bibleVersesTextCloud');
    const headerTitle = document.getElementById('versesHeaderTitle');
    if (headerTitle) headerTitle.textContent = "MARCA LOS VERSICULOS";
    container.innerHTML = '';
    window.bibleState.selectedVerses = [];
    window.bibleState.currentVerses = verses; // Guardar versículos actuales para recuperar el texto después

    if (!verses || verses.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay versÃ­culos.</div>';
        return;
    }

    verses.forEach(v => {
        const el = document.createElement('div');
        el.className = 'verse-row';
        el.style.padding = '12px';
        el.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        el.style.display = 'flex';
        el.style.gap = '10px';
        
        el.innerHTML = `
            <div class="verse-num" style="color:var(--ocher-base); font-weight:bold; min-width:20px;">${v.verse}</div>
            <div class="verse-text" style="flex:1; font-size:0.95rem;">${v.text}</div>
            <input type="checkbox" class="verse-check" style="width:20px; height:20px;">
        `;
        
        el.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                const cb = el.querySelector('input');
                cb.checked = !cb.checked;
            }
            toggleVerseSelection(v.verse);
            el.style.background = el.querySelector('input').checked ? 'rgba(212,175,55,0.1)' : 'transparent';
        };
        container.appendChild(el);
    });
}

function renderSearchResults(results) {
    const container = document.getElementById('bibleVersesTextCloud');
    const headerTitle = document.getElementById('versesHeaderTitle');
    showBibleView('verses');
    if (headerTitle) headerTitle.textContent = "RESULTADOS DE BÚSQUEDA";
    container.innerHTML = '';
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-state">No se encontraron resultados para esta bÃºsqueda.</div>';
        return;
    }

    results.forEach(r => {
        const el = document.createElement('div');
        el.className = 'verse-row';
        el.style.padding = '15px';
        el.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
        el.style.background = 'rgba(255,255,255,0.02)';
        el.style.marginBottom = '8px';
        el.style.borderRadius = '8px';
        el.innerHTML = `
            <div style="color:var(--ocher-base); font-size:0.8rem; font-weight:800; margin-bottom:6px; display:flex; justify-content:space-between;">
                <span>${r.cita}</span>
                <i class="fa-solid fa-plus-circle"></i>
            </div>
            <div style="font-size:0.95rem; line-height:1.5; color:#fff;">${r.texto}</div>
        `;
        el.onclick = () => {
             addItemToCart('bible', { cita: r.cita, texto: r.texto });
             
             // Feedback visual mejorado
             const icon = el.querySelector('i');
             const originalClass = icon.className;
             
             el.style.background = 'rgba(212,175,55,0.3)';
             el.style.borderColor = 'var(--ocher-base)';
             icon.className = 'fa-solid fa-circle-check';
             icon.style.color = '#2ecc71';
             
             setTimeout(() => {
                 el.style.background = 'rgba(255,255,255,0.02)';
                 el.style.borderColor = 'transparent';
                 icon.className = originalClass;
                 icon.style.color = '';
             }, 600);
        };
        container.appendChild(el);
    });
}

function toggleVerseSelection(num) {
    const idx = window.bibleState.selectedVerses.indexOf(num);
    if (idx === -1) window.bibleState.selectedVerses.push(num);
    else window.bibleState.selectedVerses.splice(idx, 1);
}

function addSelectedVersesToCart() {
    const state = window.bibleState;
    if (state.selectedVerses.length === 0) return;
    
    const sorted = [...state.selectedVerses].sort((a, b) => a - b);
    const verAbbr = state.version.split('-').pop().trim();

    function processAndAdd(obs) {
        sorted.forEach(function(vNum) {
            const vData = state.currentVerses ? state.currentVerses.find(v => v.verse === vNum) : null;
            const cite = `${verAbbr} ${state.book.name} ${state.chapter}:${vNum}`;
            const vText = vData ? vData.text : "Versículo individual";
            
            addItemToCartFinal('bible', { cita: cite, texto: vText }, obs);
        });
        
        bibleBack();
        if (typeof showNotification === 'function') {
            showNotification(`${sorted.length} versículos añadidos.`, "success");
        }
    }

    // Manejar modal de observaciones (copia lógica de addItemToCart para evitar múltiples popups)
    const modal = document.getElementById('modalObs');
    const input = document.getElementById('obsModalInput');

    if (modal && input) {
        input.value = "";
        modal.classList.remove('hidden');
        document.getElementById('btnConfirmObs').onclick = () => {
            processAndAdd(input.value.trim());
            modal.classList.add('hidden');
        };
    } else {
        processAndAdd("");
    }
}

/** ── NAVEGACIÓN DE VISTAS ── */
function showBibleView(viewName) {
    window.bibleState.view = viewName;
    document.querySelectorAll('.bible-view').forEach(v => v.classList.add('hidden'));
    document.getElementById('bibleTitleMain').classList.remove('hidden');
    document.getElementById('bibleBreadcrumb').classList.add('hidden');
    const cart = document.getElementById('bibleCartContainer');
    const pathEl = document.getElementById('biblePath');
    
    if (viewName === 'versions') {
        document.getElementById('viewVersions').classList.remove('hidden');
        renderBibleVersions();
    } 
    else if (viewName === 'books') {
        document.getElementById('viewBooks').classList.remove('hidden');
        document.getElementById('bibleBreadcrumb').classList.remove('hidden');
        document.getElementById('bibleTitleMain').classList.add('hidden');
        pathEl.innerHTML = `<span onclick="showBibleView('versions')" style="cursor:pointer; color:var(--ocher-light); font-weight:800; padding: 2px 6px; background:rgba(212,175,55,0.1); border-radius:4px; margin-right:6px;" class="breadcrumb-item">${window.bibleState.version}</span>`;
        if (cart) cart.classList.remove('hidden');
        renderBibleBooks();
    }
    else if (viewName === 'chapters') {
        document.getElementById('viewChapters').classList.remove('hidden');
        document.getElementById('bibleBreadcrumb').classList.remove('hidden');
        document.getElementById('bibleTitleMain').classList.add('hidden');
        pathEl.innerHTML = `
            <span onclick="showBibleView('books')" style="cursor:pointer; color:var(--ocher-light); font-weight:800; padding: 2px 6px; background:rgba(212,175,55,0.1); border-radius:4px; margin-right:6px;" class="breadcrumb-item">${window.bibleState.version}</span> 
            <span style="color:var(--ocher-base); font-weight:700;">${window.bibleState.book.name}</span>
        `;
        if (cart) cart.classList.remove('hidden');
        renderBibleChapters();
    }
    else if (viewName === 'verses') {
        document.getElementById('viewVerses').classList.remove('hidden');
        document.getElementById('bibleBreadcrumb').classList.remove('hidden');
        document.getElementById('bibleTitleMain').classList.add('hidden');
        const bookName = window.bibleState.book ? window.bibleState.book.name : "";
        const chapNum = window.bibleState.chapter || "";
        
        if (bookName) {
            pathEl.innerHTML = `
                <span onclick="showBibleView('books')" style="cursor:pointer; color:var(--ocher-light); font-weight:800; padding: 2px 6px; background:rgba(212,175,55,0.1); border-radius:4px; margin-right:6px;" class="breadcrumb-item">${window.bibleState.version}</span>
                <span onclick="showBibleView('chapters')" style="cursor:pointer; color:var(--ocher-base); font-weight:700;" class="breadcrumb-item">${bookName}</span> 
                <span style="opacity:0.4; margin:0 4px;">&gt;</span>
                <span onclick="showBibleView('chapters')" style="cursor:pointer; color:var(--text-main);" class="breadcrumb-item">${chapNum}</span>
            `;
        } else {
            pathEl.innerHTML = `<span onclick="showBibleView('versions')" style="cursor:pointer;" class="breadcrumb-item">Resultados BÃºsqueda</span>`;
        }
        if (cart) cart.classList.add('hidden');
    }
}

function bibleBack() {
    const cur = window.bibleState.view;
    if (cur === 'verses') {
        if (window.bibleState.book) showBibleView('chapters');
        else showBibleView('versions'); // De bÃºsqueda a versiones
    }
    else if (cur === 'chapters') showBibleView('books');
    else if (cur === 'books') showBibleView('versions');
}

/** ── CANTOS Y ANUNCIOS ── */
function renderSongLibrary(lista) {
    const container = document.getElementById('songListCloud');
    if (!container) return;
    container.innerHTML = '';
    lista.forEach(item => {
        const el = document.createElement('div');
        el.className = 'mobile-list-item';
        el.innerHTML = `<i class="fa-solid fa-music"></i><div class="item-info"><div class="item-title">${item.titulo}</div></div><i class="fa-solid fa-eye" style="opacity:0.3"></i>`;
        el.onclick = () => showPreview(item);
        container.appendChild(el);
    });
}

function renderCloudLibrary(lista, type, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (!lista || lista.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay anuncios en la biblioteca.</div>';
        return;
    }

    lista.forEach(item => {
        // Soporte robusto para ambos idiomas de campos
        const title = item.titulo || item.title || "(Sin título)";
        const text = item.texto || item.content || "";
        const id = String(item.id);
        const hasImg = item.img ? `<i class="fa-solid fa-image" style="color:var(--ocher-light); margin-left:8px; font-size:0.8rem;"></i>` : "";
        
        // Escapar JSON para los atributos onclick
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

        const el = document.createElement('div');
        el.className = 'mobile-list-item';
        el.innerHTML = `
            <i class="fa-solid fa-bullhorn"></i>
            <div class="item-info">
                <div class="item-title">${title} ${hasImg}</div>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <i class="fa-solid fa-eye" style="opacity:0.3; font-size:1.1rem;" onclick="event.stopPropagation(); showPreviewAnn(${itemJson})"></i>
                <i class="fa-solid fa-pen-to-square" style="color:var(--ocher-base); font-size:1rem;" onclick="event.stopPropagation(); editAnnouncement(${itemJson})"></i>
                <i class="fa-solid fa-trash-can" style="color:#e74c3c; font-size:1rem;" onclick="event.stopPropagation(); deleteAnnouncement('${id}')"></i>
            </div>
        `;
        el.onclick = () => {
            // Quitar el proceso de añadir directo al presionar el anuncio
            // Ahora la única forma de añadir es con el botón + o desde el preview
            showPreviewAnn(item);
        };
        container.appendChild(el);
    });
}

function editAnnouncement(ann) {
    const idEl = document.getElementById('manualAnnId');
    const titleEl = document.getElementById('manualAnnTitle');
    const textEl = document.getElementById('manualAnnText');
    const timeEl = document.getElementById('manualAnnTime');
    const labelEl = document.getElementById('btnAnnLabel');
    
    if (idEl) idEl.value = ann.id;
    if (titleEl) titleEl.value = ann.titulo || "";
    if (textEl) textEl.value = ann.texto || "";
    if (timeEl) timeEl.value = ann.tiempo || 20;
    if (labelEl) labelEl.textContent = "GUARDAR CAMBIOS";

    const btnCancel = document.getElementById('btnCancelAnnEdit');
    if (btnCancel) btnCancel.classList.remove('hidden');
    
    const container = document.getElementById('annFormContainer');
    if (container) container.classList.remove('hidden');
    const header = document.getElementById('annFormHeader');
    if (header) header.classList.add('active');
    
    if (titleEl) {
        setTimeout(() => {
            titleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            titleEl.focus();
        }, 150);
    }
}

function cancelAnnEdit() {
    const idEl = document.getElementById('manualAnnId');
    const titleEl = document.getElementById('manualAnnTitle');
    const textEl = document.getElementById('manualAnnText');
    const timeEl = document.getElementById('manualAnnTime');
    const labelEl = document.getElementById('btnAnnLabel');
    
    if (idEl) idEl.value = "";
    if (titleEl) titleEl.value = "";
    if (textEl) textEl.value = "";
    if (timeEl) timeEl.value = 20;
    if (labelEl) labelEl.textContent = "AÑADIR";

    const btnCancel = document.getElementById('btnCancelAnnEdit');
    if (btnCancel) btnCancel.classList.add('hidden');

    const container = document.getElementById('annFormContainer');
    if (container) container.classList.add('hidden');
    const header = document.getElementById('annFormHeader');
    if (header) header.classList.remove('active');
}

function deleteAnnouncement(id) {
    showConfirm("¿Deseas eliminar este anuncio definitivamente de la biblioteca?", () => {
        // 1. Enviar petición a Firestore (para que la PC lo borre)
        db.collection('peticiones_libreria').add({
            type: 'DELETE_ANN',
            id: id,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Optimización local inmediata: Agregar a lista negra temporal
        if (!window.pendingDeletions) window.pendingDeletions = [];
        window.pendingDeletions.push(String(id));
        localStorage.setItem('mobilePendingDeletions', JSON.stringify(window.pendingDeletions));

        // 3. Remover de la memoria local y guardar
        window.cloudAnnouncements = window.cloudAnnouncements.filter(a => String(a.id) !== String(id));
        localStorage.setItem('mobileCloudAnn', JSON.stringify(window.cloudAnnouncements));
        
        // 4. Activar cooldown de seguridad para ignorar el próximo snapshot de rebote
        window.lastLibraryUpdate = Date.now();
        localStorage.setItem('mobileLastSync', window.lastLibraryUpdate);
        
        // 5. Refrescar UI inmediatamente
        renderCloudLibrary(window.cloudAnnouncements, 'anuncios', 'announcementListCloud');

        showNotification("Solicitud de eliminación enviada", "info");
    });
}

function showPreviewAnn(ann) {
    window.currentPreviewSong = null;
    window.currentPreviewAnn = ann;
    document.getElementById('previewTitle').textContent = ann.titulo || "Anuncio General";
    const lyricsEl = document.getElementById('previewLyrics');
    
    let content = ann.texto || "Sin contenido de texto.";
    let imgInfo = "";
    if (ann.img) {
        imgInfo = `<div style="margin-bottom:15px; padding:8px; background:rgba(212,175,55,0.1); border-radius:8px; font-size:0.8rem; color:var(--ocher-light);">
            <i class="fa-solid fa-image"></i> IMAGEN DE FONDO: <strong>${ann.img}</strong>
        </div>`;
    }
    
    lyricsEl.innerHTML = `
        ${imgInfo}
        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; border-left: 4px solid var(--ocher-base); white-space: pre-wrap;">
            ${content}
        </div>
    `;
    const footer = document.getElementById('modalPreviewFooter');
    if (footer) footer.classList.add('hidden');
    document.getElementById('modalPreview').classList.remove('hidden');
}

async function showPreview(song) {
    window.currentPreviewAnn = null; // Limpiar preview de anuncio
    window.currentPreviewSong = song;
    document.getElementById('previewTitle').textContent = song.titulo;
    const lyricsEl = document.getElementById('previewLyrics');
    
    if (song.letra) {
        lyricsEl.textContent = song.letra;
    } else {
        lyricsEl.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando letra desde la nube...</div>';
        try {
            const doc = await db.collection('biblioteca_cantos_texto').doc(String(song.id)).get();
            if (doc.exists) {
                const data = doc.data();
                song.letra = data.letra; // Cachear para la prÃ³xima vez
                lyricsEl.textContent = data.letra;
            } else {
                lyricsEl.textContent = "Error: Letra no encontrada. Usa 'Exportar Letras' en la PC.";
            }
        } catch (e) {
            lyricsEl.textContent = "Error de conexión: " + e.message;
        }
    }
    const footer = document.getElementById('modalPreviewFooter');
    if (footer) footer.classList.remove('hidden');
    document.getElementById('modalPreview').classList.remove('hidden');
}

function closePreview() {
    document.getElementById('modalPreview').classList.add('hidden');
}

/** ── CARRITO Y ENVÍO ── */
/** ── MANEJO DE CARRITO Y PERSISTENCIA ── */
function saveCartState() {
    localStorage.setItem('mobileCart', JSON.stringify(window.cart));
}

function addItemToCart(type, item) {
    if (!window.cart[type]) window.cart[type] = [];
    
    // Abrir modal de observaciones nativo
    const modal = document.getElementById('modalObs');
    const input = document.getElementById('obsModalInput');
    
    if (modal && input) {
        input.value = "";
        modal.classList.remove('hidden');
        
        document.getElementById('btnConfirmObs').onclick = () => {
            addItemToCartFinal(type, item, input.value.trim());
            modal.classList.add('hidden');
            showNotification("¡Añadido a la lista de envío!", "success");
        };
    } else {
        addItemToCartFinal(type, item, "");
        showNotification("¡Añadido!", "success");
    }
}

function addItemToCartFinal(type, item, obs) {
    const entry = {
        data: item,
        obs: obs
    };
    window.cart[type].push(entry);
    saveCartState();
    updateSendButtonState();
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-mobile';
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    if (type === 'error') toast.style.background = '#e74c3c';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function closeObsModal() {
    document.getElementById('modalObs').classList.add('hidden');
}

function showConfirm(message, next) {
    const modal = document.getElementById('modalConfirm');
    const text = document.getElementById('confirmModalText');
    const btnAccept = document.getElementById('btnAcceptConfirm');
    const btnCancel = document.getElementById('btnCancelConfirm');
    
    if (!modal || !text) return;
    
    text.textContent = message;
    modal.classList.remove('hidden');
    
    const close = () => modal.classList.add('hidden');
    
    btnAccept.onclick = () => {
        close();
        if (next) next();
    };
    
    btnCancel.onclick = close;
}

function removeItemFromCart(type, index) {
    window.cart[type].splice(index, 1);
    saveCartState();
    renderCart(type);
    updateSendButtonState();
}

function clearCart() {
    showConfirm("¿Deseas vaciar toda la lista seleccionada?", () => {
        window.cart = { bible: [], songs: [] };
        saveCartState();
        renderCart();
        updateSendButtonState();
        showNotification("Lista vaciada.");
    });
}

function renderCart(type) {
    if (!type) {
        renderCart('bible');
        renderCart('songs');
        updateSendButtonState();
        return;
    }
    const cartIds = { bible: 'bibleCart', songs: 'songCart' };
    const container = document.getElementById(cartIds[type]);
    if (!container) return;

    if (window.cart[type].length === 0) {
        container.innerHTML = '<div class="empty-state">No hay elementos</div>';
        return;
    }
    container.innerHTML = '';
    window.cart[type].forEach((entry, idx) => {
        const item = entry.data;
        let displayHtml = "";
        
        if (typeof item === 'object' && item.cita && item.texto) {
            // Nuevo formato detallado para Biblias
            displayHtml = `
                <div style="font-size:0.9rem; line-height:1.4; color: #fff; margin-bottom: 4px; white-space: pre-wrap;">${item.texto}</div>
                <div style="font-size:0.75rem; color:var(--ocher-light); font-weight:800; text-transform: uppercase;">${item.cita}</div>
            `;
        } else {
            // Formato estándar (Canciones o formato viejo)
            const display = item.titulo || item.texto || (typeof item === 'string' ? item : "Elemento");
            displayHtml = `<div style="font-weight:700; color:white;">${display}</div>`;
        }

        const obs = entry.obs ? `<div class="cart-item-obs" style="font-size:0.7rem; color: var(--ocher-base); margin-top:5px; font-style: italic; opacity: 0.9; border-top: 1px solid rgba(212,175,55,0.2); padding-top: 3px;">
            <i class="fa-solid fa-comment-dots"></i> ${entry.obs}
        </div>` : "";
        
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.style = "background: rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid var(--ocher-base); box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="flex:1;">
                    ${displayHtml}
                    ${obs}
                </div>
                <i class="fa-trash-can fa-solid" style="color:#e74c3c; cursor:pointer; padding:5px; font-size: 1.1rem; margin-left:10px;" onclick="removeItemFromCart('${type}', ${idx})"></i>
            </div>`;
        container.appendChild(row);
    });
}

async function handleGlobalSend() {
    if (!window.cart.bible.length && !window.cart.songs.length) return;
    
    const btn = document.getElementById('btnSendToCloud');
    const oldHtml = btn.innerHTML;
    const obs = document.getElementById('globalObservations')?.value || "";

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ENVIANDO...';

    const messageData = {
        sender: window.currentUser?.name || "LÃ­der MÃ³vil",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        bible: window.cart.bible,
        songs: window.cart.songs,
        observations: obs, // Incluir observaciones para PC
        status: 'pending'
    };

    try {
        // Enviar a la nube (PC lo recibirÃ¡)
        const msgRef = await db.collection('mensajes_nube').add(messageData);
        
        // Registro de AuditorÃ­a (Logs)
        await db.collection('logs_movil').add({
            ...messageData,
            msgId: msgRef.id,
            dateStr: new Date().toLocaleDateString(),
            timeStr: new Date().toLocaleTimeString()
        });

        // Restaurar botón ANTES de renderizar el carrito (para que el badge exista de nuevo)
        btn.disabled = false;
        btn.innerHTML = oldHtml;

        // Limpiar estado
        window.cart = { bible: [], songs: [] };
        if (document.getElementById('globalObservations')) document.getElementById('globalObservations').value = "";
        saveCartState();
        
        renderCart(); 
        showNotification("¡Petición enviada exitosamente!", "success");
        // Volver a biblias después de enviar
        const bibleTab = document.querySelector('.tab-btn[data-tab="biblias"]');
        if (bibleTab) bibleTab.click();
    } catch (e) {
        console.error("Send error:", e);
        showNotification("Error al enviar: " + e.message, "error");
        // Asegurar restauración en caso de error
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    } finally {
        updateSendButtonState();
    }
}

async function handleManualAnnSend() {
    const annId = document.getElementById('manualAnnId').value;
    const title = document.getElementById('manualAnnTitle').value.trim();
    const content = document.getElementById('manualAnnText').value.trim();
    const time = document.getElementById('manualAnnTime')?.value || 20;
    if (!title && !content) return showNotification("Escribe al menos un título o mensaje", "error");
    
    const btn = document.getElementById('btnSendManualAnn');
    const label = document.getElementById('btnAnnLabel');
    const icon = btn?.querySelector('i');
    
    const originalLabelText = label ? label.textContent : "AÑADIR";
    const originalIconClass = icon ? icon.className : "fa-solid fa-cloud-arrow-up";

    if (btn) btn.disabled = true;
    if (label) label.textContent = "GUARDANDO...";
    if (icon) icon.className = "fa-solid fa-spinner fa-spin";

    const item = {
        id: annId || ("manual_" + Date.now()),
        titulo: title || "Anuncio",
        title: title || "Anuncio",
        texto: content,
        content: content,
        tiempo: time,
        duration: time,
        updatedAt: Date.now()
    };

    // Actualización optimista local
    const idx = window.cloudAnnouncements.findIndex(a => String(a.id) === String(item.id));
    if (idx >= 0) {
        window.cloudAnnouncements[idx] = { ...window.cloudAnnouncements[idx], ...item };
    } else {
        window.cloudAnnouncements.push(item);
    }
    
    window.lastLibraryUpdate = Date.now();
    localStorage.setItem('mobileLastSync', window.lastLibraryUpdate);
    localStorage.setItem('mobileCloudAnn', JSON.stringify(window.cloudAnnouncements));
    renderCloudLibrary(window.cloudAnnouncements, 'anuncios', 'announcementListCloud');

    try {
        await db.collection('peticiones_libreria').add({
            type: 'UPDATE_ANN',
            item: item,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (annId) {
             showNotification("¡Biblioteca actualizada!", "success");
        } else {
             showNotification("¡Añadido a la biblioteca!", "success");
        }
        
        cancelAnnEdit(); 
        const listContainer = document.getElementById('announcementListCloud');
        if (listContainer) listContainer.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error("Error saving announcement:", e);
        showNotification("Error al guardar: " + e.message, "error");
        // Restaurar texto si falló y no se reseteó
        if (label) label.textContent = originalLabelText;
    } finally {
        if (btn) btn.disabled = false;
        if (icon) icon.className = originalIconClass;
    }
}

async function handleNoteSend() {
    const txt = document.getElementById('noteText').value.trim();
    if (!txt) return showNotification("Escribe un mensaje", "error");

    const bt = document.getElementById('btnSendNote');
    bt.disabled = true;
    try {
        await db.collection('notas').add({
            texto: txt,
            categoria: document.getElementById('noteCategory').value,
            fecha: new Date().toISOString().split('T')[0],
            usuario: document.getElementById('userName').textContent || 'Líder',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('noteText').value = '';
        showNotification("¡Nota enviada al equipo!", "success");
    } catch(e) { showNotification(e.message, "error"); }
    bt.disabled = false;
}

function updateSendButtonState() {
    const total = (window.cart.bible?.length || 0) + (window.cart.songs?.length || 0) + (window.cart.announcements?.length || 0);
    const btn = document.getElementById('btnSendToCloud');
    if (btn) btn.disabled = total === 0;

    const badge = document.getElementById('cartHeaderBadge');
    if (badge) {
        badge.style.display = total > 0 ? 'flex' : 'none';
        badge.textContent = total;
    }
}

function openCartPanel() {
    // Desactivar otros tabs
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // Activar panel de carrito
    const cartPanel = document.querySelector('.panel[data-id="cart"]');
    if (cartPanel) {
        cartPanel.classList.add('active');
        renderCart(); // Asegurar que todo el contenido estÃ© actualizado
    }
}

function initPanels() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.querySelector(`.panel[data-id="${id}"]`).classList.add('active');
        };
    });
}

function initSearch() {
    const songInput = document.getElementById('songSearchGlobal');
    const songClear = document.getElementById('clearSongSearch');
    
    if (songInput) {
        songInput.oninput = (e) => {
            const raw = e.target.value;
            const q = normalizeText(raw);
            
            if (songClear) {
                if (raw) songClear.classList.remove('hidden');
                else songClear.classList.add('hidden');
            }
            // Filtrado ignorando acentos y mayúsculas (Busca en título y letra)
            const filtered = window.cloudSongs.filter(s => {
                const titleMatch = normalizeText(s.titulo || s.title || "").includes(q);
                const lyricsMatch = normalizeText(s.letra || s.lyrics || "").includes(q);
                return titleMatch || lyricsMatch;
            });
            renderSongLibrary(filtered);
        };
    }
    
    if (songClear) {
        songClear.onclick = () => {
            songInput.value = "";
            songClear.classList.add('hidden');
            renderSongLibrary(window.cloudSongs);
            songInput.focus();
        };
    }

    const bibleSearch = document.getElementById('bibleSearchGlobal');
    const bibleClear = document.getElementById('clearBibleSearch');
    let searchTimeout;
    
    if (bibleSearch) {
        bibleSearch.oninput = (e) => {
            clearTimeout(searchTimeout);
            const raw = e.target.value;
            const q = raw.trim();
            const qNorm = normalizeText(q);
            
            if (bibleClear) {
                if (raw) bibleClear.classList.remove('hidden');
                else bibleClear.classList.add('hidden');
            }
            
            if (q.length === 0) {
                if (window.bibleState.book) showBibleView('chapters');
                else if (window.bibleState.version) showBibleView('books');
                else showBibleView('versions');
                return;
            }

            if (q.length < 3) return;
            
            searchTimeout = setTimeout(() => {
                console.log("[Search] Buscando:", qNorm);
                // performLocalSearch ya usa normalizeText internamente
                if (!performLocalSearch(qNorm)) {
                    const container = document.getElementById('bibleVersesTextCloud');
                    if (container) container.innerHTML = '<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Buscando en la PC...</div>';
                    showBibleView('verses');
                    db.collection('peticiones_movil').doc('current').set({ 
                        type: 'SEARCH_BIBLE', 
                        query: q, // Enviamos el original por si la PC maneja su propia normalizaciÃ³n
                        version: window.bibleState.version,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
                    });
                }
            }, 600);
        };
        
        if (bibleClear) {
            bibleClear.onclick = () => {
                bibleSearch.value = "";
                bibleClear.classList.add('hidden');
                // Resetear vista
                if (window.bibleState.book) showBibleView('chapters');
                else if (window.bibleState.version) showBibleView('books');
                else showBibleView('versions');
                bibleSearch.focus();
            };
        }
    }
}

/** ── SEGURIDAD Y SESIÓN ── */
window.handleLogin = async function() {
    const uInput = document.getElementById('loginUser').value.trim();
    const pInput = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError');
    const btn = document.getElementById('btnLoginAction');

    if (!uInput || !pInput) {
        err.textContent = "Por favor, completa ambos campos.";
        err.style.display = 'block';
        setTimeout(() => err.style.display = 'none', 3000);
        return;
    }

    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando...';

    // Intentar obtener cachÃ© local de usuarios (para modo offline)
    const cachedUsers = JSON.parse(localStorage.getItem('cachedUsers')) || [];

    try {
        // 1. Intentar validar ONLINE con Firebase
        const doc = await db.collection('usuarios_autorizados').doc('master').get();
        
        if (doc.exists) {
            const data = doc.data();
            const users = data.lista || [];
            
            // Actualizar cachÃ© local para futuros usos offline
            localStorage.setItem('cachedUsers', JSON.stringify(users));
            
            const found = users.find(x => x.u.toLowerCase() === uInput.toLowerCase() && x.p === pInput);

            if (found) {
                if (found.perm === false) {
                    btn.disabled = false;
                    btn.innerHTML = oldText;
                    err.textContent = "Acceso denegado: No tienes permiso para usar la App móvil.";
                    err.style.display = 'block';
                    setTimeout(() => err.style.display = 'none', 5000);
                    return;
                }
                completeLogin(found.u);
                return;
            }
        } else {
            // El documento no existe en la nube
            if (uInput.toLowerCase() === 'admin' && pInput === '123') {
                 completeLogin('Administrador (Inicial)');
                 return;
            }
        }
        
        // Si llegamos aquÃ­ y no hay error de red, es que las credenciales son malas
        throw new Error("Credenciales invÃ¡lidas");

    } catch (e) {
        console.warn("[Login] Fallo online, intentando offline...", e.message);
        
        // 2. Validar OFFLINE contra cachÃ© local
        const foundLocal = cachedUsers.find(x => x.u.toLowerCase() === uInput.toLowerCase() && x.p === pInput);
        
        if (foundLocal) {
            showNotification("Modo Offline: Acceso concedido mediante cachÃ© local.", "success");
            completeLogin(foundLocal.u + " (Offline)");
        } else {
            err.textContent = (e.message === "Credenciales invÃ¡lidas") ? "Usuario o clave incorrectos." : "Sin conexiÃ³n y usuario no reconocido localmente.";
            err.style.display = 'block';
            setTimeout(() => err.style.display = 'none', 5000);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
};

function completeLogin(name) {
    const userObj = { name, loggedAt: Date.now() };
    localStorage.setItem('mobileUser', JSON.stringify(userObj));
    window.currentUser = userObj;
    checkUserSession();
}

window.handleLogout = function() {
    showConfirm("¿Deseas cerrar la sesión activa?", () => {
        localStorage.removeItem('mobileUser');
        window.currentUser = null;
        
        // Limpiar campos de login
        const loginUser = document.getElementById('loginUser');
        const loginPass = document.getElementById('loginPass');
        if (loginUser) loginUser.value = "";
        if (loginPass) loginPass.value = "";

        checkUserSession(); // Cambia la vista instantáneamente sin recargar
    });
};

function checkUserSession() {
    const app = document.getElementById('app-mobile');
    const login = document.getElementById('loginScreen');
    const userDisplay = document.getElementById('userName');

    if (window.currentUser) {
        app.classList.remove('hidden');
        login.classList.add('hidden');
        if (userDisplay) userDisplay.textContent = window.currentUser.name;
    } else {
        app.classList.remove('hidden');
        login.classList.remove('hidden');
    }
}

/** ── FAVORITOS DE CANCIONES (REAL-TIME) ── */
let songFavorites = [];
function initSongFavoritesListener() {
    console.log("[Mobile] Cargando favoritos de canciones...");
    
    db.collection('cantos_favoritos').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            songFavorites = doc.data().lista || [];
            console.log(`[Mobile] Favoritos actualizados: ${songFavorites.length} canciones.`);
            renderSongFavorites();
        } else {
            songFavorites = [];
            console.warn("[Mobile] El documento de favoritos no existe en la nube.");
            renderSongFavorites();
        }
    }, err => {
        console.error("[Mobile] Error cargando favoritos:", err);
        const list = document.getElementById('favoritosCantosList');
        if(list) list.innerHTML = '<div class="error-state">Reconectando con favoritos...</div>';
        
        // Reintentar en 3 segundos
        setTimeout(() => {
            initSongFavoritesListener();
        }, 3000);
    });

    const searchInput = document.getElementById('favSearch');
    if (searchInput) {
        searchInput.oninput = (e) => renderSongFavorites(e.target.value.toLowerCase());
    }
}

function renderSongFavorites(filter = "") {
    const list = document.getElementById('favoritosCantosList');
    if (!list) return;

    if (songFavorites.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay canciones en favoritos aún.</div>';
        return;
    }

    const normalizedFilter = (filter || "").toLowerCase().trim();

    const filtered = songFavorites.filter(s => {
        const title = normalizeText(s.titulo || s.title || "");
        const tono = normalizeText(s.tono || "");
        const lyrics = normalizeText(s.letra || s.lyrics || "");
        const q = normalizedFilter; // normalizedFilter ya es lowecase y trim
        return title.includes(q) || tono.includes(q) || lyrics.includes(q);
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">No se encontraron resultados en favoritos.</div>';
        return;
    }

    let html = '';
    filtered.forEach((s) => {
        const sTitle = s.titulo || s.title || "Sin título";
        const sLyrics = s.letra || s.lyrics || "";
        // Encontrar el índice REAL en la lista original
        const originalIdx = songFavorites.findIndex(fav => (fav.titulo === sTitle || fav.title === sTitle) && (fav.letra === sLyrics || fav.lyrics === sLyrics));
        
        html += `
            <div class="cloud-song-item" onclick="showFavoriteLyrics(${originalIdx})">
                <div style="flex:1;">
                    <div class="song-name-main">${sTitle}</div>
                    ${s.tono ? `<div style="font-size:0.75rem; color:var(--ocher-light); margin-top:2px;">Tono: ${s.tono}</div>` : ''}
                </div>
                <i class="fa-solid fa-chevron-right" style="opacity:0.3; font-size:0.8rem;"></i>
            </div>
        `;
    });

    list.innerHTML = html;
}

window.showFavoriteLyrics = function(idx) {
    const song = songFavorites[idx];
    if (!song) return;

    const modal = document.getElementById('modalPreview');
    const title = document.getElementById('previewTitle');
    const lyrics = document.getElementById('previewLyrics');
    const footer = document.getElementById('modalPreviewFooter');

    const sTitle = song.titulo || song.title || "Sin título";
    const sLyrics = song.letra || song.lyrics || "Sin letra registrada.";

    title.textContent = sTitle + (song.tono ? ` (${song.tono})` : '');
    lyrics.textContent = sLyrics;
    
    // Ocultar botón de añadir al carrito porque esto es consulta de favoritos
    if (footer) footer.style.display = 'none';

    modal.classList.remove('hidden');
};

// Sobrescribir closePreview para restaurar el footer si se necesita despuÃ©s
const originalClosePreview = window.closePreview;
window.closePreview = function() {
    const footer = document.getElementById('modalPreviewFooter');
    if (footer) footer.style.display = 'flex';
    if (originalClosePreview) originalClosePreview();
    else document.getElementById('modalPreview').classList.add('hidden');
};

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

// 🛒 ESTADO GLOBAL
window.cart = JSON.parse(localStorage.getItem('mobileCart')) || { bible: [], songs: [] };
window.currentUser = JSON.parse(localStorage.getItem('mobileUser')) || null;
if (window.currentUser && !window.currentUser.role) {
    window.currentUser.role = (window.currentUser.username === 'admin') ? 'admin' : 'user';
}
window.bibleState = { 
    view: 'versions', 
    version: null,
    book: null,
    chapter: null,
    selectedVerses: [] 
};
window.cloudSongs = JSON.parse(localStorage.getItem('mobileCloudSongs')) || [];
window.cloudAnnouncements = JSON.parse(localStorage.getItem('mobileCloudAnn')) || [];
window.verseHistory = JSON.parse(localStorage.getItem('mobileVerseHistory')) || [];
window.pendingDeletions = JSON.parse(localStorage.getItem('mobilePendingDeletions')) || [];
window.pendingCreates = JSON.parse(localStorage.getItem('mobilePendingCreates')) || [];
window.lastLibraryUpdate = parseInt(localStorage.getItem('mobileLastSync')) || 0;
window.songKeywords = JSON.parse(localStorage.getItem('mobileSongKeywords')) || [
  { key: 'CORO', type: 'chorus' },
  { key: 'ESTROFA', type: 'verse' },
  { key: 'PUENTE', type: 'bridge' },
  { key: 'FINAL', type: 'final' },
  { key: 'INTRO', type: 'intro' },
  { key: 'PRE-CORO', type: 'chorus' },
  { key: 'INTERMEDIO', type: 'bridge' },
  { key: 'ESTRIBILLO', type: 'chorus' },
  { key: 'SOLO', type: 'bridge' },
  { key: 'RAP', type: 'bridge' },
  { key: 'TAG', type: 'bridge' }
];
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
    if (splashStatus) splashStatus.textContent = "Inicializando paneles...";
    initPanels();
    initSearch();
    
    // Sincronizar con la nube solo si ya hay una sesión activa
    if (window.currentUser) {
        startCloudSync();
    }
    
    if (splashProgress) splashProgress.style.width = '60%';

    // 4. Pequeño delay para asegurar que Firestore conecte y cargue lo esencial
    setTimeout(async () => {
        if (splashStatus) splashStatus.textContent = "Cargando favoritos y preferencias...";
        renderCart();
        renderSongFavorites(); // Cargar favoritos inmediatamente desde la caché local
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

    initStatusIndicators();
    // initKeywordsListener is now only called once inside initCloudListeners
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

let cloudUnsubscribeFunctions = [];

function startCloudSync() {
    if (!window.currentUser) {
        console.log("[Mobile Sync] Omitiendo sincronización: No hay usuario autenticado.");
        return;
    }
    stopCloudSync();
    console.log("[Mobile Sync] Iniciando todos los listeners de la nube...");
    
    const unsubKeywords = initKeywordsListener();
    if (unsubKeywords) cloudUnsubscribeFunctions.push(unsubKeywords);
    
    const unsubsCloud = initCloudListeners();
    if (Array.isArray(unsubsCloud)) {
        cloudUnsubscribeFunctions = cloudUnsubscribeFunctions.concat(unsubsCloud);
    }
    
    const unsubVerse = initVerseCacheListener();
    if (unsubVerse) cloudUnsubscribeFunctions.push(unsubVerse);
    
    const unsubNotes = initNotesListener();
    if (unsubNotes) cloudUnsubscribeFunctions.push(unsubNotes);
    
    const unsubFavs = initSongFavoritesListener();
    if (unsubFavs) cloudUnsubscribeFunctions.push(unsubFavs);

    const unsubHistory = initVerseHistoryListener();
    if (unsubHistory) cloudUnsubscribeFunctions.push(unsubHistory);
}

function stopCloudSync() {
    if (cloudUnsubscribeFunctions.length > 0) {
        console.log(`[Mobile Sync] Deteniendo ${cloudUnsubscribeFunctions.length} listeners activos de Firestore...`);
        cloudUnsubscribeFunctions.forEach(unsub => {
            if (typeof unsub === 'function') {
                try { unsub(); } catch(e) { console.warn("[Mobile Sync] Error deteniendo listener:", e); }
            }
        });
        cloudUnsubscribeFunctions = [];
    }
}

function initCloudListeners() {
    console.log("[Mobile] Conectado a la nube.");

    const unsubBibles = db.collection('biblioteca_biblias').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            window.bibleVersions = data.lista || [];
            window.bibleBooks = data.libros || [];
            if (window.bibleState.view === 'versions') renderBibleVersions();
        }
    });

    const unsubSongs = db.collection('biblioteca_cantos').doc('master').onSnapshot(async doc => {
        if (!doc.exists) return;
        
        const data = doc.data();
        const numChunks = data.numChunks || 0;
        const cloudHash = data.libHash || 'legacy';
        const localHash = localStorage.getItem('mobileSongsHash') || '';

        // 1. Verificamos si ya tenemos esta versión de la librería
        if (cloudHash === localHash && window.cloudSongs.length > 0) {
            console.log("[Sync] Librería de canciones ya está al día. Omitiendo descarga.");
            renderSongLibrary(window.cloudSongs);
            return;
        }
        
        if (numChunks > 0) {
            // Actualización ultra-rápida de un solo bloque si solo se editó 1 canción en la PC
            if (data.lastUpdatedChunk !== undefined && window.cloudSongs && window.cloudSongs.length > 0) {
                try {
                    const chunkDoc = await db.collection('biblioteca_cantos').doc(`chunk_${data.lastUpdatedChunk}`).get();
                    if (chunkDoc.exists) {
                        const updatedChunkList = chunkDoc.data().lista || [];
                        const chunkSize = 20;
                        const start = data.lastUpdatedChunk * chunkSize;
                        window.cloudSongs.splice(start, updatedChunkList.length, ...updatedChunkList);
                        localStorage.setItem('mobileCloudSongs', JSON.stringify(window.cloudSongs));
                        localStorage.setItem('mobileSongsHash', cloudHash);
                        renderSongLibrary(window.cloudSongs);
                        console.log(`[Sync] Bloque ${data.lastUpdatedChunk} actualizado en caliente.`);
                        return;
                    }
                } catch (e) {
                    console.warn("[Sync] Error en actualización de bloque, intentando full:", e);
                }
            }

            console.log(`[Sync] Nueva versión detectada (${cloudHash}). Sincronizando...`);
            
            if (window.isFetchingChunks) return;
            window.isFetchingChunks = true;

            try {
                let allSongs = [];
                const chunkSize = 1; 
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
                    
                    const percent = Math.round((i/numChunks)*100);
                    const msg = `Sincronizando canciones: ${percent}%`;
                    
                    const loginStatus = document.getElementById('loginLoadingStatus');
                    const loginText = document.getElementById('loginLoadingText');
                    if (loginStatus && !window.currentUser) {
                        loginStatus.classList.remove('hidden');
                        if (loginText) loginText.textContent = msg;
                    } else {
                        showNotification(msg, "info", "sync-songs");
                    }
                }
                
                const loginStatus = document.getElementById('loginLoadingStatus');
                if (loginStatus) loginStatus.classList.add('hidden');
                
                allSongs.sort((a,b) => (a.id || 0) - (b.id || 0));
                
                window.cloudSongs = allSongs;
                
                // 2. Guardar en memoria local para la próxima vez
                localStorage.setItem('mobileCloudSongs', JSON.stringify(allSongs));
                localStorage.setItem('mobileSongsHash', cloudHash);
                
                renderSongLibrary(window.cloudSongs);
                console.log(`[Sync] ${window.cloudSongs.length} canciones sincronizadas y guardadas localmente.`);
            } catch (err) {
                console.error("[Sync] Error al reconstruir bloques:", err);
                showNotification("Error al cargar canciones. Intenta sincronizar de nuevo.", "error");
            } finally {
                window.isFetchingChunks = false;
            }
        } else if (data.lista) {
            // Formato antiguo o lista pequeña
            const oldList = data.lista || [];
            oldList.sort((a,b) => (a.id || 0) - (b.id || 0));
            window.cloudSongs = oldList;
            localStorage.setItem('mobileCloudSongs', JSON.stringify(oldList));
            localStorage.setItem('mobileSongsHash', cloudHash);
            renderSongLibrary(window.cloudSongs);
            console.log(`[Sync] ${window.cloudSongs.length} canciones cargadas (Legacy).`);
        } else {
            window.cloudSongs = [];
            renderSongLibrary([]);
        }
    }, err => {
        console.error("[Sync] Error en listener de canciones:", err);
    });

    const unsubAnn = db.collection('biblioteca_anuncios').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            const cloudRaw = doc.data().lista || [];
            if (!window.pendingDeletions) window.pendingDeletions = [];
            if (!window.pendingCreates) window.pendingCreates = [];

            // 1. Limpiar pendientes de eliminación si ya no existen en la nube (confirmación del borrado)
            if (window.pendingDeletions.length > 0) {
                const stillInCloud = window.pendingDeletions.filter(id => cloudRaw.some(a => String(a.id) === String(id)));
                if (stillInCloud.length !== window.pendingDeletions.length) {
                    window.pendingDeletions = stillInCloud;
                    localStorage.setItem('mobilePendingDeletions', JSON.stringify(window.pendingDeletions));
                }
            }

            // 2. Limpiar pendientes de creación si ya están presentes en la nube (confirmación de creación)
            if (window.pendingCreates.length > 0) {
                const notYetInCloud = window.pendingCreates.filter(id => !cloudRaw.some(a => String(a.id) === String(id)));
                if (notYetInCloud.length !== window.pendingCreates.length) {
                    window.pendingCreates = notYetInCloud;
                    localStorage.setItem('mobilePendingCreates', JSON.stringify(window.pendingCreates));
                }
            }

            // 3. Filtrar de la nube aquellos que marcamos localmente para eliminar
            const cloudList = cloudRaw.filter(a => !window.pendingDeletions.includes(String(a.id)));

            // 4. Mapear elementos de la nube resolviendo por updatedAt
            const mergedList = cloudList.map(cloudItem => {
                const localItem = (window.cloudAnnouncements || []).find(a => String(a.id) === String(cloudItem.id));
                if (localItem && (localItem.updatedAt || 0) > (cloudItem.updatedAt || 0)) {
                    // La versión local es una edición más reciente que aún no refleja la nube
                    return {
                        ...cloudItem,
                        ...localItem,
                        thumb: localItem.thumb || cloudItem.thumb || "",
                        img: localItem.img || cloudItem.img || "",
                        bgName: localItem.bgName || cloudItem.bgName || "",
                        bgType: localItem.bgType || cloudItem.bgType || ""
                    };
                }
                return cloudItem;
            });

            // 5. Añadir ÚNICAMENTE los elementos locales que están en pendingCreates
            // (Si no están en pendingCreates y no vienen en cloudList, fueron borrados en la PC: NO RESUCITARLOS)
            (window.cloudAnnouncements || []).forEach(localItem => {
                const idStr = String(localItem.id);
                if (window.pendingDeletions.includes(idStr)) return;

                if (window.pendingCreates.includes(idStr) && !mergedList.some(a => String(a.id) === idStr)) {
                    mergedList.push(localItem);
                }
            });

            console.log("[Sync] Biblioteca de anuncios sincronizada en tiempo real.");
            window.cloudAnnouncements = mergedList;
            localStorage.setItem('mobileCloudAnn', JSON.stringify(window.cloudAnnouncements));
            renderCloudLibrary(window.cloudAnnouncements, 'anuncios', 'announcementListCloud');
        }
    });

    return [unsubBibles, unsubSongs, unsubAnn];
}

function initNotesListener() {
    const today = new Date().toISOString().split('T')[0];
    return db.collection('notas')
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

function initKeywordsListener() {
    console.log("[Mobile] Escuchando etiquetas de canciones...");
    return db.collection('configuracion').doc('etiquetas').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.lista && Array.isArray(data.lista)) {
                window.songKeywords = data.lista;
                localStorage.setItem('mobileSongKeywords', JSON.stringify(data.lista));
                console.log("[Mobile] Etiquetas actualizadas:", data.lista.length);
            }
        }
    }, err => {
        console.warn("[Mobile] Error cargando etiquetas:", err);
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

        // 2. Descargar libro por libro (Uno a uno para máxima estabilidad)
        for (let i = 0; i < total; i++) {
            const book = booksList[i];
            
            // Actualizar UI del botón y notificación en cada libro
            if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i+1}/${total}`;
            showNotification(`Descargando ${versionName}: ${book.name} (${i+1}/${total})`, "info", "bible-dl");

            // Intento de descarga con reintentos
            let docPlan = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    docPlan = await db.collection('biblias_texto_completo').doc(versionName).collection('libros').doc(String(book.id)).get();
                    break; // Éxito, salimos del while
                } catch (err) {
                    attempts++;
                    console.warn(`[Bible] Error descargando libro ${book.id}, reintento ${attempts}/${maxAttempts}...`, err);
                    if (attempts >= maxAttempts) throw err; // Si fallan todos los reintentos, lanzamos el error
                    await new Promise(res => setTimeout(res, 1000)); // Esperar 1s antes de reintentar
                }
            }
            
            if (docPlan && docPlan.exists) {
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
    db.collection('peticiones_movil').doc('current').set({
        type: 'GET_VERSES',
        version: state.version,
        bookId: state.book.id,
        chapter: state.chapter,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => {
        console.error("[Mobile] Error pidiendo versículos a PC:", err);
        container.innerHTML = '<div class="error-state">Error al conectar con PC.</div>';
    });
}

function initVerseCacheListener() {
    return db.collection('cache_capitulo').doc('current').onSnapshot(doc => {
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

    if (!lista || lista.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay canciones sincronizadas. Pulsa "Sincronizar" en la PC.</div>';
        return;
    }

    lista.forEach(item => {
        const el = document.createElement('div');
        el.className = 'mobile-list-item';

        const sTitle = item.titulo || item.title || "Canto";
        let itemTono = item.tono || "";
        let itemBpm = (item.bpm !== undefined && item.bpm !== null && item.bpm !== '') ? String(item.bpm) : "";

        // Si la canción aún no tiene BPM en la lista pero está en Favoritos (en vivo con PC), asociarlo
        if (!itemBpm && window.songFavorites && window.songFavorites.length > 0) {
            const cleanT = (typeof normalizeText === 'function') ? normalizeText(sTitle) : sTitle.toLowerCase().trim();
            const foundFav = window.songFavorites.find(f => {
                const fT = (typeof normalizeText === 'function') ? normalizeText(f.titulo || f.title || "") : (f.titulo || f.title || "").toLowerCase().trim();
                return fT === cleanT;
            });
            if (foundFav) {
                if (foundFav.bpm) {
                    itemBpm = String(foundFav.bpm);
                    item.bpm = itemBpm;
                }
                if (!itemTono && foundFav.tono) {
                    itemTono = String(foundFav.tono);
                    item.tono = itemTono;
                }
            }
        }

        const toneHtml = itemTono ? `<span>Tono: ${itemTono}</span>` : '';
        const bpmHtml = itemBpm ? `<span>BPM: ${itemBpm}</span>` : '';
        el.innerHTML = `
            <i class="fa-solid fa-music"></i>
            <div class="item-info">
                <div class="item-title">${sTitle}</div>
                ${(toneHtml || bpmHtml) ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--ocher-light); opacity: 0.7; margin-top: 1px;">${toneHtml}${bpmHtml}</div>` : ''}
            </div>
            <i class="fa-solid fa-eye" style="opacity:0.3"></i>
        `;
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
        const rawThumb = item.thumb || item.img || item.background || "";
        const hasValidThumb = rawThumb && !rawThumb.startsWith('blob:');
        const isVideo = item.bgType === 'video' || (item.bgName && item.bgName.match(/\.(mp4|webm|mkv|mov)$/i));
        const hasMedia = hasValidThumb || item.bgName || (item.bgType && item.bgType !== 'none');
        
        const mediaBadge = hasMedia ? `<i class="fa-solid ${isVideo ? 'fa-film' : 'fa-image'}" style="color:var(--ocher-light); margin-left:6px; font-size:0.75rem;" title="Con fondo multimedia"></i>` : "";
        
        // Escapar JSON para los atributos onclick
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

        const thumbIcon = hasValidThumb
            ? `<img src="${rawThumb}" style="width:36px; height:24px; object-fit:cover; border-radius:4px; border:1px solid rgba(212,175,55,0.4); flex-shrink:0;" />`
            : `<i class="fa-solid fa-bullhorn"></i>`;

        const el = document.createElement('div');
        el.className = 'mobile-list-item';
        el.innerHTML = `
            ${thumbIcon}
            <div class="item-info">
                <div class="item-title">${title} ${mediaBadge}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <button class="btn-fav-item-action" title="Copiar para WhatsApp" onclick="event.stopPropagation(); copySingleAnnouncementWhatsApp(${itemJson});" style="color:#25d366; border-color:rgba(37,211,102,0.3); width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:6px; background:rgba(37,211,102,0.1); cursor:pointer;">
                    <i class="fa-brands fa-whatsapp" style="font-size:0.95rem;"></i>
                </button>
                <i class="fa-solid fa-eye" style="opacity:0.3; font-size:1.1rem; cursor:pointer;" onclick="event.stopPropagation(); showPreviewAnn(${itemJson})"></i>
                <i class="fa-solid fa-pen-to-square" style="color:var(--ocher-base); font-size:1rem; cursor:pointer;" onclick="event.stopPropagation(); editAnnouncement(${itemJson})"></i>
                <i class="fa-solid fa-trash-can" style="color:#e74c3c; font-size:1rem; cursor:pointer;" onclick="event.stopPropagation(); deleteAnnouncement('${id}')"></i>
            </div>
        `;
        el.onclick = () => {
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
        const idStr = String(id);
        // 1. Enviar petición a Firestore (para que la PC lo borre y persista)
        db.collection('peticiones_libreria').add({
            type: 'DELETE_ANN',
            id: idStr,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Optimización local inmediata: Agregar a lista negra temporal
        if (!window.pendingDeletions) window.pendingDeletions = [];
        if (!window.pendingDeletions.includes(idStr)) {
            window.pendingDeletions.push(idStr);
            localStorage.setItem('mobilePendingDeletions', JSON.stringify(window.pendingDeletions));
        }

        // 3. Quitar de pendingCreates si estaba ahí
        if (window.pendingCreates) {
            window.pendingCreates = window.pendingCreates.filter(cid => String(cid) !== idStr);
            localStorage.setItem('mobilePendingCreates', JSON.stringify(window.pendingCreates));
        }

        // 4. Remover de la memoria local y guardar
        window.cloudAnnouncements = (window.cloudAnnouncements || []).filter(a => String(a.id) !== idStr);
        localStorage.setItem('mobileCloudAnn', JSON.stringify(window.cloudAnnouncements));

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
    
    // Identificar imagen o miniatura válida (evitar URLs blob locales de PC)
    const rawImg = ann.thumb || ann.img || ann.background || "";
    const validBgImg = (rawImg && !rawImg.startsWith('blob:')) ? rawImg : null;

    // Badge elegante de medio (si tiene nombre o tipo, SIN mostrar URLs de código feas)
    let badgeHtml = "";
    if (ann.bgName || (ann.bgType && ann.bgType !== 'none')) {
        const isVideo = ann.bgType === 'video' || (ann.bgName && ann.bgName.match(/\.(mp4|webm|mkv|mov)$/i));
        const iconClass = isVideo ? 'fa-film' : 'fa-image';
        const labelText = ann.bgName ? ann.bgName : (isVideo ? 'Video de fondo' : 'Imagen de fondo');
        
        badgeHtml = `
            <div style="display:inline-flex; align-items:center; gap:7px; padding:5px 14px; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.3); border-radius:20px; font-size:0.75rem; color:var(--ocher-light); margin-bottom:14px;">
                <i class="fa-solid ${iconClass}"></i>
                <span>Fondo: <strong>${labelText}</strong></span>
            </div>
        `;
    }

    // Estilo de la tarjeta: si hay fondo válido, aplicarlo con overlay oscuro para contraste perfecto
    const cardBgStyle = validBgImg 
        ? `background-color: #14141c; background-image: linear-gradient(rgba(14, 13, 18, 0.72), rgba(10, 9, 14, 0.86)), url('${validBgImg}'); background-size: cover; background-position: center; background-repeat: no-repeat; border: 1px solid rgba(212,175,55,0.35); box-shadow: 0 4px 18px rgba(0,0,0,0.6);`
        : `background: rgba(255,255,255,0.05); border-left: 4px solid var(--ocher-base);`;

    lyricsEl.innerHTML = `
        ${badgeHtml}
        <div style="${cardBgStyle} padding: 18px; border-radius: 12px; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.9);">
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
    
    // Asignar Tono si existe
    const toneDisplay = document.getElementById('previewTone');
    if (toneDisplay) {
        if (song.tono) {
            toneDisplay.textContent = `Tono: ${song.tono}`;
            toneDisplay.classList.remove('hidden');
        } else {
            toneDisplay.classList.add('hidden');
        }
    }

    // Asignar BPM si existe
    const bpmDisplay = document.getElementById('previewBpm');
    if (bpmDisplay) {
        let bpmVal = song.bpm || "";
        if (!bpmVal && window.cloudSongs && window.cloudSongs.length > 0) {
            const cleanT = normalizeText(song.titulo || song.title || "");
            const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
            if (match && match.bpm) {
                bpmVal = match.bpm;
                if (!song.bpm) song.bpm = match.bpm;
            }
        }
        if (bpmVal) {
            bpmDisplay.textContent = `BPM: ${bpmVal}`;
            bpmDisplay.classList.remove('hidden');
        } else {
            bpmDisplay.classList.add('hidden');
        }
    }

    // Inicializar Metrónomo para la canción
    if (window.MobileMetronome) {
        MobileMetronome.loadSong(song);
    }
    const lyricsEl = document.getElementById('previewLyrics');
    
    if (song.letra) {
        lyricsEl.innerHTML = formatLyrics(song.letra);
    } else {
        lyricsEl.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando letra desde la nube...</div>';
        try {
            const doc = await db.collection('biblioteca_cantos_texto').doc(String(song.id)).get();
            if (doc.exists) {
                const data = doc.data();
                song.letra = data.letra; // Cachear para la prÃ³xima vez
                lyricsEl.innerHTML = formatLyrics(data.letra);
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

function formatLyrics(lyrics) {
    if (!lyrics) return "";
    
    // Dividir por párrafos (doble salto de línea o similar)
    const paragraphs = lyrics.split(/\n\s*\n/);
    let html = '';

    paragraphs.forEach((para) => {
        const lines = para.split('\n').filter(l => l.trim() !== '');
        if (lines.length === 0) return;

        // Detectar tipo de sección por la primera línea
        const firstLine = lines[0].trim().toUpperCase();
        let sectionType = 'verse';
        let hasLabel = false;

        const keywords = window.songKeywords || [];

        for (const kw of keywords) {
            const upKey = kw.key.toUpperCase();
            // Match exact word or follow by number/colon (e.g. "CORO 1", "CORO:")
            const regex = new RegExp(`^${upKey}(\\s|\\d|:|$)`);
            if (regex.test(firstLine)) {
                sectionType = kw.type;
                hasLabel = true;
                break;
            }
        }

        html += `<div class="song-${sectionType}-block">`;

        lines.forEach((line, pIndex) => {
            if (pIndex === 0 && hasLabel) {
                html += `<div class="song-section-label">${line.trim()}</div>`;
            } else {
                html += `<div class="song-line-preview">${line}</div>`;
            }
        });

        html += `</div>`;
    });

    return html;
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

function showNotification(message, type = 'success', id = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    let toast = id ? document.getElementById(`toast-${id}`) : null;
    let isNew = false;
    
    if (!toast) {
        toast = document.createElement('div');
        if (id) toast.id = `toast-${id}`;
        toast.className = 'toast-mobile';
        isNew = true;
    }
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    if (type === 'error') toast.style.background = '#e74c3c';
    else if (type === 'info') toast.style.background = 'var(--wine-accent)';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    if (isNew) {
        container.appendChild(toast);
    } else {
        // Si ya existe, reiniciamos la animación de entrada si estaba saliendo
        toast.classList.remove('toast-fade-out');
    }
    
    // Auto-eliminar
    if (toast.timeout) clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, type === 'info' ? 5000 : 3000);
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
            if (type === 'songs') {
                const toneHtml = item.tono ? `<span>Tono: ${item.tono}</span>` : '';
                let itemBpm = item.bpm || "";
                if (!itemBpm && window.cloudSongs && window.cloudSongs.length > 0) {
                    const cleanT = normalizeText(item.titulo || item.title || "");
                    const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
                    if (match && match.bpm) itemBpm = match.bpm;
                }
                const bpmHtml = itemBpm ? `<span>BPM: ${itemBpm}</span>` : '';
                if (toneHtml || bpmHtml) {
                    displayHtml += `<div style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:var(--ocher-light); opacity:0.7; margin-top:2px;">${toneHtml}${bpmHtml}</div>`;
                }
            }
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

    const myUser = window.currentUser?.username || window.currentUser?.name || "lider";
    if (window.cart.songs && window.cart.songs.length > 0) {
        window.cart.songs.forEach(s => {
            if (s.data && typeof s.data === 'object') s.data.addedBy = myUser;
            s.addedBy = myUser;
        });
    }

    const messageData = {
        sender: window.currentUser?.name || "Líder Móvil",
        senderUsername: myUser,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        bible: window.cart.bible,
        songs: window.cart.songs,
        observations: obs, // Incluir observaciones para PC
        status: 'pending'
    };

    // --- GUARDAR EN HISTORIAL (NUEVO) ---
    if (window.cart.bible && window.cart.bible.length > 0) {
        // Añadir al inicio para que el más reciente aparezca primero
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newHistoryEntries = window.cart.bible.map(entry => ({
            ...entry,
            time: timeStr,
            timestamp: Date.now(),
            addedBy: myUser
        }));
        
        window.verseHistory = [...newHistoryEntries, ...window.verseHistory].slice(0, 50); // Límite de 50
        saveAndSyncVerseHistory();
    }
    // ------------------------------------

    // --- GUARDAR EN FAVORITOS COMPARTIDOS (NUEVO) ---
    if (window.cart.songs && window.cart.songs.length > 0) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newFavEntries = [];

        window.cart.songs.forEach(entry => {
            const song = entry.data || entry;
            const sTitle = (song.titulo || song.title || entry.title || "").trim();
            if (!sTitle) return;

            // Evitar duplicar si ya existe en Favoritos
            const exists = songFavorites.some(f => (f.titulo || f.title || "").trim().toLowerCase() === sTitle.toLowerCase());
            if (!exists) {
                let songBpm = song.bpm || entry.bpm || "";
                let songCompas = song.compas || entry.compas || "";
                if (!songBpm && window.cloudSongs && window.cloudSongs.length > 0) {
                    const cleanT = normalizeText(sTitle);
                    const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
                    if (match) {
                        if (match.bpm) songBpm = match.bpm;
                        if (match.compas) songCompas = match.compas;
                    }
                }
                newFavEntries.push({
                    id: song.id || entry.id || ("canto_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4)),
                    titulo: sTitle,
                    title: sTitle,
                    tono: song.tono || entry.tono || "",
                    bpm: songBpm,
                    compas: songCompas,
                    letra: song.letra || song.lyrics || entry.letra || entry.lyrics || "",
                    lyrics: song.letra || song.lyrics || entry.letra || entry.lyrics || "",
                    obs: entry.obs || song.obs || "",
                    addedBy: myUser,
                    time: timeStr,
                    timestamp: Date.now()
                });
            }
        });

        if (newFavEntries.length > 0) {
            songFavorites = [...songFavorites, ...newFavEntries];
            saveAndSyncSongFavorites();
        }
    }
    // -----------------------------------------------------------

    // Limpiar estado local y UI inmediatamente (Optimista)
    window.cart = { bible: [], songs: [] };
    if (document.getElementById('globalObservations')) document.getElementById('globalObservations').value = "";
    saveCartState();
    renderCart(); 
    
    // Volver a biblias de inmediato para una UI fluida
    const bibleTab = document.querySelector('.tab-btn[data-tab="biblias"]');
    if (bibleTab) bibleTab.click();
    
    showNotification("Enviando petición a la PC...", "info", "send-queue");

    // Ejecutar escrituras asíncronamente en segundo plano
    db.collection('mensajes_nube').add(messageData)
        .then(msgRef => {
            console.log("[Mobile] Petición enviada, id:", msgRef.id);
            return db.collection('logs_movil').add({
                ...messageData,
                msgId: msgRef.id,
                dateStr: new Date().toLocaleDateString(),
                timeStr: new Date().toLocaleTimeString()
            });
        })
        .then(() => {
            showNotification("¡Petición enviada exitosamente!", "success", "send-queue");
        })
        .catch(e => {
            console.error("[Mobile] Error enviando petición:", e);
            showNotification("Guardado localmente. Se enviará al reconectar.", "warning", "send-queue");
        })
        .finally(() => {
            // Asegurar restauración del botón
            btn.disabled = false;
            btn.innerHTML = oldHtml;
            updateSendButtonState();
        });
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
        if (!window.pendingCreates) window.pendingCreates = [];
        if (!window.pendingCreates.includes(String(item.id))) {
            window.pendingCreates.push(String(item.id));
            localStorage.setItem('mobilePendingCreates', JSON.stringify(window.pendingCreates));
        }
    }
    
    if (window.pendingDeletions) {
        window.pendingDeletions = window.pendingDeletions.filter(did => String(did) !== String(item.id));
        localStorage.setItem('mobilePendingDeletions', JSON.stringify(window.pendingDeletions));
    }

    localStorage.setItem('mobileCloudAnn', JSON.stringify(window.cloudAnnouncements));
    renderCloudLibrary(window.cloudAnnouncements, 'anuncios', 'announcementListCloud');

    // Limpiar UI del formulario de inmediato (Optimista)
    if (annId) {
         showNotification("Guardando cambios...", "info", "save-ann");
    } else {
         showNotification("Añadiendo a la biblioteca...", "info", "save-ann");
    }
    
    cancelAnnEdit(); 
    const listContainer = document.getElementById('announcementListCloud');
    if (listContainer) listContainer.scrollIntoView({ behavior: 'smooth' });

    // Guardar asíncronamente en segundo plano
    db.collection('peticiones_libreria').add({
        type: 'UPDATE_ANN',
        item: item,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification(annId ? "¡Biblioteca actualizada!" : "¡Añadido a la biblioteca!", "success", "save-ann");
    }).catch(e => {
        console.error("[Mobile] Error saving announcement:", e);
        showNotification("Error de sincronización con la PC", "warning", "save-ann");
    }).finally(() => {
        if (btn) btn.disabled = false;
        if (icon) icon.className = originalIconClass;
    });
}

async function handleNoteSend() {
    const txt = document.getElementById('noteText').value.trim();
    if (!txt) return showNotification("Escribe un mensaje", "error");

    const bt = document.getElementById('btnSendNote');
    bt.disabled = true;
    
    // Limpiar campo e informar de inmediato (Optimista)
    document.getElementById('noteText').value = '';
    showNotification("Enviando nota...", "info", "send-note");

    db.collection('notas').add({
        texto: txt,
        categoria: document.getElementById('noteCategory').value,
        fecha: new Date().toISOString().split('T')[0],
        usuario: document.getElementById('userName').textContent || 'Líder',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showNotification("¡Nota enviada al equipo!", "success", "send-note");
    }).catch(e => {
        console.error("[Mobile] Error enviando nota:", e);
        showNotification("Guardado localmente. Se enviará al reconectar.", "warning", "send-note");
    }).finally(() => {
        bt.disabled = false;
    });
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
            
            // Refrescar contenido si es historial
            if (id === 'historialVersiculos') renderVerseHistory();
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
            // Filtrado inteligente y ordenado protegido
            try {
                const matches = [];
                for (let i = 0; i < (window.cloudSongs || []).length; i++) {
                    const s = window.cloudSongs[i];
                    if (!s) continue;
                    
                    if (s._normTitle === undefined) s._normTitle = normalizeText(s.titulo || s.title || "");
                    if (s._normLyrics === undefined) s._normLyrics = normalizeText(s.letra || s.lyrics || "");

                    const inTitle = s._normTitle.includes(q);
                    const inLyrics = s._normLyrics.includes(q);

                    if (inTitle || inLyrics) {
                        matches.push({ song: s, inTitle, inLyrics });
                    }
                }

                matches.sort((a, b) => {
                    if (a.inTitle && !b.inTitle) return -1;
                    if (!a.inTitle && b.inTitle) return 1;

                    if (a.inTitle && b.inTitle) {
                        const idxA = a.song._normTitle.indexOf(q);
                        const idxB = b.song._normTitle.indexOf(q);
                        if (idxA !== idxB) return idxA - idxB;
                    }

                    const tA = a.song._normTitle || "";
                    const tB = b.song._normTitle || "";
                    return tA.localeCompare(tB);
                });

                renderSongLibrary(matches.map(m => m.song));
            } catch (err) {
                alert("Error de búsqueda móvil: " + err.message);
                renderSongLibrary(window.cloudSongs); // Fallback
            }
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

        const favSearchInput = document.getElementById('favSearch');
        if (favSearchInput) {
            favSearchInput.oninput = (e) => renderSongFavorites(e.target.value.toLowerCase());
        }
        
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
                // Pasar tanto el alias como el mismo como nombre y su rol
                completeLogin(found.u, found.u, found.role);
                return;
            }
        } else {
            // El documento no existe en la nube
            if (uInput.toLowerCase() === 'admin' && pInput === '123') {
                 completeLogin('Administrador', 'admin', 'admin');
                 return;
            }
        }
        
        // Si llegamos aquí y no hay error de red, es que las credenciales son malas
        throw new Error("Credenciales inválidas");

    } catch (e) {
        console.warn("[Login] Fallo online, intentando offline...", e.message);
        
        // 2. Validar OFFLINE contra caché local
        const foundLocal = cachedUsers.find(x => x.u.toLowerCase() === uInput.toLowerCase() && x.p === pInput);
        
        if (foundLocal) {
            showNotification("Modo Offline: Acceso concedido.", "success");
            completeLogin(foundLocal.u, foundLocal.u, foundLocal.role);
        } else {
            err.textContent = (e.message === "Credenciales inválidas") ? "Usuario o clave incorrectos." : "Sin conexión y usuario no reconocido localmente.";
            err.style.display = 'block';
            setTimeout(() => err.style.display = 'none', 5000);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
};

function completeLogin(name, username, role) {
    const uLow = (username || name).toLowerCase();
    const finalRole = role || (uLow === 'admin' ? 'admin' : 'user');
    const userObj = { name, username: uLow, role: finalRole, loggedAt: Date.now() };
    localStorage.setItem('mobileUser', JSON.stringify(userObj));
    window.currentUser = userObj;
    checkUserSession();
    startCloudSync(); // Arrancar sincronización al iniciar sesión
}

window.handleLogout = function() {
    showConfirm("¿Deseas cerrar la sesión activa?", () => {
        // 1. Limpiar sesión
        localStorage.removeItem('mobileUser');
        window.currentUser = null;
        
        stopCloudSync(); // Detener todos los listeners activos de Firestore
        
        // 2. Cerrar menús/modales abiertos
        if (typeof closeUserMenu === 'function') closeUserMenu();
        if (typeof closePassModal === 'function') closePassModal();
        
        // 3. Limpiar campos de login
        const loginUser = document.getElementById('loginUser');
        const loginPass = document.getElementById('loginPass');
        if (loginUser) loginUser.value = "";
        if (loginPass) loginPass.value = "";

        // 4. Actualizar vista
        checkUserSession();
    });
};

window.handleAppRepair = function() {
    showConfirm("Esto limpiará la memoria temporal (caché) y reiniciará la app para solucionar errores de guardado. ¿Deseas continuar?", async () => {
        try {
            showNotification("Reparando base de datos...", "info", "repair");
            
            // 1. Desactivar red y persistencia de Firestore
            if (window.firebase) {
                try {
                    await firebase.firestore().terminate();
                    await firebase.firestore().clearPersistence();
                } catch(e) { console.warn("Firestore cleanup skipped", e); }
            }

            // 2. Limpiar LocalStorage
            localStorage.clear();

            // 3. Limpiar Bases de Datos IndexedDB
            if (window.indexedDB) {
                const dbs = ['ProyectorProMobile', 'ProyectorProDB', 'firestoreDb'];
                dbs.forEach(dbName => {
                    try { indexedDB.deleteDatabase(dbName); } catch(e) {}
                });
            }

            // 4. Limpiar Caches y Unregister Service Worker
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }

            if (navigator.serviceWorker) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // 5. Reiniciar App
            showNotification("Reparación completa. Reiniciando...", "success", "repair");
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);

        } catch (e) {
            console.error("Error en reparación:", e);
            showNotification("Error al reparar: " + e.message, "error");
        }
    });
};

function checkUserSession() {
    const app = document.getElementById('app-mobile');
    const login = document.getElementById('loginScreen');
    const userDisplay = document.getElementById('userName');

    if (window.currentUser) {
        if (app) app.classList.remove('hidden');
        if (login) login.classList.add('hidden');
        if (userDisplay) userDisplay.textContent = window.currentUser.name;
    } else {
        // MUY IMPORTANTE: loginScreen está DENTRO de app-mobile.
        // Si ocultamos app-mobile, el login TAMBIÉN se oculta.
        if (app) app.classList.remove('hidden'); 
        if (login) login.classList.remove('hidden');
    }
}

/** ── UTILIDADES DE COPIADO Y COMPARTIDO (WHATSAPP) ── */
async function copyTextToClipboard(text) {
    if (!text) return false;
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            console.warn("[Clipboard] writeText falló, usando fallback:", e);
        }
    }

    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.setAttribute("readonly", "");
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);

        const isIOS = navigator.userAgent.match(/ipad|iphone/i);
        if (isIOS) {
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textArea.setSelectionRange(0, 999999);
        } else {
            textArea.select();
        }

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return Boolean(successful);
    } catch (err) {
        console.error("[Clipboard] Falló copia:", err);
        return false;
    }
}
window.copyTextToClipboard = copyTextToClipboard;

function getFormattedDateSpanish() {
    try {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    } catch (e) {
        return new Date().toLocaleDateString();
    }
}

function formatSongFavoritesForWhatsApp(songsToFormat = null) {
    const list = songsToFormat || songFavorites || [];
    if (list.length === 0) return "";

    const dateStr = getFormattedDateSpanish();
    let text = `🎶 *REPERTORIO DE ALABANZAS* 🎶\n`;
    text += `📅 _${dateStr}_\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    list.forEach((s, idx) => {
        const title = (s.titulo || s.title || "Sin título").trim();
        const tono = (s.tono || "").trim();
        const obs = (s.obs || "").trim();
        let sBpm = s.bpm || "";
        if (!sBpm && window.cloudSongs && window.cloudSongs.length > 0) {
            const cleanT = normalizeText(title);
            const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
            if (match && match.bpm) sBpm = match.bpm;
        }

        text += `*${idx + 1}. ${title}*\n`;
        let meta = [];
        if (tono) meta.push(`🎹 Tono: *${tono}*`);
        if (sBpm) meta.push(`⏱ *${sBpm} BPM*`);
        if (obs) meta.push(`📝 Obs: _${obs}_`);
        if (meta.length > 0) {
            text += `   ${meta.join('  |  ')}\n`;
        }
        text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ _ProyectorPro_`;
    return text.trim();
}

function formatSingleSongForWhatsApp(song) {
    if (!song) return "";
    const title = (song.titulo || song.title || "Sin título").trim();
    const tono = (song.tono || "").trim();
    const lyrics = song.letra || song.lyrics || "";
    const obs = (song.obs || "").trim();
    let songBpm = song.bpm || "";
    if (!songBpm && window.cloudSongs && window.cloudSongs.length > 0) {
        const cleanT = normalizeText(title);
        const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
        if (match && match.bpm) songBpm = match.bpm;
    }

    let text = `🎵 *${title.toUpperCase()}* 🎵\n`;
    let meta = [];
    if (tono) meta.push(`🎹 Tono: *${tono}*`);
    if (songBpm) meta.push(`⏱ *${songBpm} BPM*`);
    if (obs) meta.push(`📝 Obs: _${obs}_`);
    if (meta.length > 0) {
        text += `${meta.join('  |  ')}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    if (lyrics) {
        text += lyrics.trim() + `\n\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }
    text += `✨ _ProyectorPro_`;
    return text.trim();
}

function formatVerseHistoryForWhatsApp() {
    const list = window.verseHistory || [];
    if (list.length === 0) return "";

    const dateStr = getFormattedDateSpanish();
    let text = `📖 *HISTORIAL DE VERSÍCULOS* 📖\n`;
    text += `📅 _${dateStr}_\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    list.forEach((entry, idx) => {
        const item = entry.data || entry;
        const cita = (item.cita || "Versículo").trim().toUpperCase();
        const verso = (item.texto || "").trim();
        const obs = (entry.obs || "").trim();

        text += `📍 *${cita}*\n`;
        text += `«${verso}»\n`;
        if (obs) {
            text += `📝 _Obs: ${obs}_\n`;
        }
        text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ _ProyectorPro_`;
    return text.trim();
}

function formatSingleVerseForWhatsApp(entry) {
    if (!entry) return "";
    const item = entry.data || entry;
    const cita = (item.cita || "Versículo").trim().toUpperCase();
    const verso = (item.texto || "").trim();
    const obs = (entry.obs || "").trim();

    let text = `📖 *${cita}*\n\n«${verso}»\n`;
    if (obs) {
        text += `\n📝 _Obs: ${obs}_\n`;
    }
    text += `\n✨ _ProyectorPro_`;
    return text.trim();
}

function formatAllAnnouncementsForWhatsApp() {
    const list = window.cloudAnnouncements || [];
    if (list.length === 0) return "";

    const dateStr = getFormattedDateSpanish();
    let text = `📢 *AVISOS Y ANUNCIOS* 📢\n`;
    text += `📅 _${dateStr}_\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    list.forEach((ann, idx) => {
        const title = (ann.titulo || ann.title || "Anuncio").trim();
        const msg = (ann.texto || ann.content || "").trim();

        text += `📌 *${idx + 1}. ${title}*\n`;
        if (msg) {
            text += `${msg}\n`;
        }
        text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ _ProyectorPro_`;
    return text.trim();
}

function formatSingleAnnouncementForWhatsApp(ann) {
    if (!ann) return "";
    const title = (ann.titulo || ann.title || "Anuncio").trim();
    const msg = (ann.texto || ann.content || "").trim();
    const time = ann.tiempo ? `⏱ Duración: ${ann.tiempo}s` : "";

    let text = `📢 *ANUNCIO: ${title.toUpperCase()}* 📢\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    if (msg) {
        text += `${msg}\n\n`;
    }
    if (time) {
        text += `${time}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ _ProyectorPro_`;
    return text.trim();
}

function formatSongLyricsForWhatsApp(title, tone, lyrics, obs = "") {
    let cleanLyrics = lyrics || "";
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanLyrics;
    cleanLyrics = tempDiv.innerText || tempDiv.textContent || "";

    let text = `🎵 *${(title || "CANTO").toUpperCase()}* 🎵\n`;
    let meta = [];
    if (tone) meta.push(`🎹 Tono: *${tone}*`);
    if (obs) meta.push(`📝 Obs: _${obs}_`);
    if (meta.length > 0) {
        text += `${meta.join('  |  ')}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += cleanLyrics.trim() + `\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ _ProyectorPro_`;
    return text.trim();
}

async function copyFavsToWhatsApp(onlySelected = false) {
    let list = [];
    if (onlySelected && selectedFavIndices.size > 0) {
        list = Array.from(selectedFavIndices).sort((a, b) => a - b).map(idx => songFavorites[idx]).filter(Boolean);
    } else {
        list = songFavorites || [];
    }

    if (list.length === 0) {
        showNotification("No hay canciones en favoritos para copiar", "info");
        return;
    }

    const text = formatSongFavoritesForWhatsApp(list);
    const success = await copyTextToClipboard(text);
    if (success) {
        showNotification(`¡Repertorio (${list.length} cantos) copiado para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
}
window.copyFavsToWhatsApp = copyFavsToWhatsApp;

async function copySingleFavWhatsApp(idx) {
    const song = (songFavorites || [])[idx];
    if (!song) return;

    const text = formatSingleSongForWhatsApp(song);
    const success = await copyTextToClipboard(text);
    if (success) {
        const title = song.titulo || song.title || "Canción";
        showNotification(`¡"${title}" copiado para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
}
window.copySingleFavWhatsApp = copySingleFavWhatsApp;

async function copyVerseHistoryWhatsApp() {
    const list = window.verseHistory || [];
    if (list.length === 0) {
        showNotification("No hay versículos en el historial para copiar", "info");
        return;
    }

    const text = formatVerseHistoryForWhatsApp();
    const success = await copyTextToClipboard(text);
    if (success) {
        showNotification(`¡Historial (${list.length} versículos) copiado para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
}
window.copyVerseHistoryWhatsApp = copyVerseHistoryWhatsApp;

async function copySingleVerseWhatsApp(idx) {
    const entry = (window.verseHistory || [])[idx];
    if (!entry) return;

    const text = formatSingleVerseForWhatsApp(entry);
    const success = await copyTextToClipboard(text);
    if (success) {
        const cita = (entry.data && entry.data.cita) || "Versículo";
        showNotification(`¡${cita} copiado para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
}
window.copySingleVerseWhatsApp = copySingleVerseWhatsApp;

async function copyAllAnnouncementsWhatsApp() {
    const list = window.cloudAnnouncements || [];
    if (!list || list.length === 0) {
        showNotification("No hay anuncios para copiar", "info");
        return;
    }

    const text = formatAllAnnouncementsForWhatsApp();
    const success = await copyTextToClipboard(text);
    if (success) {
        showNotification(`¡${list.length} anuncios copiados para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
}
window.copyAllAnnouncementsWhatsApp = copyAllAnnouncementsWhatsApp;

async function copySingleAnnouncementWhatsApp(annOrIdx) {
    let ann = null;
    if (typeof annOrIdx === 'object' && annOrIdx !== null) {
        ann = annOrIdx;
    } else if (typeof annOrIdx === 'number' || typeof annOrIdx === 'string') {
        ann = (window.cloudAnnouncements || [])[annOrIdx] || (window.cloudAnnouncements || []).find(a => String(a.id) === String(annOrIdx));
    }

    if (!ann) {
        showNotification("No se encontró el anuncio para copiar", "error");
        return;
    }

    const title = ann.titulo || ann.title || "Anuncio";
    const text = formatSingleAnnouncementForWhatsApp(ann);
    const success = await copyTextToClipboard(text);
    if (success) {
        showNotification(`¡"${title}" copiado para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
}
window.copySingleAnnouncementWhatsApp = copySingleAnnouncementWhatsApp;

window.copyCurrentPreviewLyricsWhatsApp = async function() {
    if (window.currentPreviewAnn) {
        const ann = window.currentPreviewAnn;
        const title = ann.titulo || ann.title || "Anuncio";
        const text = formatSingleAnnouncementForWhatsApp(ann);
        const success = await copyTextToClipboard(text);
        if (success) {
            showNotification(`¡Anuncio "${title}" copiado para WhatsApp! 📋`, "success");
        } else {
            showNotification("No se pudo copiar al portapapeles", "error");
        }
        return;
    }

    let title = "";
    let tone = "";
    let lyrics = "";
    let obs = "";

    const song = window.currentPreviewSong || window._currentPreviewSong;
    if (song) {
        title = song.titulo || song.title || "Sin título";
        tone = song.tono || "";
        lyrics = song.letra || song.lyrics || "";
        obs = song.obs || "";
    } else {
        const titleEl = document.getElementById('previewTitle');
        const lyricsEl = document.getElementById('previewLyrics');
        const toneEl = document.getElementById('previewTone');
        title = titleEl ? titleEl.textContent : "Canto";
        tone = (toneEl && !toneEl.classList.contains('hidden')) ? toneEl.textContent.replace(/^Tono:\s*/i, '') : "";
        lyrics = lyricsEl ? lyricsEl.innerText : "";
    }

    const text = formatSongLyricsForWhatsApp(title, tone, lyrics, obs);
    const success = await copyTextToClipboard(text);
    if (success) {
        showNotification(`¡Letra de "${title}" copiada para WhatsApp! 📋`, "success");
    } else {
        showNotification("No se pudo copiar al portapapeles", "error");
    }
};

/** ── FAVORITOS DE CANCIONES (REAL-TIME CON ACCIONES Y PERMISOS) ── */
let songFavorites = JSON.parse(localStorage.getItem('mobileSongFavorites')) || [];
window.songFavorites = songFavorites;
let isFavSelectMode = false;
let selectedFavIndices = new Set();

function isCurrentUserAdmin() {
    if (!window.currentUser) return false;
    const u = (window.currentUser.username || window.currentUser.name || "").toLowerCase();
    return u === 'admin' || window.currentUser.role === 'admin';
}

function canUserManageSong(song) {
    if (!window.currentUser) return false;
    if (isCurrentUserAdmin()) return true;
    const myUser = (window.currentUser.username || window.currentUser.name || "").toLowerCase();
    const owner = (song.addedBy || "").toLowerCase();
    return Boolean(owner && owner === myUser);
}

function initSongFavoritesListener() {
    console.log("[Mobile] Cargando favoritos de canciones...");
    initFavActionButtons();
    
    return db.collection('cantos_favoritos').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            songFavorites = doc.data().lista || [];
            window.songFavorites = songFavorites;
            localStorage.setItem('mobileSongFavorites', JSON.stringify(songFavorites));
            console.log(`[Mobile] Favoritos actualizados: ${songFavorites.length} canciones.`);
            renderSongFavorites();
            if (window.cloudSongs && window.cloudSongs.length > 0) {
                renderSongLibrary(window.cloudSongs);
            }
        } else {
            songFavorites = [];
            window.songFavorites = [];
            localStorage.setItem('mobileSongFavorites', JSON.stringify(songFavorites));
            console.warn("[Mobile] El documento de favoritos no existe en la nube.");
            renderSongFavorites();
        }
    }, err => {
        console.error("[Mobile] Error cargando favoritos:", err);
        const list = document.getElementById('favoritosCantosList');
        if (list && songFavorites.length === 0) {
            list.innerHTML = '<div class="error-state">Reconectando con favoritos...</div>';
        }
    });
}

function renderSongFavorites(filter = "") {
    const list = document.getElementById('favoritosCantosList');
    if (!list) return;

    if (songFavorites.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay canciones en favoritos aún.</div>';
        updateFavSelectionUI();
        return;
    }

    const normalizedFilter = (filter || "").toLowerCase().trim();

    const filtered = songFavorites.map((s, idx) => ({ song: s, originalIdx: idx })).filter(item => {
        const s = item.song;
        const title = normalizeText(s.titulo || s.title || "");
        const tono = normalizeText(s.tono || "");
        const lyrics = normalizeText(s.letra || s.lyrics || "");
        return title.includes(normalizedFilter) || tono.includes(normalizedFilter) || lyrics.includes(normalizedFilter);
    });

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">No se encontraron resultados en favoritos.</div>';
        updateFavSelectionUI();
        return;
    }

    let html = '';
    filtered.forEach((item) => {
        const s = item.song;
        const originalIdx = item.originalIdx;
        const sTitle = s.titulo || s.title || "Sin título";
        const canManage = canUserManageSong(s);
        const isFirst = originalIdx === 0;
        const isLast = originalIdx === songFavorites.length - 1;
        const isChecked = selectedFavIndices.has(originalIdx);
        const ownerName = s.addedBy || 'PC';
        
        let sTono = s.tono || "";
        let sBpm = (s.bpm !== undefined && s.bpm !== null && s.bpm !== '') ? String(s.bpm) : "";
        if ((!sBpm || !sTono) && window.cloudSongs && window.cloudSongs.length > 0) {
            const cleanT = (typeof normalizeText === 'function') ? normalizeText(sTitle) : sTitle.toLowerCase().trim();
            const match = window.cloudSongs.find(cs => {
                const csT = (typeof normalizeText === 'function') ? normalizeText(cs.titulo || cs.title || "") : (cs.titulo || cs.title || "").toLowerCase().trim();
                return csT === cleanT;
            });
            if (match) {
                if (!sBpm && match.bpm) sBpm = String(match.bpm);
                if (!sTono && match.tono) sTono = String(match.tono);
            }
        }

        html += `
            <div class="cloud-song-item" onclick="handleFavItemClick(event, ${originalIdx})">
                ${isFavSelectMode ? `
                    <input type="checkbox" class="fav-checkbox" 
                        ${canManage ? '' : 'disabled title="Solo el autor o admin puede seleccionarla"'} 
                        ${isChecked ? 'checked' : ''} 
                        onclick="event.stopPropagation(); toggleFavSelect(${originalIdx});">
                ` : ''}

                <div style="flex:1; min-width:0; padding-right:8px;">
                    <div class="song-name-main" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sTitle}</div>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
                        ${sTono ? `<span style="font-size:0.75rem; color:var(--ocher-light);">Tono: ${sTono}</span>` : ''}
                        ${sBpm ? `<span style="font-size:0.75rem; color:var(--ocher-light);">BPM: ${sBpm}</span>` : ''}
                        ${!canManage ? `
                            <span class="song-owner-tag" title="Enviado por ${ownerName}">
                                <i class="fa-solid fa-user-lock" style="font-size:0.65rem;"></i> ${ownerName}
                            </span>
                        ` : ''}
                        ${s.obs ? `<span style="font-size:0.7rem; color:var(--ocher-light); font-style:italic; opacity:0.85;"><i class="fa-solid fa-comment-dots"></i> ${s.obs}</span>` : ''}
                    </div>
                </div>

                ${!isFavSelectMode ? `
                    <div class="fav-item-actions" onclick="event.stopPropagation();">
                        <button class="btn-fav-item-action" title="Copiar para WhatsApp" onclick="event.stopPropagation(); copySingleFavWhatsApp(${originalIdx});" style="color:#25d366; border-color:rgba(37,211,102,0.3);">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        ${canManage ? `
                            <button class="btn-fav-item-action" title="Subir" ${isFirst ? 'disabled' : ''} onclick="event.stopPropagation(); moveFavOrder(${originalIdx}, -1);">
                                <i class="fa-solid fa-chevron-up"></i>
                            </button>
                            <button class="btn-fav-item-action" title="Bajar" ${isLast ? 'disabled' : ''} onclick="event.stopPropagation(); moveFavOrder(${originalIdx}, 1);">
                                <i class="fa-solid fa-chevron-down"></i>
                            </button>
                            <button class="btn-fav-item-action fav-action-delete" title="Quitar de favoritos" onclick="event.stopPropagation(); removeSingleFavorite(${originalIdx});">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
                ` : `
                    <i class="fa-solid fa-chevron-right" style="opacity:0.3; font-size:0.8rem; margin-left:6px;"></i>
                `}
            </div>
        `;
    });

    list.innerHTML = html;
    updateFavSelectionUI();
}

function handleFavItemClick(event, idx) {
    if (isFavSelectMode) {
        const s = songFavorites[idx];
        if (s && canUserManageSong(s)) {
            toggleFavSelect(idx);
        } else {
            showNotification("Solo el autor o un admin puede seleccionar esta canción", "warning");
        }
        return;
    }
    showFavoriteLyrics(idx);
}

function toggleFavSelect(idx) {
    if (selectedFavIndices.has(idx)) {
        selectedFavIndices.delete(idx);
    } else {
        selectedFavIndices.add(idx);
    }
    renderSongFavorites();
}

function updateFavSelectionUI() {
    const selBar = document.getElementById('favSelectionBar');
    const selCountEl = document.getElementById('favSelectedCount');
    const btnDeleteSel = document.getElementById('btnDeleteSelectedFavs');
    const btnToggle = document.getElementById('btnToggleFavSelect');

    if (btnToggle) {
        btnToggle.classList.toggle('active', isFavSelectMode);
    }

    if (selBar) {
        selBar.classList.toggle('hidden', !isFavSelectMode);
    }

    if (selCountEl) {
        selCountEl.textContent = `${selectedFavIndices.size} seleccionada${selectedFavIndices.size === 1 ? '' : 's'}`;
    }

    if (btnDeleteSel) {
        btnDeleteSel.disabled = selectedFavIndices.size === 0;
    }
    const btnCopySelected = document.getElementById('btnCopySelectedFavs');
    if (btnCopySelected) {
        btnCopySelected.disabled = selectedFavIndices.size === 0;
        btnCopySelected.style.opacity = selectedFavIndices.size === 0 ? '0.4' : '1';
        btnCopySelected.style.pointerEvents = selectedFavIndices.size === 0 ? 'none' : 'auto';
    }
}

function initFavActionButtons() {
    const btnToggle = document.getElementById('btnToggleFavSelect');
    if (btnToggle && !btnToggle._initialized) {
        btnToggle._initialized = true;
        btnToggle.onclick = () => {
            isFavSelectMode = !isFavSelectMode;
            if (!isFavSelectMode) selectedFavIndices.clear();
            renderSongFavorites();
        };
    }

    const btnClr = document.getElementById('btnClrFavsMobile');
    if (btnClr && !btnClr._initialized) {
        btnClr._initialized = true;
        btnClr.onclick = () => clearAllFavoritesMobile();
    }

    const btnSelectAll = document.getElementById('btnSelectAllFavs');
    if (btnSelectAll && !btnSelectAll._initialized) {
        btnSelectAll._initialized = true;
        btnSelectAll.onclick = () => {
            songFavorites.forEach((s, idx) => {
                if (canUserManageSong(s)) {
                    selectedFavIndices.add(idx);
                }
            });
            renderSongFavorites();
        };
    }

    const btnCancel = document.getElementById('btnCancelFavSelect');
    if (btnCancel && !btnCancel._initialized) {
        btnCancel._initialized = true;
        btnCancel.onclick = () => {
            isFavSelectMode = false;
            selectedFavIndices.clear();
            renderSongFavorites();
        };
    }

    const btnDeleteSel = document.getElementById('btnDeleteSelectedFavs');
    if (btnDeleteSel && !btnDeleteSel._initialized) {
        btnDeleteSel._initialized = true;
        btnDeleteSel.onclick = () => removeSelectedFavorites();
    }

    const btnCopyWhatsApp = document.getElementById('btnCopyFavsWhatsApp');
    if (btnCopyWhatsApp && !btnCopyWhatsApp._initialized) {
        btnCopyWhatsApp._initialized = true;
        btnCopyWhatsApp.onclick = () => copyFavsToWhatsApp();
    }

    const btnCopySelected = document.getElementById('btnCopySelectedFavs');
    if (btnCopySelected && !btnCopySelected._initialized) {
        btnCopySelected._initialized = true;
        btnCopySelected.onclick = () => copyFavsToWhatsApp(true);
    }

    if (window.MobileMetronome) {
        MobileMetronome.init();
    }
}

window.moveFavOrder = function(index, direction) {
    const song = songFavorites[index];
    if (!song || !canUserManageSong(song)) {
        showNotification("Solo el autor de esta canción o un admin puede moverla", "warning");
        return;
    }
    const target = index + direction;
    if (target < 0 || target >= songFavorites.length) return;
    const temp = songFavorites[index];
    songFavorites[index] = songFavorites[target];
    songFavorites[target] = temp;
    saveAndSyncSongFavorites();
};

window.removeSingleFavorite = function(index) {
    const song = songFavorites[index];
    if (!song || !canUserManageSong(song)) {
        showNotification("Solo el autor de esta canción o un admin puede eliminarla", "warning");
        return;
    }
    const songTitle = song.titulo || song.title || "esta canción";
    showConfirm(`¿Quitar "${songTitle}" de favoritos?`, () => {
        songFavorites.splice(index, 1);
        selectedFavIndices.delete(index);
        saveAndSyncSongFavorites();
        showNotification("Canción quitada de favoritos", "success");
    });
};

window.removeSelectedFavorites = function() {
    const indicesToDelete = Array.from(selectedFavIndices).filter(idx => {
        const s = songFavorites[idx];
        return s && canUserManageSong(s);
    });

    if (indicesToDelete.length === 0) {
        showNotification("No has seleccionado canciones que puedas eliminar", "warning");
        return;
    }

    showConfirm(`¿Quitar las ${indicesToDelete.length} canciones seleccionadas de favoritos?`, () => {
        songFavorites = songFavorites.filter((_, idx) => !indicesToDelete.includes(idx));
        selectedFavIndices.clear();
        isFavSelectMode = false;
        saveAndSyncSongFavorites();
        showNotification(`${indicesToDelete.length} canciones quitadas de favoritos`, "success");
    });
};

window.clearAllFavoritesMobile = function() {
    if (songFavorites.length === 0) {
        showNotification("No hay canciones en favoritos", "info");
        return;
    }
    const isAdmin = isCurrentUserAdmin();
    if (isAdmin) {
        showConfirm("¿Deseas quitar TODAS las canciones de favoritos?", () => {
            songFavorites = [];
            selectedFavIndices.clear();
            isFavSelectMode = false;
            saveAndSyncSongFavorites();
            showNotification("Se vació la lista de favoritos", "success");
        });
    } else {
        const myUser = (window.currentUser?.username || window.currentUser?.name || "").toLowerCase();
        const mySongsCount = songFavorites.filter(s => (s.addedBy || "").toLowerCase() === myUser).length;
        if (mySongsCount === 0) {
            showNotification("No tienes canciones añadidas por ti en favoritos", "info");
            return;
        }
        showConfirm(`¿Deseas quitar tus ${mySongsCount} canciones enviadas a favoritos?`, () => {
            songFavorites = songFavorites.filter(s => (s.addedBy || "").toLowerCase() !== myUser);
            selectedFavIndices.clear();
            isFavSelectMode = false;
            saveAndSyncSongFavorites();
            showNotification("Tus canciones fueron quitadas de favoritos", "success");
        });
    }
};

// ── METRÓNOMO PROFESIONAL EN APP MÓVIL ──
const MobileMetronome = {
    audioCtx: null,
    isPlaying: false,
    bpm: 120,
    compas: '4/4',
    beatsPerMeasure: 4,
    currentBeat: 0,
    nextNoteTime: 0.0,
    timerID: null,
    lookahead: 25.0,
    scheduleAheadTime: 0.1,
    soundEnabled: true,
    tapTimes: [],
    currentSong: null,

    init() {
        this.bindEvents();
        this.updateUI();
    },

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    loadSong(song) {
        this.currentSong = song;
        let sBpm = song && song.bpm ? song.bpm : null;
        let sCompas = song && song.compas ? song.compas : null;
        if (!sBpm && song && window.cloudSongs && window.cloudSongs.length > 0) {
            const cleanT = normalizeText(song.titulo || song.title || "");
            const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
            if (match) {
                if (match.bpm) sBpm = match.bpm;
                if (match.compas) sCompas = match.compas;
            }
        }
        const bpm = sBpm ? parseInt(sBpm) : 120;
        const compas = sCompas ? sCompas : '4/4';
        this.setBpm(bpm, compas);
    },

    setBpm(newBpm, newCompas = null) {
        if (newBpm && !isNaN(newBpm)) {
            this.bpm = Math.min(Math.max(parseInt(newBpm), 30), 280);
        }
        if (newCompas) {
            this.setCompas(newCompas);
        } else {
            this.updateUI();
        }
    },

    setCompas(compasStr) {
        this.compas = compasStr || '4/4';
        const parts = this.compas.split('/');
        this.beatsPerMeasure = parseInt(parts[0]) || 4;
        this.currentBeat = 0;
        this.updateUI();
    },

    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
    },

    start() {
        if (this.isPlaying) return;
        const ctx = this.getAudioContext();
        this.isPlaying = true;
        this.currentBeat = 0;
        this.nextNoteTime = ctx.currentTime + 0.05;
        this.timerID = setInterval(() => this.scheduler(), this.lookahead);
        this.updateUI();
    },

    stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        clearInterval(this.timerID);
        this.timerID = null;
        this.currentBeat = 0;
        this.updateUI();
    },

    nextNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        this.nextNoteTime += secondsPerBeat;
        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
    },

    scheduleNote(beatNumber, time) {
        if (this.soundEnabled && this.audioCtx) {
            try {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                const isDownbeat = (beatNumber === 0);
                osc.frequency.value = isDownbeat ? 1200 : 800;
                gain.gain.setValueAtTime(isDownbeat ? 0.9 : 0.6, time);
                gain.gain.exponentialRampToValueAtTime(0.001, time + (isDownbeat ? 0.06 : 0.04));

                osc.start(time);
                osc.stop(time + (isDownbeat ? 0.06 : 0.04));
            } catch (err) {
                console.warn('[MobileMetronome] Error audio:', err);
            }
        }

        const timeToVisual = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
        setTimeout(() => {
            if (!this.isPlaying) return;
            this.triggerVisualBeat(beatNumber);
        }, timeToVisual);
    },

    scheduler() {
        if (!this.isPlaying || !this.audioCtx) return;
        while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.nextNoteTime);
            this.nextNote();
        }
    },

    triggerVisualBeat(beat) {
        const visual = document.getElementById('mobileMetroVisualBeat');
        if (visual) {
            visual.className = 'mobile-metro-beat-dot ' + (beat === 0 ? 'beat-down' : 'beat-sub');
            setTimeout(() => {
                if (visual) visual.className = 'mobile-metro-beat-dot';
            }, 120);
        }

        // Vibración háptica suave en el tiempo 1 si el móvil lo permite
        if (beat === 0 && navigator.vibrate) {
            try { navigator.vibrate(14); } catch (e) { }
        }
    },

    tapTempo() {
        const now = performance.now();
        if (this.tapTimes.length > 0 && (now - this.tapTimes[this.tapTimes.length - 1]) > 2500) {
            this.tapTimes = [];
        }
        this.tapTimes.push(now);
        if (this.tapTimes.length > 5) {
            this.tapTimes.shift();
        }
        if (this.tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < this.tapTimes.length; i++) {
                intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            this.setBpm(calculatedBpm);
        }
    },

    updateUI() {
        const pill = document.getElementById('btnMobileToggleMetro');
        const label = document.getElementById('mobileMetroBpmLabel');
        const icon = document.getElementById('iconMobileMetroPlay');
        const compasSelect = document.getElementById('mobileMetroCompas');
        const muteBtn = document.getElementById('btnMobileMetroMute');

        if (label) label.textContent = `${this.bpm} BPM`;
        if (compasSelect) compasSelect.value = this.compas;
        if (pill) {
            pill.classList.toggle('active', this.isPlaying);
        }
        if (icon) {
            icon.className = this.isPlaying ? 'fa-solid fa-square' : 'fa-solid fa-play';
        }
        if (muteBtn) {
            muteBtn.classList.toggle('active', this.soundEnabled);
            muteBtn.innerHTML = this.soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        }
    },

    bindEvents() {
        const pill = document.getElementById('btnMobileToggleMetro');
        const tapBtn = document.getElementById('btnMobileTapTempo');
        const minusBtn = document.getElementById('btnMobileMetroMinus');
        const plusBtn = document.getElementById('btnMobileMetroPlus');
        const muteBtn = document.getElementById('btnMobileMetroMute');
        const compasSelect = document.getElementById('mobileMetroCompas');

        if (pill) pill.onclick = () => this.toggle();
        if (tapBtn) tapBtn.onclick = () => this.tapTempo();
        if (minusBtn) minusBtn.onclick = () => this.setBpm(this.bpm - 1);
        if (plusBtn) plusBtn.onclick = () => this.setBpm(this.bpm + 1);
        if (muteBtn) {
            muteBtn.onclick = () => {
                this.soundEnabled = !this.soundEnabled;
                this.updateUI();
            };
        }
        if (compasSelect) {
            compasSelect.onchange = () => this.setCompas(compasSelect.value);
        }
    }
};
window.MobileMetronome = MobileMetronome;

function saveAndSyncSongFavorites() {
    // Asegurar que ninguna canción en favoritos pierda BPM si está en cloudSongs
    if (window.cloudSongs && window.cloudSongs.length > 0) {
        songFavorites.forEach(f => {
            if (!f.bpm) {
                const cleanT = (typeof normalizeText === 'function') ? normalizeText(f.titulo || f.title || "") : (f.titulo || f.title || "").toLowerCase().trim();
                const match = window.cloudSongs.find(cs => {
                    const csT = (typeof normalizeText === 'function') ? normalizeText(cs.titulo || cs.title || "") : (cs.titulo || cs.title || "").toLowerCase().trim();
                    return csT === cleanT;
                });
                if (match) {
                    if (match.bpm) f.bpm = match.bpm;
                    if (match.compas && !f.compas) f.compas = match.compas;
                }
            }
        });
    }
    localStorage.setItem('mobileSongFavorites', JSON.stringify(songFavorites));
    renderSongFavorites();
    db.collection('cantos_favoritos').doc('master').set({
        lista: songFavorites,
        updatedBy: window.currentUser?.username || 'mobile',
        updated: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log("[Mobile] Favoritos sincronizados con Firebase exitosamente.");
    }).catch(err => {
        console.error("[Mobile] Error sincronizando favoritos:", err);
    });
}

window.showFavoriteLyrics = function(idx) {
    const song = songFavorites[idx];
    if (!song) return;

    window._currentPreviewSong = song;
    const modal = document.getElementById('modalPreview');
    const title = document.getElementById('previewTitle');
    const toneEl = document.getElementById('previewTone');
    const lyrics = document.getElementById('previewLyrics');
    const footer = document.getElementById('modalPreviewFooter');

    const sTitle = song.titulo || song.title || "Sin título";
    const sLyrics = song.letra || song.lyrics || "Sin letra registrada.";

    title.textContent = sTitle;
    if (toneEl) {
        if (song.tono) {
            toneEl.textContent = `Tono: ${song.tono}`;
            toneEl.classList.remove('hidden');
        } else {
            toneEl.classList.add('hidden');
        }
    }

    let songBpm = song.bpm || "";
    if (!songBpm && window.cloudSongs && window.cloudSongs.length > 0) {
        const cleanT = normalizeText(sTitle);
        const match = window.cloudSongs.find(cs => normalizeText(cs.titulo || cs.title || "") === cleanT);
        if (match && match.bpm) {
            songBpm = match.bpm;
            if (!song.bpm) song.bpm = match.bpm;
            if (!song.compas && match.compas) song.compas = match.compas;
        }
    }

    const bpmEl = document.getElementById('previewBpm');
    if (bpmEl) {
        if (songBpm) {
            bpmEl.textContent = `BPM: ${songBpm}`;
            bpmEl.classList.remove('hidden');
        } else {
            bpmEl.classList.add('hidden');
        }
    }

    if (window.MobileMetronome) {
        MobileMetronome.loadSong(song);
    }

    lyrics.innerHTML = formatLyrics(sLyrics);
    
    // Ocultar botón de añadir al carrito porque esto es consulta de favoritos
    if (footer) footer.style.display = 'none';

    modal.classList.remove('hidden');
};

// Sobrescribir closePreview para restaurar el footer si se necesita despuÃ©s
const originalClosePreview = window.closePreview;
window.closePreview = function() {
    window._currentPreviewSong = null;
    if (window.MobileMetronome) {
        MobileMetronome.stop();
    }
    const footer = document.getElementById('modalPreviewFooter');
    if (footer) footer.style.display = 'flex';
    if (originalClosePreview) originalClosePreview();
    else document.getElementById('modalPreview').classList.add('hidden');
};

function canUserManageVerse(entry) {
    if (!window.currentUser) return false;
    if (isCurrentUserAdmin()) return true;
    const myUser = (window.currentUser.username || window.currentUser.name || "").toLowerCase();
    const owner = (entry.addedBy || "").toLowerCase();
    return Boolean(owner && owner === myUser);
}

/** ── HISTORIAL DE VERSÍCULOS ── */
function renderVerseHistory() {
    const container = document.getElementById('verseHistoryList');
    if (!container) return;

    if (!window.verseHistory || window.verseHistory.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay versículos en el historial de hoy.</div>';
        return;
    }

    container.innerHTML = '';
    window.verseHistory.forEach((entry, idx) => {
        const item = entry.data || entry;
        const canManage = canUserManageVerse(entry);
        const ownerName = entry.addedBy || 'Desconocido';
        const el = document.createElement('div');
        el.className = 'cloud-card'; // Reutilizar estilos de notas
        el.style = "margin-bottom: 10px; padding: 15px; border-radius: 12px; background: rgba(255,255,255,0.04); border-left: 4px solid var(--ocher-base); box-shadow: 0 2px 8px rgba(0,0,0,0.2);";
        
        el.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; font-size:0.75rem;">
                <span style="color:var(--ocher-base); font-weight:800; text-transform:uppercase;">${item.cita}</span>
                <div style="display:flex; align-items:center; gap:6px;">
                    ${!canManage ? `
                        <span class="song-owner-tag" style="margin:0; font-size:0.65rem;" title="Enviado por ${ownerName}">
                            <i class="fa-solid fa-user-lock" style="font-size:0.6rem;"></i> ${ownerName}
                        </span>
                    ` : ''}
                    <span style="opacity:0.6; font-size:0.7rem;"><i class="fa-regular fa-clock"></i> ${entry.time || '--:--'}</span>
                </div>
            </div>
            <div style="font-size:1.05rem; line-height:1.5; color:#fff; white-space: pre-wrap;">${item.texto}</div>
            ${entry.obs ? `<div style="font-size:0.75rem; color:var(--ocher-light); margin-top:8px; font-style:italic; opacity:0.7; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">Obs: ${entry.obs}</div>` : ''}
            <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:12px;">
                ${canManage ? `
                    <button onclick="removeSingleVerseHistory(${idx})" class="btn-fav-item-action fav-action-delete" title="Eliminar de historial" style="width:auto; padding:5px 10px; height:32px; gap:5px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; font-size:0.72rem; border-radius:6px; font-weight:700; cursor:pointer;">
                        <i class="fa-solid fa-trash-can"></i> ELIMINAR
                    </button>
                ` : ''}
                <button onclick="copySingleVerseWhatsApp(${idx})" class="btn-fav-item-action" title="Copiar versículo para WhatsApp" style="width:auto; padding:5px 10px; height:32px; gap:5px; background:rgba(37,211,102,0.15); border:1px solid rgba(37,211,102,0.35); color:#25d366; font-size:0.72rem; border-radius:6px; font-weight:700; cursor:pointer;">
                    <i class="fa-brands fa-whatsapp"></i> COPIAR
                </button>
                <button onclick="reAddFromHistory(${idx})" style="background:var(--wine-accent); color:white; border:1px solid var(--ocher-base); border-radius:6px; padding:5px 12px; height:32px; font-size:0.72rem; font-weight:700; display:flex; align-items:center; gap:5px; cursor:pointer;">
                    <i class="fa-solid fa-plus"></i> RE-ENVIAR
                </button>
            </div>
        `;
        container.appendChild(el);
    });
}

window.removeSingleVerseHistory = function(idx) {
    const entry = window.verseHistory[idx];
    if (!entry || !canUserManageVerse(entry)) {
        showNotification("Solo el autor de este versículo o un admin puede eliminarlo", "warning");
        return;
    }
    const cita = (entry.data && entry.data.cita) || "este versículo";
    showConfirm(`¿Quitar "${cita}" del historial de lectura?`, () => {
        window.verseHistory.splice(idx, 1);
        saveAndSyncVerseHistory();
        showNotification("Versículo quitado del historial", "success");
    });
};

function clearVerseHistory() {
    if (!window.verseHistory || window.verseHistory.length === 0) {
        showNotification("No hay versículos en el historial", "info");
        return;
    }
    const isAdmin = isCurrentUserAdmin();
    if (isAdmin) {
        showConfirm("¿Deseas vaciar el historial de versículos de esta sesión?", () => {
            window.verseHistory = [];
            saveAndSyncVerseHistory();
            showNotification("Historial limpiado.");
        });
    } else {
        const myUser = (window.currentUser?.username || window.currentUser?.name || "").toLowerCase();
        const myVerses = window.verseHistory.filter(v => (v.addedBy || "").toLowerCase() === myUser);
        if (myVerses.length === 0) {
            showNotification("No tienes versículos enviados por ti en el historial", "info");
            return;
        }
        showConfirm(`¿Deseas quitar tus ${myVerses.length} versículos del historial de lectura?`, () => {
            window.verseHistory = window.verseHistory.filter(v => (v.addedBy || "").toLowerCase() !== myUser);
            saveAndSyncVerseHistory();
            showNotification("Tus versículos fueron quitados del historial.");
        });
    }
}

function saveAndSyncVerseHistory() {
    localStorage.setItem('mobileVerseHistory', JSON.stringify(window.verseHistory));
    renderVerseHistory();
    if (typeof db === 'undefined' || !db) return;

    const payload = (window.verseHistory || []).map(entry => {
        const item = entry.data || entry;
        return {
            cita: item.cita || item.ref || "",
            texto: item.texto || item.text || "",
            addedBy: entry.addedBy || item.addedBy || window.currentUser?.username || "movil",
            time: entry.time || "",
            obs: entry.obs || item.obs || "",
            bookName: item.libro || item.bookName || "",
            chapter: item.capitulo || item.chapter || 0,
            verse: item.versiculo || item.verse || 0,
            version: item.version || ""
        };
    });

    db.collection('historial_versiculos').doc('master').set({
        lista: payload,
        updatedBy: window.currentUser?.username || 'movil',
        updated: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        console.log("[Mobile] Historial de versículos sincronizado con Firebase.");
    }).catch(err => {
        console.error("[Mobile] Error sincronizando historial de versículos:", err);
    });
}

function initVerseHistoryListener() {
    console.log("[Mobile] Cargando historial de versículos desde la nube...");
    let isHistFirstLoad = true;
    return db.collection('historial_versiculos').doc('master').onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            const cloudSender = (data.updatedBy || "").toLowerCase();
            const myUser = (window.currentUser?.username || window.currentUser?.name || "movil").toLowerCase();

            // Si el cambio lo originó este mismo móvil en esta sesión, no re-mapear innecesariamente
            if (cloudSender === myUser && !isHistFirstLoad) {
                isHistFirstLoad = false;
                return;
            }
            isHistFirstLoad = false;

            const cloudList = data.lista || [];
            window.verseHistory = cloudList.map(item => ({
                time: item.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                addedBy: item.addedBy || 'Desconocido',
                obs: item.obs || "",
                data: {
                    cita: item.cita || item.ref || "",
                    texto: item.texto || item.text || "",
                    version: item.version || "",
                    libro: item.bookName || item.libro || "",
                    capitulo: item.chapter || item.capitulo || 0,
                    versiculo: item.verse || item.versiculo || 0
                }
            }));
            localStorage.setItem('mobileVerseHistory', JSON.stringify(window.verseHistory));
            console.log(`[Mobile] Historial de versículos actualizado desde la nube: ${window.verseHistory.length} registros.`);
            renderVerseHistory();
        } else {
            isHistFirstLoad = false;
            // Si la nube aún no tiene documento de historial pero el móvil sí tiene datos locales, sincronizar inicial
            if (window.verseHistory && window.verseHistory.length > 0) {
                saveAndSyncVerseHistory();
            }
        }
    }, err => {
        console.error("[Mobile] Error escuchando historial de versículos:", err);
    });
}

function reAddFromHistory(idx) {
    const entry = window.verseHistory[idx];
    if (entry) {
        addItemToCartFinal('bible', entry.data, entry.obs || "");
        showNotification("Versículo añadido a la lista de envío.");
    }
}

/** ── GESTIÓN DE CUENTA ── */
window.toggleUserMenu = function() {
    const user = window.currentUser;
    if (!user) return;
    const nameEl = document.getElementById('optModalUserName');
    if (nameEl) nameEl.textContent = user.name || user.username;
    document.getElementById('userOptionsModal').classList.remove('hidden');
};

window.closeUserMenu = function() {
    document.getElementById('userOptionsModal').classList.add('hidden');
};

window.showChangePassModal = function() {
    closeUserMenu();
    document.getElementById('passwordModal').classList.remove('hidden');
    document.getElementById('oldPassInput').value = "";
    document.getElementById('newPass1Input').value = "";
    document.getElementById('newPass2Input').value = "";
    document.getElementById('passErrText').style.display = 'none';
};

window.closePassModal = function() {
    document.getElementById('passwordModal').classList.add('hidden');
};

window.saveNewPassword = async function() {
    const oldP = document.getElementById('oldPassInput').value;
    const p1 = document.getElementById('newPass1Input').value;
    const p2 = document.getElementById('newPass2Input').value;
    const err = document.getElementById('passErrText');
    const btn = document.getElementById('btnSaveMobPass');

    if (!oldP || !p1 || !p2) {
        err.textContent = "Todos los campos son obligatorios.";
        err.style.display = 'block';
        return;
    }
    if (p1 !== p2) {
        err.textContent = "Las nuevas contraseñas no coinciden.";
        err.style.display = 'block';
        return;
    }
    if (p1.length < 3) {
        err.textContent = "La clave es demasiado corta (mínimo 3).";
        err.style.display = 'block';
        return;
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> GUARDANDO...';

    try {
        if (!window.currentUser || !window.currentUser.username) throw new Error("Sesión no válida");
        const userId = window.currentUser.username;
        const oldP = document.getElementById('oldPassInput').value;
        const p1 = document.getElementById('newPass1Input').value;

        // 1. ACTUALIZACIÓN DIRECTA EN EL MAESTRO (Para inmediatez)
        const docRef = db.collection('usuarios_autorizados').doc('master');
        const snap = await docRef.get();
        if (snap.exists) {
            const data = snap.data();
            const users = data.lista || [];
            const uIdx = users.findIndex(u => u.u.toLowerCase() === userId.toLowerCase());
            
            if (uIdx === -1) throw new Error("Usuario no encontrado en el servidor");
            if (users[uIdx].p !== oldP) throw new Error("Contraseña actual incorrecta");

            users[uIdx].p = p1;
            await docRef.set({ 
                lista: users, 
                updated: firebase.firestore.FieldValue.serverTimestamp() 
            });
            // También actualizar caché local para permitir acceso offline con la nueva clave
            localStorage.setItem('cachedUsers', JSON.stringify(users));
        }

        // 2. PETICIÓN PARA QUE LA PC ACTUALICE SU BASE LOCAL (Para persistencia)
        await db.collection('peticiones_libreria').add({
            type: 'UPDATE_USER_PASS',
            user: userId,
            old: oldP,
            new: p1,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        closePassModal();
        showNotification("¡Contraseña actualizada con éxito!");
        
        // Cerrar sesión para que el usuario re-ingrese con la nueva clave
        setTimeout(() => {
            handleLogout();
        }, 1500);

    } catch (e) {
        console.error(e);
        err.textContent = "Error: " + (e.message || "revisa conexión");
        err.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

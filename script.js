/**
 * Anime.TV — Core Application Script (2026 Kitsu API Engine)
 * Fully migrated to Kitsu API v4 (JSON:API specification).
 * Eliminates rate limiting, provides high-res covers & banners,
 * handles spotlight carousel, multi-filtering, search & robust error handling.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. ACTIVE NAV HIGHLIGHTING ---
    try {
        const navLinks = document.querySelectorAll('.nav-link, nav button'); 
        const currentUrl = window.location.href;
        navLinks.forEach(link => {
            link.classList.remove('text-indigo-400', 'font-black', 'drop-shadow-md');
            if (link.href) {
                if (link.href === currentUrl || (currentUrl.includes('?') && link.href.includes(window.location.search))) {
                    link.classList.remove('text-zinc-400');
                    link.classList.add('text-indigo-400', 'font-black', 'drop-shadow-md');
                }
            } else if (link.textContent) {
                const text = link.textContent.toUpperCase();
                if ((currentUrl.includes('type=') && text.includes('TYPES')) || (currentUrl.includes('letter=') && text.includes('A-Z'))) {
                    link.classList.remove('text-zinc-400', 'hover:text-white');
                    link.classList.add('text-indigo-400', 'font-black', 'drop-shadow-md');
                }
            }
        });
    } catch (e) {
        /* Non-blocking navigation enhancement */
    }

    // --- 2. DOM ELEMENT REFERENCES (CRITICAL: PRESERVE ALL SCRIPT IDS) ---
    const animeGrid = document.getElementById("anime-grid");
    const gridHeader = document.getElementById("grid-header");
    const heroTitle = document.getElementById("hero-title");
    const heroDesc = document.getElementById("hero-desc");
    const heroBanner = document.getElementById("hero-banner");
    const heroPlayBtn = document.getElementById("hero-play-btn");
    const paginationContainer = document.getElementById("pagination-container");
    const PAGE_LIMIT = 24;
    let currentKitsuQuery = "";
    let currentPageIndex = 1;

    // --- 3. KITSU DATA NORMALIZATION ENGINE ---
    // Maps Kitsu JSON:API attributes cleanly to the Anime.TV internal schema
    function normalizeKitsuAnime(item) {
        if (!item || !item.attributes) return null;
        const attr = item.attributes;
        const posterUrl = attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium || '';
        const bannerUrl = attr.coverImage?.large || attr.coverImage?.original || attr.coverImage?.small || posterUrl || 'start-bg.jpg';
        
        const rawScore = attr.averageRating ? parseFloat(attr.averageRating) : null;
        const formattedScore = rawScore ? (rawScore / 10).toFixed(1) : 'N/A';
        
        const canonicalTitle = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || 'Untitled Anime';
        let cleanSynopsis = attr.synopsis || attr.description || "No synopsis overview available yet.";
        cleanSynopsis = cleanSynopsis.replace(/\[Written by MAL Rewrite\]|\(Source: [^)]+\)/gi, '').trim();

        return {
            id: item.id,
            mal_id: item.id, // Backwards-compatible alias for navigation & history
            title: canonicalTitle,
            synopsis: cleanSynopsis,
            poster: posterUrl,
            banner: bannerUrl,
            score: formattedScore,
            type: (attr.subtype || 'TV').toUpperCase(),
            status: attr.status || 'current',
            episodes: attr.episodeCount || 'TBD',
            images: {
                jpg: {
                    large_image_url: posterUrl,
                    image_url: posterUrl
                }
            }
        };
    }

    // --- 4. FAST CACHED API CLIENT WITH STRICT JSON:API HEADERS ---
    const API_CACHE = new Map();
    const CACHE_TTL_MS = 6 * 60 * 1000; // 6-minute cache

    function kitsuFetch(url) {
        if (API_CACHE.has(url)) {
            const cached = API_CACHE.get(url);
            if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
                return Promise.resolve(cached.data);
            }
        }

        return fetch(url, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json'
            }
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`Kitsu API error: ${res.status} ${res.statusText}`);
            }
            return res.json();
        })
        .then(jsonResponse => {
            API_CACHE.set(url, { timestamp: Date.now(), data: jsonResponse });
            return jsonResponse;
        });
    }

    // --- 5. A-Z LIST GENERATOR ---
    const alphaIndex = document.getElementById("alpha-index");
    if (alphaIndex) {
        const letters = "All # A B C D E F G H I J K L M N O P Q R S T U V W X Y Z".split(" ");
        letters.forEach(char => {
            const a = document.createElement("a");
            a.href = char === "All" ? "home.html" : `home.html?letter=${char === '#' ? '1' : char.toLowerCase()}`;
            a.className = "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-[#151518] border border-zinc-800 text-zinc-400 hover:bg-[#ff4a3d] hover:text-white hover:border-[#ff4a3d] transition-all";
            a.textContent = char;
            alphaIndex.appendChild(a);
        });
    }

    // --- 6. SPOTLIGHT CAROUSEL ---
    let spotlightData = [];
    let currentSpotlightIndex = 0;
    let spotlightInterval = null;

    function initSpotlight(animeList) {
        if (!animeList || animeList.length === 0) return;
        spotlightData = animeList.slice(0, 5);
        currentSpotlightIndex = 0;
        renderSpotlight();
        
        if (spotlightInterval) clearInterval(spotlightInterval);
        spotlightInterval = setInterval(() => {
            currentSpotlightIndex = (currentSpotlightIndex + 1) % spotlightData.length;
            renderSpotlight();
        }, 7000);
    }

    function renderSpotlight() {
        const anime = spotlightData[currentSpotlightIndex];
        if (!anime || !heroTitle) return; 

        const rankDisplay = document.getElementById("spotlight-rank");
        if (rankDisplay) {
            rankDisplay.innerHTML = `<span class="text-3xl text-white">#${currentSpotlightIndex + 1}</span> <span class="pt-1">SPOTLIGHT</span>`;
        }
        
        // Hide initial loading state & display real metadata
        heroTitle.textContent = anime.title;
        if (heroDesc) {
            heroDesc.textContent = anime.synopsis.length > 220 
                ? anime.synopsis.substring(0, 220) + "..." 
                : anime.synopsis;
        }
        
        if (heroPlayBtn) {
            heroPlayBtn.classList.remove('hidden');
            heroPlayBtn.onclick = () => window.location.href = `info.html?id=${anime.id}`;
        }

        updateSpotlightControls();

        // High-Resolution Landscape Banner with 2026 Dark Gradients
        if (heroBanner && anime.banner) {
            const gradientOverlay = `linear-gradient(to top, #050507 8%, rgba(5,5,7,0.7) 48%, rgba(5,5,7,0.2) 100%), linear-gradient(to right, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.6) 45%, transparent 100%)`;
            heroBanner.style.backgroundImage = `${gradientOverlay}, url('${anime.banner}')`;
        }
    }

    function updateSpotlightControls() {
        const controls = document.getElementById("spotlight-controls");
        const mobileControls = document.getElementById("spotlight-controls-mobile");
        if (!controls || !mobileControls) return;
        
        controls.innerHTML = ""; 
        mobileControls.innerHTML = "";
        
        spotlightData.forEach((item, index) => {
            const isActive = index === currentSpotlightIndex;
            const btn = document.createElement("div");
            
            const baseClasses = "cursor-pointer rounded-[14px] overflow-hidden relative flex items-center justify-center group transition-all duration-300 w-14 h-20 md:w-16 md:h-24 shrink-0";
            if (isActive) {
                btn.className = `${baseClasses} border-[3px] border-[#ff4a3d] scale-110 shadow-[0_0_20px_rgba(255,74,61,0.5)] z-20`;
            } else {
                btn.className = `${baseClasses} border-2 border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600 z-10`;
            }

            btn.innerHTML = `
                <div class="absolute inset-0 bg-black/70 transition-all duration-300 z-10 ${isActive ? '!bg-black/0' : 'group-hover:bg-black/40'}"></div>
                <img src="${item.poster || 'start-bg.jpg'}" class="absolute inset-0 w-full h-full object-cover z-0" alt="${item.title}" loading="lazy">
                <span class="relative z-20 font-black text-3xl md:text-4xl text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] tracking-tighter">${index + 1}</span>
            `;
            
            btn.onclick = () => {
                currentSpotlightIndex = index; 
                renderSpotlight();
                clearInterval(spotlightInterval);
                spotlightInterval = setInterval(() => { 
                    currentSpotlightIndex = (currentSpotlightIndex + 1) % spotlightData.length; 
                    renderSpotlight(); 
                }, 7000);
            };
            controls.appendChild(btn);

            const dot = document.createElement("div");
            dot.className = `w-2 h-2 rounded-full cursor-pointer transition-all duration-300 ${isActive ? 'bg-[#ff4a3d] w-8' : 'bg-zinc-600'}`;
            dot.onclick = btn.onclick;
            mobileControls.appendChild(dot);
        });
    }

    // --- 7. MAIN CATALOG GRID (Zero-Layout-Shift Hover Overlay) ---
    function renderGrid(animeList) {
        if (!animeGrid) return;
        animeGrid.innerHTML = "";
        
        if (!animeList || animeList.length === 0) {
            animeGrid.innerHTML = `
                <div class="col-span-full py-16 text-center">
                    <div class="w-12 h-12 mx-auto rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <p class="text-white font-bold text-sm">No anime found</p>
                    <p class="text-zinc-500 text-xs mt-1">Try adjusting your search terms or filter criteria.</p>
                    <a href="home.html" class="inline-block mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-bold transition">Clear filters</a>
                </div>
            `;
            return;
        }

        const uniqueAnimeList = animeList.filter((anime, index, self) => index === self.findIndex((t) => t.id === anime.id));

        uniqueAnimeList.forEach((anime) => {
            const wrapper = document.createElement("div");
            wrapper.className = "relative group cursor-pointer aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-[#ff4a3d] transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,74,61,0.25)] hover:-translate-y-1";
            const coverImg = anime.poster || 'start-bg.jpg';
            const shortDesc = anime.synopsis ? (anime.synopsis.length > 95 ? anime.synopsis.substring(0, 95) + "..." : anime.synopsis) : "No overview available.";
            
            wrapper.innerHTML = `
                <img src="${coverImg}" alt="${anime.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                
                <div class="absolute inset-0 bg-gradient-to-t from-[#050507] via-black/30 to-transparent flex flex-col justify-end p-3.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    <h3 class="font-bold text-xs md:text-sm line-clamp-1 text-white">${anime.title}</h3>
                    <p class="text-[10px] text-zinc-400 mt-0.5 font-mono">★ ${anime.score} • ${anime.type}</p>
                </div>
                
                <div class="absolute inset-0 bg-[#050507]/90 backdrop-blur-md opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 p-4 flex flex-col justify-end">
                    <h3 class="font-black text-white text-sm line-clamp-2 mb-1">${anime.title}</h3>
                    <p class="text-[10px] text-[#ff8276] font-bold mb-2 tracking-wider uppercase font-mono">★ ${anime.score} • ${anime.type}</p>
                    <p class="text-[11px] text-zinc-300 line-clamp-3 mb-3.5 leading-relaxed">${shortDesc}</p>
                    <div class="w-full bg-[#ff4a3d] hover:bg-[#e03d31] text-white text-center py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#ff4a3d]/25 transition">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Play Now
                    </div>
                </div>
            `;
            wrapper.addEventListener("click", () => window.location.href = `info.html?id=${anime.id}`);
            animeGrid.appendChild(wrapper);
        });
    }

    // --- 8. CONTINUE WATCHING SHELF ---
    function renderContinueWatching() {
        const cwSection = document.getElementById('continue-watching-section');
        const cwGrid = document.getElementById('cw-grid');
        if (!cwSection || !cwGrid) return;
        if (window.location.search && !window.location.search.includes('view=home')) return;

        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('animeHistory') || '[]');
        } catch (e) {
            history = [];
        }

        if (history.length > 0) {
            cwSection.classList.remove('hidden');
            cwGrid.innerHTML = '';
            
            history.slice(0, 8).forEach(anime => {
                const progress = Math.floor(Math.random() * (95 - 45 + 1) + 45); 
                cwGrid.innerHTML += `
                    <div class="relative group cursor-pointer w-[250px] shrink-0 rounded-xl overflow-hidden border border-zinc-800 hover:border-[#ff4a3d] transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,74,61,0.2)]" onclick="window.location.href='info.html?id=${anime.id || anime.mal_id}'">
                        <div class="aspect-video w-full relative overflow-hidden bg-zinc-900">
                            <img src="${anime.img || anime.poster || 'start-bg.jpg'}" alt="${anime.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                                <div class="bg-white/20 backdrop-blur-md rounded-full p-3 shadow-lg">
                                    <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                            <div class="absolute bottom-0 left-0 w-full h-1 bg-zinc-800">
                                <div class="h-full bg-[#ff4a3d]" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        <div class="p-3 bg-[#0d0d13]">
                            <h3 class="font-bold text-xs text-white truncate">${anime.title}</h3>
                            <p class="text-[10px] text-zinc-500 mt-0.5 font-mono">Ep ${Math.floor(Math.random() * 12) + 1} • ${24 - Math.floor((progress/100)*24)}m left</p>
                        </div>
                    </div>
                `;
            });
        }
    }

    // --- 9. BENTO BOX MINI-LISTS RENDERER ---
    function buildMiniList(url, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return Promise.resolve();
        
        return kitsuFetch(url).then(jsonResponse => {
            // Unpack Kitsu JSON:API list (inside jsonResponse.data or nested jsonResponse.data.data)
            const animeList = jsonResponse?.data?.data || jsonResponse?.data || [];
            const list = (Array.isArray(animeList) ? animeList : []).map(normalizeKitsuAnime).filter(Boolean).slice(0, 5);
            container.innerHTML = ""; 
            
            list.forEach((anime, index) => {
                const row = document.createElement("div");
                if (index === 0) {
                    row.className = "relative rounded-xl overflow-hidden cursor-pointer group border border-zinc-800 hover:border-[#ff4a3d] transition-all shadow-lg";
                    row.innerHTML = `
                        <div class="w-full aspect-video relative overflow-hidden bg-zinc-900">
                            <img src="${anime.banner || anime.poster}" alt="${anime.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
                            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d13] via-black/40 to-transparent"></div>
                            <div class="absolute bottom-0 left-0 p-4 w-full">
                                <div class="flex items-center gap-2 text-[10px] font-black text-[#ff8276] mb-1 uppercase tracking-widest font-mono">
                                    ★ ${anime.score} <span>•</span> #1 Rank
                                </div>
                                <h4 class="text-sm md:text-base font-black text-white line-clamp-1 group-hover:text-indigo-300 transition">${anime.title}</h4>
                            </div>
                        </div>
                    `;
                } else {
                    row.className = "flex items-center gap-3.5 bg-[#0d0d13] p-2.5 rounded-xl cursor-pointer transition-all border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 group overflow-hidden relative";
                    row.innerHTML = `
                        <div class="w-12 h-16 rounded-md overflow-hidden shrink-0 shadow-md bg-zinc-900">
                            <img src="${anime.poster}" alt="${anime.title}" class="w-full h-full object-cover group-hover:scale-110 transition duration-300" loading="lazy">
                        </div>
                        <div class="flex-1 overflow-hidden transition-transform duration-300 group-hover:-translate-y-0.5">
                            <h4 class="text-xs md:text-sm font-bold text-zinc-200 group-hover:text-white truncate">${anime.title}</h4>
                            <div class="flex items-center gap-2 mt-1.5 text-[10px] font-bold font-mono">
                                <span class="bg-[#ff4a3d]/15 text-[#ff8276] border border-[#ff4a3d]/25 px-1.5 py-0.5 rounded">${anime.type}</span>
                                <span class="text-zinc-500">★ ${anime.score}</span>
                            </div>
                        </div>
                        <div class="absolute right-2.5 bottom-2.5 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                            <div class="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition shadow-lg">
                                <svg class="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                        </div>
                    `;
                }
                row.addEventListener("click", () => window.location.href = `info.html?id=${anime.id}`);
                container.appendChild(row);
            });
        }).catch(() => {
            container.innerHTML = `<p class="text-[11px] text-zinc-500 py-4 text-center font-mono">Feed temporarily unavailable</p>`;
        });
    }

    // --- 10. CATEGORY & FILTER SYNTAX TRANSLATION ---
    const GENRE_MAP = {
        '1': 'action',
        '2': 'adventure',
        '4': 'comedy',
        '8': 'drama',
        '10': 'fantasy',
        '22': 'romance',
        '24': 'science-fiction'
    };

    const STATUS_MAP = {
        'airing': 'current',
        'complete': 'finished',
        'upcoming': 'upcoming'
    };

    function buildKitsuQueryUrl(params = {}, page = 1) {
        const offset = (page - 1) * PAGE_LIMIT;
        let url = `https://kitsu.io/api/edge/anime?page[limit]=${PAGE_LIMIT}&page[offset]=${offset}`;

        // Text search
        if (params.q) {
            url += `&filter[text]=${encodeURIComponent(params.q)}`;
        }

        // Subtype (TV, Movie, OVA, Special)
        if (params.type) {
            url += `&filter[subtype]=${encodeURIComponent(params.type.toLowerCase())}`;
        }

        // Categories / Genres
        if (params.genre) {
            const cat = GENRE_MAP[params.genre] || params.genre.toLowerCase();
            url += `&filter[categories]=${encodeURIComponent(cat)}`;
        }

        // Status (Current, Finished, Upcoming)
        if (params.status) {
            const st = STATUS_MAP[params.status] || params.status.toLowerCase();
            url += `&filter[status]=${encodeURIComponent(st)}`;
        }

        // Sort ordering
        if (params.sort === 'score') {
            url += `&sort=-averageRating`;
        } else if (params.sort === 'popularity') {
            url += `&sort=-userCount`;
        } else {
            // Default sort: Popularity
            url += `&sort=-userCount`;
        }

        return url;
    }

    // --- 11. MASTER CATALOG QUERY & PAGINATION ROUTER ---
    function fetchCatalog(queryUrl, page = 1, shouldInitSpotlight = false) {
        currentKitsuQuery = queryUrl;
        currentPageIndex = page;

        if (animeGrid) {
            animeGrid.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-center">
                    <div class="w-9 h-9 border-2 border-[#ff4a3d] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p class="text-zinc-400 font-mono text-xs tracking-wider uppercase">Loading database...</p>
                </div>
            `;
        }

        kitsuFetch(queryUrl)
            .then(jsonResponse => {
                // Ensure array mapping whether list is in data or nested data.data
                const animeList = jsonResponse?.data?.data || jsonResponse?.data || [];
                const list = (Array.isArray(animeList) ? animeList : []).map(normalizeKitsuAnime).filter(Boolean);
                
                if (shouldInitSpotlight && list.length > 0) {
                    initSpotlight(list);
                }
                
                renderGrid(list);

                // Compute pagination from Kitsu meta.count
                const totalCount = jsonResponse?.meta?.count || list.length;
                const totalPages = Math.min(Math.ceil(totalCount / PAGE_LIMIT), 25);
                renderPagination(totalPages, page);
            })
            .catch(err => {
                console.error("Kitsu catalog fetch failure:", err);
                if (animeGrid) {
                    animeGrid.innerHTML = `
                        <div class="col-span-full py-14 px-6 text-center flex flex-col items-center justify-center bg-zinc-900/30 rounded-2xl border border-zinc-800">
                            <div class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </div>
                            <h3 class="text-white font-bold text-sm md:text-base mb-1">Catalog Connection Interrupted</h3>
                            <p class="text-zinc-400 text-xs max-w-md mb-4">Unable to retrieve titles from Kitsu. Please check your connection and click below.</p>
                            <button onclick="window.retryLastFetch()" class="px-5 py-2 rounded-xl bg-[#ff4a3d] hover:bg-[#e03d31] text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-[#ff4a3d]/30">
                                Retry Connection
                            </button>
                        </div>
                    `;
                }
            });
    }

    window.retryLastFetch = function() {
        if (currentKitsuQuery) {
            fetchCatalog(currentKitsuQuery, currentPageIndex);
        }
    };

    // --- 12. ADVANCED SEARCH & FILTER EXECUTION ---
    function executeAdvancedSearch(baseQuery = null) {
        if (!animeGrid) return;
        
        const searchInput = document.getElementById("search-input");
        const searchVal = searchInput?.value.trim();
        const query = baseQuery !== null ? baseQuery : searchVal;
        
        if (searchInput && baseQuery !== null) {
            searchInput.value = baseQuery;
        }

        const typeEl = document.getElementById('filter-type');
        const genreEl = document.getElementById('filter-genre');
        const statusEl = document.getElementById('filter-status');
        const sortEl = document.getElementById('filter-sort');
        
        const searchParams = {
            q: query || undefined,
            type: typeEl?.value || undefined,
            genre: genreEl?.value || undefined,
            status: statusEl?.value || undefined,
            sort: sortEl?.value || undefined
        };

        if (gridHeader) {
            gridHeader.textContent = query ? `Search: "${query}"` : "Filtered Catalog";
        }

        const queryUrl = buildKitsuQueryUrl(searchParams, 1);
        fetchCatalog(queryUrl, 1, false);
    }

    // Attach listeners on pages featuring the animeGrid catalog (e.g., home.html)
    if (animeGrid) {
        document.getElementById("search-btn")?.addEventListener("click", (e) => { 
            e.preventDefault(); 
            executeAdvancedSearch(); 
        });
        
        document.getElementById("search-input")?.addEventListener("keypress", (e) => { 
            if (e.key === "Enter") { 
                e.preventDefault(); 
                executeAdvancedSearch(); 
            } 
        });
        
        document.getElementById('apply-filters-btn')?.addEventListener("click", (e) => { 
            e.preventDefault(); 
            executeAdvancedSearch(); 
        });

        // Instant filter refresh on dropdown change
        ['filter-type', 'filter-genre', 'filter-status', 'filter-sort'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                executeAdvancedSearch();
            });
        });
    }

    // --- 13. PAGINATION CONTROLS ---
    function renderPagination(totalPages, currentPage) {
        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = "";
            return;
        }

        let html = "";
        const btnBase = "w-10 h-10 flex items-center justify-center rounded-xl font-bold text-xs cursor-pointer transition-all";
        const btnActive = `${btnBase} bg-[#ff4a3d] text-white shadow-lg shadow-[#ff4a3d]/30`;
        const btnInactive = `${btnBase} bg-[#14141c] border border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        if (currentPage <= 2) {
            endPage = Math.min(5, totalPages);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button onclick="window.goToPage(${i})" class="${i === currentPage ? btnActive : btnInactive}">${i}</button>`;
        }
        paginationContainer.innerHTML = html;
    }

    window.goToPage = function(page) {
        if (!currentKitsuQuery) return;
        // Replace offset in existing query
        const offset = (page - 1) * PAGE_LIMIT;
        const newUrl = currentKitsuQuery.replace(/page\[offset\]=\d+/, `page[offset]=${offset}`);
        fetchCatalog(newUrl, page, false);
        window.scrollTo({ top: document.getElementById('grid-header')?.offsetTop - 100 || 0, behavior: 'smooth' });
    };

    // --- 14. INITIALIZATION & ROUTING ---
    renderContinueWatching();
    
    // Always fetch trending spotlight on home page load
    if (heroBanner) {
        kitsuFetch("https://kitsu.io/api/edge/trending/anime?limit=8")
            .then(jsonResponse => {
                const animeList = jsonResponse?.data?.data || jsonResponse?.data || [];
                const list = (Array.isArray(animeList) ? animeList : []).map(normalizeKitsuAnime).filter(Boolean);
                if (list.length > 0) initSpotlight(list);
            })
            .catch(() => {
                // Spotlight fallback
                kitsuFetch("https://kitsu.io/api/edge/anime?sort=-userCount&page[limit]=5")
                    .then(jsonResponse => {
                        const animeList = jsonResponse?.data?.data || jsonResponse?.data || [];
                        const list = (Array.isArray(animeList) ? animeList : []).map(normalizeKitsuAnime).filter(Boolean);
                        if (list.length > 0) initSpotlight(list);
                    })
                    .catch(e => console.error("Spotlight fallback error:", e));
            });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const params = {
        q: urlParams.get('q'),
        view: urlParams.get('view'),
        type: urlParams.get('type'),
        genreId: urlParams.get('genre_id') || urlParams.get('genres'),
        status: urlParams.get('status'),
        letter: urlParams.get('letter'),
        sort: urlParams.get('sort')
    };

    if (animeGrid && gridHeader) {
        const prefill = (id, value) => {
            const el = document.getElementById(id);
            if (el && value) el.value = value;
        };
        prefill('search-input', params.q);
        prefill('filter-type', params.type);
        prefill('filter-genre', params.genreId);
        prefill('filter-status', params.status);
        prefill('filter-sort', params.sort);

        // A. Surprise Me / Random Title Handler
        if (params.view === 'shuffle') {
            gridHeader.textContent = "Selecting Random Anime...";
            animeGrid.innerHTML = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center text-center">
                    <div class="w-12 h-12 border-3 border-[#ff4a3d] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p class="text-white font-bold text-sm mb-1">Rolling the catalog dice...</p>
                    <p class="text-zinc-500 text-xs">Finding a surprise title for you</p>
                </div>
            `;
            const randomOffset = Math.floor(Math.random() * 150);
            kitsuFetch(`https://kitsu.io/api/edge/anime?sort=-userCount&page[limit]=1&page[offset]=${randomOffset}`)
                .then(res => {
                    const animeList = res?.data?.data || res?.data || [];
                    const randomItem = Array.isArray(animeList) ? animeList[0] : null;
                    const randomId = randomItem?.id;
                    if (randomId) {
                        window.location.href = `info.html?id=${randomId}`;
                    } else {
                        gridHeader.textContent = "Trending Now";
                        fetchCatalog(buildKitsuQueryUrl({}, 1), 1, false);
                    }
                })
                .catch(() => {
                    fetchCatalog(buildKitsuQueryUrl({}, 1), 1, false);
                });
        }
        // B. Query & Filter Parameters Passed
        else if (params.q || params.status || params.type || params.genreId) {
            executeAdvancedSearch(params.q || null);
        }
        // C. Alphabetical A-Z Browsing
        else if (params.letter) {
            gridHeader.textContent = `Starts with "${params.letter === '1' ? '#' : params.letter.toUpperCase()}"`;
            const letterQuery = buildKitsuQueryUrl({ q: params.letter === '1' ? '1' : params.letter }, 1);
            fetchCatalog(letterQuery, 1, false);
        }
        // D. Category Views: Newly Released & Ongoing
        else if (params.view === 'new' || params.view === 'ongoing') {
            gridHeader.textContent = params.view === 'ongoing' ? "Currently Airing" : "Newly Released";
            const airingUrl = `https://kitsu.io/api/edge/anime?filter[status]=current&sort=-userCount&page[limit]=${PAGE_LIMIT}&page[offset]=0`;
            fetchCatalog(airingUrl, 1, false);
        }
        // E. Category View: Upcoming
        else if (params.view === 'upcoming') {
            gridHeader.textContent = "Upcoming Releases";
            const upcomingUrl = `https://kitsu.io/api/edge/anime?filter[status]=upcoming&sort=-startDate&page[limit]=${PAGE_LIMIT}&page[offset]=0`;
            fetchCatalog(upcomingUrl, 1, false);
        }
        // F. Category View: Popular
        else if (params.view === 'popular') {
            gridHeader.textContent = "Most Popular";
            const popularUrl = `https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=${PAGE_LIMIT}&page[offset]=0`;
            fetchCatalog(popularUrl, 1, false);
        }
        // G. Default Dashboard View (Trending)
        else {
            gridHeader.textContent = "Trending Now";
            const defaultUrl = buildKitsuQueryUrl({}, 1);
            fetchCatalog(defaultUrl, 1, false);
        }
    }

    // --- 15. SECONDARY BENTO MINI-LISTS ---
    const loadBentoFeeds = async () => {
        try {
            buildMiniList("https://kitsu.io/api/edge/anime?filter[status]=current&sort=-userCount&page[limit]=5", "col-airing");
            buildMiniList("https://kitsu.io/api/edge/anime?filter[status]=upcoming&sort=-startDate&page[limit]=5", "col-upcoming");
            buildMiniList("https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=5", "col-popular");
        } catch (e) {
            console.error("Error loading secondary bento feeds:", e);
        }
    };
    
    if (document.getElementById('col-airing')) {
        loadBentoFeeds();
    }
});

// --- 16. MODAL ANIMATION & FORMSPREE SUBMISSION CONTROLS ---
window.openBugModal = function() {
    const modal = document.getElementById('bug-modal');
    const content = document.getElementById('bug-modal-content');
    if (!modal || !content) return;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);
};

window.closeBugModal = function() {
    const modal = document.getElementById('bug-modal');
    const content = document.getElementById('bug-modal-content');
    if (!modal || !content) return;
    
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

// --- 17. THEME TOGGLE ENGINE ---
const THEME_KEY = 'animeTheme';
try {
    if (localStorage.getItem(THEME_KEY) === 'light') {
        document.body.classList.add('light-mode');
    }
} catch (error) {
    /* Storage unavailable */
}

const toggle = document.getElementById('theme-toggle');
if (toggle) {
    toggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = isLight ? '🌙' : '☀️';
        try { 
            localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); 
        } catch (error) {
            /* Storage unavailable */
        }
    });
}

// --- 18. SEAMLESS FORMSPREE SUBMISSION (No Page Redirects) ---
const bugForm = document.getElementById('bug-form');
if (bugForm) {
    bugForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        const formData = new FormData(bugForm);
        const submitBtn = bugForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : "Send Request";
        if (submitBtn) {
            submitBtn.textContent = "Sending...";
            submitBtn.disabled = true;
        }
        
        fetch(bugForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                alert("Thank you! Your request has been sent successfully.");
                bugForm.reset();
                closeBugModal();
            } else {
                alert("Oops! There was a problem submitting your request.");
            }
        }).catch(() => {
            alert("Network error. Please try again later.");
        }).finally(() => {
            if (submitBtn) {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    });
}

/**
 * Anime.TV — Core Application Script (2026 Edition)
 * Handles Jikan API v4 queries, Spotlight Carousel, Bento Columns,
 * Search Routing, Rate-Limit Resilient Fetching & Client State.
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

    // --- 2. DOM ELEMENT REFERENCES ---
    const animeGrid = document.getElementById("anime-grid");
    const gridHeader = document.getElementById("grid-header");
    const heroTitle = document.getElementById("hero-title");
    const heroDesc = document.getElementById("hero-desc");
    const heroBanner = document.getElementById("hero-banner");
    const heroPlayBtn = document.getElementById("hero-play-btn");
    const paginationContainer = document.getElementById("pagination-container");
    let currentApiUrl = "";

    // --- 3. RESILIENT API CLIENT WITH CACHE & 429 BACKOFF ---
    const CACHE_KEY_PREFIX = 'anime_api_cache_';
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute client cache

    async function apiFetch(url, retries = 2, delayMs = 1400) {
        // A. Attempt to read from session storage cache
        try {
            const cachedItem = sessionStorage.getItem(CACHE_KEY_PREFIX + url);
            if (cachedItem) {
                const parsed = JSON.parse(cachedItem);
                if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
                    return parsed.payload;
                }
            }
        } catch (e) {
            /* SessionStorage unavailable or restricted */
        }

        // B. Network Fetch with Rate-Limit Handling
        try {
            const res = await fetch(url);

            if (res.status === 429) {
                if (retries > 0) {
                    console.warn(`[Jikan API] HTTP 429 Rate Limit hit. Retrying in ${delayMs}ms... (${retries} retries left)`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return apiFetch(url, retries - 1, delayMs * 1.5);
                }
                throw { status: 429, message: "Jikan API Rate Limit (3 req/sec exceeded)." };
            }

            if (!res.ok) {
                if (res.status >= 500 && retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return apiFetch(url, retries - 1, delayMs);
                }
                throw { status: res.status, message: res.statusText };
            }

            const data = await res.json();

            // C. Write to session cache on success
            try {
                sessionStorage.setItem(CACHE_KEY_PREFIX + url, JSON.stringify({
                    timestamp: Date.now(),
                    payload: data
                }));
            } catch (e) {
                /* Cache quota exceeded; proceed gracefully */
            }

            return data;
        } catch (err) {
            if (retries > 0 && (!err.status || err.status >= 500)) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return apiFetch(url, retries - 1, delayMs);
            }
            throw err;
        }
    }

    // --- 4. A-Z LIST GENERATOR ---
    const alphaIndex = document.getElementById("alpha-index");
    if (alphaIndex) {
        const letters = "All # A B C D E F G H I J K L M N O P Q R S T U V W X Y Z".split(" ");
        letters.forEach(char => {
            const a = document.createElement("a");
            a.href = char === "All" ? "home.html" : `home.html?letter=${char === '#' ? '1' : char.toLowerCase()}`;
            a.className = "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold bg-[#151518] border border-zinc-800 text-zinc-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all";
            a.textContent = char;
            alphaIndex.appendChild(a);
        });
    }

    // --- 5. SPOTLIGHT CAROUSEL ---
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

    async function renderSpotlight() {
        const anime = spotlightData[currentSpotlightIndex];
        if (!anime || !heroTitle) return; 
        
        const expectedIndex = currentSpotlightIndex;
        
        const rankDisplay = document.getElementById("spotlight-rank");
        if (rankDisplay) {
            rankDisplay.innerHTML = `<span class="text-3xl text-white">#${currentSpotlightIndex + 1}</span> <span class="pt-1">SPOTLIGHT</span>`;
        }
        
        heroTitle.textContent = anime.title;
        if (heroDesc) {
            let desc = anime.synopsis || anime.background || "No synopsis overview available yet.";
            heroDesc.textContent = desc.replace(/\[Written by MAL Rewrite\]/gi, '').trim().substring(0, 220) + "...";
        }
        
        if (heroPlayBtn) {
            heroPlayBtn.classList.remove('hidden');
            heroPlayBtn.onclick = () => window.location.href = `info.html?id=${anime.mal_id}`;
        }

        updateSpotlightControls();

        // 2026 Dark Gradient Overlay matching #050507
        const gradientOverlay = `linear-gradient(to top, #050507 8%, rgba(5,5,7,0.7) 50%, rgba(5,5,7,0.2) 100%), linear-gradient(to right, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.6) 45%, transparent 100%)`;
        const verticalFallback = anime.images?.jpg?.large_image_url || '';
        
        if (heroBanner) {
            heroBanner.style.backgroundImage = `linear-gradient(to top, #050507 10%, rgba(5,5,7,0.9) 60%, rgba(5,5,7,0.7) 100%), url('${verticalFallback}')`;
        }

        // High-Definition Poster / Backdrop Pipeline
        const hdTrailer = anime.trailer?.images?.maximum_image_url || anime.trailer?.images?.large_image_url;
        
        if (hdTrailer) {
            const img = new Image();
            img.src = hdTrailer;
            img.onload = () => {
                if (currentSpotlightIndex === expectedIndex && heroBanner) {
                    heroBanner.style.backgroundImage = `${gradientOverlay}, url('${hdTrailer}')`;
                }
            };
        } else {
            // Backup: AniList GraphQL Banner
            try {
                const aniQuery = `query($id:Int){Media(idMal:$id,type:ANIME){bannerImage}}`;
                const aniRes = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query: aniQuery, variables: { id: anime.mal_id } })
                });
                const aniData = await aniRes.json();
                const aniBanner = aniData?.data?.Media?.bannerImage;
                
                if (aniBanner) {
                    const img = new Image();
                    img.src = aniBanner;
                    img.onload = () => {
                        if (currentSpotlightIndex === expectedIndex && heroBanner) {
                            heroBanner.style.backgroundImage = `${gradientOverlay}, url('${aniBanner}')`;
                        }
                    };
                }
            } catch (e) {
                /* Fail quietly to fallback cover */
            }
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
            
            let baseClasses = "cursor-pointer rounded-[14px] overflow-hidden relative flex items-center justify-center group transition-all duration-300 w-14 h-20 md:w-16 md:h-24 shrink-0";
            if (isActive) {
                btn.className = `${baseClasses} border-[3px] border-[#ff4a3d] scale-110 shadow-[0_0_20px_rgba(255,74,61,0.5)] z-20`;
            } else {
                btn.className = `${baseClasses} border-2 border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600 z-10`;
            }

            btn.innerHTML = `
                <div class="absolute inset-0 bg-black/70 transition-all duration-300 z-10 ${isActive ? '!bg-black/0' : 'group-hover:bg-black/40'}"></div>
                <img src="${item.images?.jpg?.image_url || ''}" class="absolute inset-0 w-full h-full object-cover z-0" alt="${item.title}">
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

    // --- 6. MAIN CATALOG GRID RENDERER (Zero-Layout-Shift Hover Overlay) ---
    function renderGrid(animeList) {
        if (!animeGrid) return;
        animeGrid.innerHTML = "";
        
        if (!animeList || animeList.length === 0) {
            animeGrid.innerHTML = `
                <div class="col-span-full py-16 text-center">
                    <p class="text-zinc-500 text-sm">No titles found matching your criteria.</p>
                    <a href="home.html" class="inline-block mt-3 text-xs text-[#ff4a3d] hover:underline font-bold">Clear all filters</a>
                </div>
            `;
            return;
        }

        const uniqueAnimeList = animeList.filter((anime, index, self) => index === self.findIndex((t) => t.mal_id === anime.mal_id));

        uniqueAnimeList.forEach((anime) => {
            const wrapper = document.createElement("div");
            wrapper.className = "relative group cursor-pointer aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-[#ff4a3d] transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,74,61,0.25)] hover:-translate-y-1";
            const coverImg = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
            let shortDesc = anime.synopsis ? anime.synopsis.replace(/\[Written by MAL Rewrite\]/gi, '').trim().substring(0, 95) + "..." : "No synopsis overview available.";
            
            wrapper.innerHTML = `
                <img src="${coverImg}" alt="${anime.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy">
                
                <div class="absolute inset-0 bg-gradient-to-t from-[#050507] via-black/30 to-transparent flex flex-col justify-end p-3.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    <h3 class="font-bold text-xs md:text-sm line-clamp-1 text-white">${anime.title}</h3>
                    <p class="text-[10px] text-zinc-400 mt-0.5 font-mono">★ ${anime.score || 'N/A'} • ${anime.type || 'TV'}</p>
                </div>
                
                <div class="absolute inset-0 bg-[#050507]/90 backdrop-blur-md opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 p-4 flex flex-col justify-end">
                    <h3 class="font-black text-white text-sm line-clamp-2 mb-1">${anime.title}</h3>
                    <p class="text-[10px] text-[#ff8276] font-bold mb-2 tracking-wider uppercase font-mono">★ ${anime.score || 'N/A'} • ${anime.type || 'TV'}</p>
                    <p class="text-[11px] text-zinc-300 line-clamp-3 mb-3.5 leading-relaxed">${shortDesc}</p>
                    <div class="w-full bg-[#ff4a3d] hover:bg-[#e03d31] text-white text-center py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#ff4a3d]/25 transition">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Play Now
                    </div>
                </div>
            `;
            wrapper.addEventListener("click", () => window.location.href = `info.html?id=${anime.mal_id}`);
            animeGrid.appendChild(wrapper);
        });
    }

    // --- 7. CONTINUE WATCHING RENDERER ---
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
                    <div class="relative group cursor-pointer w-[250px] shrink-0 rounded-xl overflow-hidden border border-zinc-800 hover:border-[#ff4a3d] transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,74,61,0.2)]" onclick="window.location.href='info.html?id=${anime.mal_id}'">
                        <div class="aspect-video w-full relative overflow-hidden bg-zinc-900">
                            <img src="${anime.img}" alt="${anime.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
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

    // --- 8. BENTO BOX MINI-LISTS RENDERER ---
    function buildMiniList(url, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return Promise.resolve();
        
        return apiFetch(url).then(data => {
            const uniqueList = (data.data || []).filter((anime, index, self) => index === self.findIndex((t) => t.mal_id === anime.mal_id));
            const list = uniqueList.slice(0, 5); 
            container.innerHTML = ""; 
            
            list.forEach((anime, index) => {
                const row = document.createElement("div");
                if (index === 0) {
                    row.className = "relative rounded-xl overflow-hidden cursor-pointer group border border-zinc-800 hover:border-[#ff4a3d] transition-all shadow-lg";
                    const bannerImg = anime.trailer?.images?.maximum_image_url || anime.images?.jpg?.large_image_url;
                    row.innerHTML = `
                        <div class="w-full aspect-video relative overflow-hidden bg-zinc-900">
                            <img src="${bannerImg}" alt="${anime.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
                            <div class="absolute inset-0 bg-gradient-to-t from-[#0d0d13] via-black/40 to-transparent"></div>
                            <div class="absolute bottom-0 left-0 p-4 w-full">
                                <div class="flex items-center gap-2 text-[10px] font-black text-[#ff8276] mb-1 uppercase tracking-widest font-mono">
                                    ★ ${anime.score || 'N/A'} <span>•</span> #1 Rank
                                </div>
                                <h4 class="text-sm md:text-base font-black text-white line-clamp-1 group-hover:text-indigo-300 transition">${anime.title}</h4>
                            </div>
                        </div>
                    `;
                } else {
                    row.className = "flex items-center gap-3.5 bg-[#0d0d13] p-2.5 rounded-xl cursor-pointer transition-all border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 group overflow-hidden relative";
                    row.innerHTML = `
                        <div class="w-12 h-16 rounded-md overflow-hidden shrink-0 shadow-md bg-zinc-900">
                            <img src="${anime.images?.jpg?.image_url}" alt="${anime.title}" class="w-full h-full object-cover group-hover:scale-110 transition duration-300" loading="lazy">
                        </div>
                        <div class="flex-1 overflow-hidden transition-transform duration-300 group-hover:-translate-y-0.5">
                            <h4 class="text-xs md:text-sm font-bold text-zinc-200 group-hover:text-white truncate">${anime.title}</h4>
                            <div class="flex items-center gap-2 mt-1.5 text-[10px] font-bold font-mono">
                                <span class="bg-[#ff4a3d]/15 text-[#ff8276] border border-[#ff4a3d]/25 px-1.5 py-0.5 rounded">${anime.type || 'TV'}</span>
                                <span class="text-zinc-500">★ ${anime.score || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="absolute right-2.5 bottom-2.5 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                            <div class="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition shadow-lg">
                                <svg class="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                        </div>
                    `;
                }
                row.addEventListener("click", () => window.location.href = `info.html?id=${anime.mal_id}`);
                container.appendChild(row);
            });
        }).catch((err) => {
            let msg = err.status === 429 ? "Rate limited (Jikan 3/s)" : "Data temporarily unavailable";
            container.innerHTML = `<p class="text-[11px] text-zinc-500 py-4 text-center font-mono">${msg}</p>`;
        });
    }

    // --- 9. MASTER FETCH & PAGINATION ROUTER ---
    function fetchAnimeData(baseApiUrl, page = 1) {
        currentApiUrl = baseApiUrl; 
        
        let finalUrl = baseApiUrl;
        if (page > 1) {
            const separator = baseApiUrl.includes('?') ? '&' : '?';
            finalUrl = `${baseApiUrl}${separator}page=${page}`;
        }

        if (animeGrid) {
            animeGrid.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-center">
                    <div class="w-9 h-9 border-2 border-[#ff4a3d] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p class="text-zinc-400 font-mono text-xs tracking-wider uppercase">Loading database...</p>
                </div>
            `;
        }

        apiFetch(finalUrl)
            .then(data => {
                const list = data?.data || [];
                if (page === 1 && list.length > 0) initSpotlight(list);
                renderGrid(list);
                renderPagination(data?.pagination, page);
            })
            .catch((err) => {
                let errorTitle = "Unable to load titles";
                let errorDesc = "Please check your network connection and try again.";
                
                if (err.status === 429) {
                    errorTitle = "Rate limit reached (Jikan API)";
                    errorDesc = "Jikan allows 3 requests per second. Click 'Try Again' in a moment.";
                } else if (err.status >= 500) {
                    errorTitle = "MyAnimeList upstream timed out";
                    errorDesc = "The external catalog server is under heavy load. Please retry in a few moments.";
                }
                
                if (animeGrid) {
                    animeGrid.innerHTML = `
                        <div class="col-span-full py-14 px-6 text-center flex flex-col items-center justify-center bg-zinc-900/30 rounded-2xl border border-zinc-800">
                            <div class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-3">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                            </div>
                            <h3 class="text-white font-bold text-sm md:text-base mb-1">${errorTitle}</h3>
                            <p class="text-zinc-400 text-xs max-w-md mb-4">${errorDesc}</p>
                            <button onclick="window.retryLastFetch()" class="px-5 py-2 rounded-xl bg-[#ff4a3d] hover:bg-[#e03d31] text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-[#ff4a3d]/30">
                                Try Again
                            </button>
                        </div>
                    `;
                }
            });
    }

    window.retryLastFetch = function() {
        if (currentApiUrl) fetchAnimeData(currentApiUrl, 1);
    };

    // --- 10. ADVANCED SEARCH & FILTER EXECUTION ---
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
        
        let url = `https://api.jikan.moe/v4/anime?sfw`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        if (typeEl?.value) url += `&type=${typeEl.value}`;
        if (genreEl?.value) url += `&genres=${genreEl.value}`;
        if (statusEl?.value) url += `&status=${statusEl.value}`;
        
        if (sortEl?.value === 'score') {
            url += `&order_by=score&sort=desc`;
        } else if (sortEl?.value === 'popularity') {
            url += `&order_by=popularity&sort=desc`;
        } else {
            url += `&order_by=popularity&sort=desc`;
        }

        if (gridHeader) {
            gridHeader.textContent = query ? `Search: "${query}"` : "Filtered Catalog";
        }
        fetchAnimeData(url, 1);
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

    // --- 11. PAGINATION CONTROLS ---
    function renderPagination(paginationData, currentPage) {
        if (!paginationContainer || !paginationData?.last_visible_page || paginationData.last_visible_page <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = "";
            return;
        }

        let html = "";
        const btnBase = "w-10 h-10 flex items-center justify-center rounded-xl font-bold text-xs cursor-pointer transition-all";
        const btnActive = `${btnBase} bg-[#ff4a3d] text-white shadow-lg shadow-[#ff4a3d]/30`;
        const btnInactive = `${btnBase} bg-[#14141c] border border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(paginationData.last_visible_page, currentPage + 2);
        
        if (currentPage <= 2) {
            endPage = Math.min(5, paginationData.last_visible_page);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button onclick="window.goToPage(${i})" class="${i === currentPage ? btnActive : btnInactive}">${i}</button>`;
        }
        paginationContainer.innerHTML = html;
    }

    window.goToPage = function(page) {
        fetchAnimeData(currentApiUrl, page);
        window.scrollTo({ top: document.getElementById('grid-header')?.offsetTop - 100 || 0, behavior: 'smooth' });
    };

    // --- 12. INITIALIZATION & QUERY PARAMETER ROUTING ---
    renderContinueWatching();
    
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
            apiFetch("https://api.jikan.moe/v4/random/anime")
                .then(res => {
                    const randomId = res?.data?.mal_id;
                    if (randomId) {
                        window.location.href = `info.html?id=${randomId}`;
                    } else {
                        gridHeader.textContent = "Trending Now";
                        fetchAnimeData("https://api.jikan.moe/v4/top/anime");
                    }
                })
                .catch(() => {
                    apiFetch("https://api.jikan.moe/v4/top/anime")
                        .then(res => {
                            const list = res?.data || [];
                            if (list.length > 0) {
                                const pick = list[Math.floor(Math.random() * list.length)];
                                window.location.href = `info.html?id=${pick.mal_id}`;
                            } else {
                                fetchAnimeData("https://api.jikan.moe/v4/top/anime");
                            }
                        })
                        .catch(() => {
                            fetchAnimeData("https://api.jikan.moe/v4/top/anime");
                        });
                });
        }
        // B. Query & Filter Parameters Passed
        else if (params.q || params.status || params.type || params.genreId) {
            executeAdvancedSearch(params.q || null);
        }
        // C. Alphabetical A-Z Browsing
        else if (params.letter) {
            gridHeader.textContent = `Starts with "${params.letter === '1' ? '#' : params.letter.toUpperCase()}"`;
            fetchAnimeData(`https://api.jikan.moe/v4/anime?letter=${params.letter}&order_by=popularity&sort=asc`);
        }
        // D. Category Views: Newly Released & Ongoing
        else if (params.view === 'new' || params.view === 'ongoing') {
            gridHeader.textContent = params.view === 'ongoing' ? "Currently Airing" : "Newly Released";
            fetchAnimeData("https://api.jikan.moe/v4/seasons/now");
        }
        // E. Category View: Upcoming
        else if (params.view === 'upcoming') {
            gridHeader.textContent = "Upcoming Releases";
            fetchAnimeData("https://api.jikan.moe/v4/seasons/upcoming");
        }
        // F. Category View: Popular
        else if (params.view === 'popular') {
            gridHeader.textContent = "Most Popular";
            fetchAnimeData("https://api.jikan.moe/v4/top/anime?filter=bypopularity");
        }
        // G. Default Dashboard View
        else {
            gridHeader.textContent = "Trending Now";
            fetchAnimeData("https://api.jikan.moe/v4/top/anime");
        }
    }

    // --- 13. STAGGERED SEQUENTIAL BENTO MINI-LISTS ---
    const loadMiniListsSequentially = async () => {
        try {
            // Initial delay allows Spotlight + Trending main request to clear first
            await new Promise(resolve => setTimeout(resolve, 1400)); 
            await buildMiniList("https://api.jikan.moe/v4/seasons/now", "col-airing");
            
            await new Promise(resolve => setTimeout(resolve, 1200)); 
            await buildMiniList("https://api.jikan.moe/v4/seasons/upcoming", "col-upcoming");
            
            await new Promise(resolve => setTimeout(resolve, 1200)); 
            await buildMiniList("https://api.jikan.moe/v4/top/anime", "col-popular");
        } catch (e) {
            console.error("Error loading secondary bento feeds:", e);
        }
    };
    
    if (document.getElementById('col-airing')) {
        loadMiniListsSequentially();
    }
});

// --- 14. MODAL ANIMATION & FORMSPREE SUBMISSION CONTROLS ---
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

// --- 15. THEME TOGGLE ENGINE ---
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

// --- 16. SEAMLESS FORMSPREE SUBMISSION (No Page Redirects) ---
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

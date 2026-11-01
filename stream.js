/**
 * Anime.TV — Stream & Details Logic (2026 Kitsu API Engine)
 * Handles anime detail rendering, high-res posters, YouTube trailers,
 * character roster, and external streaming server modal.
 */

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');

    // --- 1. MODAL CONTROLS ---
    const serverModal = document.getElementById('server-modal');

    window.openServerModal = function() {
        if (!serverModal) return;
        serverModal.classList.remove('hidden');
        document.documentElement.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => serverModal.classList.remove('opacity-0'));
        });
    };

    window.closeServerModal = function() {
        if (!serverModal) return;
        serverModal.classList.add('opacity-0');
        setTimeout(() => {
            serverModal.classList.add('hidden');
            document.documentElement.style.overflow = '';
        }, 300);
    };

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !serverModal || serverModal.classList.contains('hidden')) return;
        window.closeServerModal();
    });

    const titleEl = document.getElementById('anime-title');
    const descEl = document.getElementById('anime-desc');
    const badgesEl = document.getElementById('anime-badges');
    const cover = document.getElementById('anime-cover');
    const trailerContainer = document.getElementById('trailer-container');
    const castContainer = document.getElementById('cast-list');
    const actionButtons = document.getElementById('action-buttons');
    const backdrop = document.getElementById('backdrop-container');

    if (!animeId) {
        if (titleEl) titleEl.textContent = "No title selected";
        if (descEl) descEl.textContent = "Open a title from the catalog to see its synopsis, cast and streaming sources.";
        if (badgesEl) badgesEl.innerHTML = `<span class="chip">Nothing loaded</span>`;
        if (castContainer) castContainer.innerHTML = `<p class="detail-note">PICK A TITLE FIRST</p>`;
        if (trailerContainer) {
            trailerContainer.innerHTML = `
                <div class="trailer-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="m10 8 6 4-6 4V8Z"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>
                    NO TITLE SELECTED
                </div>`;
        }
        return;
    }

    // --- 2. KITSU API ENDPOINTS ---
    const ANIME_API = `https://kitsu.io/api/edge/anime/${animeId}`;
    const CAST_API = `https://kitsu.io/api/edge/anime-characters?filter[animeId]=${animeId}&include=character&page[limit]=6`;

    let animeTitle = "";

    try {
        const [animeRes, castRes] = await Promise.all([
            fetch(ANIME_API, {
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json'
                }
            }),
            fetch(CAST_API, {
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json'
                }
            })
        ]);

        if (!animeRes.ok) throw new Error("Anime API not found");

        const animeJson = await animeRes.json();
        let castJson = { included: [] };
        if (castRes.ok) {
            try { castJson = await castRes.json(); } catch (e) {}
        }

        const rawData = animeJson?.data?.data || animeJson?.data || animeJson;
        const attr = rawData?.attributes || rawData;
        if (!attr) throw new Error("Malformed anime data");

        animeTitle = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp || "Untitled Anime";
        document.title = `${animeTitle} — Anime.TV`;
        
        if (titleEl) titleEl.textContent = animeTitle;
        if (descEl) descEl.textContent = attr.synopsis || attr.description || "No synopsis available.";

        const coverUrl = attr.posterImage?.large || attr.posterImage?.original || attr.posterImage?.medium || '';
        if (cover) {
            cover.alt = `${animeTitle} poster`;
            cover.onload = () => cover.classList.remove('hidden');
            cover.onerror = () => {
                cover.classList.add('hidden');
                cover.removeAttribute('src');
            };
            if (coverUrl) {
                cover.src = coverUrl;
                if (cover.complete && cover.naturalWidth > 0) cover.classList.remove('hidden');
            } else {
                cover.classList.add('hidden');
            }
        }

        const backdropUrl = attr.coverImage?.large || attr.coverImage?.original || coverUrl;
        if (backdrop && backdropUrl) {
            backdrop.style.backgroundImage = `url('${backdropUrl}')`;
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
        }

        // Badges mapping
        const chips = [];
        if (attr.averageRating) {
            const score = (parseFloat(attr.averageRating) / 10).toFixed(1);
            chips.push(`<span class="chip chip-accent">★ ${score}</span>`);
        }
        if (attr.ageRating) chips.push(`<span class="chip">${attr.ageRating}</span>`);
        if (attr.subtype) chips.push(`<span class="chip">${attr.subtype.toUpperCase()}</span>`);
        if (attr.startDate) chips.push(`<span class="chip">${attr.startDate.slice(0, 4)}</span>`);
        if (attr.episodeCount) chips.push(`<span class="chip">${attr.episodeCount} ep</span>`);
        if (attr.status) chips.push(`<span class="chip">${attr.status}</span>`);

        if (badgesEl) {
            badgesEl.innerHTML = chips.join('') || `<span class="chip">Unrated</span>`;
        }

        if (actionButtons) actionButtons.classList.remove('hidden');

        // Watch Now button linking to player.html
        const playBtn = actionButtons?.querySelector('a[href*="player.html"]');
        if (playBtn) {
            playBtn.href = `player.html?id=${animeId}&title=${encodeURIComponent(animeTitle)}`;
        }

        // YouTube Trailer Embed
        if (trailerContainer) {
            if (attr.youtubeVideoId) {
                trailerContainer.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${attr.youtubeVideoId}?autoplay=0&controls=1&modestbranding=1"
                            title="${animeTitle} trailer"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowfullscreen class="w-full h-full rounded-2xl"></iframe>`;
            } else {
                trailerContainer.innerHTML = `
                    <div class="trailer-placeholder flex flex-col items-center justify-center text-zinc-500 py-16">
                        <svg class="w-10 h-10 mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m10 8 6 4-6 4V8Z"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>
                        <p class="text-xs font-mono tracking-wider uppercase">Official Trailer Unavailable</p>
                    </div>`;
            }
        }

        // Character Cast Roster
        if (castContainer) {
            const characters = castJson.included || [];
            if (characters.length === 0) {
                castContainer.innerHTML = `<p class="detail-note">CAST INFORMATION UNAVAILABLE</p>`;
            } else {
                castContainer.innerHTML = characters.slice(0, 5).map(c => {
                    const charName = c.attributes?.canonicalName || c.attributes?.name || "Character";
                    const charImg = c.attributes?.image?.original || c.attributes?.image?.large || '';
                    return `
                        <div class="cast-row">
                            <img src="${charImg || 'start-bg.jpg'}" alt="${charName}" class="cast-avatar" loading="lazy">
                            <div class="cast-copy">
                                <h3 class="cast-name">${charName}</h3>
                                <p class="cast-va">Character</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // 3. EXTERNAL STREAMING SERVERS MODAL
        const encodedTitle = encodeURIComponent(animeTitle);
        const servers = [
            { name: "HiAnime", url: `https://hianime.to/search?keyword=${encodedTitle}` },
            { name: "GogoAnime", url: `https://gogoanime3.co/search.html?keyword=${encodedTitle}` },
            { name: "AnimePahe", url: `https://animepahe.pw/` },
            { name: "Crunchyroll", url: `https://www.crunchyroll.com/search?q=${encodedTitle}` }
        ];

        const serverGrid = document.getElementById('server-grid');
        if (serverGrid) {
            serverGrid.innerHTML = '';
            servers.forEach((server, index) => {
                let host = '';
                try { host = new URL(server.url).hostname.replace(/^www\./, ''); } catch (error) { host = 'external'; }

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'server-tile';
                btn.innerHTML = `
                    <span class="server-copy">
                        <span class="server-index">${String(index + 1).padStart(2, '0')} / EXTERNAL</span>
                        <span class="server-name">${server.name}</span>
                        <span class="server-host">${host}</span>
                    </span>
                    <span class="server-arrow" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>
                    </span>
                `;
                btn.onclick = () => window.open(server.url, '_blank', 'noopener');
                serverGrid.appendChild(btn);
            });
        }

    } catch (error) {
        console.error("Stream details error:", error);
        if (titleEl) titleEl.textContent = "Title unavailable";
        if (descEl) descEl.textContent = "Could not load this title. Please check your connection and refresh.";
        if (badgesEl) badgesEl.innerHTML = `<span class="chip">Catalog Error</span>`;
        if (castContainer) castContainer.innerHTML = `<p class="detail-note">CAST INFORMATION UNAVAILABLE</p>`;
    }
});

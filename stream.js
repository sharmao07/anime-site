document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const jikanId = urlParams.get('id');

    // --- MODAL CONTROLS (defined up-front so the button is always live) ---
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

    if (!jikanId) {
        titleEl.textContent = "No title selected";
        descEl.textContent = "Open a title from the catalog to see its synopsis, cast and streaming sources.";
        badgesEl.innerHTML = `<span class="chip">Nothing loaded</span>`;
        const castContainer = document.getElementById('cast-list');
        if (castContainer) castContainer.innerHTML = `<p class="detail-note">PICK A TITLE FIRST</p>`;
        document.getElementById('trailer-container').innerHTML = `
            <div class="trailer-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="m10 8 6 4-6 4V8Z"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>
                NO TITLE SELECTED
            </div>`;
        return;
    }

    // --- APIs ---
    const JIKAN_API = `https://api.jikan.moe/v4/anime/${jikanId}/full`;
    const CAST_API = `https://api.jikan.moe/v4/anime/${jikanId}/characters`;

    let animeTitle = "";

    try {
        // 1. POPULATE UI
        const [animeRes, castRes] = await Promise.all([fetch(JIKAN_API), fetch(CAST_API)]);
        if (!animeRes.ok) throw new Error("Anime API rate limit");

        const animeData = await animeRes.json();
        let castData = { data: [] };
        if (castRes.ok) {
            try { castData = await castRes.json(); } catch (error) { /* keep empty fallback */ }
        }
        const anime = animeData.data;

        animeTitle = anime.title_english || anime.title || "Untitled";
        document.title = `${animeTitle} — Anime.TV`;
        titleEl.textContent = animeTitle;
        descEl.textContent = anime.synopsis || "No synopsis available.";

        const coverUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '';
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

        const backdropUrl = anime.trailer?.images?.maximum_image_url || anime.images?.jpg?.large_image_url;
        const backdrop = document.getElementById('backdrop-container');
        if (backdropUrl) {
            backdrop.style.backgroundImage = `url('${backdropUrl}')`;
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
        }

        const chips = [];
        if (anime.score) chips.push(`<span class="chip chip-accent">★ ${Number(anime.score).toFixed(1)}</span>`);
        if (anime.rating) chips.push(`<span class="chip">${anime.rating.split(' ')[0]}</span>`);
        if (anime.type) chips.push(`<span class="chip">${anime.type}</span>`);
        if (anime.year) chips.push(`<span class="chip">${anime.year}</span>`);
        if (anime.episodes) chips.push(`<span class="chip">${anime.episodes} ep</span>`);
        if (anime.status) chips.push(`<span class="chip">${anime.status}</span>`);
        badgesEl.innerHTML = chips.join('') || `<span class="chip">Unrated</span>`;

        document.getElementById('action-buttons').classList.remove('hidden');

        if (anime.trailer?.embed_url) {
            document.getElementById('trailer-container').innerHTML = `
                <iframe src="${anime.trailer.embed_url}?autoplay=0&controls=1&modestbranding=1"
                        title="${animeTitle} trailer"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowfullscreen></iframe>`;
        }

        const castContainer = document.getElementById('cast-list');
        const mainCast = castData.data ? castData.data.slice(0, 4) : [];
        if (mainCast.length === 0) {
            castContainer.innerHTML = `<p class="detail-note">CAST INFORMATION UNAVAILABLE</p>`;
        } else {
            castContainer.innerHTML = mainCast.map(c => {
                const voiceActor = c.voice_actors?.find(va => va.language === 'Japanese');
                const vaName = voiceActor ? voiceActor.person.name : "Unknown VA";
                return `
                    <div class="cast-row">
                        <img src="${c.character.images?.jpg?.image_url || ''}" alt="" class="cast-avatar" loading="lazy">
                        <div class="cast-copy">
                            <h3 class="cast-name">${c.character.name}</h3>
                            <p class="cast-va">VA · ${vaName}</p>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 2. PREPARE THE SERVERS
        const encodedTitle = encodeURIComponent(animeTitle);
        const servers = [
            { name: "HiAnime", url: `https://hianime.to/search?keyword=${encodedTitle}` },
            { name: "GogoAnime", url: `https://gogoanime3.co/search.html?keyword=${encodedTitle}` },
            { name: "AnimePahe", url: `https://animepahe.pw/` },
            { name: "Crunchyroll", url: `https://www.crunchyroll.com/search?q=${encodedTitle}` }
        ];

        const serverGrid = document.getElementById('server-grid');
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

    } catch (error) {
        titleEl.textContent = "Title unavailable";
        descEl.textContent = "The catalog could not load this title just now. It may be a temporary API limit — refresh in a moment.";
        badgesEl.innerHTML = `<span class="chip">Request failed</span>`;
        const castContainer = document.getElementById('cast-list');
        if (castContainer) castContainer.innerHTML = `<p class="detail-note">CAST INFORMATION UNAVAILABLE</p>`;
    }
});

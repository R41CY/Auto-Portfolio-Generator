/* =============================================================
   Auto Portfolio Generator — Core Application Logic
   =============================================================
   Handles: wizard navigation, project CRUD, live preview,
   portfolio template generation, and ZIP download.
   ============================================================= */

(function () {
    'use strict';

    // ── State ──────────────────────────────────────────────────
    const state = {
        currentStep: 1,
        totalSteps: 4,
        projects: [],
        nextProjectId: 1,
        theme: {
            primaryColor: '#6c63ff',
            bgColor: '#0a0a0f',
            cardColor: '#111122',
            textColor: '#ffffff'
        }
    };

    // ── DOM References ─────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        steps: $$('.step-content'),
        indicators: $$('.step-indicator'),
        lines: $$('.step-line'),
        prevBtn: $('#prev-btn'),
        nextBtn: $('#next-btn'),
        addProjectBtn: $('#add-project-btn'),
        projectsList: $('#projects-list'),
        emptyState: $('#empty-projects'),
        previewFrame: $('#preview-frame'),
        previewUrl: $('#preview-url'),
        generateBtn: $('#generate-btn'),
        generateStatus: $('#generate-status'),
        primaryColor: $('#primaryColor'),
        bgColor: $('#bgColor'),
        cardColor: $('#cardColor'),
        textColor: $('#textColor')
    };

    // ── Helpers ────────────────────────────────────────────────
    function getPersonalInfo() {
        return {
            fullName: $('#fullName').value.trim(),
            title: $('#title').value.trim(),
            bio: $('#bio').value.trim(),
            email: $('#email').value.trim(),
            phone: $('#phone').value.trim(),
            whatsapp: $('#whatsapp').value.trim(),
            linkedin: $('#linkedin').value.trim(),
            github: $('#github').value.trim(),
            instagram: $('#instagram').value.trim(),
            twitter: $('#twitter').value.trim(),
            tiktok: $('#tiktok').value.trim(),
            youtube: $('#youtube').value.trim(),
            facebook: $('#facebook').value.trim(),
            threads: $('#threads').value.trim(),
            website: $('#website').value.trim(),
            profilePhoto: $('#profilePhoto').value.trim()
        };
    }

    function escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return str.replace(/[&<>"']/g, (c) => map[c]);
    }

    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }

    // ── Save / Load from localStorage ──────────────────────────
    function saveState() {
        const info = getPersonalInfo();
        localStorage.setItem('ap_personal', JSON.stringify(info));
        localStorage.setItem('ap_projects', JSON.stringify(state.projects));
        localStorage.setItem('ap_theme', JSON.stringify(state.theme));
    }

    function loadState() {
        try {
            const info = JSON.parse(localStorage.getItem('ap_personal'));
            if (info) {
                Object.keys(info).forEach((key) => {
                    const el = $(`#${key}`);
                    if (el) el.value = info[key] || '';
                });
            }
            const projects = JSON.parse(localStorage.getItem('ap_projects'));
            if (projects && projects.length) {
                projects.forEach((p) => addProject(p));
            }
            const theme = JSON.parse(localStorage.getItem('ap_theme'));
            if (theme) {
                Object.assign(state.theme, theme);
                dom.primaryColor.value = theme.primaryColor;
                dom.bgColor.value = theme.bgColor;
                dom.cardColor.value = theme.cardColor;
                dom.textColor.value = theme.textColor;
            }
        } catch (e) { /* ignore corrupt data */ }
    }

    // ── Step Navigation ────────────────────────────────────────
    function goToStep(step) {
        if (step < 1 || step > state.totalSteps) return;

        if (step > state.currentStep && !validateStep(state.currentStep)) return;

        state.currentStep = step;

        dom.steps.forEach((s, i) => s.classList.toggle('active', i === step - 1));
        dom.indicators.forEach((ind, i) => {
            ind.classList.remove('active', 'completed');
            if (i < step - 1) ind.classList.add('completed');
            if (i === step - 1) ind.classList.add('active');
        });
        dom.lines.forEach((line, i) => line.classList.toggle('active', i < step - 1));

        dom.prevBtn.disabled = step === 1;
        const arrowSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
        dom.nextBtn.innerHTML = step === state.totalSteps ? 'Finish' : `Next ${arrowSvg}`;
        dom.nextBtn.style.visibility = step === state.totalSteps ? 'hidden' : 'visible';

        if (step === 3) updatePreview();

        saveState();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateStep(step) {
        if (step === 1) {
            const name = $('#fullName').value.trim();
            const title = $('#title').value.trim();
            if (!name || !title) {
                alert('Please fill in your Full Name and Professional Title.');
                return false;
            }
        }
        return true;
    }

    // ── Project Management ─────────────────────────────────────
    function addProject(data) {
        const id = state.nextProjectId++;
        const project = {
            id,
            projectTitle: (data && data.projectTitle) || '',
            projectTag: (data && data.projectTag) || '',
            projectDesc: (data && data.projectDesc) || '',
            mediaType: (data && data.mediaType) || 'image',
            mediaSource: (data && data.mediaSource) || ''
        };
        state.projects.push(project);
        renderProject(project);
        updateEmptyState();
        saveState();
    }

    function renderProject(project) {
        const template = $('#project-template');
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.project-card');
        card.dataset.id = project.id;
        card.querySelector('.project-number').textContent = `#${getProjectIndex(project.id) + 1}`;

        const fields = card.querySelectorAll('[data-field]');
        fields.forEach((field) => {
            const key = field.dataset.field;
            if (field.tagName === 'SELECT') {
                field.value = project[key] || field.options[0].value;
            } else {
                field.value = project[key] || '';
            }
            field.addEventListener('input', () => {
                const proj = state.projects.find((p) => p.id === project.id);
                if (proj) proj[key] = field.value;
                if (key === 'mediaType') updateMediaHint(card);
                saveState();
            });
            field.addEventListener('change', () => {
                const proj = state.projects.find((p) => p.id === project.id);
                if (proj) proj[key] = field.value;
                if (key === 'mediaType') updateMediaHint(card);
                saveState();
            });
        });

        updateMediaHint(card);

        card.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => handleProjectAction(btn.dataset.action, project.id));
        });

        dom.projectsList.appendChild(clone);
    }

    function updateMediaHint(card) {
        const typeSelect = card.querySelector('[data-field="mediaType"]');
        const hint = card.querySelector('.media-hint');
        const sourceInput = card.querySelector('[data-field="mediaSource"]');
        const driveTip = card.querySelector('.gdrive-tip');
        const hints = {
            'image': { hint: 'Paste a direct image URL (e.g. https://example.com/image.jpg)', placeholder: 'https://example.com/image.jpg' },
            'gdrive-image': { hint: 'Paste a Google Drive link or file ID', placeholder: 'https://drive.google.com/file/d/abc123/view' },
            'gdrive-video': { hint: 'Paste a Google Drive link or file ID', placeholder: 'https://drive.google.com/file/d/abc123/view' },
            'youtube': { hint: 'Paste a YouTube URL or video ID', placeholder: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
        };
        const t = typeSelect.value;
        if (hint) hint.textContent = hints[t].hint;
        if (sourceInput) sourceInput.placeholder = hints[t].placeholder;
        if (driveTip) driveTip.hidden = (t !== 'gdrive-image' && t !== 'gdrive-video');
    }

    function handleProjectAction(action, id) {
        const idx = state.projects.findIndex((p) => p.id === id);
        if (idx === -1) return;

        if (action === 'remove') {
            state.projects.splice(idx, 1);
        } else if (action === 'move-up' && idx > 0) {
            [state.projects[idx - 1], state.projects[idx]] = [state.projects[idx], state.projects[idx - 1]];
        } else if (action === 'move-down' && idx < state.projects.length - 1) {
            [state.projects[idx], state.projects[idx + 1]] = [state.projects[idx + 1], state.projects[idx]];
        }

        rebuildProjectsList();
        saveState();
    }

    function rebuildProjectsList() {
        dom.projectsList.innerHTML = '';
        state.projects.forEach((p) => renderProject(p));
        updateEmptyState();
    }

    function updateEmptyState() {
        dom.emptyState.classList.toggle('hidden', state.projects.length > 0);
    }

    function getProjectIndex(id) {
        return state.projects.findIndex((p) => p.id === id);
    }

    // ── Live Preview ───────────────────────────────────────────
    const updatePreview = debounce(function () {
        const info = getPersonalInfo();
        const html = generatePortfolioHTML(info, state.projects, state.theme, true);
        dom.previewFrame.srcdoc = html;
        const slug = info.fullName ? info.fullName.toLowerCase().replace(/\s+/g, '') : 'yourname';
        dom.previewUrl.textContent = `${slug}.github.io/portfolio`;
    }, 300);

    // ── Theme Controls ─────────────────────────────────────────
    function onThemeChange() {
        state.theme.primaryColor = dom.primaryColor.value;
        state.theme.bgColor = dom.bgColor.value;
        state.theme.cardColor = dom.cardColor.value;
        state.theme.textColor = dom.textColor.value;
        saveState();
        if (state.currentStep === 3) updatePreview();
    }

    // ═══════════════════════════════════════════════════════════
    //  PORTFOLIO TEMPLATE GENERATORS
    // ═══════════════════════════════════════════════════════════

    function generatePortfolioHTML(info, projects, theme, inline) {
        const name = escapeHtml(info.fullName || 'Your Name');
        const title = escapeHtml(info.title || 'Creative Professional');
        const bio = escapeHtml(info.bio || '');
        const photo = escapeHtml(info.profilePhoto || '');

        const safeInfo = {};
        Object.keys(info).forEach((k) => { safeInfo[k] = escapeHtml(info[k] || ''); });

        const projectCards = projects.map((p, idx) => buildProjectCard(p, idx)).join('\n            ');

        const socialLinks = buildSocialLinks(safeInfo);
        const contactCards = buildContactCards(safeInfo);

        const cssContent = generatePortfolioCSS(theme);
        const jsContent = generatePortfolioJS();

        const styleTag = inline
            ? `<style>${cssContent}</style>`
            : '<link rel="stylesheet" href="style.css">';
        // JS is always inlined to avoid Windows blocking .js files from ZIPs
        const scriptTag = `<script>${jsContent}<\/script>`;

        return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} — ${title}</title>
    <meta name="description" content="${bio || title}">
    <meta name="author" content="${name}">
    <meta property="og:title" content="${name} — ${title}">
    <meta property="og:description" content="${bio || title}">
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(theme.primaryColor)}' stroke-width='2.5'%3E%3Cpolygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/%3E%3C/svg%3E">
    ${styleTag}
</head>
<body>
    <nav class="navbar" id="navbar">
        <a href="#home" class="nav-brand">${name.split(' ')[0]}<span class="accent">.</span></a>
        <ul class="nav-links" id="nav-links">
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#portfolio">Portfolio</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
        <div class="nav-right">
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
                <svg class="icon-sun" id="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <svg class="icon-moon" id="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <button class="mobile-toggle" id="mobile-toggle" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <section id="home" class="hero">
        <div class="hero-content">
            <p class="hero-greeting">Hello, I'm</p>
            <h1 class="hero-name">${name}</h1>
            <p class="hero-title">${title}</p>
            ${bio ? `<p class="hero-bio">${bio}</p>` : ''}
            <div class="hero-cta">
                <a href="#portfolio" class="btn btn-primary">View My Work</a>
                <a href="#contact" class="btn btn-outline">Get In Touch</a>
            </div>
        </div>
        <div class="scroll-indicator">
            <span>Scroll</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
    </section>

    <section id="about" class="section about">
        <div class="container">
            <h2 class="section-title reveal">About Me</h2>
            <div class="about-grid${photo ? '' : ' no-photo'} reveal">
                ${photo ? `<div class="about-photo-wrap"><img src="${photo}" alt="${name}" class="about-photo" loading="lazy"></div>` : ''}
                <div class="about-text">
                    ${bio ? `<p>${bio}</p>` : `<p>${name} is a ${title.toLowerCase()} passionate about creating exceptional work.</p>`}
                    ${socialLinks ? `<div class="social-links">${socialLinks}</div>` : ''}
                </div>
            </div>
        </div>
    </section>

    ${projects.length ? `<section id="portfolio" class="section portfolio">
        <div class="container">
            <h2 class="section-title reveal">My Work</h2>
            <div class="portfolio-grid">
            ${projectCards}
            </div>
        </div>
    </section>` : ''}

    <section id="contact" class="section contact">
        <div class="container">
            <h2 class="section-title reveal">Get In Touch</h2>
            <p class="contact-desc reveal">Interested in working together? Feel free to reach out.</p>
            <div class="contact-grid reveal">
                ${contactCards}
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            ${buildFooterSocials(safeInfo)}
            <p>&copy; ${new Date().getFullYear()} ${name}. All rights reserved.</p>
            <p class="footer-credit">Made with <a href="https://r41cy.github.io/Auto-Portfolio-Generator/" target="_blank" rel="noopener">Auto Portfolio Generator</a></p>
        </div>
    </footer>

    ${scriptTag}
</body>
</html>`;
    }

    function buildProjectCard(p, idx) {
        const title = escapeHtml(p.projectTitle || 'Untitled Project');
        const tag = escapeHtml(p.projectTag || '');
        const desc = escapeHtml(p.projectDesc || '');
        const mediaType = p.mediaType || 'image';
        const source = (p.mediaSource || '').trim();

        const playOverlay = `<div class="play-overlay"><div class="play-circle"><svg viewBox="0 0 24 24" width="26" height="26" fill="white"><path d="M8 5v14l11-7z"/></svg></div><span class="play-label">Click to Play</span></div>`;
        const thumbError = `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" style="display:block"`;
        const thumbFallback = `<div class="thumb-fallback" style="display:none"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Thumbnail unavailable</span></div>`;

        let mediaHTML = '';
        if (source) {
            if (mediaType === 'image') {
                mediaHTML = `<img src="${escapeHtml(source)}" alt="${title}" loading="lazy" ${thumbError}>${thumbFallback}`;
            } else if (mediaType === 'gdrive-image') {
                const driveId = extractDriveId(source);
                mediaHTML = `<img src="https://lh3.googleusercontent.com/d/${escapeHtml(driveId)}=w800" alt="${title}" loading="lazy" ${thumbError}>${thumbFallback}`;
            } else if (mediaType === 'gdrive-video') {
                const driveId = extractDriveId(source);
                mediaHTML = `<div class="video-thumb drive-wrap" onclick="playDrive(this,'${escapeHtml(driveId)}')">
                    <img src="https://lh3.googleusercontent.com/d/${escapeHtml(driveId)}=w800" alt="${title}" class="drive-thumb-img" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.thumb-fallback').style.display='flex'">
                    <div class="thumb-fallback" style="display:none"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>${title}</span></div>
                    ${playOverlay}
                </div>`;
            } else if (mediaType === 'youtube') {
                const ytId = extractYouTubeId(source);
                mediaHTML = `<div class="video-thumb" onclick="playYouTube(this,'${escapeHtml(ytId)}')">
                    <img src="https://img.youtube.com/vi/${escapeHtml(ytId)}/hqdefault.jpg" alt="${title}" loading="lazy" onerror="this.style.display='none';this.parentElement.querySelector('.thumb-fallback').style.display='flex'">
                    <div class="thumb-fallback" style="display:none"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span>${title}</span></div>
                    ${playOverlay}
                </div>`;
            }
        } else {
            mediaHTML = `<div class="placeholder-thumb"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`;
        }

        const staggerDelay = typeof idx === 'number' ? `style="transition-delay:${idx * 0.1}s"` : '';
        return `<div class="portfolio-card reveal" ${staggerDelay}>
                <div class="card-media">${mediaHTML}</div>
                <div class="card-body">
                    ${tag ? `<span class="card-tag">${tag}</span>` : ''}
                    <h3 class="card-title">${title}</h3>
                    ${desc ? `<p class="card-desc">${desc}</p>` : ''}
                </div>
            </div>`;
    }

    // SVG icon map for social platforms
    const socialSVG = {
        email: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>',
        phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        whatsapp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>',
        linkedin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
        github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
        instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
        twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
        tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.18z"/></svg>',
        youtube: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
        facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
        threads: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.282-1.592-1.668-.1.907-.32 1.705-.662 2.378-.61 1.2-1.564 2.01-2.753 2.337-1.135.312-2.378.16-3.396-.416-1.15-.65-1.887-1.742-2.012-2.982-.093-.924.098-1.836.553-2.638.433-.763 1.074-1.346 1.86-1.688.836-.364 1.82-.476 2.94-.335 1.073.135 1.87.49 2.42 1.085.02-.512-.01-1.022-.087-1.518l2.027-.35c.142.828.185 1.7.124 2.58.578.56.988 1.243 1.2 2.01.384 1.395.34 3.32-1.1 5.03C17.59 22.78 15.381 23.978 12.186 24zm1.638-8.682c-.601-.074-1.098-.03-1.528.132-.415.157-.74.405-.963.736-.26.383-.37.822-.316 1.27.073.588.418 1.116 1.003 1.447.515.292 1.143.382 1.737.24.72-.171 1.304-.648 1.69-1.378.2-.378.354-.843.448-1.401-.567-.377-1.27-.864-2.071-1.046z"/></svg>',
        website: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
    };

    function normalizeSocialUrl(platform, value) {
        if (!value) return '';
        if (platform === 'instagram' && !value.startsWith('http')) {
            return 'https://instagram.com/' + value.replace(/^@/, '');
        }
        if (platform === 'twitter' && !value.startsWith('http')) {
            return 'https://x.com/' + value.replace(/^@/, '');
        }
        if (platform === 'tiktok' && !value.startsWith('http')) {
            return 'https://tiktok.com/@' + value.replace(/^@/, '');
        }
        if (platform === 'facebook' && !value.startsWith('http')) {
            return 'https://facebook.com/' + value.replace(/^@/, '');
        }
        if (platform === 'threads' && !value.startsWith('http')) {
            return 'https://threads.net/@' + value.replace(/^@/, '');
        }
        if (platform === 'whatsapp') {
            const digits = value.replace(/[^0-9+]/g, '');
            return 'https://wa.me/' + digits.replace(/^\+/, '');
        }
        if (platform === 'phone') {
            return 'tel:' + value;
        }
        if (platform === 'email') {
            return 'mailto:' + value;
        }
        return value;
    }

    function buildSocialLinks(info) {
        const platforms = [
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'whatsapp', label: 'WhatsApp' },
            { key: 'linkedin', label: 'LinkedIn' },
            { key: 'github', label: 'GitHub' },
            { key: 'facebook', label: 'Facebook' },
            { key: 'threads', label: 'Threads' },
            { key: 'instagram', label: 'Instagram' },
            { key: 'twitter', label: 'X / Twitter' },
            { key: 'tiktok', label: 'TikTok' },
            { key: 'youtube', label: 'YouTube' },
            { key: 'website', label: 'Website' }
        ];
        let html = '';
        platforms.forEach((p) => {
            if (info[p.key]) {
                const href = normalizeSocialUrl(p.key, info[p.key]);
                const target = (p.key === 'email' || p.key === 'phone') ? '' : ' target="_blank"';
                html += `<a href="${href}"${target} class="social-link" title="${p.label}">${socialSVG[p.key]} ${p.label}</a>`;
            }
        });
        return html;
    }

    function extractHandle(value, patterns) {
        if (!value) return value;
        let clean = value;
        patterns.forEach((p) => { clean = clean.replace(p, ''); });
        clean = clean.replace(/\/+$/, '');
        return clean ? '@' + clean : value;
    }

    function buildContactCards(info) {
        const platforms = [
            { key: 'email', label: 'Email', display: info.email },
            { key: 'phone', label: 'Phone', display: info.phone },
            { key: 'whatsapp', label: 'WhatsApp', display: info.whatsapp },
            { key: 'linkedin', label: 'LinkedIn', display: info.linkedin ? extractHandle(info.linkedin, [/^https?:\/\/(www\.)?linkedin\.com\/in\//]) : '' },
            { key: 'github', label: 'GitHub', display: info.github ? extractHandle(info.github, [/^https?:\/\/(www\.)?github\.com\//]) : '' },
            { key: 'facebook', label: 'Facebook', display: info.facebook ? extractHandle(info.facebook, [/^@/, /^https?:\/\/(www\.)?(facebook|fb)\.com\//]) : '' },
            { key: 'threads', label: 'Threads', display: info.threads ? extractHandle(info.threads, [/^@/, /^https?:\/\/(www\.)?threads\.net\/@?/]) : '' },
            { key: 'instagram', label: 'Instagram', display: info.instagram ? extractHandle(info.instagram, [/^@/, /^https?:\/\/(www\.)?instagram\.com\//]) : '' },
            { key: 'twitter', label: 'X / Twitter', display: info.twitter ? extractHandle(info.twitter, [/^@/, /^https?:\/\/(www\.)?(twitter|x)\.com\//]) : '' },
            { key: 'tiktok', label: 'TikTok', display: info.tiktok ? extractHandle(info.tiktok, [/^@/, /^https?:\/\/(www\.)?tiktok\.com\/@?/]) : '' },
            { key: 'youtube', label: 'YouTube', display: info.youtube ? info.youtube.replace(/^https?:\/\/(www\.)?youtube\.com\/?/, '').replace(/\/$/, '') || 'YouTube' : '' },
            { key: 'website', label: 'Website', display: info.website ? info.website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '' }
        ];
        let html = '';
        platforms.forEach((p) => {
            if (info[p.key]) {
                const href = normalizeSocialUrl(p.key, info[p.key]);
                const target = (p.key === 'email' || p.key === 'phone') ? '' : ' target="_blank" rel="noopener"';
                html += `<a href="${href}"${target} class="contact-card">
                    <span class="contact-card-icon">${socialSVG[p.key]}</span>
                    <span class="contact-card-label">${p.label}</span>
                    <span class="contact-card-value">${p.display}</span>
                </a>`;
            }
        });
        return html;
    }

    function buildFooterSocials(info) {
        const platforms = [
            { key: 'linkedin', label: 'LinkedIn' },
            { key: 'github', label: 'GitHub' },
            { key: 'facebook', label: 'Facebook' },
            { key: 'threads', label: 'Threads' },
            { key: 'instagram', label: 'Instagram' },
            { key: 'twitter', label: 'X / Twitter' },
            { key: 'tiktok', label: 'TikTok' },
            { key: 'youtube', label: 'YouTube' }
        ];
        let links = '';
        platforms.forEach((pl) => {
            if (info[pl.key]) {
                const href = normalizeSocialUrl(pl.key, info[pl.key]);
                links += `<a href="${href}" target="_blank" rel="noopener" title="${pl.label}">${socialSVG[pl.key]}</a>`;
            }
        });
        if (!links) return '';
        return `<div class="footer-socials">${links}</div>`;
    }

    function extractYouTubeId(url) {
        if (!url) return '';
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : url.trim();
    }

    function extractDriveId(input) {
        if (!input) return '';
        input = input.trim();
        // Full URL: https://drive.google.com/file/d/FILE_ID/...
        var match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        // URL with id param: https://drive.google.com/open?id=FILE_ID
        match = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        // Already a bare file ID (alphanumeric, dashes, underscores)
        if (/^[a-zA-Z0-9_-]{10,}$/.test(input)) return input;
        return input;
    }

    // ── Generated Portfolio CSS ────────────────────────────────
    function generatePortfolioCSS(theme) {
        const p = theme.primaryColor;
        const bg = theme.bgColor;
        const card = theme.cardColor;
        const text = theme.textColor;

        const isLight = isLightColor(bg);
        const textSec = isLight ? '#555555' : '#a0a0b8';
        const border = isLight ? '#e0e0e0' : 'rgba(255,255,255,0.08)';
        const bgSec = isLight ? '#f5f5f7' : blendColor(bg, '#ffffff', 0.06);

        const lightBorder = isLightColor(card) ? '#e5e7eb' : 'rgba(255,255,255,0.08)';
        const cardBgGlass = isLight ? 'rgba(255,255,255,0.7)' : `rgba(${hexToRgb(card)}, 0.5)`;
        const lightCardBg = isLight ? 'rgba(255,255,255,0.85)' : `rgba(${hexToRgb(card)}, 0.5)`;

        return `/* Auto-generated by Auto Portfolio Generator */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
    --primary: ${p};
    --bg: ${bg};
    --bg-secondary: ${bgSec};
    --card-bg: ${card};
    --card-bg-glass: ${cardBgGlass};
    --text: ${text};
    --text-secondary: ${textSec};
    --border: ${border};
    --font: 'Inter', system-ui, -apple-system, sans-serif;
}

[data-theme="light"] {
    --bg: #ffffff;
    --bg-secondary: #f8f9fc;
    --card-bg: #ffffff;
    --card-bg-glass: rgba(255,255,255,0.75);
    --text: #111827;
    --text-secondary: #6b7280;
    --border: #e5e7eb;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    line-height: 1.8;
    font-size: 16px;
    overflow-x: hidden;
    transition: background 0.4s ease, color 0.4s ease;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
.accent { color: var(--primary); }

/* Navbar */
.navbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 32px;
    background: rgba(${hexToRgb(bg)}, 0.7);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(${hexToRgb(p)}, 0.1);
    transition: all 0.35s ease;
}
.navbar.scrolled {
    padding: 10px 32px;
    box-shadow: 0 4px 30px rgba(0,0,0,0.08);
    border-bottom-color: rgba(${hexToRgb(p)}, 0.15);
}
[data-theme="light"] .navbar {
    background: rgba(255,255,255,0.8);
    border-bottom: 1px solid rgba(0,0,0,0.06);
}
[data-theme="light"] .navbar.scrolled {
    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
}
.nav-brand {
    font-size: 22px; font-weight: 800; color: var(--text);
    text-decoration: none; letter-spacing: -0.02em;
}
.nav-links {
    display: flex; list-style: none; gap: 32px;
}
.nav-links a {
    color: var(--text-secondary); text-decoration: none; font-size: 14px;
    font-weight: 500; transition: color 0.25s ease; position: relative;
    padding-bottom: 4px;
}
.nav-links a:hover, .nav-links a.active { color: var(--primary); }
.nav-links a::after {
    content: ''; position: absolute; bottom: 0; left: 50%; width: 0; height: 4px;
    background: var(--primary); border-radius: 2px; transition: all 0.25s ease;
    transform: translateX(-50%);
}
.nav-links a:hover::after, .nav-links a.active::after { width: 6px; }
.nav-right { display: flex; align-items: center; gap: 12px; }
.theme-toggle {
    background: none; border: 1px solid var(--border); border-radius: 10px;
    padding: 7px 11px; cursor: pointer; font-size: 18px; color: var(--text);
    transition: all 0.25s ease;
}
.theme-toggle:hover { background: var(--bg-secondary); border-color: var(--primary); }
.mobile-toggle {
    display: none; flex-direction: column; gap: 5px; background: none;
    border: none; cursor: pointer; padding: 4px;
}
.mobile-toggle span {
    display: block; width: 24px; height: 2px; background: var(--text);
    transition: all 0.3s;
}

/* Hero */
.hero {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    text-align: center; padding: 120px 24px 80px; position: relative;
    background:
        radial-gradient(ellipse at 20% 50%, rgba(${hexToRgb(p)}, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 50%, rgba(${hexToRgb(p)}, 0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 0%, rgba(${hexToRgb(p)}, 0.1) 0%, transparent 60%);
}
.hero-content { position: relative; z-index: 1; }

/* Hero stagger animations */
.hero-greeting, .hero-name, .hero-title, .hero-bio, .hero-cta {
    opacity: 0; animation: heroFadeUp 0.7s ease forwards;
}
.hero-greeting { animation-delay: 0.1s; }
.hero-name { animation-delay: 0.2s; }
.hero-title { animation-delay: 0.3s; }
.hero-bio { animation-delay: 0.4s; }
.hero-cta { animation-delay: 0.5s; }

@keyframes heroFadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
}

.hero-greeting {
    font-size: 14px; color: var(--primary); font-weight: 700;
    text-transform: uppercase; letter-spacing: 4px; margin-bottom: 16px;
}
.hero-name {
    font-size: clamp(40px, 8vw, 82px); font-weight: 800;
    line-height: 1.05; margin-bottom: 16px; letter-spacing: -0.03em;
    background: linear-gradient(135deg, var(--text) 0%, var(--primary) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}
.hero-title {
    font-size: clamp(18px, 3vw, 24px); color: var(--text-secondary);
    margin-bottom: 20px; font-weight: 400;
}
.hero-bio {
    max-width: 560px; margin: 0 auto 36px; color: var(--text-secondary);
    font-size: 16px; line-height: 1.8;
}
.hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }

/* Scroll Indicator */
.scroll-indicator {
    position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    color: var(--text-muted, var(--text-secondary)); font-size: 11px;
    font-weight: 600; letter-spacing: 1px; text-transform: uppercase; opacity: 0.5;
    animation: scrollBounce 2s ease-in-out infinite;
}
.scroll-indicator svg { opacity: 0.7; }

@keyframes scrollBounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(8px); }
}

/* Buttons */
.btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 32px; border-radius: 24px; font-size: 14px; font-weight: 600;
    text-decoration: none; transition: all 0.3s ease; border: none; cursor: pointer;
    font-family: var(--font);
}
.btn-primary {
    background: var(--primary); color: #fff;
}
.btn-primary:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 28px rgba(${hexToRgb(p)}, 0.35);
}
.btn-outline {
    background: transparent; color: var(--text); border: 1.5px solid var(--border);
}
.btn-outline:hover {
    border-color: var(--primary); color: var(--primary);
    box-shadow: 0 4px 16px rgba(${hexToRgb(p)}, 0.1);
}

/* Section */
.section { padding: 100px 0; }
.section:nth-child(even) { background: var(--bg-secondary); }
.section-title {
    font-size: 32px; font-weight: 800; text-align: center; margin-bottom: 48px;
    letter-spacing: -0.02em; position: relative;
}
.section-title::after {
    content: ''; display: block; width: 40px; height: 3px; background: var(--primary);
    margin: 14px auto 0; border-radius: 2px;
}

/* About */
.about-grid {
    display: grid; grid-template-columns: auto 1fr; gap: 48px;
    align-items: center; max-width: 800px; margin: 0 auto;
}
.about-grid.no-photo { grid-template-columns: 1fr; text-align: center; max-width: 640px; }
.about-photo-wrap {
    width: 200px; height: 200px; border-radius: 50%; overflow: hidden;
    border: 3px solid var(--primary); padding: 4px; flex-shrink: 0;
    animation: photoPulse 3s ease-in-out infinite;
}
@keyframes photoPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(${hexToRgb(p)}, 0.2); }
    50% { box-shadow: 0 0 0 12px rgba(${hexToRgb(p)}, 0); }
}
.about-photo { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.about-text p { font-size: 16px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 20px; }
.social-links { display: flex; gap: 10px; flex-wrap: wrap; }
.about-grid.no-photo .social-links { justify-content: center; }
.social-link {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;
    background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 24px;
    color: var(--text-secondary); text-decoration: none; font-size: 13px; font-weight: 500;
    transition: all 0.25s ease;
}
.social-link:hover { border-color: var(--primary); color: var(--primary); background: rgba(${hexToRgb(p)}, 0.06); }

/* Portfolio Grid */
.portfolio-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
}
.portfolio-card {
    background: var(--card-bg-glass); border: 1px solid var(--border); border-radius: 16px;
    overflow: hidden; transition: all 0.35s ease;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.portfolio-card:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(${hexToRgb(p)}, 0.2);
    border-color: rgba(${hexToRgb(p)}, 0.4);
}
.card-media { position: relative; overflow: hidden; aspect-ratio: 16/9; background: var(--bg-secondary); }
.card-media img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.card-media iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
.portfolio-card:hover .card-media img { transform: scale(1.06); }
.drive-wrap { position: relative; width: 100%; height: 100%; }
.placeholder-thumb {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    font-size: 32px; color: var(--primary); background: var(--bg-secondary);
}
.thumb-fallback {
    width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; color: var(--text-secondary); background: var(--bg-secondary); font-size: 12px;
    text-align: center; padding: 12px;
}
.video-thumb { position: relative; cursor: pointer; width: 100%; height: 100%; }
.video-thumb img { width: 100%; height: 100%; object-fit: cover; }
.play-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 8px;
    background: rgba(0,0,0,0.35); transition: background 0.3s;
}
.video-thumb:hover .play-overlay { background: rgba(0,0,0,0.5); }
.play-circle {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--primary); display: flex; align-items: center;
    justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.video-thumb:hover .play-circle { transform: scale(1.1); box-shadow: 0 6px 28px rgba(${hexToRgb(p)}, 0.5); }
.play-label {
    color: #fff; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;
    text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
.card-body { padding: 20px; }
.card-tag {
    display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--primary); background: rgba(${hexToRgb(p)}, 0.1);
    padding: 4px 12px; border-radius: 20px; margin-bottom: 10px;
    box-shadow: 0 0 8px rgba(${hexToRgb(p)}, 0.08);
}
.card-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.01em; }
.card-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }

/* Staggered reveal for cards */
.portfolio-card.reveal { transition: opacity 0.6s ease, transform 0.6s ease; }

/* Contact */
.contact {
    text-align: center; position: relative;
    background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg) 100%);
}
.contact-desc { color: var(--text-secondary); font-size: 16px; margin-bottom: 40px; max-width: 500px; margin-left: auto; margin-right: auto; }
.contact-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px; max-width: 800px; margin: 0 auto;
}
.contact-card {
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 28px 16px; background: var(--card-bg-glass); border: 1px solid var(--border);
    border-radius: 16px; color: var(--text); text-decoration: none;
    transition: all 0.3s ease; text-align: center;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.contact-card:hover {
    border-color: rgba(${hexToRgb(p)}, 0.4); transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(${hexToRgb(p)}, 0.12);
}
.contact-card-icon {
    width: 48px; height: 48px; border-radius: 50%; background: rgba(${hexToRgb(p)}, 0.1);
    display: flex; align-items: center; justify-content: center;
    color: var(--primary); flex-shrink: 0;
    transition: all 0.3s ease;
}
.contact-card:hover .contact-card-icon {
    background: var(--primary); color: #fff;
    box-shadow: 0 4px 16px rgba(${hexToRgb(p)}, 0.3);
}
.contact-card-label { font-size: 13px; font-weight: 700; }
.contact-card-value { font-size: 12px; color: var(--text-secondary); word-break: break-all; }

/* Theme toggle icons */
.icon-sun, .icon-moon { display: none; }
[data-theme="dark"] .icon-sun { display: block; }
[data-theme="light"] .icon-moon { display: block; }

/* Footer */
.footer {
    text-align: center; padding: 40px 0 32px;
    border-top: 1px solid var(--border);
    color: var(--text-secondary); font-size: 13px;
    position: relative;
}
.footer::before {
    content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 200px; height: 1px;
    background: linear-gradient(90deg, transparent, var(--primary), transparent);
}
.footer-socials {
    display: flex; justify-content: center; gap: 16px; margin-bottom: 16px;
}
.footer-socials a {
    color: var(--text-secondary); transition: color 0.25s ease, transform 0.25s ease;
    display: inline-flex;
}
.footer-socials a:hover { color: var(--primary); transform: translateY(-2px); }
.footer-credit {
    margin-top: 8px; font-size: 12px; opacity: 0.6;
}
.footer-credit a {
    color: var(--primary); text-decoration: none; font-weight: 500;
}
.footer-credit a:hover { text-decoration: underline; }

/* Reveal Animation */
.reveal {
    opacity: 0; transform: translateY(30px);
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Light mode card refinements */
[data-theme="light"] .portfolio-card {
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    backdrop-filter: none;
}
[data-theme="light"] .portfolio-card:hover {
    box-shadow: 0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(${hexToRgb(p)}, 0.15);
}
[data-theme="light"] .contact-card {
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    backdrop-filter: none;
}

/* Mobile */
@media (max-width: 768px) {
    .container { padding: 0 16px; }
    .nav-links {
        display: none; position: fixed; top: 56px; left: 0; right: 0;
        background: var(--bg); flex-direction: column; padding: 24px; gap: 16px;
        border-bottom: 1px solid var(--border);
        backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    }
    .nav-links.open { display: flex; }
    .mobile-toggle { display: flex; }
    .hero { padding: 90px 20px 60px; min-height: 85vh; min-height: 85dvh; }
    .hero-name { font-size: clamp(28px, 10vw, 48px); }
    .hero-title { font-size: clamp(16px, 4vw, 20px); }
    .hero-bio { font-size: 15px; margin-bottom: 28px; }
    .hero-cta { flex-direction: column; align-items: center; gap: 12px; }
    .hero-cta .btn { width: 100%; max-width: 280px; justify-content: center; }
    .section { padding: 64px 0; }
    .section-title { font-size: 26px; margin-bottom: 32px; }
    .about-grid { grid-template-columns: 1fr; text-align: center; gap: 28px; }
    .about-photo-wrap { margin: 0 auto; width: 140px; height: 140px; }
    .about-text p { font-size: 15px; }
    .social-links { justify-content: center; }
    .portfolio-grid { grid-template-columns: 1fr; gap: 16px; }
    .portfolio-card:hover { transform: none; }
    .card-body { padding: 16px; }
    .contact-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .contact-card { padding: 20px 12px; }
    .contact-card-icon { width: 40px; height: 40px; }
    .navbar { padding: 12px 16px; }
    .nav-brand { font-size: 20px; }
    .scroll-indicator { display: none; }
    .btn { min-height: 44px; font-size: 14px; }
    .footer { padding: 28px 0 24px; }
    .footer-socials { gap: 12px; }
}

@media (max-width: 420px) {
    .hero { padding: 80px 16px 48px; min-height: 80vh; min-height: 80dvh; }
    .hero-greeting { font-size: 12px; letter-spacing: 3px; }
    .hero-name { font-size: clamp(24px, 11vw, 40px); }
    .section { padding: 48px 0; }
    .section-title { font-size: 22px; margin-bottom: 24px; }
    .about-photo-wrap { width: 120px; height: 120px; }
    .portfolio-grid { grid-template-columns: 1fr; }
    .contact-grid { grid-template-columns: 1fr; }
    .contact-card { flex-direction: row; text-align: left; gap: 12px; padding: 16px; }
    .contact-card-icon { width: 36px; height: 36px; flex-shrink: 0; }
    .contact-card-label { font-size: 13px; }
    .contact-card-value { font-size: 11px; }
    .navbar { padding: 10px 12px; }
    .nav-brand { font-size: 18px; }
}`;
    }

    // ── Generated Portfolio JS ─────────────────────────────────
    function generatePortfolioJS() {
        return `/* Auto-generated by Auto Portfolio Generator */
(function(){
    'use strict';

    // Theme Toggle
    var themeToggle = document.getElementById('theme-toggle');
    var currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if(themeToggle) {
        themeToggle.addEventListener('click', function(){
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
        });
    }

    // Mobile Menu
    var mobileToggle = document.getElementById('mobile-toggle');
    var navLinks = document.getElementById('nav-links');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', function(){
            navLinks.classList.toggle('open');
        });
    }
    if(navLinks) {
        navLinks.querySelectorAll('a').forEach(function(link){
            link.addEventListener('click', function(){ navLinks.classList.remove('open'); });
        });
    }

    // Navbar Scroll Effect
    var navbar = document.getElementById('navbar');
    window.addEventListener('scroll', function(){
        if(navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click', function(e){
            var target = document.querySelector(this.getAttribute('href'));
            if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); }
        });
    });

    // Scroll Reveal with stagger support
    var reveals = document.querySelectorAll('.reveal');
    var observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
            if(entry.isIntersecting){
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el){ observer.observe(el); });

    // Active Nav Link on scroll
    var sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', function(){
        var scrollY = window.scrollY + 100;
        sections.forEach(function(sec){
            var top = sec.offsetTop;
            var height = sec.offsetHeight;
            var id = sec.getAttribute('id');
            var link = document.querySelector('.nav-links a[href="#'+id+'"]');
            if(link){
                if(scrollY >= top && scrollY < top + height){
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    });

    // Hide scroll indicator on scroll
    var scrollInd = document.querySelector('.scroll-indicator');
    if(scrollInd) {
        window.addEventListener('scroll', function(){
            scrollInd.style.opacity = window.scrollY > 100 ? '0' : '0.5';
        }, {passive:true});
    }
})();

// Google Drive Video Player
function playDrive(el, fileId){
    el.style.position = 'relative';
    el.innerHTML = '<iframe src="https://drive.google.com/file/d/'+fileId+'/preview" allow="autoplay; fullscreen" allowfullscreen frameborder="0" style="position:absolute;inset:0;width:100%;height:100%;border:none;z-index:2;"></iframe>';
}

// YouTube Video Player
function playYouTube(el, videoId){
    el.style.position = 'relative';
    el.innerHTML = '<iframe src="https://www.youtube.com/embed/'+videoId+'?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen frameborder="0" style="position:absolute;inset:0;width:100%;height:100%;border:none;z-index:2;"></iframe>';
}`;
    }

    // ── Color Utility Functions ────────────────────────────────
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r},${g},${b}`;
    }

    function isLightColor(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 128;
    }

    function blendColor(hex1, hex2, ratio) {
        hex1 = hex1.replace('#', '');
        hex2 = hex2.replace('#', '');
        if (hex1.length === 3) hex1 = hex1.split('').map((c) => c + c).join('');
        if (hex2.length === 3) hex2 = hex2.split('').map((c) => c + c).join('');
        const r = Math.round(parseInt(hex1.substring(0, 2), 16) * (1 - ratio) + parseInt(hex2.substring(0, 2), 16) * ratio);
        const g = Math.round(parseInt(hex1.substring(2, 4), 16) * (1 - ratio) + parseInt(hex2.substring(2, 4), 16) * ratio);
        const b = Math.round(parseInt(hex1.substring(4, 6), 16) * (1 - ratio) + parseInt(hex2.substring(4, 6), 16) * ratio);
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    }

    // ── ZIP Generation & Download ──────────────────────────────
    async function generateAndDownload() {
        const info = getPersonalInfo();
        if (!info.fullName || !info.title) {
            alert('Please fill in at least your Full Name and Title in Step 1.');
            return;
        }

        dom.generateStatus.textContent = 'Generating your portfolio...';
        dom.generateBtn.disabled = true;

        try {
            await new Promise((r) => setTimeout(r, 300));

            const htmlContent = generatePortfolioHTML(info, state.projects, state.theme, false);
            const cssContent = generatePortfolioCSS(state.theme);

            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip library not loaded. Please check your internet connection and refresh the page.');
            }

            const zip = new JSZip();
            zip.file('index.html', htmlContent);
            zip.file('style.css', cssContent);

            const blob = await zip.generateAsync({ type: 'blob' });

            const slug = info.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
            const filename = `${slug}-portfolio.zip`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            dom.generateStatus.textContent = 'Download started! Check your downloads folder.';
            dom.generateStatus.style.color = '#10b981';
        } catch (err) {
            dom.generateStatus.textContent = 'Error: ' + err.message;
            dom.generateStatus.style.color = '#ef4444';
        } finally {
            dom.generateBtn.disabled = false;
        }
    }

    // ── Event Listeners ────────────────────────────────────────
    dom.nextBtn.addEventListener('click', () => goToStep(state.currentStep + 1));
    dom.prevBtn.addEventListener('click', () => goToStep(state.currentStep - 1));
    dom.addProjectBtn.addEventListener('click', () => addProject());
    dom.generateBtn.addEventListener('click', generateAndDownload);

    [dom.primaryColor, dom.bgColor, dom.cardColor, dom.textColor].forEach((input) => {
        input.addEventListener('input', onThemeChange);
    });

    // Auto-save on personal info changes
    $$('#step-1 input, #step-1 textarea').forEach((input) => {
        input.addEventListener('input', saveState);
    });

    // Collapsible section toggles
    $$('.form-section-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', !expanded);
            const body = btn.nextElementSibling;
            if (body) body.hidden = expanded;
        });
    });

    // ── Initialize ─────────────────────────────────────────────
    loadState();
    updateEmptyState();

    // Auto-expand collapsible sections if they already have data
    $$('.form-section.collapsible').forEach((section) => {
        const hasData = Array.from(section.querySelectorAll('input, textarea'))
            .some((input) => input.value.trim() !== '');
        if (hasData) {
            const btn = section.querySelector('.form-section-toggle');
            const body = section.querySelector('.form-section-body');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (body) body.hidden = false;
        }
    });

    goToStep(1);

})();

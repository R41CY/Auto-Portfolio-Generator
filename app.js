/* =============================================================
   Auto Portfolio Generator — Core Application Logic
   (c) 2026 Raicy. All Rights Reserved.
   Unauthorized copying, modification, or distribution of this
   file is strictly prohibited.
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
            primaryColor: '#c8a04e',
            bgColor: '#0c0c0c',
            cardColor: '#161616',
            textColor: '#f5f0e8'
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
            location: ($('#location') ? $('#location').value.trim() : ''),
            availability: $('#availability').value.trim(),
            bio: $('#bio').value.trim(),
            aboutMe: $('#aboutMe').value.trim(),
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
        const avail = escapeHtml(info.availability || '');
        const bio = escapeHtml(info.bio || '');
        const aboutMe = escapeHtml(info.aboutMe || '');
        const photo = escapeHtml(info.profilePhoto || '');

        const safeInfo = {};
        Object.keys(info).forEach((k) => { safeInfo[k] = escapeHtml(info[k] || ''); });

        const projectCards = projects.map((p, idx) => buildProjectCard(p, idx)).join('\n            ');

        const hasProjects = projects.length > 0;
        const contactCards = buildContactCards(safeInfo);

        const cssContent = generatePortfolioCSS(theme);
        const jsContent = generatePortfolioJS();

        const styleTag = inline
            ? `<style>${cssContent}</style>`
            : '<link rel="stylesheet" href="style.css">';
        const finalJS = inline ? jsContent : obfuscateJS(jsContent);
        const scriptTag = `<script>${finalJS}<\/script>`;

        const navPortfolioLink = hasProjects ? '<li><a href="#work">Work</a></li>' : '';
        const heroPrimaryBtn = hasProjects
            ? '<a href="#work" class="btn btn-primary">View Work</a>'
            : '<a href="#contact" class="btn btn-primary">Get In Touch</a>';
        const heroSecondaryBtn = hasProjects
            ? '<a href="#contact" class="btn btn-outline">Contact Me &rarr;</a>'
            : '<a href="#about" class="btn btn-outline">About Me &rarr;</a>';

        const nameParts = name.split(' ').filter(Boolean);
        const firstName = nameParts[0] || name;
        const middleNames = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const location = escapeHtml(info.location || '');

        return `<!-- Portfolio generated by Auto Portfolio Generator | (c) 2026 Raicy. All Rights Reserved. -->
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} — ${title}</title>
    <meta name="description" content="${aboutMe || bio || title}">
    <meta name="author" content="${name}">
    <meta property="og:title" content="${name} — ${title}">
    <meta property="og:description" content="${aboutMe || bio || title}">
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(theme.primaryColor)}' stroke-width='2.5'%3E%3Cpolygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/%3E%3C/svg%3E">
    ${styleTag}
</head>
<body>
    <nav class="navbar" id="navbar">
        <a href="#home" class="nav-brand">${firstName}<span class="accent">.</span></a>
        <ul class="nav-links" id="nav-links">
            <li><a href="#about">About</a></li>
            ${navPortfolioLink}
            <li><a href="#contact">Contact</a></li>
        </ul>
        <div class="nav-right">
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
                <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <button class="mobile-toggle" id="mobile-toggle" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <section id="home" class="hero">
        <div class="hero-bg-grid"></div>
        <div class="hero-orb hero-orb-1"></div>
        <div class="hero-orb hero-orb-2"></div>
        <div class="hero-inner">
            ${photo ? `<div class="hero-photo-col">
                <div class="hero-photo-frame">
                    <img src="${photo}" alt="${name}" class="hero-photo" loading="eager">
                    <div class="hero-photo-tag">${escapeHtml(title)}</div>
                </div>
            </div>` : ''}
            <div class="hero-text-col">
                ${avail ? `<div class="avail-badge"><span class="avail-line"></span><span class="avail-dot"></span><span class="avail-text">${avail}</span></div>` : ''}
                <h1 class="hero-name">
                    <span class="hero-name-first">${firstName}</span>
                    ${middleNames ? `<span class="hero-name-middle"><em>${middleNames}</em></span>` : ''}
                    ${lastName ? `<span class="hero-name-last">${lastName}</span>` : ''}
                </h1>
                <div class="hero-info">
                    <p class="hero-title">${title.toUpperCase()}</p>
                    ${location ? `<p class="hero-location"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${location}</p>` : ''}
                </div>
                ${bio ? `<p class="hero-bio">${bio}</p>` : ''}
                <div class="hero-cta">
                    ${heroPrimaryBtn}
                    ${heroSecondaryBtn}
                </div>
            </div>
        </div>
        <div class="hero-bottom-fade"></div>
    </section>

    <section id="about" class="section about-section">
        <div class="container">
            <div class="section-header reveal">
                <span class="section-tag">About</span>
                <h2 class="section-title">A little about me</h2>
            </div>
            <div class="about-content reveal">
                <div class="about-text">
                    ${aboutMe ? `<p>${aboutMe}</p>` : bio ? `<p>${bio}</p>` : `<p>${name} is a ${title.toLowerCase()} passionate about creating exceptional work.</p>`}
                </div>
            </div>
            <div class="about-divider"></div>
        </div>
    </section>

    ${hasProjects ? `<section id="work" class="section work-section">
        <div class="container">
            <div class="section-header reveal">
                <span class="section-tag">Portfolio</span>
                <h2 class="section-title">Selected Work</h2>
            </div>
            <div class="work-grid">
            ${projectCards}
            </div>
        </div>
    </section>` : ''}

    <section id="contact" class="section contact-section">
        <div class="container">
            <div class="contact-inner reveal">
                <div class="section-header">
                    <span class="section-tag">Contact</span>
                    <h2 class="section-title">Let's work together</h2>
                    <p class="section-desc">Have a project in mind? I'd love to hear about it.</p>
                </div>
                <div class="contact-grid">
                    ${contactCards}
                </div>
            </div>
        </div>
    </section>

    <footer class="footer">
        <div class="container">
            <div class="footer-inner">
                <div class="footer-brand">
                    <a href="#home" class="footer-logo">${firstName}<span class="accent">.</span></a>
                    <p>${title}</p>
                </div>
                <div class="footer-links">
                    ${buildFooterSocials(safeInfo)}
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} ${name}. All rights reserved.</p>
                <p class="footer-credit">Built with <a href="https://r41cy.github.io/Auto-Portfolio-Generator/" target="_blank" rel="noopener">Auto Portfolio</a></p>
            </div>
        </div>
    </footer>

    <div class="scroll-progress" id="scroll-progress"></div>
    <div class="cursor-dot" id="cursor-dot"></div>
    <div class="cursor-ring" id="cursor-ring"></div>
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
        const textSec = isLight ? '#555555' : '#9a978e';
        const border = isLight ? '#e0e0e0' : 'rgba(255,255,255,0.06)';
        const bgSec = isLight ? '#f5f5f7' : blendColor(bg, '#ffffff', 0.05);

        const cardBgGlass = isLight ? 'rgba(255,255,255,0.7)' : `rgba(${hexToRgb(card)}, 0.5)`;

        return `/* Auto-generated by Auto Portfolio Generator */

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
    --font-display: 'Playfair Display', Georgia, serif;
}
[data-theme="light"] {
    --bg: #faf8f4; --bg-secondary: #f0ede6; --card-bg: #ffffff;
    --card-bg-glass: rgba(255,255,255,0.88); --text: #1a1a17;
    --text-secondary: #6b6862; --border: rgba(0,0,0,0.06);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
    font-family: var(--font); background: var(--bg); color: var(--text);
    line-height: 1.7; font-size: 16px; overflow-x: hidden;
    transition: background 0.5s ease, color 0.5s ease;
    -webkit-font-smoothing: antialiased;
}
*, *::before, *::after { cursor: none !important; }
body::after {
    content: ''; position: fixed; inset: 0; z-index: 9000; pointer-events: none; opacity: 0.015;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 256px;
}
::selection { background: rgba(${hexToRgb(p)}, 0.2); }
.container { max-width: 1140px; margin: 0 auto; padding: 0 32px; }
.accent { color: var(--primary); }

/* Cursor */
.cursor-dot, .cursor-ring { position: fixed; border-radius: 50%; pointer-events: none; top: 0; left: 0; will-change: transform; }
.cursor-dot { width: 8px; height: 8px; background: var(--primary); z-index: 99999; box-shadow: 0 0 12px rgba(${hexToRgb(p)}, 0.5); transition: width .2s, height .2s, background .2s, box-shadow .2s, margin .2s; }
[data-theme="light"] .cursor-dot { background: var(--primary); box-shadow: 0 0 8px rgba(${hexToRgb(p)}, 0.3); }
.cursor-ring { width: 36px; height: 36px; border: 1.5px solid rgba(${hexToRgb(p)}, 0.4); z-index: 99998; transition: width .3s, height .3s, border-color .3s, background .3s, margin .3s; }
.cursor-dot.hovering { width: 14px; height: 14px; margin: -3px 0 0 -3px; background: var(--primary); box-shadow: 0 0 14px rgba(${hexToRgb(p)}, 0.9); }
.cursor-ring.hovering { width: 50px; height: 50px; margin: -7px 0 0 -7px; border-color: rgba(${hexToRgb(p)}, 0.3); background: rgba(${hexToRgb(p)}, 0.05); }

/* ── Navbar ── */
.navbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    display: flex; align-items: center; justify-content: space-between;
    padding: 22px 48px; background: transparent; border-bottom: 1px solid transparent;
    transition: all .5s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1);
}
.navbar.scrolled {
    padding: 14px 48px;
    background: rgba(${hexToRgb(bg)}, 0.75);
    backdrop-filter: blur(20px) saturate(1.6); -webkit-backdrop-filter: blur(20px) saturate(1.6);
    border-bottom-color: var(--border);
    box-shadow: 0 2px 24px rgba(0,0,0,0.06);
}
[data-theme="light"] .navbar.scrolled { background: rgba(250,249,247,0.82); }
.nav-brand { font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--text); text-decoration: none; letter-spacing: -0.02em; }
.nav-links { display: flex; list-style: none; gap: 36px; }
.nav-links a { color: var(--text-secondary); text-decoration: none; font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; transition: color .3s; position: relative; padding-bottom: 4px; }
.nav-links a:hover, .nav-links a.active { color: var(--text); }
.nav-links a::after { content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 2px; background: var(--primary); transition: width .4s cubic-bezier(.16,1,.3,1); }
.nav-links a:hover::after, .nav-links a.active::after { width: 100%; }
.nav-right { display: flex; align-items: center; gap: 12px; }
.theme-toggle { background: transparent; border: 1.5px solid var(--border); border-radius: 50%; width: 40px; height: 40px; padding: 0; display: flex; align-items: center; justify-content: center; color: var(--text); transition: all .4s cubic-bezier(.16,1,.3,1); }
.theme-toggle:hover { border-color: var(--primary); color: var(--primary); box-shadow: 0 0 20px rgba(${hexToRgb(p)}, 0.12); transform: rotate(15deg); }
.icon-sun, .icon-moon { display: none; }
[data-theme="dark"] .icon-sun { display: block; }
[data-theme="light"] .icon-moon { display: block; }
.mobile-toggle { display: none; flex-direction: column; gap: 5px; background: none; border: none; padding: 4px; }
.mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--text); transition: all .3s; }

/* ── Hero ── */
.hero {
    min-height: 100vh; display: flex; align-items: center; position: relative;
    overflow: hidden; padding: 100px 0 60px;
}
.hero-bg-grid {
    position: absolute; inset: 0; pointer-events: none; opacity: 0.018;
    background-image:
        linear-gradient(rgba(${hexToRgb(p)}, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(${hexToRgb(p)}, 0.1) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,0,0,0.6), transparent);
    -webkit-mask-image: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,0,0,0.6), transparent);
}
[data-theme="light"] .hero-bg-grid { opacity: 0.015; }
.hero-orb { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(80px); will-change: transform; }
.hero-orb-1 { width: 500px; height: 500px; top: -15%; left: -12%; background: radial-gradient(circle, rgba(${hexToRgb(p)}, 0.08), transparent 70%); animation: orb1 20s ease-in-out infinite; }
.hero-orb-2 { width: 350px; height: 350px; bottom: -8%; right: -10%; background: radial-gradient(circle, rgba(${hexToRgb(p)}, 0.06), transparent 70%); animation: orb2 16s ease-in-out infinite; }
[data-theme="light"] .hero-orb-1 { background: radial-gradient(circle, rgba(${hexToRgb(p)}, 0.04), transparent 70%); }
[data-theme="light"] .hero-orb-2 { background: radial-gradient(circle, rgba(${hexToRgb(p)}, 0.03), transparent 70%); }
@keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.98)} }
@keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-30px,20px) scale(1.04)} 66%{transform:translate(25px,-15px) scale(0.97)} }
.hero-bottom-fade { position: absolute; bottom: 0; left: 0; right: 0; height: 150px; background: linear-gradient(to top, var(--bg), transparent); pointer-events: none; z-index: 1; }
.hero-inner {
    display: flex; align-items: center; gap: 72px;
    max-width: 1200px; margin: 0 auto; padding: 0 56px;
    position: relative; z-index: 2; width: 100%;
}

/* Hero Photo */
.hero-photo-col { flex-shrink: 0; opacity: 0; animation: fadeUp .9s cubic-bezier(.16,1,.3,1) .1s forwards; }
.hero-photo-frame {
    width: 360px; aspect-ratio: 3/4; border-radius: 20px; overflow: hidden;
    position: relative;
    border: 1px solid rgba(${hexToRgb(p)}, 0.15);
    box-shadow: 0 40px 100px rgba(0,0,0,0.3), 0 0 60px rgba(${hexToRgb(p)}, 0.04);
    transition: transform .6s cubic-bezier(.16,1,.3,1), box-shadow .6s ease;
}
.hero-photo-frame::before {
    content: ''; position: absolute; inset: -2px; border-radius: 22px; z-index: -1;
    background: conic-gradient(from 0deg, rgba(${hexToRgb(p)}, 0.4), transparent 25%, rgba(${hexToRgb(p)}, 0.2) 50%, transparent 75%, rgba(${hexToRgb(p)}, 0.4));
    animation: borderSpin 8s linear infinite;
    opacity: 0; transition: opacity .5s ease;
}
.hero-photo-frame:hover::before { opacity: 1; }
@keyframes borderSpin { to { transform: rotate(360deg); } }
.hero-photo-frame::after {
    content: ''; position: absolute; inset: 0; border-radius: 20px; pointer-events: none; z-index: 2;
    background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 100%);
}
.hero-photo-frame:hover {
    transform: translateY(-8px) rotate(-1deg) scale(1.02);
    box-shadow: 0 48px 100px rgba(0,0,0,0.3), 0 0 80px rgba(${hexToRgb(p)}, 0.12);
}
[data-theme="light"] .hero-photo-frame { border-color: rgba(0,0,0,0.06); box-shadow: 0 24px 64px rgba(0,0,0,0.1); }
[data-theme="light"] .hero-photo-frame:hover { box-shadow: 0 32px 80px rgba(0,0,0,0.14); }
.hero-photo { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .8s cubic-bezier(.16,1,.3,1); }
.hero-photo-frame:hover .hero-photo { transform: scale(1.06); }
.hero-photo-tag {
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 3;
    background: var(--primary);
    color: #0c0c0c; font-size: 10px; font-weight: 800;
    letter-spacing: 2px; text-transform: uppercase; padding: 10px 22px;
    border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,0.35);
    white-space: nowrap;
}
[data-theme="light"] .hero-photo-tag { color: #fff; }

/* Hero Text */
.hero-text-col { flex: 1; }
.avail-badge {
    display: inline-flex; align-items: center; gap: 10px;
    color: #4ade80; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 28px;
    opacity: 0; animation: fadeUp .8s cubic-bezier(.16,1,.3,1) .1s forwards;
}
.avail-line { width: 28px; height: 2px; background: #4ade80; border-radius: 2px; flex-shrink: 0; }
.avail-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.6); animation: blink 2s ease-in-out infinite; flex-shrink: 0; }
.avail-text { color: #4ade80; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
[data-theme="light"] .avail-badge { color: #16a34a; }
[data-theme="light"] .avail-line { background: #16a34a; }
[data-theme="light"] .avail-text { color: #16a34a; }
.hero-name {
    font-family: var(--font-display); font-weight: 800; line-height: 1.05;
    margin-bottom: 28px; letter-spacing: -0.03em;
    opacity: 0; animation: fadeUp .8s cubic-bezier(.16,1,.3,1) .2s forwards;
}
.hero-name-first { display: block; font-size: clamp(52px, 8vw, 96px); color: var(--text); }
.hero-name-middle { display: block; font-size: clamp(52px, 8vw, 96px); color: var(--primary); }
.hero-name-middle em { font-style: italic; }
.hero-name-last { display: block; font-size: clamp(52px, 8vw, 96px); color: var(--text); }
.hero-info {
    margin-bottom: 24px;
    opacity: 0; animation: fadeUp .8s cubic-bezier(.16,1,.3,1) .4s forwards;
}
.hero-title {
    font-size: 12px; font-weight: 700; letter-spacing: 3px; color: var(--text-secondary);
    margin-bottom: 6px;
}
.hero-location {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 13px; color: var(--text-secondary); font-weight: 500;
}
.hero-location svg { color: var(--primary); flex-shrink: 0; }
.hero-bio {
    color: var(--text-secondary); font-size: 15px; line-height: 1.85; max-width: 460px;
    margin-bottom: 40px;
    opacity: 0; animation: fadeUp .8s cubic-bezier(.16,1,.3,1) .55s forwards;
}
.hero-cta {
    display: flex; gap: 16px; flex-wrap: wrap;
    opacity: 0; animation: fadeUp .8s cubic-bezier(.16,1,.3,1) .7s forwards;
}
@keyframes fadeUp { from{opacity:0;transform:translateY(28px);filter:blur(3px)} to{opacity:1;transform:translateY(0);filter:blur(0)} }

/* ── Buttons ── */
.btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 16px 36px; border-radius: 12px; font-size: 13px; font-weight: 700;
    text-decoration: none; transition: all .4s cubic-bezier(.16,1,.3,1); border: none;
    font-family: var(--font); letter-spacing: 1.2px; text-transform: uppercase;
    position: relative; overflow: hidden;
}
.btn-primary {
    background: var(--primary); color: #0c0c0c;
    box-shadow: 0 4px 24px rgba(${hexToRgb(p)}, 0.25);
}
.btn-primary::after {
    content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    transition: none;
}
.btn-primary:hover::after { left: 120%; transition: left .7s ease; }
.btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(${hexToRgb(p)}, 0.35), 0 0 0 1px rgba(${hexToRgb(p)}, 0.12); }
[data-theme="light"] .btn-primary { color: #fff; }
.btn-outline { background: transparent; color: var(--text); border: 1.5px solid var(--border); border-radius: 12px; }
.btn-outline:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 24px rgba(${hexToRgb(p)}, 0.08); }

/* ── Sections ── */
section[id] { scroll-margin-top: 70px; }
.section { padding: 100px 0; position: relative; }
.section-header { text-align: center; margin-bottom: 48px; }
.section-tag {
    display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--primary);
    background: rgba(${hexToRgb(p)}, 0.05); border: 1px solid rgba(${hexToRgb(p)}, 0.1);
    padding: 7px 20px; border-radius: 50px; margin-bottom: 18px;
    transition: background .3s, border-color .3s;
}
.section-header:hover .section-tag { background: rgba(${hexToRgb(p)}, 0.08); border-color: rgba(${hexToRgb(p)}, 0.2); }
.section-title {
    font-family: var(--font-display); font-size: clamp(32px, 5vw, 44px); font-weight: 700;
    letter-spacing: -0.02em; line-height: 1.2; color: var(--text);
}
.section-desc { color: var(--text-secondary); font-size: 16px; max-width: 480px; margin: 12px auto 0; line-height: 1.7; }

/* ── About ── */
.about-section { background: var(--bg-secondary); position: relative; overflow: hidden; }
.about-section::before {
    content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 600px; height: 300px;
    background: radial-gradient(ellipse, rgba(${hexToRgb(p)}, 0.04), transparent 70%); pointer-events: none;
}
.about-content { max-width: 680px; margin: 0 auto; text-align: center; }
.about-text p { font-size: 17px; color: var(--text-secondary); line-height: 2; }
.about-divider {
    width: 100px; height: 2px; margin: 48px auto 0;
    background: linear-gradient(90deg, transparent, rgba(${hexToRgb(p)}, 0.4), transparent);
    border-radius: 2px;
}

/* ── Work Grid ── */
.work-section { overflow: hidden; }
.work-section::before {
    content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.03;
    background-image: radial-gradient(rgba(${hexToRgb(p)}, 0.15) 1px, transparent 1px);
    background-size: 40px 40px;
}
.work-section .container { position: relative; z-index: 1; }
.work-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
}
.portfolio-card {
    background: var(--card-bg-glass); border: 1px solid var(--border); border-radius: 20px;
    overflow: hidden; transition: all .5s cubic-bezier(.16,1,.3,1);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    position: relative;
}
.portfolio-card::after {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: linear-gradient(45deg, transparent 42%, rgba(255,255,255,0.04) 50%, transparent 58%);
    transform: translateX(-100%); pointer-events: none; z-index: 0; border-radius: 20px;
}
.portfolio-card:hover::after { transform: translateX(100%); transition: transform .8s ease; }
.portfolio-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 32px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(${hexToRgb(p)}, 0.12), 0 0 40px rgba(${hexToRgb(p)}, 0.04);
    border-color: rgba(${hexToRgb(p)}, 0.25);
}
[data-theme="light"] .portfolio-card { background: var(--card-bg); backdrop-filter: none; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
[data-theme="light"] .portfolio-card:hover { box-shadow: 0 24px 56px rgba(0,0,0,0.08); }
.card-media { position: relative; overflow: hidden; aspect-ratio: 16/9; background: var(--bg-secondary); }
.card-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s cubic-bezier(.16,1,.3,1); }
.card-media iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
.portfolio-card:hover .card-media img { transform: scale(1.05); }
.drive-wrap { position: relative; width: 100%; height: 100%; }
.placeholder-thumb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--primary); background: var(--bg-secondary); }
.thumb-fallback { width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-secondary); background: var(--bg-secondary); font-size: 12px; text-align: center; padding: 12px; }
.video-thumb { position: relative; width: 100%; height: 100%; }
.video-thumb img { width: 100%; height: 100%; object-fit: cover; }
.play-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(0,0,0,0.3); transition: background .35s; }
.video-thumb:hover .play-overlay { background: rgba(0,0,0,0.5); }
.play-circle { width: 60px; height: 60px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 28px rgba(0,0,0,0.3); transition: all .4s cubic-bezier(.16,1,.3,1); }
.video-thumb:hover .play-circle { transform: scale(1.12); box-shadow: 0 8px 36px rgba(${hexToRgb(p)}, 0.5); }
.play-label { color: #fff; font-size: 10px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.card-body { padding: 22px; }
.card-tag { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--primary); background: rgba(${hexToRgb(p)}, 0.06); padding: 4px 12px; border-radius: 50px; margin-bottom: 10px; }
.card-title { font-size: 17px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.02em; }
.card-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }
.portfolio-card.reveal { transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }

/* ── Contact ── */
.contact-section { background: var(--bg-secondary); text-align: center; }
.contact-inner { max-width: 900px; margin: 0 auto; }
.contact-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px; margin-top: 40px;
}
.contact-card {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 32px 18px; background: var(--card-bg-glass); border: 1px solid var(--border);
    border-radius: 18px; color: var(--text); text-decoration: none;
    transition: all .4s cubic-bezier(.16,1,.3,1); text-align: center;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    position: relative; overflow: hidden;
}
.contact-card::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 0%, rgba(${hexToRgb(p)}, 0.06), transparent 70%);
    opacity: 0; transition: opacity .4s ease;
}
.contact-card:hover::before { opacity: 1; }
.contact-card:hover {
    border-color: rgba(${hexToRgb(p)}, 0.2); transform: translateY(-8px);
    box-shadow: 0 20px 56px rgba(${hexToRgb(p)}, 0.08), 0 0 0 1px rgba(${hexToRgb(p)}, 0.06);
}
[data-theme="light"] .contact-card { background: #fff; backdrop-filter: none; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
[data-theme="light"] .contact-card:hover { box-shadow: 0 12px 36px rgba(0,0,0,0.06); }
.contact-card-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: rgba(${hexToRgb(p)}, 0.06); border: 1px solid rgba(${hexToRgb(p)}, 0.08);
    display: flex; align-items: center; justify-content: center; color: var(--primary);
    transition: all .4s cubic-bezier(.16,1,.3,1);
}
.contact-card:hover .contact-card-icon { background: var(--primary); color: #fff; border-color: var(--primary); border-radius: 50%; transform: scale(1.1); box-shadow: 0 6px 20px rgba(${hexToRgb(p)}, 0.25); }
.contact-card-label { font-size: 13px; font-weight: 700; letter-spacing: 0.3px; }
.contact-card-value { font-size: 11px; color: var(--text-secondary); word-break: break-all; }

/* ── Footer ── */
.footer { padding: 64px 0 32px; border-top: 1px solid var(--border); color: var(--text-secondary); font-size: 13px; position: relative; overflow: hidden; }
.footer::before { content: ''; position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 300px; height: 2px; background: linear-gradient(90deg, transparent, rgba(${hexToRgb(p)}, 0.35), transparent); }
.footer::after { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 500px; height: 120px; background: radial-gradient(ellipse, rgba(${hexToRgb(p)}, 0.03), transparent 70%); pointer-events: none; }
.footer-inner { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; gap: 24px; }
.footer-brand p { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
.footer-logo { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text); text-decoration: none; }
.footer-socials { display: flex; gap: 6px; }
.footer-socials a { color: var(--text-secondary); display: inline-flex; padding: 10px; border-radius: 12px; border: 1px solid var(--border); transition: all .4s cubic-bezier(.16,1,.3,1); background: transparent; }
.footer-socials a:hover { color: var(--primary); border-color: rgba(${hexToRgb(p)}, 0.2); background: rgba(${hexToRgb(p)}, 0.06); transform: translateY(-4px); box-shadow: 0 6px 24px rgba(${hexToRgb(p)}, 0.08); }
.footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid var(--border); font-size: 12px; color: var(--text-secondary); opacity: 0.6; }
.footer-credit a { color: var(--primary); text-decoration: none; font-weight: 500; }
.footer-credit a:hover { text-decoration: underline; }

/* ── Scroll Progress ── */
.scroll-progress { position: fixed; top: 0; left: 0; height: 2px; background: linear-gradient(90deg, var(--primary), rgba(${hexToRgb(p)}, 0.4)); z-index: 9999; width: 0; transition: width 0.1s linear; pointer-events: none; }

/* ── Reveal ── */
.reveal { opacity: 0; transform: translateY(40px) scale(0.98); transition: opacity .75s ease-out, transform .75s cubic-bezier(.16,1,.3,1), filter .75s ease; filter: blur(6px); }
.reveal.visible { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }

/* ── Mobile ── */
@media (max-width: 768px) {
    .container { padding: 0 20px; }
    .navbar { padding: 14px 20px; }
    .navbar.scrolled { padding: 10px 20px; }
    .nav-links { display: none; position: fixed; top: 56px; left: 0; right: 0; background: var(--bg); flex-direction: column; padding: 24px; gap: 16px; border-bottom: 1px solid var(--border); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    .nav-links.open { display: flex; }
    .mobile-toggle { display: flex; }
    .hero { padding: 90px 0 60px; min-height: auto; }
    .hero-inner { flex-direction: column; padding: 0 20px; gap: 40px; text-align: center; }
    .hero-photo-frame { width: 280px; margin: 0 auto; }
    .hero-photo-frame::before { display: none; }
    .hero-info { text-align: center; }
    .hero-location { justify-content: center; }
    .hero-text-col { align-items: center; display: flex; flex-direction: column; }
    .hero-name-first, .hero-name-middle, .hero-name-last { font-size: clamp(36px, 10vw, 52px); }
    .hero-bio { text-align: center; margin-left: auto; margin-right: auto; }
    .hero-cta { justify-content: center; }
    .hero-orb { display: none; }
    .hero-bg-grid { display: none; }
    .section { padding: 64px 0; }
    .section-title { font-size: 28px; }
    .work-grid { grid-template-columns: 1fr; }
    .contact-grid { grid-template-columns: repeat(2, 1fr); }
    .footer-inner { flex-direction: column; align-items: center; text-align: center; }
    .footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
    .btn { min-height: 44px; font-size: 12px; }
    *, *::before, *::after { cursor: auto !important; }
    .cursor-dot, .cursor-ring { display: none !important; }
}
@media (max-width: 420px) {
    .hero-photo-frame { width: 240px; }
    .hero-name-first, .hero-name-middle, .hero-name-last { font-size: clamp(28px, 11vw, 40px); }
    .section { padding: 48px 0; }
    .section-title { font-size: 24px; }
    .contact-grid { grid-template-columns: 1fr; }
    .contact-card { flex-direction: row; text-align: left; gap: 12px; padding: 16px; }
    .contact-card-icon { width: 40px; height: 40px; flex-shrink: 0; }
    .navbar { padding: 10px 16px; }
    .nav-brand { font-size: 18px; }
}`;
    }

    // ── Generated Portfolio JS ─────────────────────────────────
    function generatePortfolioJS() {
        return `/* Auto-generated by Auto Portfolio Generator */
(function(){
    'use strict';

    var themeToggle = document.getElementById('theme-toggle');
    var currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    if(themeToggle) {
        themeToggle.addEventListener('click', function(){
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('theme', currentTheme);
            themeToggle.style.transform = 'rotate(360deg) scale(0.8)';
            setTimeout(function(){ themeToggle.style.transform = ''; }, 500);
        });
    }

    var mobileToggle = document.getElementById('mobile-toggle');
    var navLinks = document.getElementById('nav-links');
    if(mobileToggle) {
        mobileToggle.addEventListener('click', function(){ navLinks.classList.toggle('open'); });
    }
    if(navLinks) {
        navLinks.querySelectorAll('a').forEach(function(link){
            link.addEventListener('click', function(){ navLinks.classList.remove('open'); });
        });
    }

    // Navbar: glass on scroll + auto-hide on scroll down
    var navbar = document.getElementById('navbar');
    var scrollProg = document.getElementById('scroll-progress');
    var lastY = 0;
    window.addEventListener('scroll', function(){
        var y = window.scrollY;
        if(navbar){
            navbar.classList.toggle('scrolled', y > 60);
            if(y > 400 && y > lastY + 5) { navbar.style.transform = 'translateY(-100%)'; }
            else if(y < lastY - 5 || y < 100) { navbar.style.transform = 'translateY(0)'; }
        }
        if(scrollProg){
            var h = document.documentElement.scrollHeight - window.innerHeight;
            scrollProg.style.width = h > 0 ? ((y / h) * 100) + '%' : '0';
        }
        lastY = y;
    }, {passive:true});

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click', function(e){
            var t = document.querySelector(this.getAttribute('href'));
            if(t){ e.preventDefault(); var off = navbar ? navbar.offsetHeight : 0;
                window.scrollTo({top: t.getBoundingClientRect().top + window.scrollY - off, behavior:'smooth'});
            }
        });
    });

    // Staggered scroll reveal
    var reveals = document.querySelectorAll('.reveal');
    var revObs = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
            if(entry.isIntersecting){ entry.target.classList.add('visible'); revObs.unobserve(entry.target); }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(function(el){ revObs.observe(el); });

    // Staggered portfolio card reveal
    var cards = document.querySelectorAll('.portfolio-card');
    var cardObs = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
            if(entry.isIntersecting){
                var idx = Array.from(cards).indexOf(entry.target);
                entry.target.style.transitionDelay = (idx * 0.1) + 's';
                entry.target.classList.add('visible');
                cardObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    cards.forEach(function(c){ c.classList.add('reveal'); cardObs.observe(c); });

    // Active nav link
    var secs = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', function(){
        var sy = window.scrollY + 120;
        secs.forEach(function(s){
            var link = document.querySelector('.nav-links a[href="#'+s.id+'"]');
            if(link){
                if(sy >= s.offsetTop && sy < s.offsetTop + s.offsetHeight) link.classList.add('active');
                else link.classList.remove('active');
            }
        });
    }, {passive:true});

    // Parallax orbs on scroll
    var orbs = document.querySelectorAll('.hero-orb');
    if(orbs.length){
        window.addEventListener('scroll', function(){
            var y = window.scrollY;
            orbs.forEach(function(o, i){
                var speed = (i + 1) * 0.08;
                o.style.transform = 'translateY(' + (y * speed) + 'px)';
            });
        }, {passive:true});
    }

    // Magnetic button hover
    document.querySelectorAll('.btn').forEach(function(btn){
        btn.addEventListener('mousemove', function(e){
            var r = btn.getBoundingClientRect();
            var x = (e.clientX - r.left - r.width / 2) * 0.15;
            var y = (e.clientY - r.top - r.height / 2) * 0.15;
            btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        });
        btn.addEventListener('mouseleave', function(){
            btn.style.transform = '';
        });
    });

    // Tilt effect on portfolio cards (GPU-accelerated, no layout thrash)
    if(!window.matchMedia('(max-width:768px)').matches){
        document.querySelectorAll('.portfolio-card').forEach(function(card){
            card.addEventListener('mousemove', function(e){
                var r = card.getBoundingClientRect();
                var x = ((e.clientX - r.left) / r.width - 0.5) * 8;
                var y = ((e.clientY - r.top) / r.height - 0.5) * -8;
                card.style.transform = 'perspective(600px) rotateX(' + y + 'deg) rotateY(' + x + 'deg) translateY(-10px)';
            });
            card.addEventListener('mouseleave', function(){
                card.style.transform = '';
            });
        });
    }

    // Custom cursor
    if(!window.matchMedia('(max-width:768px)').matches&&!('ontouchstart' in window)){
        var cd=document.getElementById('cursor-dot'),cr=document.getElementById('cursor-ring');
        if(cd&&cr){
            var mx=-100,my=-100,rx=-100,ry=-100,hov=false;
            document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;},{passive:true});
            document.addEventListener('mouseleave',function(){cd.style.opacity='0';cr.style.opacity='0';});
            document.addEventListener('mouseenter',function(){cd.style.opacity='1';cr.style.opacity='1';});
            (function tick(){rx+=(mx-rx)*0.1;ry+=(my-ry)*0.1;cd.style.transform='translate3d('+(mx-4)+'px,'+(my-4)+'px,0)';cr.style.transform='translate3d('+(rx-18)+'px,'+(ry-18)+'px,0)';requestAnimationFrame(tick);})();
            document.addEventListener('mouseover',function(e){if(!hov&&e.target.closest('a,button,[onclick],select,.theme-toggle,.video-thumb')){hov=true;cd.classList.add('hovering');cr.classList.add('hovering');}});
            document.addEventListener('mouseout',function(e){if(hov&&e.target.closest('a,button,[onclick],select,.theme-toggle,.video-thumb')){hov=false;cd.classList.remove('hovering');cr.classList.remove('hovering');}});
        }
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
}

// Source Protection
(function(){
    var t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(60px);background:rgba(20,20,40,0.95);color:#9898b8;font-size:13px;padding:10px 22px;border-radius:10px;border:1px solid rgba(108,99,255,0.2);z-index:999999;opacity:0;transition:all 0.3s;pointer-events:none;font-family:Inter,system-ui,sans-serif;backdrop-filter:blur(8px)';
    t.textContent='Source code is protected';
    document.body.appendChild(t);
    function s(){t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';clearTimeout(t._i);t._i=setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(60px)';},2000);}
    document.addEventListener('contextmenu',function(e){e.preventDefault();s();});
    document.addEventListener('keydown',function(e){
        if(e.key==='F12'){e.preventDefault();s();return;}
        if(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='i'||e.key==='J'||e.key==='j'||e.key==='C'||e.key==='c')){e.preventDefault();s();return;}
        if(e.ctrlKey&&(e.key==='u'||e.key==='U'||e.key==='s'||e.key==='S'||e.key==='c'||e.key==='C')){e.preventDefault();s();return;}
    });
})();`;
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

    // ── Obfuscation & Minification ──────────────────────────────
    function obfuscateJS(code) {
        try {
            return 'eval(atob("' + btoa(unescape(encodeURIComponent(code))) + '"))';
        } catch (e) {
            return code;
        }
    }

    function minifyCSS(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s*([{}:;,>~+])\s*/g, '$1')
            .replace(/;\}/g, '}')
            .replace(/\s{2,}/g, ' ')
            .replace(/\n/g, '')
            .trim();
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
            const cssContent = minifyCSS(generatePortfolioCSS(state.theme));

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

    // ── Welcome Modal ────────────────────────────────────────────
    const welcomeOverlay = $('#welcome-overlay');
    const welcomeStartBtn = $('#welcome-start-btn');
    if (welcomeOverlay && welcomeStartBtn) {
        if (localStorage.getItem('ap_welcomed')) {
            welcomeOverlay.remove();
        } else {
            welcomeStartBtn.addEventListener('click', function () {
                welcomeOverlay.classList.add('hidden');
                localStorage.setItem('ap_welcomed', '1');
                setTimeout(function () { welcomeOverlay.remove(); }, 500);
            });
        }
    }

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

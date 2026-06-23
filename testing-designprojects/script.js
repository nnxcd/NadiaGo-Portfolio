const infoPanel  = document.getElementById('info-panel');
const worksPanel = document.getElementById('works-panel');
const allPanels  = [infoPanel, worksPanel];
const collapsedSize = new Map();


/* ── Panel open / close ──────────────────────────────────── */

function openPanel(panel) {
  const content = panel.querySelector('.panel-content');
  const startW  = panel.offsetWidth;
  const startH  = panel.offsetHeight;
  collapsedSize.set(panel.id, { w: startW, h: startH });

  // Measure target height at final width (off-screen)
  panel.style.transition = 'none';
  panel.style.width = '300px';
  content.style.display = 'block';
  panel.classList.add('is-open');
  const targetH = panel.scrollHeight;

  // Reset to collapsed size
  panel.style.width  = startW + 'px';
  panel.style.height = startH + 'px';
  panel.classList.remove('is-open');
  void panel.offsetWidth;

  // Animate to target
  panel.style.transition = '';
  panel.classList.add('is-open');
  panel.style.width  = '300px';
  panel.style.height = targetH + 'px';

  setTimeout(() => { panel.style.width = ''; }, 350);
}

function closePanel(panel) {
  const content = panel.querySelector('.panel-content');
  const saved   = collapsedSize.get(panel.id);

  panel.style.width  = panel.offsetWidth  + 'px';
  panel.style.height = panel.offsetHeight + 'px';
  void panel.offsetWidth;

  panel.classList.remove('is-open');
  panel.style.width  = saved ? saved.w + 'px' : '';
  panel.style.height = saved ? saved.h + 'px' : '';

  setTimeout(() => {
    content.style.display = 'none';
    panel.style.width  = '';
    panel.style.height = '';
    collapsedSize.delete(panel.id);
  }, 350);
}

function closeAll() {
  allPanels.forEach(p => { if (p.classList.contains('is-open')) closePanel(p); });
}

function togglePanel(panel) {
  if (panel.classList.contains('is-open')) {
    closePanel(panel);
  } else {
    if (window.innerWidth <= 768 && panel === infoPanel && overlay.classList.contains('is-open')) {
      closeOverlay();
    }
    openPanel(panel);
  }
}

document.getElementById('alan-xu-btn').addEventListener('click', () => { closeAll(); closeOverlay(); });
document.getElementById('info-btn').addEventListener('click',   () => togglePanel(infoPanel));
document.getElementById('works-btn').addEventListener('click',  () => togglePanel(worksPanel));
document.getElementById('archive-btn').addEventListener('click', showArchivePanel);


/* ── Info panel ──────────────────────────────────────────── */

function buildInfoPanel() {
  const infoContent = document.getElementById('info-content');

  function addSection(label, valueEl) {
    const div = document.createElement('div');
    div.className = 'info-section';
    if (label) {
      const lbl = document.createElement('span');
      lbl.className = 'info-label h2';
      lbl.textContent = label;
      div.appendChild(lbl);
    }
    div.appendChild(valueEl);
    infoContent.appendChild(div);
  }

  function textEl(content) {
    const el = document.createElement('span');
    el.className = 'info-value h2';
    el.textContent = content;
    return el;
  }

  function linkEl(text, href, onClick) {
    const el = document.createElement('a');
    el.className = 'info-value h2 info-link';
    el.textContent = text;
    if (onClick) {
      el.href = '#';
      el.addEventListener('click', e => { e.preventDefault(); onClick(); });
    } else {
      el.href = href;
      if (!href.startsWith('mailto:')) { el.target = '_blank'; el.rel = 'noopener'; }
    }
    return el;
  }

  // Live clock
  const clock = document.createElement('span');
  clock.className = 'info-value h2';
  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) + ' Los Angeles';
  }
  updateClock();
  setInterval(updateClock, 1000);
  addSection('Current Time & Location:', clock);

  addSection("What I'm doing right now:", textEl('Stressing about graduation'));
  addSection('Specialization:', textEl('Branding, Motion, Typography'));
  addSection('Email:', linkEl('hello@alanxu.info', 'mailto:hello@alanxu.info'));

  // Bio image — preload so scrollHeight is accurate when panel opens
  const bioImg = document.createElement('img');
  bioImg.className = 'info-value info-bio-img';
  bioImg.src = 'Other Assets/graphic design is my passion.png';
  const infoBtn = document.getElementById('info-btn');
  if (!bioImg.complete) {
    infoBtn.style.pointerEvents = 'none';
    const enableBtn = () => { infoBtn.style.pointerEvents = ''; };
    bioImg.addEventListener('load',  enableBtn, { once: true });
    bioImg.addEventListener('error', enableBtn, { once: true });
    setTimeout(enableBtn, 3000);
  }
  bioImg.style.cursor = 'pointer';
  bioImg.addEventListener('click', openResumeOverlay);
  addSection('Short Bio:', bioImg);
  // Remove gap between bio image and links
  bioImg.parentElement.style.marginBottom = '0';

  const linksDiv = document.createElement('div');
  linksDiv.className = 'info-section';
  const resumeWrapper = document.createElement('div');
  resumeWrapper.className = 'resume-btn-wrapper';
  resumeWrapper.style.cursor = 'pointer';
  resumeWrapper.addEventListener('click', openResumeOverlay);
  // Move bio image into the wrapper
  bioImg.parentElement.removeChild(bioImg);
  resumeWrapper.appendChild(bioImg);
  const resumeText = document.createElement('span');
  resumeText.className = 'h2 info-link resume-btn-text';
  resumeText.textContent = 'Click here for a lot more info';
  resumeWrapper.appendChild(resumeText);
  // Insert wrapper at end of previous section
  const bioSection = infoContent.lastElementChild;
  bioSection.appendChild(resumeWrapper);
  bioSection.style.marginBottom = '0';
  linksDiv.appendChild(document.createElement('br'));
  linksDiv.appendChild(linkEl('LinkedIn', 'https://www.linkedin.com/in/alan-xu-3093541b7/'));
  linksDiv.appendChild(linkEl('Instagram', 'https://www.instagram.com/alanxu.info/'));
  infoContent.appendChild(linksDiv);
}

buildInfoPanel();


/* ── Works list ──────────────────────────────────────────── */

async function loadWorks() {
  try {
    const res       = await fetch('works.json');
    const worksData = await res.json();

    const ul = document.createElement('ul');
    ul.className = 'project-list';
    worksData.projects.forEach(({ title, slug }) => {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.textContent = title;
      a.className = 'h2';
      a.href = '#';
      if (slug) {
        a.addEventListener('click', e => { e.preventDefault(); openOverlay(title, slug); });
      } else {
        a.style.opacity = '0.4';
        a.style.pointerEvents = 'none';
      }
      li.appendChild(a);
      ul.appendChild(li);
    });
    document.getElementById('works-content').appendChild(ul);
  } catch (err) {
    console.warn('Could not load works. Serve via a local HTTP server.', err);
  }
}

loadWorks();


/* ── Archive lightbox ────────────────────────────────────── */

function showArchivePanel() {
  const existing = document.getElementById('archive-backdrop');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'archive-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;cursor:pointer;';

  const panel = document.createElement('div');
  panel.style.cssText = 'width:500px;max-width:90vw;height:250px;background:#D7D7D7;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;';

  const text = document.createElement('span');
  text.className = 'h2';
  text.innerHTML = 'Sorry this bad boy isn\'t ready yet.<br><br>Come back later.';
  panel.appendChild(text);
  backdrop.appendChild(panel);

  document.getElementById('bg-grid').classList.add('blurred');

  backdrop.addEventListener('click', () => {
    backdrop.remove();
    if (!document.getElementById('project-overlay').classList.contains('is-open')) {
      document.getElementById('bg-grid').classList.remove('blurred');
    }
  }, { once: true });

  document.body.appendChild(backdrop);
}


/* ── Project overlay ─────────────────────────────────────── */

const overlay      = document.getElementById('project-overlay');
const overlayClose = document.getElementById('overlay-close');
const overlayBody  = document.getElementById('overlay-body');
let currentSlug    = null;
let overlayObserver = null;

function openResumeOverlay() {
  currentSlug = '__resume__';
  overlayBody.innerHTML = '';
  overlayBody.scrollTop = 0;
  overlayBody.style.overflowY = '';
  overlayBody.style.padding = '';
  if (window.innerWidth <= 768 && infoPanel.classList.contains('is-open')) closePanel(infoPanel);

  function makeEntry(lines) {
    const div = document.createElement('div');
    div.className = 'resume-entry';
    lines.forEach(({ text, cls }) => {
      const p = document.createElement('div');
      p.className = cls;
      p.textContent = text;
      div.appendChild(p);
    });
    return div;
  }

  function makeSection(title, entries) {
    const div = document.createElement('div');
    div.className = 'resume-col-section';
    const h = document.createElement('div');
    h.className = 'h2 resume-col-section-title';
    h.textContent = title;
    div.appendChild(h);
    entries.forEach(e => div.appendChild(e));
    return div;
  }

  function makeCompactEntry(text, date) {
    const div = document.createElement('div');
    div.className = 'resume-entry resume-entry-compact';
    const t = document.createElement('span');
    t.className = 'h2';
    t.textContent = text + ' ';
    div.appendChild(t);
    const d = document.createElement('span');
    d.className = 'caption';
    d.textContent = date;
    div.appendChild(d);
    return div;
  }

  const grid = document.createElement('div');
  grid.className = 'resume-columns';

  // Column 1: Education
  const col1 = document.createElement('div');
  col1.appendChild(makeSection('Education', [
    makeEntry([
      { text: 'Sept 2020 \u2013 April 2026', cls: 'h2' },
      { text: 'ArtCenter College of Design', cls: 'h2' },
      { text: 'Pasadena, CA', cls: 'h2' },
      { text: 'Bachelor of Fine Arts in Graphic Design', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Sept 2019 \u2013 May 2020', cls: 'h2' },
      { text: 'Woodbury University', cls: 'h2' },
      { text: 'Burbank, CA', cls: 'h2' },
      { text: 'Bachelor of Arts in Interdisciplinary Study', cls: 'caption' }
    ])
  ]));
  grid.appendChild(col1);

  // Column 2: Experience
  const col2 = document.createElement('div');
  col2.appendChild(makeSection('Experience', [
    makeEntry([
      { text: 'Sept 2020 \u2013 Ongoing', cls: 'h2' },
      { text: 'Freelance Graphic & Motion Designer', cls: 'h2' },
      { text: 'Independent', cls: 'h2' },
      { text: 'Design print, motion, interaction, and brand systems for startups and agencies in gaming, tech, fine art, and entertainment.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Jan 2020 \u2013 April 2026', cls: 'h2' },
      { text: 'Teaching Assistant', cls: 'h2' },
      { text: 'ArtCenter College of Design, Los Angeles, CA', cls: 'h2' },
      { text: 'Assisted faculty across undergraduate and graduate design courses, leading critiques and supporting concept and system development across print, motion, and transmedia. Provided technical and conceptual guidance during reviews and production.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Jan 2026 \u2013 Feb 2026 / Feb 2024 \u2013 Mar 2024', cls: 'h2' },
      { text: 'Freelance Graphic Designer', cls: 'h2' },
      { text: 'Massive Assembly, Los Angeles, CA', cls: 'h2' },
      { text: 'Developed brand identity systems for Riot Games\u2019 2024 VALORANT World Championship Tour and League of Legends MSI 26, producing scalable assets for global event branding.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Oct 2025 \u2013 Dec 2025', cls: 'h2' },
      { text: 'Design Residency', cls: 'h2' },
      { text: 'Fork, Seoul, Korea', cls: 'h2' },
      { text: 'Developed original work with guidance from designer Moonsick Gang from research and experimentation through production and public exhibition.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'May 2025 \u2013 Aug 2025', cls: 'h2' },
      { text: 'Berlin Study Away', cls: 'h2' },
      { text: 'ArtCenter College of Design, Berlin, Germany', cls: 'h2' },
      { text: 'Developed a body of design work informed by direct engagement with research on Berlin\u2019s cultural, social, and urban infrastructures during a three-month study-away semester.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Jan 2025 \u2013 May 2025', cls: 'h2' },
      { text: 'Freelance Junior Motion Designer', cls: 'h2' },
      { text: 'Hornet, New York, NY', cls: 'h2' },
      { text: 'Designed and animated motion graphics for internal and external projects in collaboration with the studio team. Contributed to client-facing work for brands including Apple, Sonic, and Buffalo Wild Wings.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'May 2021 \u2013 April 2025', cls: 'h2' },
      { text: 'Graphic Design Department Events Team Lead', cls: 'h2' },
      { text: 'ArtCenter College of Design, Los Angeles, CA', cls: 'h2' },
      { text: 'Designed and managed the ArtCenter Designer Speaker Series, coordinating outreach to international designers and producing promotional assets for department events and communications.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'April 2024 \u2013 Aug 2024', cls: 'h2' },
      { text: 'Sponsored Studio', cls: 'h2' },
      { text: 'Samsung x ArtCenter, Los Angeles, CA', cls: 'h2' },
      { text: 'Collaborated cross-disciplinarily on a hypothetical Samsung Galaxy campaign, designing a complete brand identity system to support product concepts and visuals.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'April 2024 \u2013 July 2024', cls: 'h2' },
      { text: 'Freelance Graphic & Motion Designer', cls: 'h2' },
      { text: '10 Summers/DJ Mustard, Los Angeles, CA', cls: 'h2' },
      { text: 'Designed brand and identity system for DJ Mustard, including logo, typography, 2D and 3D animation, vinyl album artwork, title cards, and supporting visual assets.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'May 2023 \u2013 Sept 2023', cls: 'h2' },
      { text: 'Graphic Design Intern', cls: 'h2' },
      { text: 'Massive Assembly', cls: 'h2' },
      { text: 'Designed a 250-page process book documenting four cinematic projects from concept to final render. Created internal motion assets for presentations and communications.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Jan 2022 \u2013 May 2022', cls: 'h2' },
      { text: 'Orientation Leader', cls: 'h2' },
      { text: 'ArtCenter College of Design, Los Angeles, CA', cls: 'h2' },
      { text: 'Assisted incoming students in navigating the academic, social, and cultural environment of ArtCenter. Designed digital assets to support orientation programming and communications.', cls: 'caption' }
    ]),
    makeEntry([
      { text: 'Jan 2021 \u2013 Jan 2022', cls: 'h2' },
      { text: 'Graphic Design Representative', cls: 'h2' },
      { text: 'ArtCenter College of Design, Los Angeles, CA', cls: 'h2' },
      { text: 'Organized events and workshops, addressed student feedback with strategic solutions, and collaborated with other department representatives and chairs to enhance the ArtCenter experience.', cls: 'caption' }
    ])
  ]));
  grid.appendChild(col2);

  // Column 3: Awards, Exhibition, Press
  const col3 = document.createElement('div');

  col3.appendChild(makeSection('Awards & Recognition', [
    makeCompactEntry('Communication Arts, Typography Annual + Design Annual x2', '2025\u201324'),
    makeCompactEntry('World\u2019s Best Typography 45, Judge\u2019s Choice', '2024'),
    makeCompactEntry('TDC Young Ones, Top 3 + Winner Brand & Identity + Winner Motion', '2024'),
    makeCompactEntry('ADC Young Ones, Merit', '2024'),
    makeCompactEntry('C2A, Best of Best in Animation + Winner Brand Identity', '2024'),
    makeCompactEntry('Kyoto Global Design Awards, Visual Winner x3', '2024'),
    makeCompactEntry('Core77, Brand and Identity Student Winner + Communication Design Student Notable', '2024\u201323'),
    makeCompactEntry('Graphis New Talent, Platinum + Gold x2 + Silver', '2024\u201323'),
    makeCompactEntry('DNA Paris, Communication + Branding Communication + Typography x2', '2024'),
    makeCompactEntry('Design MasterPrize, Best of Best Brand Identity', '2024'),
    makeCompactEntry('IDA, Bronze', '2024'),
    makeCompactEntry('Indigo Design Award, Gold Computer Animation + Silver Branding x2', '2024'),
    makeCompactEntry('Cidea Design Award, NewStar Award + Design Award', '2024'),
    makeCompactEntry('World Brand Design Society, Bronze', '2024')
  ]));

  col3.appendChild(makeSection('Exhibition', [
    makeCompactEntry('Fork Unfolding #3, Seoul Korea', '2026'),
    makeCompactEntry('TDC70 Traveling Exhibition', '2024\u201325'),
    makeCompactEntry('HMCT Gallery, LA', '2024'),
    makeCompactEntry('ArtCenter Student Gallery, LA', '2021\u201322')
  ]));

  col3.appendChild(makeSection('Press', [
    makeCompactEntry('Bold Journey, Meet Alan Xu', '2025'),
    makeCompactEntry('ArtCenter View Book', '2025\u201326'),
    makeCompactEntry('Graphic Design USA, Student to Watch', '2024'),
    makeCompactEntry('Graphis Blog, ArtCenter Student\u2019s Platinum Brand Play', '2024'),
    makeCompactEntry('Indigo Design Award, Interview with Alan Xu', '2024'),
    makeCompactEntry('Graphis Blog, New Talent Elevates Their Design Game', '2024')
  ]));

  const statement = document.createElement('div');
  statement.className = 'h2 overlay-description';
  const para1 = document.createElement('p');
  para1.textContent = 'Finding light in what feels impossible is what drives my work. When nothing works, I step back. I take a breath and look at the problem from a different angle. There is always another perspective, another possibility.';
  const para2 = document.createElement('p');
  para2.textContent = 'The challenge isn\u2019t avoiding difficulty, it\u2019s looking at it from another direction to recognize the hidden opportunity. That\u2019s how I approach design. I don\u2019t settle when something feels stuck. I reframe it. I refine it. I work until confusion becomes clarity and obstacles become opportunities.';
  para1.style.marginBottom = '10px';
  statement.appendChild(para1);
  statement.appendChild(para2);
  overlayBody.appendChild(statement);

  grid.appendChild(col3);
  overlayBody.appendChild(grid);

  const pdfLink = document.createElement('a');
  pdfLink.className = 'h2 info-link';
  pdfLink.textContent = 'PDF copy here :D';
  pdfLink.href = 'Other Assets/AX_Resume_26.pdf';
  pdfLink.target = '_blank';
  pdfLink.rel = 'noopener';
  overlayBody.appendChild(pdfLink);

  overlay.classList.add('is-open');
  document.getElementById('bg-grid').classList.add('blurred');
}

async function openOverlay(title, slug) {
  if (!slug) return;
  if (slug === currentSlug && overlay.classList.contains('is-open')) return;

  currentSlug = slug;
  if (overlayObserver) { overlayObserver.disconnect(); overlayObserver = null; }
  overlayBody.innerHTML = '';
  overlayBody.scrollTop = 0;
  overlayBody.style.padding = '';
  overlayBody.style.overflowY = '';

  if (window.innerWidth <= 768 && infoPanel.classList.contains('is-open')) closePanel(infoPanel);
  if (!worksPanel.classList.contains('is-open')) openPanel(worksPanel);

  overlay.classList.add('is-open');
  document.getElementById('bg-grid').classList.add('blurred');

  try {
    const res  = await fetch(`projects/${slug}/data.json`);
    const data = await res.json();
    if (slug !== currentSlug) return;

    const mediaElements = [];

    const titleEl = document.createElement('p');
    titleEl.className = 'h1';
    titleEl.textContent = data.title;
    overlayBody.appendChild(titleEl);

    const cats = document.createElement('p');
    cats.className = 'caption';
    cats.textContent = data.categories.join(', ');
    overlayBody.appendChild(cats);

    const desc = document.createElement('div');
    desc.className = 'h2 overlay-description';
    data.description.split('\n\n').forEach((para, i, arr) => {
      const p = document.createElement('p');
      p.textContent = para;
      if (i < arr.length - 1) p.style.marginBottom = '10px';
      desc.appendChild(p);
    });
    overlayBody.appendChild(desc);

    if (data.details) {
      desc.style.marginBottom = '15px';
      const detailsGrid = document.createElement('div');
      detailsGrid.className = 'resume-columns';
      detailsGrid.style.marginBottom = '30px';
      data.details.forEach(col => {
        const colDiv = document.createElement('div');
        const heading = document.createElement('div');
        heading.className = 'h2';
        heading.textContent = col.heading + ':';
        colDiv.appendChild(heading);
        const items = document.createElement('div');
        items.className = 'h2';
        items.textContent = col.items.join(', ');
        colDiv.appendChild(items);
        detailsGrid.appendChild(colDiv);
      });
      overlayBody.appendChild(detailsGrid);
    }

    data.media.forEach(item => {
      let el;
      if (item.type === 'image') {
        el = document.createElement('img');
        el.src = `projects/${slug}/${item.src}`;
        el.style.width = '100%';
        el.style.display = 'block';
      } else if (item.type === 'video') {
        el = document.createElement('video');
        el.src = `projects/${slug}/${item.src}`;
        el.muted = true;
        el.loop = true;
        el.autoplay = true;
        el.playsInline = true;
        el.setAttribute('muted', '');
        el.setAttribute('playsinline', '');
        el.style.width = '100%';
        el.style.display = 'block';
      } else if (item.type === 'duo' || item.type === 'duo-mobile-solo' || item.type === 'trio' || item.type === 'trio-mobile-solo' || item.type === 'quad' || item.type === 'gallery' || item.type === 'gallery-4' || item.type === 'gallery-4-nogap' || item.type === 'gallery-5' || item.type === 'gallery-5-nogap' || item.type === 'gallery-8') {
        el = document.createElement('div');
        if (item.type === 'duo') el.className = 'media-duo';
        else if (item.type === 'duo-mobile-solo') el.className = 'media-duo media-duo-mobile-solo';
        else if (item.type === 'trio') el.className = 'media-trio';
        else if (item.type === 'trio-mobile-solo') el.className = 'media-trio media-trio-mobile-solo';
        else if (item.type === 'quad') el.className = 'media-quad';
        else if (item.type === 'gallery-4') el.className = 'media-gallery-4';
        else if (item.type === 'gallery-4-nogap') el.className = 'media-gallery-4-nogap';
        else if (item.type === 'gallery-5') el.className = 'media-gallery-5';
        else if (item.type === 'gallery-5-nogap') el.className = 'media-gallery-5-nogap';
        else if (item.type === 'gallery-8') el.className = 'media-gallery-8';
        else el.className = 'media-gallery';
        item.items.forEach(src => {
          let child;
          if (/\.(mp4|webm|mov)$/i.test(src)) {
            child = document.createElement('video');
            child.src = `projects/${slug}/${src}`;
            child.muted = true;
            child.loop = true;
            child.autoplay = true;
            child.playsInline = true;
            child.setAttribute('muted', '');
            child.setAttribute('playsinline', '');
            child.style.width = '100%';
            child.style.display = 'block';
          } else {
            child = document.createElement('img');
            child.src = `projects/${slug}/${src}`;
            child.style.width = '100%';
            child.style.display = 'block';
          }
          child.classList.add('media-item');
          el.appendChild(child);
          mediaElements.push(child);
        });
      } else if (item.type === 'iframe') {
        el = document.createElement('iframe');
        el.src = item.src;
        el.style.cssText = 'border:0;width:100%;height:' + (item.height || '600px') + ';';
        el.allowFullscreen = true;
        el.setAttribute('scrolling', 'no');
        if (item.allow) el.allow = item.allow;
      } else if (item.type === 'youtube' || item.type === 'youtube-autoplay') {
        el = document.createElement('div');
        el.style.cssText = 'position:relative;width:100%;aspect-ratio:16/9;';
        const iframe = document.createElement('iframe');
        const sep = item.src.includes('?') ? '&' : '?';
        if (item.type === 'youtube-autoplay') {
          const videoId = item.src.split('/embed/')[1]?.split('?')[0] || '';
          iframe.src = item.src + sep + 'autoplay=1&mute=1&playsinline=1&loop=1&controls=0&playlist=' + videoId;
          iframe.allow = 'autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
          iframe._autoplay = true;
        } else {
          iframe.src = item.src + sep + 'autoplay=0';
          iframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        }
        iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
        iframe.allowFullscreen = true;
        el.appendChild(iframe);
      }
      if (el) {
        if (item.type !== 'gallery') { el.classList.add('media-item'); mediaElements.push(el); }
        overlayBody.appendChild(el);
        if (item.caption) {
          const cap = document.createElement('p');
          cap.className = (item.captionClass || 'caption') + ' media-caption';
          cap.textContent = item.caption;
          overlayBody.appendChild(cap);
        }
      }
    });

    if (data.credits) {
      const creditsGrid = document.createElement('div');
      creditsGrid.className = 'resume-columns';
      data.credits.forEach(col => {
        const colDiv = document.createElement('div');
        col.forEach(section => {
          const sectionDiv = document.createElement('div');
          sectionDiv.style.marginBottom = '15px';
          const heading = document.createElement('div');
          heading.className = 'h2';
          heading.style.marginBottom = '2px';
          heading.textContent = section.heading;
          sectionDiv.appendChild(heading);
          section.names.forEach(name => {
            const line = document.createElement('div');
            line.className = 'h2';
            line.textContent = name;
            sectionDiv.appendChild(line);
          });
          colDiv.appendChild(sectionDiv);
        });
        creditsGrid.appendChild(colDiv);
      });
      overlayBody.appendChild(creditsGrid);
    }

    setTimeout(() => {
      mediaElements.forEach((el, i) => setTimeout(() => {
        el.classList.add('visible');
        if (el.tagName === 'VIDEO') el.play().catch(() => {});
        el.querySelectorAll('video').forEach(v => v.play().catch(() => {}));
      }, i * 80));
    }, 400);

    // Pause non-autoplay iframes when scrolled out of view
    overlayObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && entry.target.tagName === 'IFRAME') {
          entry.target.src = entry.target.src.replace('autoplay=1', 'autoplay=0');
        }
      });
    }, { root: overlayBody, threshold: 0.1 });

    overlayBody.querySelectorAll('iframe').forEach(f => {
      if (!f._autoplay) overlayObserver.observe(f);
    });

  } catch (err) {
    console.warn('Could not load project data:', err);
  }
}

function closeOverlay() {
  if (overlayObserver) { overlayObserver.disconnect(); overlayObserver = null; }
  overlayBody.querySelectorAll('iframe').forEach(f => {
    if (!f._autoplay) f.src = f.src;
  });
  overlay.classList.remove('is-open');
  overlayBody.style.padding = '';
  overlayBody.style.overflowY = '';
  document.getElementById('bg-grid').classList.remove('blurred');
  currentSlug = null;
}

overlayClose.addEventListener('click', closeOverlay);

document.getElementById('bg-grid').addEventListener('click', () => {
  closeAll();
  if (overlay.classList.contains('is-open')) closeOverlay();
});

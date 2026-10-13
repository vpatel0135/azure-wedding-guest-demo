/* ==========================================================================
   OUR WEDDING — GUEST APPLICATION (standalone build)
   ==========================================================================
   This is the ENTIRE client-side logic for the public Guest site. It is a
   separate, self-contained application — not a mode inside the private
   planning application. It never references the private application's own
   full in-memory dataset or its seed of authored planning work, never
   contains its access code, and contains none of its operational
   rendering code (the internal dashboard, task/decision/note management,
   the advanced-tools surface, detail drawers, etc.) — that code simply
   does not exist in this file, so there is nothing here that could leak it.

   It reads exactly one data source: `guestData`, defined in
   guest-data.generated.js immediately before this file in the built
   guest/index.html. guestData is produced by build/generate_guest_data.js,
   which walks the canonical data.js and copies out only an explicit,
   positive allowlist of fields the functions below actually read — see
   that script for the allowlist itself. If a function below doesn't read
   a field, that field was never copied into guestData in the first place.

   Most of the query-layer functions here (guestEvents, guestTimeline,
   timelineQuery, rollup helpers, phase/date helpers, transportation
   filtering) are intentionally near-identical to the equivalent functions
   in the Wedding Team app's app.js — same names, same logic — because they
   were always the "guest read layer" of one shared design, and keeping the
   logic identical is what makes it possible to verify by inspection that
   this file behaves exactly like the guest experience already did inside
   the combined prototype. The difference is what they read (guestData,
   already pre-filtered and field-stripped at build time) and what code
   surrounds them (nothing operational).
   ========================================================================== */
(function(){
"use strict";

/* ---------------------------- Constants ---------------------------- */
const ICONS = {
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
};

/* GUEST PREVIEW MODE (2026-08-29): namespaced independently of the Wedding
   Team app's own localStorage keys (which this build never even ships the
   code to read/write) — purely a QA/preview convenience for maintainers, holds
   only a timestamp, never wedding content. An ordinary guest never sees or
   sets this: the demo clock control (see guestDemoClockHtml() /
   wireGuestDemoClock() below) is opt-in, appearing only when the page URL
   carries ?demo=1 (isPreviewMode()). Without that query parameter, every
   visitor gets real time, unconditionally — loadPersisted() below ignores
   any stored value entirely when not in preview mode, so a stray
   left-over localStorage entry (e.g. from a previous preview session on a
   shared or borrowed device) can never leak simulated time to a real
   guest. This replaces an earlier build's always-on simulated-date
   fallback, which made every guest see a permanently simulated date and a
   permanent "Preview mode" banner with no way back to real time short of
   editing devtools — not appropriate once the site is live for real
   guests. */
const LS_KEYS = { SIM_DATE: "wos_guest_sim_date" };
/* Preset "jump to" moments for the guest demo clock — one representative,
   comfortably-inside-the-window timestamp per event (mirrors the ops
   Wedding Team app's own demo-clock presets for Mehndi/Vidhi/Sangeet/
   Wedding; Reception and Farewell are guest-specific additions since the
   guest site has no finer ops-only sub-moments like Photo Groups or
   Reception Seating to jump to separately). Format matches
   <input type="datetime-local"> (no seconds), same as team-app.js. */
const GUEST_DEMO_PRESETS = [
  {value: "2027-06-10T18:15", label: "Welcome · 6:15 PM"},
  {value: "2027-06-11T10:00", label: "Family Ceremony · 10:00 AM"},
  {value: "2027-06-11T19:30", label: "Music Night · 7:30 PM"},
  {value: "2027-06-12T15:00", label: "Wedding · 3:00 PM"},
  {value: "2027-06-12T19:00", label: "Reception · 7:00 PM"},
  {value: "2027-06-13T10:00", label: "Farewell Brunch · 10:00 AM"}
];
/* True only when this page load explicitly opted into preview mode via
   ?demo=1 in the URL. The guest site is a single-page app with no
   internal link ever changing location.search (every internal "nav" is a
   JS state change via data-guest-nav buttons — see wireGuestShellEvents;
   the only <a href> elements are external, target="_blank" links to the
   Lens camera and Google Maps), so this stays true for the whole visit
   without any extra plumbing to "preserve" the query string on navigation. */
function isPreviewMode(){
  try{ return new URLSearchParams(location.search).get("demo") === "1"; }
  catch(e){ return false; }
}

/* ---------------------------- State ---------------------------- */
const state = {
  guestView: "home",          // home | timeline
  guestScheduleEventId: null, // null = event picker; an event id = that event's schedule
  simDate: null
};

const data = guestData; // guestData is defined in guest-data.generated.js, loaded just before this file

function loadPersisted(){
  /* Ordinary guests (no ?demo=1): always real time, full stop — never
     even consult localStorage, so no stored preview state can leak. */
  if(!isPreviewMode()){ state.simDate = null; return; }
  /* Preview mode: restore whatever simulated time (if any) was last
     applied, so navigating Home/Schedule — or reloading — within the same
     browser keeps showing the same moment until Real Time is pressed. */
  try{
    const simIso = localStorage.getItem(LS_KEYS.SIM_DATE);
    state.simDate = (simIso && !Number.isNaN(new Date(simIso).getTime())) ? new Date(simIso) : null;
  }catch(e){ state.simDate = null; }
}

/* ---------------------------- Utils ---------------------------- */
function now(){ return state.simDate ? state.simDate : new Date(); }
function isDemoClock(){ return !!state.simDate; }
function byId(arr, id){ return arr.find(x=>x.id===id); }
function ev(id){ return byId(data.events, id); }
function tlItem(id){ return byId(data.timelineItems, id); }
function venueOf(id){ return byId(data.venues, id); }

function fmtDate(d, opts){
  const date = (d instanceof Date) ? d : new Date(d);
  return date.toLocaleDateString('en-US', opts || {month:'short', day:'numeric'});
}
function fmtTime(d){
  const date = (d instanceof Date) ? d : new Date(d);
  return date.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', hour12:true});
}
/* GUEST MAIN-POINT TIMELINE correction (2026-08-22): a public highlight
   sourced from the Sheet carries its exact authored time text
   (sourceTimeLabel — a single time like "6:00 PM," or a range like
   "10:30:00 - 12:30:00 AM"). team-app.js shows that text verbatim; the
   guest site instead runs it through normalizeTimeLabel() first (see
   below) so a raw Sheet artifact like "12:00:00 PM - 2:00:00 PM" never
   reaches a guest as-is. Every other public timeline item (none of which
   carry sourceTimeLabel) falls back to fmtTime() as before, which never
   includes seconds. */
function displayTimeLabel(item){
  return item.sourceTimeLabel != null ? normalizeTimeLabel(item.sourceTimeLabel) : fmtTime(item.time);
}
/* RESPONSIVE / TIME NORMALIZATION sweep (2026-08-29): sourceTimeLabel is
   hand-authored Sheet text and is not always clean — seconds sometimes
   survive ("12:00:00 PM - 2:00:00 PM"), a leading zero sometimes survives
   ("01:00:00"), and the AM/PM marker is sometimes only given on one side
   of a range ("01:00:00 - 2:00:00 PM"). Guests should never see any of
   that — only "12:00 PM – 2:00 PM" / "1:00 PM – 2:00 PM" style output:
   hour/minute/AM-PM preserved, seconds dropped, en dash between range
   ends. A single time (no range) is normalized the same way. Anything
   that doesn't parse as a recognizable time or time range (should not
   happen with well-formed Sheet data) is returned unchanged rather than
   risk mangling it. */
function normalizeTimeLabel(raw){
  if(typeof raw === "number" && Number.isFinite(raw)) {
    const minutes = Math.floor(((raw % 1 + 1) % 1) * 1440 + 1e-7);
    return `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2,"0")} ${minutes < 720 ? "AM" : "PM"}`;
  }
  if(typeof raw !== "string") return raw;
  const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([AaPp][Mm])?$/;
  const parseToken = (tok) => {
    const m = tok.trim().match(TIME_RE);
    if(!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
    return {hour: parseInt(m[1], 10), minute: m[2], meridiem: m[3] ? m[3].toUpperCase() : null};
  };
  /* Minutes since midnight under an assumed meridiem — comparisons below
     use full minute precision, not just the hour. */
  const toMin = (t, meridiem) => ((t.hour % 12) + (meridiem === "PM" ? 12 : 0)) * 60 + parseInt(t.minute, 10);
  const fmt = (t) => `${t.hour % 12 || 12}:${t.minute} ${t.meridiem}`;
  const rangeMatch = raw.match(/^\s*(.+?)\s*[-\u2013\u2014]\s*(.+?)\s*$/);
  if(rangeMatch){
    const start = parseToken(rangeMatch[1]);
    const end = parseToken(rangeMatch[2]);
    if(start && end){
      /* When only one side carries AM/PM, first try giving the bare side
         the same meridiem; if that would make the range run backwards,
         the authored intent must be the other meridiem — which also
         handles cross-midnight ranges naturally ("10:30 - 12:30 AM"
         means 10:30 PM – 12:30 AM: same-meridiem reads backwards, so
         the start flips to PM; "11:00 PM - 1:00" flips the end to AM). */
      if(!start.meridiem && end.meridiem){
        const same = end.meridiem, other = same === "AM" ? "PM" : "AM";
        start.meridiem = toMin(start, same) <= toMin(end, end.meridiem) ? same : other;
      } else if(!end.meridiem && start.meridiem){
        const same = start.meridiem, other = same === "AM" ? "PM" : "AM";
        end.meridiem = toMin(end, same) >= toMin(start, start.meridiem) ? same : other;
      }
      if(!start.meridiem && !end.meridiem) {
        start.meridiem = start.hour < 12 ? "AM" : "PM";
        end.meridiem = end.hour < 12 ? "AM" : "PM";
      }
      if(start.meridiem && end.meridiem) return `${fmt(start)} \u2013 ${fmt(end)}`;
    }
  }
  const single = parseToken(raw);
  if(single){
    single.meridiem ||= single.hour < 12 ? "AM" : "PM";
    return fmt(single);
  }
  // Preserve explanatory text while removing embedded clock seconds.
  return raw.replace(/\b(\d{1,2}):(\d{2}):\d{2}(?:\.\d+)?/g, "$1:$2");
}
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function isSameDay(dateA, dateB){
  return dateA.getFullYear()===dateB.getFullYear() && dateA.getMonth()===dateB.getMonth() && dateA.getDate()===dateB.getDate();
}
let toastTimer = null;
function toast(msg){
  const el = document.getElementById("toast");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove("show"), 2600);
}

function itemsForEvent(eventId){
  return data.timelineItems.filter(t=>t.eventId===eventId).sort((a,b)=>new Date(a.time)-new Date(b.time));
}
function allItemsSorted(){
  return data.timelineItems
    .map((it, i) => ({it, i}))
    .sort((a,b)=> (new Date(a.it.time) - new Date(b.it.time)) || (a.i - b.i))
    .map(x => x.it);
}

/* ============================================================
   TIMELINE — the same public-only read layer the combined app used
   (timelineQuery/rollup helpers), operating over a dataset that is
   ALREADY public-only by construction (guest-data.generated.js never
   includes an internal/ops-audience timeline item at all). The rollup
   guard below is kept for correctness/forward-compatibility even though
   no record in the current dataset exercises it.
   ============================================================ */
function rollupParentOf(item){
  if(!item || !item.rollupParentId) return null;
  const p = tlItem(item.rollupParentId);
  if(!p || p.rollupParentId) return null;
  return p;
}
function childrenOf(itemId){
  const parent = tlItem(itemId);
  if(!parent || parent.rollupParentId) return [];
  return allItemsSorted().filter(x=>x.rollupParentId === itemId);
}
function displayTitle(item){
  return item.guestTitle || item.title;
}
function endTimeOf(item){
  const start = new Date(item.time).getTime();
  const sorted = allItemsSorted();
  const idx = sorted.findIndex(x=>x.id===item.id);
  const nextInEvent = sorted.slice(idx+1).find(x=>x.eventId===item.eventId);
  if(nextInEvent) return new Date(nextInEvent.time).getTime();
  const parentEvent = ev(item.eventId);
  if(parentEvent) return new Date(parentEvent.endTime).getTime();
  return start + 20*60000;
}
function spanEndOf(item){
  const kids = childrenOf(item.id);
  if(!kids.length) return endTimeOf(item);
  return Math.max(endTimeOf(item), endTimeOf(kids[kids.length-1]));
}
function dayKeyOf(item){
  const e = ev(item.eventId);
  return (e && e.date) ? e.date : String(item.time).slice(0,10);
}
function deriveDayGroups(){
  const byDay = new Map();
  data.events.forEach(e=>{
    if(!e.date) return;
    if(!byDay.has(e.date)) byDay.set(e.date, []);
    byDay.get(e.date).push(e);
  });
  const days = [...byDay.keys()].sort();
  return days.map(d=>{
    const evs = byDay.get(d).sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
    const dayLabel = fmtDate(d+"T12:00:00", {month:'short', day:'numeric'});
    return { id:d, label:`${dayLabel} · ${evs.map(e=>e.title).join(" & ")}`, shortLabel:dayLabel, events:evs };
  });
}
function weddingWeekBounds(){
  const dates = data.events.map(e=>e.date).filter(Boolean).sort();
  const fallback = data.wedding.primaryDate;
  return { start: dates[0] || fallback, end: dates[dates.length-1] || fallback };
}
function timelineQuery(opts){
  const o = opts || {};
  let items = allItemsSorted();
  if(o.eventId) items = items.filter(it=>it.eventId === o.eventId);
  if(o.rollup) items = items.filter(it=>!rollupParentOf(it));
  return items;
}

/* VENUE AND TIMELINE DATA RESET milestone (2026-08-21): this used to
   filter out any event with zero timeline items — which, with
   data.timelineItems now empty by design, hid every single event from
   the guest site permanently. Events are their own real thing (title,
   date, venue, dress code) independent of whether a detailed moment-by-
   moment schedule has been authored under them yet; requirement 5 is
   explicit that events must stay visible even with no timeline. This
   function is now a plain sorted list of every event — nothing is
   gated on timeline-item presence anymore. */
function guestEvents(){
  return [...data.events]
    .sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
}
function guestTimeline(){ return timelineQuery({rollup:true}); }
function guestTimelineForEvent(eventId){ return guestTimeline().filter(it=>it.eventId===eventId); }
function guestCurrentItem(){
  const t = now().getTime();
  return guestTimeline().find(it=>{
    const start = new Date(it.time).getTime();
    const event = ev(it.eventId);
    return event && t >= new Date(event.startTime).getTime() && t < new Date(event.endTime).getTime() && t >= start && t < spanEndOf(it);
  }) || null;
}
function guestUpcomingItem(){
  const t = now().getTime();
  return guestTimeline().find(it => {
    const event = ev(it.eventId), start = new Date(it.time).getTime();
    return event && start > t && start >= new Date(event.startTime).getTime() && start < new Date(event.endTime).getTime();
  }) || null;
}
function guestLiveEvent(){
  const t = now().getTime();
  return guestEvents().find(e=>{
    const start = new Date(e.startTime).getTime();
    const end = new Date(e.endTime).getTime();
    return t >= start && t < end;
  }) || null;
}
function guestLiveEventId(){
  const cur = guestCurrentItem();
  if(cur) return cur.eventId;
  const liveEvent = guestLiveEvent();
  return liveEvent ? liveEvent.id : null;
}
/* EVENT PHOTO CAMERA: no generic fallback. A camera link is eligible only
   for the one event that is live and only when its checked-in URL is https.
   This intentionally requires a user tap—automatic popups/redirects are
   blocked inconsistently on mobile and are disorienting to a first-time
   guest. Once opened, the external Lens experience owns its own camera and
   lock-screen/live-notification behavior. */
function guestPhotoLinkForEvent(eventId){
  const event = ev(eventId);
  const config = event && event.lens;
  if(!config || typeof config.url !== "string" || !/^https:\/\//i.test(config.url)) return null;
  return config;
}
/* GUEST MEHNDI COPY (2026-08-29): the disabled card previously stacked three
   separate "not available" signals — an eyebrow pill, this h2, and the
   button label — which read as noisy/redundant. Now there is exactly one
   status message on the disabled button itself plus one explanatory
   heading naming *when* it opens; the eyebrow pill is dropped
   entirely rather than repeating the same idea a third way. Guest-only —
   the ops preview's own copy (team-app.js) is intentionally left as-is. */
function guestPhotoDisabledCardHtml(event){
  return `
    <section class="guest-live-photo-wrap" aria-label="Photo sharing for ${esc(event.title)} — check back tomorrow">
      <div class="guest-live-photo-card is-disabled">
        <div class="guest-live-photo-icon">${ICONS.camera}</div>
        <h2>Photo Sharing Starts at the Family Ceremony</h2>
        <p>We can't wait to see the celebration through your eyes — the shared camera opens once the family ceremony begins.</p>
        <button class="guest-live-photo-button is-disabled" type="button" disabled aria-disabled="true">${ICONS.camera} Check back tomorrow</button>
      </div>
    </section>
  `;
}
/* PRE-EVENT CAMERA DISCOVERY milestone (2026-08-30): before the very
   first celebration begins (the earliest event in data.events — via
   guestEvents(), already sorted by startTime, currently Mehndi), Home
   shows a compact, disabled coming-soon card so guests can discover the
   camera feature early rather than seeing nothing. Scoped to the plain
   Home call (no requestedEventId) so a specific event's own schedule-
   page CTA (renderGuestScheduleForEvent) is untouched. Driven entirely
   through the shared now() against real event data — never a hardcoded
   date — so ?demo=1 previews it exactly like every other live-status
   surface. Once any real event goes live this is unreachable, so live
   activation, the Mehndi-disabled card, between-event gaps and post-
   wedding behavior are all unchanged. */
function guestPhotoComingSoonCardHtml(){
  return `
    <section class="guest-live-photo-wrap" aria-label="Event camera — coming soon">
      <div class="guest-live-photo-card is-disabled">
        <div class="guest-live-photo-icon">${ICONS.camera}</div>
        <h2>Event Camera</h2>
        <p>Photo sharing starts at the family ceremony.</p>
        <button class="guest-live-photo-button is-disabled" type="button" disabled aria-disabled="true">${ICONS.camera} Check back in during the next event.</button>
      </div>
    </section>
  `;
}
function guestLivePhotoCtaHtml(requestedEventId){
  const liveEventId = guestLiveEventId();
  if(!liveEventId){
    if(!requestedEventId){
      const earliest = guestEvents()[0];
      if(earliest && now() < new Date(earliest.startTime)) return guestPhotoComingSoonCardHtml();
    }
    return "";
  }
  if(requestedEventId && requestedEventId !== liveEventId) return "";
  const event = ev(liveEventId);
  if(!event) return "";
  if(event.id === MEHNDI_EVENT_ID){
    return guestPhotoDisabledCardHtml(event);
  }
  const config = guestPhotoLinkForEvent(liveEventId);
  if(!config) return "";
  const qr = typeof config.qrImageUrl === "string" && /^(?:https:\/\/|qr\/)/i.test(config.qrImageUrl)
    ? `<details class="guest-live-photo-qr"><summary>Show QR code</summary><img src="${esc(config.qrImageUrl)}" alt="QR code for the ${esc(event.title)} event camera"></details>`
    : "";
  return `
    <section class="guest-live-photo-wrap" aria-label="Share photos from ${esc(event.title)}">
      <div class="guest-live-photo-card">
        <div class="guest-live-photo-eyebrow"><span></span> Live at ${esc(event.title)}</div>
        <div class="guest-live-photo-icon">${ICONS.camera}</div>
        <h2>Take a Photo With Us</h2>
        <p>We’d love to experience the celebration through your eyes. Capture and share the moments that stand out to you.</p>
        <a class="guest-live-photo-button" href="${esc(config.url)}" target="_blank" rel="noopener" aria-label="Open the ${esc(event.title)} event camera to add photos (opens in a new tab)">${ICONS.camera} Open Event Camera</a>
        ${qr}
        ${data.wedding.hashtag ? `<div class="guest-live-photo-hashtag"><span>Keep sharing with</span><strong>${esc(data.wedding.hashtag)}</strong></div>` : ""}
      </div>
    </section>
  `;
}
function guestLiveSeatingCtaHtml(){
  if(guestLiveEventId() !== "event_reception") return "";
  return `
    <section class="guest-live-seating-wrap" aria-label="Find your reception table">
      <div class="guest-live-seating-card">
        <div class="guest-live-seating-eyebrow"><span></span> Reception seating is open</div>
        <h2>Find Your Table</h2>
        <p>Search your name for your table number, or browse the full seating list.</p>
        <a class="guest-live-seating-button" href="/seating">Find My Table ${ICONS.chevron}</a>
      </div>
    </section>
  `;
}
function guestDayGroups(){
  const ids = new Set(guestEvents().map(e=>e.id));
  return deriveDayGroups()
    .map(d => ({...d, events: d.events.filter(e=>ids.has(e.id))}))
    .filter(d => d.events.length);
}

/* Event atmosphere changes only the visual tokens. Navigation, spacing,
   controls, and content structure stay identical so first-time guests never
   have to relearn the site as the celebration moves between events. */
function guestThemeEvent(){
  if(state.guestView === "timeline" && state.guestScheduleEventId){
    const selected = ev(state.guestScheduleEventId);
    if(selected) return selected;
  }
  return guestRelevantEvent();
}
/* COUNTDOWN THEME milestone (2026-08-30): before the very first
   celebration begins, guest Home used to inherit Mehndi's own green
   theme purely because guestRelevantEvent()'s planning-phase fallback is
   events[0] (the earliest event — Mehndi). This gives that pre-event
   state its own neutral champagne/ivory identity instead, WITHOUT
   touching guestThemeEvent()/guestRelevantEvent() themselves (still used
   exactly as before once an explicit schedule selection, or an actual
   live event, applies) — opening Mehndi's own schedule page, or Mehndi
   actually being live, both still take precedence and show green,
   unchanged. Driven by the shared now() against the earliest real event
   start in data.events, same pattern as the pre-event camera card. */
function guestThemeClass(){
  const explicitlySelected = state.guestView === "timeline" && state.guestScheduleEventId && ev(state.guestScheduleEventId);
  const earliestEvent = guestEvents()[0];
  if(!explicitlySelected && !guestLiveEvent() && earliestEvent && now() < new Date(earliestEvent.startTime)){
    return "guest-theme-countdown";
  }
  const event = guestThemeEvent();
  return event ? `guest-theme-${event.id.replace(/^event_/, "")}` : "guest-theme-default";
}
function applyGuestTheme(){
  const app = document.querySelector(".guest-app");
  if(!app) return;
  [...app.classList].filter(name=>name.startsWith("guest-theme-")).forEach(name=>app.classList.remove(name));
  app.classList.add(guestThemeClass());
}

function getPhase(){
  const t = now();
  const bounds = weddingWeekBounds();
  const weekStart = new Date(bounds.start+"T00:00:00");
  const weekEnd = new Date(bounds.end+"T23:59:59");
  if(t < weekStart) return "planning";
  if(t > weekEnd) return "post";
  return "week";
}
function daysUntil(targetIso){
  const t = now();
  const target = new Date(targetIso+"T00:00:00");
  const ms = target - new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round(ms / 86400000);
}

/* ---- Transportation: guest gate only (confirmed + public), matching the
   Team app's guestFacingTransportation() exactly — kept here for parity
   even though guestData.transportation is already pre-filtered to this
   same gate at build time (defense in depth, zero-cost given how small
   the array is). ---- */
function allTransportation(){ return data.transportation || []; }
function isGuestFacingTransportation(t){ return t.lifecycle === "confirmed"; }
function guestFacingTransportation(eventId){
  return allTransportation()
    .filter(isGuestFacingTransportation)
    .filter(t=>!eventId || t.eventId === eventId)
    .sort((a,b)=>new Date(a.departureTime)-new Date(b.departureTime));
}
function transportationLabel(t){
  const pickup = venueOf(t.pickupVenueId)?.name || "Pickup TBD";
  const dest = venueOf(t.destinationVenueId)?.name || "Destination TBD";
  return `${pickup} → ${dest}`;
}

function venueHasUsableAddress(venue){
  return !!(venue && venue.address && venue.mapLinkable !== false);
}

/* ============================================================
   OUR WEDDING — the guest experience UI.
   ============================================================ */
function coupleMonogram(){
  const parts = String(data.wedding.coupleNames||"").split(/\s*&\s*/).filter(Boolean);
  if(parts.length < 2) return esc(data.wedding.coupleNames||"");
  return esc(parts.map(p=>p.trim()[0]).join(" & "));
}

function guestPreviewLabelHtml(){
  if(!isDemoClock()) return "";
  return `
    <div class="guest-preview-banner">
      <span class="guest-preview-banner-inner">
        <span class="guest-preview-banner-dot"></span>
        Preview mode · Simulated ${esc(fmtDate(now(),{weekday:'long',month:'long',day:'numeric'}))} at ${esc(fmtTime(now()))}
      </span>
    </div>
  `;
}
/* Same shape team-app.js's localDateTimeValue() uses for its own
   <input type="datetime-local"> value — local (not UTC) Y-M-DTH:M. */
function localDateTimeValue(value){
  const d = new Date(value);
  const pad = n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/* GUEST DEMO CLOCK (2026-08-29): a compact, collapsed-by-default control —
   a native <details>/<summary> disclosure needs no open/close JS and stays
   keyboard/mobile accessible for free, exactly like team-app.js's own
   demo-clock-control and this build's own guest-moment-detail pattern.
   Only ever rendered when isPreviewMode() is true (see renderGuestShell()
   below); an ordinary guest's page never contains this markup at all. The
   summary row doubles as the "Demo" badge requirement: while a simulated
   time is active it shows "Demo · <date>, <time>" (and the <details> stays
   open); on Real Time it collapses back to a plain "Preview Clock" label. */
function guestDemoClockHtml(){
  return `
    <details class="guest-demo-clock" ${state.simDate ? "open" : ""}>
      <summary>
        <span class="guest-demo-badge-dot"></span>
        <span>${state.simDate ? `Demo · ${esc(fmtDate(now(),{month:'short',day:'numeric'}))}, ${esc(fmtTime(now()))}` : "Preview Clock"}</span>
      </summary>
      <div class="guest-demo-clock-panel">
        <label for="guest-demo-preset">Jump to</label>
        <select id="guest-demo-preset">
          <option value="">Choose a moment…</option>
          ${GUEST_DEMO_PRESETS.map(p=>`<option value="${p.value}">${esc(p.label)}</option>`).join("")}
        </select>
        <label for="guest-demo-custom">Custom date &amp; time</label>
        <input id="guest-demo-custom" type="datetime-local" value="${localDateTimeValue(now())}">
        <div class="guest-demo-clock-actions">
          <button class="guest-demo-btn" id="guest-demo-apply" type="button">Apply</button>
          <button class="guest-demo-btn" id="guest-demo-live" type="button">Real Time</button>
        </div>
      </div>
    </details>
  `;
}
function wireGuestDemoClock(){
  if(!isPreviewMode()) return;
  const preset = document.getElementById("guest-demo-preset");
  const custom = document.getElementById("guest-demo-custom");
  const apply = document.getElementById("guest-demo-apply");
  const live = document.getElementById("guest-demo-live");
  function setDemo(value){
    if(!value) return;
    const d = new Date(value);
    if(Number.isNaN(d.getTime())) return;
    state.simDate = d;
    try{ localStorage.setItem(LS_KEYS.SIM_DATE, d.toISOString()); }catch(e){}
    renderShell(); renderActiveView();
  }
  if(preset) preset.addEventListener("change", ()=>setDemo(preset.value));
  if(apply) apply.addEventListener("click", ()=>setDemo(custom.value));
  if(live) live.addEventListener("click", ()=>{
    state.simDate = null;
    try{ localStorage.removeItem(LS_KEYS.SIM_DATE); }catch(e){}
    renderShell(); renderActiveView();
  });
}

// Home Screen installation remains a guest choice; never block the schedule.
let installBannerDismissed = false;
function isGuestStandalone(){
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
function guestInstallBannerHtml(){
  const isAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);
  if((!isAppleMobile && !isAndroid) || isGuestStandalone() || installBannerDismissed) return "";
  try { if(localStorage.getItem('wedding_guest_install_dismissed') === '1') return ""; } catch(e) {}
  return `<aside class="guest-install-banner" aria-label="Save to Home Screen">
    <div><details><summary><span class="guest-install-glint" aria-hidden="true">↓</span> Save to Home Screen <span class="guest-install-chevron" aria-hidden="true">⌄</span></summary>
        ${isAndroid ? `<ol><li>Open this website in Chrome. If you scanned the QR code in another app, open its menu and choose to open in Chrome first.</li><li>Tap the three-dot menu, then <strong>Add to Home screen</strong> or <strong>Install and create shortcut</strong>.</li><li>Choose <strong>Install</strong> if offered, or <strong>Create shortcut</strong>, then confirm <strong>Add</strong>.</li></ol><p>A shortcut may open in Chrome rather than a separate app window. You can dismiss this suggestion after adding it.</p>` : `<ol><li>Open this website in Safari.</li><li>Tap Share (the square with an upward arrow). It may be inside the More menu.</li><li>Choose <strong>Add to Home Screen</strong>. If shown, leave <strong>Open as Web App</strong> on, then tap <strong>Add</strong>.</li></ol>`}
        <p>No download or account needed. You can keep browsing without adding it.</p>
      </details>
    </div>
    <button class="guest-install-dismiss" type="button" data-dismiss-install aria-label="Dismiss save app suggestion">×</button>
  </aside>`;
}
function renderGuestShell(){
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="guest-app ${guestThemeClass()}">
      <header class="guest-header">
        <div class="guest-header-inner">
          <button class="guest-wordmark" id="guest-logo-btn" aria-label="Our Wedding home">${coupleMonogram()}</button>
          <nav class="guest-nav" aria-label="Our Wedding navigation">
            <button class="guest-nav-link ${state.guestView==='home'?'active':''}" data-guest-nav="home">Home</button>
            <button class="guest-nav-link ${state.guestView==='timeline'?'active':''}" data-guest-nav="timeline">Schedule</button>
          </nav>
        </div>
      </header>
      ${guestInstallBannerHtml()}
      <main id="guest-view-home" class="guest-view"></main>
      <main id="guest-view-timeline" class="guest-view"></main>
      <footer class="guest-footer">
        ${isGuestStandalone() ? `<button type="button" class="guest-nav-link" data-refresh-guest>Refresh latest schedule</button>` : ""}
        <div class="guest-footer-mark">${esc(data.wedding.coupleNames)}</div>
        <div class="guest-footer-date">${fmtDate(weddingWeekBounds().start+"T00:00:00",{month:'long', year:'numeric'})}</div>
        ${isPreviewMode() ? guestDemoClockHtml() : ""}
      </footer>
    </div>
  `;
  wireGuestShellEvents();
}

function wireGuestShellEvents(){
  document.querySelector('[data-dismiss-install]')?.addEventListener('click', (event)=>{
    installBannerDismissed = true;
    try { localStorage.setItem('wedding_guest_install_dismissed', '1'); } catch(e) {}
    event.currentTarget.closest('.guest-install-banner').remove();
  });
  document.querySelector('[data-refresh-guest]')?.addEventListener('click', ()=>window.location.reload());
  document.querySelectorAll("[data-guest-nav]").forEach(b=>b.addEventListener("click", ()=>{
    const target = b.getAttribute("data-guest-nav");
    if(target === "timeline") state.guestScheduleEventId = null;
    state.guestView = target;
    renderShell(); renderActiveView();
    window.scrollTo(0, 0);
  }));
  document.getElementById("guest-logo-btn")?.addEventListener("click", ()=>{
    state.guestView = "home"; renderShell(); renderActiveView();
    window.scrollTo(0, 0);
  });
  wireGuestDemoClock();
}

function renderGuestActiveView(){
  document.querySelectorAll(".guest-view").forEach(v=>v.classList.remove("active"));
  if(state.guestView === "timeline"){
    document.getElementById("guest-view-timeline").classList.add("active");
    renderGuestTimeline();
  } else {
    document.getElementById("guest-view-home").classList.add("active");
    renderGuestHome();
  }
}

function guestRelevantEvent(){
  const phase = getPhase();
  const events = guestEvents();
  if(!events.length) return null;
  if(phase === "week"){
    const cur = guestCurrentItem();
    if(cur) return ev(cur.eventId);
    const liveEvent = guestLiveEvent();
    if(liveEvent) return liveEvent;
    const up = guestUpcomingItem();
    if(up) return ev(up.eventId);
    /* VENUE AND TIMELINE DATA RESET milestone (2026-08-21): with zero
       timeline items, guestUpcomingItem() is always null, so this used to
       fall straight to the LAST event on the books any time nothing was
       currently live — wrong mid-week, before anything has started, or
       between two events. Event-level start time is a real, non-fabricated
       fact, so it's the correct fallback for "what's next" once the
       timeline-item-based answer isn't available. */
    const upcomingEvent = events.find(e=>new Date(e.startTime).getTime() > now().getTime());
    if(upcomingEvent) return upcomingEvent;
    return events[events.length-1];
  }
  if(phase === "planning") return events[0];
  return events[events.length-1];
}

/* VIDHI TWO-SIDE EXPERIENCE (guest): mirrors the ops-side computation in
   team-app.js exactly — same side-detection rule (title starts with
   "Partner One"/"Partner Two"), same derived merge point (first item after the last
   side-tagged item, never a hardcoded title) — but run over this app's
   own already-guest-filtered item list (guestData ships only
   audience:"public" timeline items to begin with), so a guest never sees
   anything beyond what Show-to-Guest already allows. event_vidhi is the
   one fixed id, the same way this file already keys specific behavior off
   specific event ids elsewhere (e.g. guestPhotoLinkForEvent). */
const VIDHI_EVENT_ID = "event_vidhi";
/* MEHNDI HAS NO LENSE LINK YET: mirrors team-app.js's own MEHNDI_EVENT_ID
   override exactly — photo sharing starts at Vidhi, so the four other
   photo events (Vidhi/Pithi, Sangeet, Wedding Ceremony, Reception) keep
   the working TEST Lense link while Mehndi always renders a disabled
   state instead, event-id-driven rather than a hardcoded time check. */
const MEHNDI_EVENT_ID = "event_mehndi";
function vidhiSideOf(item){
  const title = (item && item.title || "").trim();
  if(/^partner one/i.test(title)) return "partnerOne";
  if(/^partner two/i.test(title)) return "partnerTwo";
  return null;
}
function vidhiMergeItem(sortedItems){
  let lastSideTime = null;
  sortedItems.forEach(it=>{
    if(!vidhiSideOf(it)) return;
    const tm = new Date(it.time).getTime();
    if(lastSideTime === null || tm > lastSideTime) lastSideTime = tm;
  });
  if(lastSideTime === null) return null;
  return sortedItems.find(it => new Date(it.time).getTime() > lastSideTime) || null;
}
function vidhiSideStatus(sortedItems, side, mergeItem, nowMs){
  const sideItems = sortedItems.filter(it=>vidhiSideOf(it)===side);
  let current = null, next = null;
  for(const it of sideItems){
    const tm = new Date(it.time).getTime();
    if(tm <= nowMs) current = it; else { next = it; break; }
  }
  if(!next && mergeItem) next = mergeItem;
  return { current, next };
}
function vidhiComputeTracks(items){
  const sorted = items.slice().sort((a,b)=> new Date(a.time) - new Date(b.time));
  const merge = vidhiMergeItem(sorted);
  if(!merge) return null;
  const nowMs = now().getTime();
  const isDual = nowMs < new Date(merge.time).getTime();
  const partnerOne = vidhiSideStatus(sorted, "partnerOne", merge, nowMs);
  const partnerTwo = vidhiSideStatus(sorted, "partnerTwo", merge, nowMs);
  if(!partnerOne.current && !partnerOne.next && !partnerTwo.current && !partnerTwo.next) return null;
  return { sorted, merge, isDual, partnerOne, partnerTwo };
}
/* GUEST HOME HIERARCHY REFINEMENT (2026-08-30): the dual-track home hero
   used to stack four loud, separately-competing blocks — an oversized
   oversized serif slogan naming no real activity, two full bordered/shadowed
   side cards, and a standalone convergence sentence floating below them.
   Screenshots showed this reading as scattered rather than as one live
   moment. Rebuilt as a single eye path: eyebrow -> concise event heading
   (the actual event name, "Vidhi / Pithi", not a slogan) -> one bordered
   .guest-vidhi-module containing both sides as compact columns (a vertical
   divider on desktop, stacked rows on mobile via .guest-vidhi-columns) ->
   the Lunch/merge convergence folded in as a subtle footer bridge inside
   that same module, instead of a separate sentence. Activity titles here
   drop their repeated "Partner One's Side —"/"Partner Two's Side —" prefix (see
   vidhiStripSidePrefix) since the column header already names the side;
   NOW vs NEXT is a small tag rather than another line of text. Scoped to
   new classes (.guest-vidhi-module/-columns/-column/-now/-next/-tag/-merge)
   used ONLY here. All values are still the same data-derived
   tracks.partnerOne/partnerTwo/merge from vidhiComputeTracks — only the rendering
   changed. (The Schedule-detail page's OWN two-side rendering, once a
   separate summary card here, was later redesigned in the GUEST EVENT-
   DETAIL HIERARCHY REFINEMENT pass below — see vidhiGuestDetailSectionsHtml.) */
function vidhiStripSidePrefix(title){
  return String(title||"").replace(/^(?:Partner One|Partner Two)['’]s Side\s*[\u2014-]\s*/i, "");
}
function vidhiGuestModuleColumnHtml(label, side){
  const nowHtml = side.current
    ? `<span class="guest-vidhi-tag is-now">Now</span>${esc(vidhiStripSidePrefix(displayTitle(side.current)))}`
    : `<span class="guest-vidhi-now-pending">Not started yet</span>`;
  const nextHtml = side.next
    ? `<div class="guest-vidhi-next"><span class="guest-vidhi-tag is-next">Next</span>${esc(vidhiStripSidePrefix(displayTitle(side.next)))} ${countdownLabel(side.next.time)}</div>`
    : "";
  return `
    <div class="guest-vidhi-column">
      <div class="guest-vidhi-column-label">${esc(label)}</div>
      <div class="guest-vidhi-now">${nowHtml}</div>
      ${nextHtml}
    </div>
  `;
}
/* Home hero variant while Vidhi is in its dual-track window. */
function vidhiDualGuestHeroHtml(event, tracks){
  return `
    <section class="guest-hero is-vidhi">
      <div class="guest-hero-eyebrow is-live">Happening Now</div>
      <h1 class="guest-hero-title">${esc(event.title)}</h1>
      <div class="guest-vidhi-module">
        <div class="guest-vidhi-module-label">Two Sides, Running in Parallel</div>
        <div class="guest-vidhi-columns">
          ${vidhiGuestModuleColumnHtml("Partner One's Side", tracks.partnerOne)}
          ${vidhiGuestModuleColumnHtml("Partner Two's Side", tracks.partnerTwo)}
        </div>
        <div class="guest-vidhi-merge">Together at ${esc(vidhiStripSidePrefix(displayTitle(tracks.merge)))} ${countdownLabel(tracks.merge.time)}</div>
      </div>
    </section>
  `;
}
/* GUEST EVENT-DETAIL HIERARCHY REFINEMENT (2026-08-30): the Vidhi
   Schedule-detail page used to render a "status card" (current/next per
   side, or after the merge a lone "Together" sentence) ABOVE the exact
   same information repeated a second time in the full flat moments list
   below it — an unrelated, equal-weight card duplicating its own page,
   and after the merge a status card floating above a still-fully-flat,
   still-interleaved run sheet. Replaced with one structural pass over
   the event's own real, already guest-filtered items — no separate
   status card, no duplication:
     - any shared item before the split (e.g. Breakfast Service, which
       carries no "Partner One's/Partner Two's Side —" prefix) in its own compact
       section, once;
     - Partner One's and Partner Two's pre-merge items as two balanced, internally
       chronological tracks (desktop columns / stacked mobile rows via
       .guest-vidhi-detail-tracks), titles stripped of their repeated
       side-name prefix via vidhiStripSidePrefix — the column header
       already names the side;
     - the merge item itself (Lunch Service) as one compact bridge line,
       not a fourth full moment row;
     - every item after the merge, once, as an ordinary shared timeline
       (the same .guest-schedule-panel/.guest-moments/renderGuestMoment
       markup every other event's detail page uses — post-merge Vidhi is
       exactly as "together" as any other event).
   Partitioning reads off vidhiComputeTracks()'s own already-derived
   `sorted` (real timeline order) and `merge` (the real, data-derived
   convergence point) — it does not re-detect sides or re-sort anything
   itself, so it can never disagree with the home hero about what merged
   when. */
function vidhiScheduleSections(tracks){
  const sorted = tracks.sorted;
  const mergeIndex = sorted.findIndex(it => it.id === tracks.merge.id);
  const pre = mergeIndex >= 0 ? sorted.slice(0, mergeIndex) : sorted;
  const together = mergeIndex >= 0 ? sorted.slice(mergeIndex + 1) : [];
  return {
    shared: pre.filter(it => !vidhiSideOf(it)),
    partnerOne: pre.filter(it => vidhiSideOf(it) === "partnerOne"),
    partnerTwo: pre.filter(it => vidhiSideOf(it) === "partnerTwo"),
    merge: tracks.merge,
    together,
  };
}
function isGuestMomentCurrent(item){
  const t = now().getTime();
  return t >= new Date(item.time).getTime() && t < spanEndOf(item);
}
function vidhiGuestDetailTrackRowHtml(item){
  const current = isGuestMomentCurrent(item);
  return `
    <div class="guest-vidhi-track-row${current ? ' is-current' : ''}" data-clock-moment="${esc(item.id)}">
      <div class="guest-vidhi-track-time">${esc(displayTimeLabel(item))}</div>
      <div class="guest-vidhi-track-title">${esc(vidhiStripSidePrefix(displayTitle(item)))}</div>
    </div>
  `;
}
function vidhiGuestDetailTrackHtml(label, items){
  return `
    <div class="guest-vidhi-track">
      <div class="guest-vidhi-track-label">${esc(label)}</div>
      ${items.length ? items.map(vidhiGuestDetailTrackRowHtml).join("") : `<p class="guest-vidhi-track-empty">Nothing scheduled yet.</p>`}
    </div>
  `;
}
function vidhiGuestDetailSectionsHtml(tracks){
  const s = vidhiScheduleSections(tracks);
  const sharedHtml = s.shared.length ? `
    <div class="guest-vidhi-detail-label">Starting Together</div>
    <div class="guest-schedule-panel guest-vidhi-shared-panel"><div class="guest-moments">${s.shared.map(renderGuestMoment).join("")}</div></div>
  ` : "";
  const togetherHtml = s.together.length ? `
    <div class="guest-vidhi-detail-label">Together</div>
    <div class="guest-schedule-panel"><div class="guest-moments">${s.together.map(renderGuestMoment).join("")}</div></div>
  ` : "";
  return `
    ${sharedHtml}
    <div class="guest-vidhi-detail-label">Two Sides, Running in Parallel</div>
    <div class="guest-schedule-panel guest-vidhi-tracks-panel">
      <div class="guest-vidhi-detail-tracks">
        ${vidhiGuestDetailTrackHtml("Partner One's Side", s.partnerOne)}
        ${vidhiGuestDetailTrackHtml("Partner Two's Side", s.partnerTwo)}
      </div>
      <div class="guest-vidhi-bridge">
        <span class="guest-vidhi-bridge-time">${esc(fmtTime(s.merge.time))}</span>
        <span class="guest-vidhi-bridge-label">${esc(displayTitle(s.merge))} — both sides come together</span>
      </div>
    </div>
    ${togetherHtml}
  `;
}

function guestHeroHtml(){
  const phase = getPhase();
  const coupleNames = data.wedding.coupleNames;

  if(phase === "planning"){
    const bounds = weddingWeekBounds();
    const days = daysUntil(bounds.start);
    return `
      <section class="guest-hero">
        <div class="guest-hero-eyebrow">We're Getting Married</div>
        <h1 class="guest-hero-title">${esc(coupleNames)}</h1>
        <div class="guest-hero-date">${fmtDate(bounds.start+"T00:00:00",{month:'long',day:'numeric'})} – ${fmtDate(bounds.end+"T00:00:00",{month:'long',day:'numeric',year:'numeric'})}</div>
        <div class="guest-countdown">${days} Day${days===1?'':'s'} To Go</div>
      </section>
    `;
  }

  if(phase === "week"){
    const cur = guestCurrentItem();
    const next = guestUpcomingItem();
    const today = guestEvents().filter(e=>isSameDay(new Date(e.startTime), now()));
    /* VENUE AND TIMELINE DATA RESET milestone (2026-08-21): guestUpcomingItem()
       is timeline-item-based and always null with zero items, which used to
       make every "no next item" case claim "The last moment of the day" —
       false the moment there's a second event still to come. Falls back to
       the next real EVENT's own start time (never fabricated, never derived
       from a deleted timeline) before ever making that claim; kept alongside
       the item-based `next` so a future authored, guest-visible timeline item
       still takes priority the moment one exists again. */
    const nextEventFallback = guestEvents().find(e=>new Date(e.startTime).getTime() > now().getTime());
    const nextLineHtml = next
      ? `<div class="guest-hero-next">Next: ${esc(displayTitle(next))} ${countdownLabel(next.time)}</div>`
      : (nextEventFallback
        ? `<div class="guest-hero-next">Next: ${esc(nextEventFallback.title)} ${countdownLabel(nextEventFallback.startTime)}</div>`
        : `<div class="guest-hero-next">The last moment of the day.</div>`);
    if(cur){
      const e = ev(cur.eventId);
      const venue = venueOf(e?.venueId);
      /* VIDHI TWO-SIDE EXPERIENCE: while the live moment belongs to the
         Vidhi event and its two sides haven't converged yet, replace the
         normal single-item hero with the dual-track view entirely. Once
         merged, fall through to the normal hero below with a "Together"
         tag so it reads as the same live moment both sides now share. */
      let vidhiTogetherSuffix = "";
      if(e && e.id === VIDHI_EVENT_ID){
        const tracks = vidhiComputeTracks(guestTimelineForEvent(e.id));
        if(tracks){
          if(tracks.isDual) return vidhiDualGuestHeroHtml(e, tracks);
          vidhiTogetherSuffix = " · Together";
        }
      }
      return `
        <section class="guest-hero">
          <div class="guest-hero-eyebrow is-live">Happening Now${vidhiTogetherSuffix}</div>
          <h1 class="guest-hero-title">${esc(displayTitle(cur))}</h1>
          <div class="guest-hero-date">${esc(e?.title||"")}${venue ? " · " + esc(venue.name) : ""}</div>
          ${nextLineHtml}
        </section>
      `;
    }
    const liveEvent = guestLiveEvent();
    if(liveEvent){
      const venue = venueOf(liveEvent.venueId);
      return `
        <section class="guest-hero">
          <div class="guest-hero-eyebrow is-live">Happening Now</div>
          <h1 class="guest-hero-title">${esc(liveEvent.title)}</h1>
          <div class="guest-hero-date">${venue ? esc(venue.name) : ""}</div>
          ${nextLineHtml}
        </section>
      `;
    }
    return `
      <section class="guest-hero">
        <div class="guest-hero-eyebrow">Welcome</div>
        <h1 class="guest-hero-title">${esc(coupleNames)}</h1>
        <div class="guest-hero-date">${fmtDate(now(),{weekday:'long',month:'long',day:'numeric'})}</div>
        ${today.length ? `<div class="guest-hero-next">Today: ${esc(today.map(e=>e.title).join(" & "))}</div>` : `<div class="guest-hero-next">A quiet day between celebrations.</div>`}
        ${next ? `<div class="guest-hero-next">Next: ${esc(displayTitle(next))} ${countdownLabel(next.time)}</div>` : (nextEventFallback ? `<div class="guest-hero-next">Next: ${esc(nextEventFallback.title)} ${countdownLabel(nextEventFallback.startTime)}</div>` : "")}
      </section>
    `;
  }

  return `
    <section class="guest-hero">
      <div class="guest-hero-eyebrow is-archive">With Love</div>
      <h1 class="guest-hero-title">Thank You</h1>
      <p class="guest-hero-sub">Thank you for celebrating with ${esc(coupleNames)}. It meant the world to have you there.</p>
    </section>
  `;
}
function minutesUntil(iso){ return Math.round((new Date(iso).getTime() - now().getTime()) / 60000); }
function countdownLabel(iso){
  const m = minutesUntil(iso);
  if(m <= 0) return "";
  if(m < 60) return `in ${m} min`;
  const h = Math.floor(m/60), mm = m % 60;
  return mm ? `in ${h}h ${mm}m` : `in ${h}h`;
}

function guestScheduleActionLabel(){
  const phase = getPhase();
  if(phase === "post") return "Relive the Celebration";
  return "View Your Schedule";
}

function guestHashtagMeaningHtml(){
  return `<div class="guest-hashtag-meaning">
    <h3>Behind our hashtag</h3>
    <dl>
      <div><dt>A</dt><dd>Avery</dd></div>
      <div><dt>J</dt><dd>Jordan</dd></div>
      <div><dt>Ever</dt><dd>One shared journey</dd></div>
      <div><dt>27</dt><dd>2027 demo</dd></div>
    </dl>
  </div>`;
}

function guestActionsPairHtml(){
  const hashtag = data.wedding.hashtag;
  const scheduleCard = `
    <button class="guest-action-card guest-schedule-action" data-guest-goto="timeline" type="button">
      <div class="guest-action-icon-badge">${ICONS.calendar}</div>
      <div class="guest-schedule-action-copy">
      <div class="guest-action-title">${guestScheduleActionLabel()}</div>
      <div class="guest-action-sub">See the full lineup</div>
      </div>
      <span class="guest-schedule-action-arrow" aria-hidden="true">↗</span>
    </button>
  `;
  const photoCard = hashtag ? `
    <div class="guest-hashtag-card">
    <button class="guest-action-card is-photo" data-copy-hashtag type="button">
      <div class="guest-action-icon-badge">${ICONS.camera}</div>
      <div class="guest-action-title">Share Your Photos</div>
      <div class="guest-action-sub">Tap to copy <span data-hashtag-text>${esc(hashtag)}</span></div>
    </button>
    ${guestHashtagMeaningHtml()}
    </div>
  ` : "";
  return `
    <section class="guest-actions-pair">
      ${photoCard}
      ${scheduleCard}
    </section>
  `;
}

function guestDetailRowsHtml(event){
  if(!event){
    return `<p class="guest-empty">Details will be posted as the date gets closer.</p>`;
  }
  const venue = venueOf(event.venueId);
  const directions = venueHasUsableAddress(venue);
  return `
    <div class="guest-details-grid">
      <div class="guest-detail">
        <div class="guest-detail-icon">${ICONS.mapPin}</div>
        <div class="guest-detail-label">Venue</div>
        <div class="guest-detail-value">${venue ? esc(venue.name) : "To be announced"}</div>
        ${venue && venue.address ? `<div class="guest-detail-sub">${esc(venue.address)}</div>` : ""}
      </div>
    </div>
    ${directions ? `<a class="guest-btn guest-btn-outline" href="https://maps.google.com/?q=${encodeURIComponent(venue.address)}" target="_blank" rel="noopener">${ICONS.mapPin} Get Directions</a>` : ""}
  `;
}

function guestTransportationHtml(event){
  const list = guestFacingTransportation(event ? event.id : null);
  if(!list.length) return "";
  return `
    <section class="guest-section">
      <div class="guest-eyebrow">Getting There</div>
      <h2 class="guest-heading-sm">Shuttle Service</h2>
      <div class="guest-transport-list">
        ${list.map(t=>`
          <div class="guest-transport-card">
            <div class="guest-transport-route">${esc(transportationLabel(t))}</div>
            <div class="guest-transport-time">Departs ${fmtTime(t.departureTime)}${t.arrivalTime ? " · arrives ~" + fmtTime(t.arrivalTime) : ""}</div>
            ${t.guestInstructions ? `<p class="guest-transport-note">${esc(t.guestInstructions)}</p>` : ""}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function wireGuestGoto(container){
  container.querySelectorAll("[data-guest-goto]").forEach(b=>b.addEventListener("click", ()=>{
    const target = b.getAttribute("data-guest-goto");
    if(target === "timeline") state.guestScheduleEventId = null;
    state.guestView = target;
    renderShell(); renderActiveView();
    window.scrollTo(0, 0);
  }));
}

async function copyHashtag(triggerEl){
  const raw = data.wedding.hashtag;
  if(!raw) return;
  const text = raw.startsWith("#") ? raw : "#"+raw;

  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      toast(`Copied ${text} — paste it when you share your photos`);
      return;
    }
  }catch(e){ /* fall through to the legacy fallback below */ }

  const hashtagEl = triggerEl ? triggerEl.querySelector("[data-hashtag-text]") : null;
  let selected = false;
  if(hashtagEl && window.getSelection){
    try{
      const range = document.createRange();
      range.selectNodeContents(hashtagEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      selected = true;
    }catch(e){ selected = false; }
  }
  let legacyCopied = false;
  if(selected){
    try{ legacyCopied = !!(document.execCommand && document.execCommand("copy")); }
    catch(e){ legacyCopied = false; }
  }

  if(legacyCopied){
    toast(`Copied ${text} — paste it when you share your photos`);
  } else if(selected){
    toast(`${text} selected — copy it to share your photos`);
  } else {
    toast(`Couldn't copy automatically — the hashtag is ${text}`);
  }
}
function wireGuestPhotoCopyButtons(container){
  container.querySelectorAll("[data-copy-hashtag]").forEach(b=>b.addEventListener("click", ()=>copyHashtag(b)));
}

function guestBrochureHtml(){
  // The ceremony takes place in New Jersey (EDT), regardless of the
  // guest's device timezone. Show the card only during its public window.
  const time = now().getTime();
  if(time < Date.parse("2027-06-12T14:00:00-04:00") || time >= Date.parse("2027-06-12T18:00:00-04:00")) return "";
  return `<section class="guest-section brochure-section"><a class="brochure-card" href="assets/wedding-brochure.pdf" target="_blank" rel="noopener" aria-label="View ceremony brochure PDF in a new tab">
    <span class="brochure-mark" aria-hidden="true">✦</span><span><span class="brochure-kicker">September 5 · Wedding Ceremony</span><strong>Our Wedding Brochure</strong><span>Follow the rituals, get to know us & enjoy a little fun.</span><small>View brochure · PDF · opens in a new tab ↗</small></span></a></section>`;
}

function renderGuestHome(){
  applyGuestTheme();
  const el = document.getElementById("guest-view-home");
  const relevant = guestRelevantEvent();
  el.innerHTML = `
    ${guestPreviewLabelHtml()}
    <div id="guest-clock-hero">${guestHeroHtml()}</div>
    <div id="guest-clock-tools">${guestLiveSeatingCtaHtml()}${guestLivePhotoCtaHtml()}</div>
    ${guestActionsPairHtml()}
    <div id="guest-clock-brochure-home">${guestBrochureHtml()}</div>
    <section class="guest-section" id="guest-clock-details">
      <div class="guest-eyebrow">The Details</div>
      <h2 class="guest-heading-sm">${relevant ? esc(relevant.title) : "The Celebration"}</h2>
      ${guestDetailRowsHtml(relevant)}
    </section>
    <div id="guest-clock-transport">${guestTransportationHtml(relevant)}</div>
  `;
  wireGuestGoto(el);
  wireGuestPhotoCopyButtons(el);
}

/* GUEST EXPANDED PROGRAM correction (2026-08-27): guestSubMoments, when
   present, is a small hand-authored, name-free, order-only list (see
   timeline-guest-subsequences.json and build/generate_guest_data.js) —
   never the item's private internal notes, which this build never even
   receives. Rendered as a native <details> disclosure so it needs no
   click-handler wiring and stays keyboard/mobile accessible for free; no
   individual times are shown for these sub-moments because none were
   individually authored — only their order is a known fact. */
function guestSubMomentsHtml(item){
  if(!Array.isArray(item.guestSubMoments) || !item.guestSubMoments.length) return "";
  return `
    <details class="guest-moment-detail">
      <summary>See the order of events</summary>
      <ol class="guest-moment-detail-list">
        ${item.guestSubMoments.map(m=>`<li>${esc(m)}</li>`).join("")}
      </ol>
    </details>
  `;
}
function renderGuestMoment(item){
  /* Active/current-row emphasis (GUEST EVENT-DETAIL HIERARCHY REFINEMENT,
     2026-08-30): purely additive — an extra class when `now()` falls
     inside this item's own span (see spanEndOf), styled in
     guest-skeleton.html. Applies on every event's detail page, not just
     Vidhi's tracks (see vidhiGuestDetailTrackRowHtml for the track-row
     equivalent), and is a no-op outside preview/live time the same way
     the rest of the guest app already handles now(). */
  const current = isGuestMomentCurrent(item);
  return `
    <div class="guest-moment${current ? ' is-current' : ''}" data-clock-moment="${esc(item.id)}">
      <div class="guest-moment-time">${esc(displayTimeLabel(item))}</div>
      <div class="guest-moment-title">${esc(displayTitle(item))}</div>
      ${guestSubMomentsHtml(item)}
    </div>
  `;
}
/* VENUE AND TIMELINE DATA RESET milestone (2026-08-21): used to return ""
   (hiding the whole event, header included) whenever it had zero timeline
   items — with data.timelineItems now empty by design, that hid every
   event's schedule block permanently. Requirement 5 is explicit: events
   stay visible, and an empty moment list reads "Schedule details coming
   soon", not a blank page. The event header (title/date/venue) is always
   real event data, never derived from the deleted timeline. */
function renderGuestEventBlock(e){
  const items = guestTimelineForEvent(e.id);
  const venue = venueOf(e.venueId);
  const headHtml = `
    <div class="guest-event-head">
      <div class="guest-event-title">${esc(e.title)}</div>
      <div class="guest-event-date">${esc(fmtDate(e.startTime,{weekday:'long',month:'long',day:'numeric'}))}</div>
      <div class="guest-event-meta">${fmtTime(e.startTime)} – ${fmtTime(e.endTime)} · ${venue ? esc(venue.name) : "Venue TBD"}</div>
    </div>
  `;
  /* Vidhi gets the special integrated two-sides structure above (see
     vidhiGuestDetailSectionsHtml); every other event — and Vidhi itself,
     as a defensive fallback, on the rare chance its data ever stops
     shaping into a mergeable pair of tracks — gets the ordinary bounded
     schedule panel every other event's detail page already uses, so the
     ONE compact header + ONE bounded schedule panel shape (requested for
     every event detail page) always holds even if that fallback ever
     fires. */
  const vidhiTracks = e.id === VIDHI_EVENT_ID ? vidhiComputeTracks(items) : null;
  const bodyHtml = vidhiTracks
    ? vidhiGuestDetailSectionsHtml(vidhiTracks)
    : (items.length
        ? `<div class="guest-schedule-panel"><div class="guest-moments">${items.map(renderGuestMoment).join("")}</div></div>`
        : `<p class="guest-empty">Schedule details coming soon.</p>`);
  return `
    <div class="guest-event">
      ${headHtml}
      ${bodyHtml}
    </div>
  `;
}

/* VENUE AND TIMELINE DATA RESET milestone (2026-08-21): "0 moments" read
   as a broken/fabricated count once every event has zero timeline items
   by design — replaced with the same "Schedule details coming soon"
   wording used in renderGuestEventBlock so the two surfaces agree. */
function guestScheduleEventCardHtml(e, isLive){
  const items = guestTimelineForEvent(e.id);
  const venue = venueOf(e.venueId);
  return `
    <button class="guest-event-pick-card ${isLive?'is-live':''}" data-event-palette="${e.id}" data-guest-schedule-open="${e.id}" type="button">
      ${isLive ? `<span class="guest-live-pill"><span class="guest-live-dot"></span>Live Now</span>` : ""}
      <div class="guest-event-pick-title">${esc(e.title)}</div>
      <div class="guest-event-pick-sub">${fmtTime(e.startTime)} – ${fmtTime(e.endTime)} · ${venue ? esc(venue.name) : "Venue TBD"}</div>
      <div class="guest-event-pick-count">${items.length ? `${items.length} moment${items.length===1?'':'s'}` : "Schedule details coming soon"}</div>
    </button>
  `;
}

function renderGuestSchedulePicker(el){
  const days = guestDayGroups();
  const phase = getPhase();
  const liveEventId = phase === "week" ? guestLiveEventId() : null;
  el.innerHTML = `
    ${guestPreviewLabelHtml()}
    <section class="guest-section guest-section-top">
      <div class="guest-eyebrow">The Schedule</div>
      <h1 class="guest-heading">Our Celebration</h1>
      ${days.length
        ? days.map(day => `
            <div class="guest-day">
              <div class="guest-day-label">${esc(day.shortLabel)}</div>
              <div class="guest-events-grid">
                ${day.events.map(e=>guestScheduleEventCardHtml(e, liveEventId===e.id)).join("")}
              </div>
            </div>
          `).join("")
        : `<p class="guest-empty">The schedule will be posted soon — check back closer to the date.</p>`}
    </section>
    ${guestSchedulePhotoNudgeHtml()}
  `;
  el.querySelectorAll("[data-guest-schedule-open]").forEach(b=>b.addEventListener("click", ()=>{
    state.guestScheduleEventId = b.getAttribute("data-guest-schedule-open");
    renderGuestTimeline();
    window.scrollTo(0, 0);
  }));
  wireGuestGoto(el);
  wireGuestPhotoCopyButtons(el);
}

function guestEventDirectoryHtml(eventId){
  const wedding = eventId === "event_wedding";
  if(!wedding && eventId !== "event_reception") return "";
  const records = wedding ? (data.photoGroups || []) : (data.seatingTables || []);
  const title = wedding ? "Wedding Photo Groups" : "Reception Seating Chart";
  return `<section class="guest-section" aria-label="${title}">
    <h2 class="guest-heading">${title}</h2>
    <label for="guest-directory-search">${wedding ? "Find your photo group" : "Find your table"}</label>
    <input id="guest-directory-search" class="guest-directory-search" type="search" placeholder="Search by name or ${wedding ? "group" : "table"}" autocomplete="off">
    <div class="guest-directory-list">${records.map(r => {
      const label = wedding ? r.title : `Table ${r.number}`;
      const groupParts = wedding ? /^(Group\s+\d+)\s+—\s+(.+)$/.exec(label) : null;
      const summaryLabel = groupParts ? groupParts[1] : label;
      const familyLabel = groupParts ? `<p class="guest-group-family"><strong>${esc(groupParts[2])}</strong></p>` : "";
      const names = wedding ? r.names : r.guests;
      return `<details class="guest-directory-record" data-directory-text="${esc([label,...names].join(" ").toLowerCase())}"><summary>${esc(summaryLabel)} · ${names.length} guests</summary>${familyLabel}<ul>${names.map(n=>`<li>${esc(n)}</li>`).join("")}</ul></details>`;
    }).join("")}</div>
    <p data-directory-empty ${records.length ? "hidden" : ""}>${records.length ? "No matching names, groups or tables." : "Details coming soon."}</p>
  </section>`;
}
function wireGuestDirectory(el){
  const input = el.querySelector("#guest-directory-search");
  if(!input) return;
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    let visible = 0;
    el.querySelectorAll("[data-directory-text]").forEach(row => {
      row.hidden = !row.getAttribute("data-directory-text").includes(query);
      row.open = !!query && !row.hidden;
      if(!row.hidden) visible++;
    });
    el.querySelector("[data-directory-empty]").hidden = visible > 0;
  });
}
function renderGuestScheduleForEvent(el, eventObj){
  el.innerHTML = `
    ${guestPreviewLabelHtml()}
    <section class="guest-section guest-section-top guest-schedule-detail-top">
      <button class="guest-schedule-back" data-guest-schedule-back type="button">${ICONS.chevron} Back to All Events</button>
      <div class="guest-eyebrow">The Schedule</div>
      ${renderGuestEventBlock(eventObj)}
    </section>
    ${eventObj.id === "event_wedding" ? `<div id="guest-clock-brochure-event">${guestBrochureHtml()}</div>` : ""}
    ${guestEventDirectoryHtml(eventObj.id)}
    <div id="guest-clock-event-camera">${guestLivePhotoCtaHtml(eventObj.id)}</div>
    ${guestSchedulePhotoNudgeHtml()}
  `;
  wireGuestDirectory(el);
  el.querySelector("[data-guest-schedule-back]").addEventListener("click", ()=>{
    state.guestScheduleEventId = null;
    renderGuestTimeline();
    window.scrollTo(0, 0);
  });
  wireGuestGoto(el);
  wireGuestPhotoCopyButtons(el);
}

function guestSchedulePhotoNudgeHtml(){
  const hashtag = data.wedding.hashtag;
  if(!hashtag) return "";
  return `
    <section class="guest-schedule-photo-nudge-wrap">
      <div class="guest-hashtag-card">
      <button class="guest-schedule-photo-nudge" data-copy-hashtag type="button">
        <span class="guest-schedule-photo-nudge-row">
          <span class="guest-schedule-photo-nudge-icon">${ICONS.camera}</span>
          <span class="guest-schedule-photo-nudge-label">Share Your Photos</span>
        </span>
        <span class="guest-schedule-photo-nudge-tag-row">
          <span class="guest-schedule-photo-nudge-tap">Tap to copy</span>
          <span class="guest-schedule-photo-nudge-hashtag" data-hashtag-text>${esc(hashtag)}</span>
        </span>
      </button>
      ${guestHashtagMeaningHtml()}
      </div>
    </section>
  `;
}

function renderGuestTimeline(){
  applyGuestTheme();
  const el = document.getElementById("guest-view-timeline");
  const eventObj = state.guestScheduleEventId ? ev(state.guestScheduleEventId) : null;
  if(!eventObj){ state.guestScheduleEventId = null; renderGuestSchedulePicker(el); return; }
  renderGuestScheduleForEvent(el, eventObj);
}

/* ---------------------------- Entry points ---------------------------- */
function renderShell(){ renderGuestShell(); }
function renderActiveView(){ renderGuestActiveView(); }

function isSeatingRoute(){
  return /^\/seating\/?$/.test(location.pathname);
}
function seatingKey(value){
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function seatingDistance(a,b){
  const row = Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let prev=row[0]; row[0]=i;
    for(let j=1;j<=b.length;j++){
      const old=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
      prev=old;
    }
  }
  return row[b.length];
}
function seatingMatches(query){
  const completedToken=/\s$/.test(String(query || ""));
  const q=seatingKey(query);
  if(q.length<2) return [];
  const qTokens=q.split(" ");
  const matches=[];
  (data.seatingTables || []).forEach(table=>table.guests.forEach(name=>{
    const key=seatingKey(name), tokens=key.split(" ");
    const contains=qTokens.every(part=>tokens.some(token=>completedToken ? token===part : token.includes(part) || (token.length>=3 && part.includes(token))));
    const fuzzy=!completedToken && q.length>=4 && (seatingDistance(q,key)<=Math.max(1,Math.floor(q.length/5)) || qTokens.every(part=>tokens.some(token=>seatingDistance(part,token)<=1)));
    if(contains || fuzzy){
      const distance=seatingDistance(q,key);
      const score=key===q?0:key.startsWith(q)?1:contains?2+(Math.abs(tokens.length-qTokens.length)/10)+(distance/1000):3+(distance/100);
      matches.push({name,number:table.number,score});
    }
  }));
  return matches.sort((a,b)=>a.score-b.score || a.name.localeCompare(b.name));
}
function renderSeatingPage(){
  document.title="Find Your Table · Avery & Jordan Demo";
  const tables=data.seatingTables || [];
  document.getElementById("app").innerHTML=`<main class="seating-page"><div class="seating-shell">
    <header class="seating-masthead"><div class="seating-monogram">${coupleMonogram()}</div><div class="seating-kicker">Reception Seating</div><h1 class="seating-title">Find Your Table</h1><p class="seating-intro">Search your name below and we’ll point you to your place for the celebration.</p></header>
    <section class="seating-search-panel" aria-label="Find your reception table"><label class="seating-search-label" for="seating-name">Guest name</label><div class="seating-search-wrap"><input class="seating-search" id="seating-name" type="search" placeholder="Start typing your name…" autocomplete="name" autocapitalize="words"><span class="seating-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></span></div><p class="seating-hint">First name, last name, or a close spelling works.</p><div class="seating-result" data-seating-result aria-live="polite"></div></section>
    <section class="seating-directory" aria-labelledby="all-tables"><div class="seating-directory-head"><h2 id="all-tables">Full Seating List</h2><p>Browse every table and guest below.</p></div>${tables.map(table=>`<details class="seating-table"><summary><span>Table ${table.number}</span><span class="seating-table-count">${table.guests.length} guests</span></summary><ul>${table.guests.map(name=>`<li>${esc(name)}</li>`).join("")}</ul></details>`).join("")}</section>
    <a class="seating-back" href="/">← Return to the wedding website</a>
  </div></main>`;
  const input=document.getElementById("seating-name"), result=document.querySelector("[data-seating-result]");
  input.addEventListener("input",()=>{
    const rawQuery=input.value;
    if(rawQuery.trim().length<2){result.innerHTML="";return;}
    const matches=seatingMatches(rawQuery);
    if(!matches.length){result.innerHTML=`<div class="seating-no-result">We couldn’t find that name. Try a shorter spelling, or browse the full list below.</div>`;return;}
    if(matches.length===1){
      const match=matches[0];
      result.innerHTML=`<div class="seating-result-card"><div class="seating-result-name">${esc(match.name)}</div><div class="seating-result-label">Your table</div><div class="seating-result-number">${match.number}</div><div class="seating-result-note">We can’t wait to celebrate with you.</div></div>`;
      return;
    }
    result.innerHTML=`<div class="seating-multiple-heading"><strong>Multiple guests found</strong><span>Choose your full name below to find the right table.</span></div><div class="seating-match-grid">${matches.map(match=>`<div class="seating-match-card"><div class="seating-match-name">${esc(match.name)}</div><div class="seating-match-table"><span>Table</span><strong>${match.number}</strong></div></div>`).join("")}</div>`;
  });
  input.focus({preventScroll:true});
}

// Update only clock-sensitive content, leaving directories, searches and
// expanded program details in place when a phone stays open during an event.
function updateGuestClockHtml(id, html){
  const target = document.getElementById(id);
  if(target && target.innerHTML !== html) target.innerHTML = html;
}
function refreshGuestClock(){
  if(document.hidden || isSeatingRoute()) return;
  applyGuestTheme();
  if(state.guestView === "home"){
    const relevant = guestRelevantEvent();
    updateGuestClockHtml("guest-clock-hero", guestHeroHtml());
    updateGuestClockHtml("guest-clock-tools", guestLiveSeatingCtaHtml()+guestLivePhotoCtaHtml());
    updateGuestClockHtml("guest-clock-brochure-home", guestBrochureHtml());
    updateGuestClockHtml("guest-clock-details", `<div class="guest-eyebrow">The Details</div><h2 class="guest-heading-sm">${relevant ? esc(relevant.title) : "The Celebration"}</h2>${guestDetailRowsHtml(relevant)}`);
    updateGuestClockHtml("guest-clock-transport", guestTransportationHtml(relevant));
  } else if(state.guestScheduleEventId){
    document.querySelectorAll("[data-clock-moment]").forEach(row=>{
      const item = data.timelineItems.find(t=>t.id===row.getAttribute("data-clock-moment"));
      row.classList.toggle("is-current", !!item && isGuestMomentCurrent(item));
    });
    updateGuestClockHtml("guest-clock-event-camera", guestLivePhotoCtaHtml(state.guestScheduleEventId));
    if(state.guestScheduleEventId === "event_wedding") updateGuestClockHtml("guest-clock-brochure-event", guestBrochureHtml());
  } else {
    const liveId = getPhase() === "week" ? guestLiveEventId() : null;
    document.querySelectorAll("[data-guest-schedule-open]").forEach(card=>{
      const live = card.getAttribute("data-guest-schedule-open") === liveId;
      card.classList.toggle("is-live", live);
      const pill = card.querySelector(".guest-live-pill");
      if(!live) pill?.remove();
      else if(!pill) card.insertAdjacentHTML("afterbegin", '<span class="guest-live-pill"><span class="guest-live-dot"></span>Live Now</span>');
    });
  }
}
function boot(){
  loadPersisted();
  if(isSeatingRoute()){ renderSeatingPage(); return; }
  renderShell();
  renderActiveView();
  setInterval(refreshGuestClock, 30000);
  document.addEventListener("visibilitychange", refreshGuestClock);
}
document.addEventListener("DOMContentLoaded", boot);
})();

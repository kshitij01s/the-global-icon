import { DatePipe, NgStyle } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService } from '../core/admin-api.service';
import { AuthService } from '../core/auth.service';

type StudioPanel =
  | 'dashboard'
  | 'library'
  | 'calendar'
  | 'creator'
  | 'templates'
  | 'regions'
  | 'assets'
  | 'animations'
  | 'schedules'
  | 'history'
  | 'published'
  | 'settings';

type Viewport = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-theme-studio',
  imports: [FormsModule, RouterLink, DatePipe, NgStyle],
  styles: [
    `
      :host {
        display: block;
        --studio-bg: #0e1116;
        --studio-panel: #161b22;
        --studio-border: #2a313c;
        --studio-accent: #c5a572;
        --studio-text: #e8e4db;
        --studio-muted: #9aa3b2;
        color: var(--studio-text);
        margin: -1.25rem;
        min-height: calc(100vh - 3rem);
        background: var(--studio-bg);
        font-family: 'Segoe UI', system-ui, sans-serif;
      }
      .studio {
        display: grid;
        grid-template-rows: 48px 1fr;
        height: calc(100vh - 3rem);
        min-height: 640px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 0.75rem;
        border-bottom: 1px solid var(--studio-border);
        background: #12161c;
      }
      .toolbar h1 {
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        margin: 0 0.75rem 0 0;
        white-space: nowrap;
      }
      .toolbar .spacer {
        flex: 1;
      }
      .tb-btn {
        background: #1c222c;
        border: 1px solid var(--studio-border);
        color: var(--studio-text);
        border-radius: 6px;
        padding: 0.35rem 0.65rem;
        font-size: 0.75rem;
        cursor: pointer;
      }
      .tb-btn:hover {
        border-color: var(--studio-accent);
      }
      .tb-btn.primary {
        background: linear-gradient(135deg, #9c7c47, #c5a572);
        color: #12151c;
        border-color: transparent;
        font-weight: 600;
      }
      .tb-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .workspace {
        display: grid;
        grid-template-columns: 220px 1fr 300px;
        min-height: 0;
      }
      .side,
      .props {
        background: var(--studio-panel);
        border-right: 1px solid var(--studio-border);
        overflow: auto;
        padding: 0.75rem;
      }
      .props {
        border-right: none;
        border-left: 1px solid var(--studio-border);
      }
      .side nav button {
        display: flex;
        width: 100%;
        text-align: left;
        gap: 0.5rem;
        background: transparent;
        border: none;
        color: var(--studio-muted);
        padding: 0.45rem 0.55rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
      }
      .side nav button.active,
      .side nav button:hover {
        background: #1e2530;
        color: var(--studio-text);
      }
      .side .label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--studio-muted);
        margin: 0.75rem 0 0.35rem;
      }
      .canvas-wrap {
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: #0a0c10;
      }
      .viewport-bar {
        display: flex;
        gap: 0.35rem;
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--studio-border);
      }
      .canvas {
        flex: 1;
        overflow: auto;
        display: flex;
        justify-content: center;
        padding: 1.25rem;
      }
      .preview-frame {
        background: var(--pv-bg, #05070b);
        color: var(--pv-text, #f5eedf);
        border: 1px solid var(--studio-border);
        border-radius: 12px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        transition: width 0.25s ease;
        overflow: hidden;
        position: relative;
      }
      .preview-frame.desktop {
        width: min(100%, 980px);
      }
      .preview-frame.tablet {
        width: 768px;
        max-width: 100%;
      }
      .preview-frame.mobile {
        width: 390px;
        max-width: 100%;
      }
      .pv-nav {
        display: flex;
        justify-content: space-between;
        padding: 0.85rem 1.1rem;
        border-bottom: 1px solid color-mix(in srgb, var(--pv-accent) 35%, transparent);
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .pv-hero {
        padding: 2.5rem 1.5rem 2rem;
        background:
          radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--pv-accent) 28%, transparent), transparent 55%),
          linear-gradient(160deg, var(--pv-navy), var(--pv-bg));
        min-height: 220px;
      }
      .pv-hero h2 {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(1.6rem, 4vw, 2.4rem);
        margin: 0.35rem 0;
        max-width: 16ch;
      }
      .pv-hero p {
        opacity: 0.8;
        max-width: 36ch;
        font-size: 0.9rem;
      }
      .pv-cta {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.55rem 1rem;
        border-radius: var(--pv-radius, 8px);
        background: var(--pv-accent);
        color: #12151c;
        font-weight: 600;
        font-size: 0.8rem;
      }
      .pv-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        padding: 1rem 1.25rem 1.5rem;
      }
      .preview-frame.mobile .pv-grid {
        grid-template-columns: 1fr;
      }
      .preview-frame.tablet .pv-grid {
        grid-template-columns: 1fr 1fr;
      }
      .pv-card {
        background: color-mix(in srgb, var(--pv-surface) 88%, black);
        border: 1px solid color-mix(in srgb, var(--pv-accent) 22%, transparent);
        border-radius: var(--pv-card-radius, 10px);
        padding: 0.85rem;
        min-height: 88px;
      }
      .pv-card small {
        color: var(--pv-accent);
        font-size: 0.65rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .fx-badge {
        position: absolute;
        top: 4.5rem;
        right: 1rem;
        font-size: 0.65rem;
        background: rgba(0, 0, 0, 0.45);
        padding: 0.25rem 0.5rem;
        border-radius: 999px;
        border: 1px solid color-mix(in srgb, var(--pv-accent) 40%, transparent);
      }
      .props h3 {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--studio-muted);
        margin: 0 0 0.65rem;
      }
      .field {
        margin-bottom: 0.65rem;
      }
      .field label {
        display: block;
        font-size: 0.7rem;
        color: var(--studio-muted);
        margin-bottom: 0.2rem;
      }
      .field input[type='text'],
      .field input[type='number'],
      .field input[type='datetime-local'],
      .field select,
      .field textarea {
        width: 100%;
        background: #0e1218;
        border: 1px solid var(--studio-border);
        color: var(--studio-text);
        border-radius: 6px;
        padding: 0.4rem 0.5rem;
        font-size: 0.8rem;
      }
      .field input[type='color'] {
        width: 100%;
        height: 2rem;
        border: none;
        background: transparent;
        cursor: pointer;
      }
      .chk {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.78rem;
        margin: 0.35rem 0;
      }
      .list-item {
        display: block;
        width: 100%;
        text-align: left;
        background: #12171f;
        border: 1px solid var(--studio-border);
        border-radius: 8px;
        padding: 0.55rem 0.65rem;
        margin-bottom: 0.4rem;
        color: var(--studio-text);
        cursor: pointer;
        font-size: 0.78rem;
      }
      .list-item.active {
        border-color: var(--studio-accent);
      }
      .list-item small {
        display: block;
        color: var(--studio-muted);
        margin-top: 0.15rem;
      }
      .status {
        display: inline-block;
        font-size: 0.65rem;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        background: #243044;
        margin-left: 0.35rem;
      }
      .status.DRAFT {
        background: #3a3420;
      }
      .status.PUBLISHED,
      .status.ACTIVE {
        background: #1d3a2a;
      }
      .status.SCHEDULED {
        background: #1e2f4a;
      }
      .status.PAUSED,
      .status.EXPIRED {
        background: #3a2222;
      }
      .msg {
        font-size: 0.75rem;
        color: var(--studio-accent);
        margin: 0.35rem 0;
      }
      .err {
        color: #f87171;
      }
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 0.5rem;
        padding: 0.75rem;
      }
      .cal-card {
        background: #161b22;
        border: 1px solid var(--studio-border);
        border-radius: 8px;
        padding: 0.65rem;
        font-size: 0.75rem;
      }
      .back-link {
        color: var(--studio-muted);
        font-size: 0.75rem;
        text-decoration: none;
      }
      .back-link:hover {
        color: var(--studio-accent);
      }
      @media (max-width: 1100px) {
        .workspace {
          grid-template-columns: 180px 1fr;
        }
        .props {
          display: none;
        }
      }
    `,
  ],
  template: `
    <div class="studio">
      <header class="toolbar">
        <h1>GLOBAL FESTIVAL THEME STUDIO</h1>
        <a class="back-link" routerLink="/themes">Overview</a>
        <div class="spacer"></div>
        <button class="tb-btn" type="button" (click)="undo()" [disabled]="!canUndo()">Undo</button>
        <button class="tb-btn" type="button" (click)="redo()" [disabled]="!canRedo()">Redo</button>
        <button class="tb-btn" type="button" (click)="resetTokens()" [disabled]="!selectedTemplate()">Reset</button>
        <button class="tb-btn" type="button" (click)="saveDraft()" [disabled]="!canManage() || !selectedTemplate()">
          Save Draft
        </button>
        <button class="tb-btn" type="button" (click)="duplicate()" [disabled]="!canManage() || !selectedTemplate()">
          Duplicate
        </button>
        <button class="tb-btn primary" type="button" (click)="publish()" [disabled]="!canManage() || !selectedTemplate()">
          Publish
        </button>
        <button class="tb-btn" type="button" (click)="openSchedule()" [disabled]="!canSchedule()">Schedule</button>
      </header>

      <div class="workspace">
        <aside class="side">
          <div class="label">Studio</div>
          <nav>
            @for (item of nav; track item.id) {
              <button type="button" [class.active]="panel() === item.id" (click)="setPanel(item.id)">
                <span>{{ item.icon }}</span>{{ item.label }}
              </button>
            }
          </nav>
          @if (msg()) {
            <p class="msg" [class.err]="msgError()">{{ msg() }}</p>
          }
        </aside>

        <section class="canvas-wrap">
          @if (panel() === 'calendar') {
            <div class="viewport-bar">
              <label>
                Year
                <input type="number" [(ngModel)]="calYear" (change)="loadCalendar()" style="width:5rem;margin-left:0.35rem" />
              </label>
              <select [(ngModel)]="calCountry" (change)="loadCalendar()">
                <option value="">All countries</option>
                @for (c of countries(); track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>
            <div class="cal-grid">
              @for (s of calendarSchedules(); track s.id) {
                <div class="cal-card">
                  <strong>{{ s.name }}</strong>
                  <span class="status" [class]="s.status">{{ s.status }}</span>
                  <div>{{ s.startsAt | date: 'mediumDate' }} → {{ s.endsAt | date: 'mediumDate' }}</div>
                  <small>{{ s.themeSlug }} · {{ s.countryCode || 'Global' }}</small>
                </div>
              }
              @for (w of calendarSamples(); track w.festival.id) {
                <div class="cal-card">
                  <strong>{{ w.festival.name }}</strong>
                  <span class="status" [class]="w.needsVerification ? 'DRAFT' : 'SCHEDULED'">
                    {{ w.needsVerification ? 'Needs verify' : 'Sample' }}
                  </span>
                  <div>{{ w.startsAt | date: 'mediumDate' }} → {{ w.endsAt | date: 'mediumDate' }}</div>
                  <small>{{ w.festival.countryCode }} · {{ w.festival.calendarBasis }}</small>
                </div>
              }
            </div>
          } @else if (panel() === 'schedules') {
            <div style="padding:1rem;overflow:auto">
              <h2 style="font-size:1rem;margin:0 0 0.75rem">Schedule Manager</h2>
              @if (canSchedule()) {
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;max-width:720px;margin-bottom:1rem">
                  <div class="field"><label>Name</label><input type="text" [(ngModel)]="schedForm.name" /></div>
                  <div class="field"><label>Event key</label><input type="text" [(ngModel)]="schedForm.eventKey" /></div>
                  <div class="field">
                    <label>Theme slug</label>
                    <select [(ngModel)]="schedForm.themeSlug">
                      @for (t of themes(); track t.slug) {
                        <option [value]="t.slug">{{ t.name }}</option>
                      }
                    </select>
                  </div>
                  <div class="field"><label>Country</label><input type="text" [(ngModel)]="schedForm.countryCode" placeholder="IN / US / GB" /></div>
                  <div class="field"><label>Starts (UTC)</label><input type="datetime-local" [(ngModel)]="schedForm.startsAt" /></div>
                  <div class="field"><label>Ends (UTC)</label><input type="datetime-local" [(ngModel)]="schedForm.endsAt" /></div>
                  <div class="field"><label>Timezone</label><input type="text" [(ngModel)]="schedForm.timezone" /></div>
                  <div class="field"><label>Priority</label><input type="number" [(ngModel)]="schedForm.priority" /></div>
                  <button class="tb-btn primary" type="button" (click)="saveSchedule()">Save schedule</button>
                </div>
              }
              @for (s of schedules(); track s.id) {
                <button type="button" class="list-item" (click)="editSchedule(s)">
                  {{ s.name }}
                  <span class="status" [class]="s.status">{{ s.status }}</span>
                  <small>{{ s.startsAt | date: 'short' }} → {{ s.endsAt | date: 'short' }} · {{ s.themeSlug }}</small>
                </button>
              }
            </div>
          } @else if (panel() === 'settings') {
            <div style="padding:1rem;max-width:520px">
              <h2 style="font-size:1rem">Theme Settings</h2>
              <label class="chk"><input type="checkbox" [(ngModel)]="flags.festivalAutoEnabled" /> Festival auto-activation</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="flags.effectsEnabled" /> Effects enabled</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="flags.allowReaderPreference" /> Allow reader preference</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="flags.allowVisitorRegionSelect" /> Allow visitor region select</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="flags.allowAdminGlobalChange" /> Allow Admin global change</label>
              <div class="field" style="margin-top:0.75rem">
                <label>Scheduler test as-of (ISO, Super Admin — does not auto-publish)</label>
                <input type="text" [(ngModel)]="flags.schedulerTestAsOf" placeholder="2026-12-25T12:00:00.000Z or empty" />
              </div>
              <button class="tb-btn primary" type="button" (click)="saveFlags()" [disabled]="!canManage()">Save settings</button>
            </div>
          } @else {
            <div class="viewport-bar">
              <button class="tb-btn" type="button" [class.primary]="viewport() === 'desktop'" (click)="viewport.set('desktop')">
                Desktop
              </button>
              <button class="tb-btn" type="button" [class.primary]="viewport() === 'tablet'" (click)="viewport.set('tablet')">
                Tablet
              </button>
              <button class="tb-btn" type="button" [class.primary]="viewport() === 'mobile'" (click)="viewport.set('mobile')">
                Mobile
              </button>
              <span style="margin-left:auto;font-size:0.75rem;color:var(--studio-muted)">
                {{ selectedTemplate()?.name || 'Select or create a template' }}
                @if (selectedTemplate()) {
                  <span class="status" [class]="selectedTemplate()!.status">{{ selectedTemplate()!.status }}</span>
                }
              </span>
            </div>
            <div class="canvas">
              <div
                class="preview-frame"
                [class]="viewport()"
                [ngStyle]="previewStyle()"
              >
                <div class="pv-nav">
                  <strong>THE GLOBAL ICON</strong>
                  <span>Stories · Editions · Magazines</span>
                </div>
                <div class="pv-hero">
                  <small style="color:var(--pv-accent);letter-spacing:0.12em;text-transform:uppercase">Live theme preview</small>
                  <h2>Turn the Pages of the Moment</h2>
                  <p>Stories That Shape Tomorrow — festival-ready editorial presentation.</p>
                  <span class="pv-cta">Explore Magazines</span>
                </div>
                @if (effectSummary()) {
                  <div class="fx-badge">Effects: {{ effectSummary() }}</div>
                }
                <div class="pv-grid">
                  <div class="pv-card"><small>Featured</small><div>Edition cover</div></div>
                  <div class="pv-card"><small>Stories</small><div>Latest narrative</div></div>
                  <div class="pv-card"><small>Leaders</small><div>Profiles</div></div>
                </div>
              </div>
            </div>
          }
        </section>

        <aside class="props">
          @if (panel() === 'library' || panel() === 'published') {
            <h3>Theme Library</h3>
            @for (t of filteredThemes(); track t.slug) {
              <button type="button" class="list-item" (click)="createFromTheme(t.slug)">
                {{ t.name }}
                <small>{{ t.kind }} · {{ t.slug }}</small>
              </button>
            }
          } @else if (panel() === 'templates' || panel() === 'creator' || panel() === 'dashboard') {
            <h3>My Templates</h3>
            <button class="tb-btn primary" type="button" style="width:100%;margin-bottom:0.5rem" (click)="newTemplate()" [disabled]="!canManage()">
              + New template
            </button>
            @for (t of templates(); track t.id) {
              <button type="button" class="list-item" [class.active]="selectedTemplate()?.id === t.id" (click)="selectTemplate(t)">
                {{ t.name }}
                <span class="status" [class]="t.status">{{ t.status }}</span>
                <small>{{ t.publishedSlug || t.slug }}</small>
              </button>
            }
            @if (selectedTemplate()) {
              <h3 style="margin-top:1rem">Colors</h3>
              @for (key of colorKeys; track key) {
                <div class="field">
                  <label>{{ key }}</label>
                  <input type="color" [ngModel]="tokenColor(key)" (ngModelChange)="setToken(key, $event)" />
                </div>
              }
              <h3>Effects</h3>
              @for (fx of effectKeys; track fx) {
                <label class="chk">
                  <input type="checkbox" [ngModel]="!!draftEffects()[fx]" (ngModelChange)="toggleEffect(fx, $event)" />
                  {{ fx }}
                </label>
              }
              <div class="field">
                <label>Intensity</label>
                <select [ngModel]="draftEffects()['intensity'] || 'subtle'" (ngModelChange)="setEffect('intensity', $event)">
                  <option value="subtle">Subtle</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
              <h3>Version history</h3>
              @for (v of selectedTemplate()?.versions || []; track v.id) {
                <button type="button" class="list-item" (click)="restoreVersion(v.id)" [disabled]="!canManage()">
                  {{ v.note || 'Version' }}
                  <small>{{ v.createdAt | date: 'short' }}</small>
                </button>
              }
            }
          } @else if (panel() === 'regions' || panel() === 'calendar') {
            <h3>Festivals by region</h3>
            <div class="field">
              <label>Filter country</label>
              <select [(ngModel)]="festCountry" (change)="filterFestivals()">
                <option value="">All</option>
                @for (c of countries(); track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </div>
            @for (f of festivalsView(); track f.id) {
              <button type="button" class="list-item" (click)="createFromFestival(f)">
                {{ f.name }}
                <small
                  >{{ f.countryCode }} · {{ f.calendarBasis }}
                  @if (!f.dateVerified) {
                    · needs date verify
                  }
                </small>
              </button>
            }
          } @else if (panel() === 'assets') {
            <h3>Asset Library</h3>
            @for (a of assets(); track a.id) {
              <div class="list-item">
                {{ a.name }}
                <small>{{ a.category }} · {{ a.key }}</small>
              </div>
            }
          } @else if (panel() === 'animations') {
            <h3>Animation Library</h3>
            @for (a of animations(); track a.id) {
              <button type="button" class="list-item" (click)="applyAnimation(a)" [disabled]="!selectedTemplate()">
                {{ a.name }}
                <small>{{ a.description }}</small>
              </button>
            }
          } @else if (panel() === 'history') {
            <h3>Activation history</h3>
            @for (h of history(); track h.id) {
              <div class="list-item">
                {{ h.changeType }} → {{ h.newSlug }}
                <small>{{ h.createdAt | date: 'short' }}</small>
              </div>
            }
          }
        </aside>
      </div>
    </div>
  `,
})
export class ThemeStudioComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AuthService);

  protected readonly nav: { id: StudioPanel; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'library', label: 'Theme Library', icon: '▤' },
    { id: 'calendar', label: 'Festival Calendar', icon: '◷' },
    { id: 'creator', label: 'Theme Creator', icon: '✎' },
    { id: 'templates', label: 'My Templates', icon: '☰' },
    { id: 'regions', label: 'Global Regions', icon: '◎' },
    { id: 'assets', label: 'Asset Library', icon: '▣' },
    { id: 'animations', label: 'Animation Library', icon: '✦' },
    { id: 'schedules', label: 'Schedule Manager', icon: '⌚' },
    { id: 'history', label: 'Preview History', icon: '↩' },
    { id: 'published', label: 'Published Themes', icon: '★' },
    { id: 'settings', label: 'Theme Settings', icon: '⚙' },
  ];

  protected readonly colorKeys = [
    'color-midnight',
    'color-navy',
    'color-gold',
    'color-gold-bright',
    'color-crimson',
    'color-ivory',
  ];
  protected readonly effectKeys = [
    'snowfall',
    'festiveLights',
    'snowman',
    'christmasTree',
    'diyaGlow',
    'colourBurst',
    'hearts',
    'fireworks',
    'natureLeaves',
    'lanterns',
    'fog',
    'petals',
    'confetti',
    'crescentGlow',
    'pumpkins',
  ];

  protected panel = signal<StudioPanel>('dashboard');
  protected viewport = signal<Viewport>('desktop');
  protected themes = signal<any[]>([]);
  protected templates = signal<any[]>([]);
  protected festivals = signal<any[]>([]);
  protected festivalsView = signal<any[]>([]);
  protected assets = signal<any[]>([]);
  protected animations = signal<any[]>([]);
  protected schedules = signal<any[]>([]);
  protected history = signal<any[]>([]);
  protected countries = signal<string[]>([]);
  protected selectedTemplate = signal<any | null>(null);
  protected draftTokens = signal<Record<string, string>>({});
  protected draftEffects = signal<Record<string, any>>({});
  protected msg = signal('');
  protected msgError = signal(false);
  protected undoStack: { tokens: Record<string, string>; effects: Record<string, any> }[] = [];
  protected redoStack: { tokens: Record<string, string>; effects: Record<string, any> }[] = [];

  protected calYear = new Date().getUTCFullYear();
  protected calCountry = '';
  protected festCountry = '';
  protected calendarSchedules = signal<any[]>([]);
  protected calendarSamples = signal<any[]>([]);

  protected flags: any = {
    festivalAutoEnabled: true,
    effectsEnabled: true,
    allowReaderPreference: true,
    allowVisitorRegionSelect: true,
    allowAdminGlobalChange: false,
    schedulerTestAsOf: '',
  };

  protected schedForm: any = {
    name: '',
    eventKey: '',
    themeSlug: 'festival-christmas',
    countryCode: '',
    startsAt: '',
    endsAt: '',
    timezone: 'UTC',
    priority: 50,
  };

  protected filteredThemes = computed(() => {
    const all = this.themes();
    if (this.panel() === 'published') return all.filter((t) => !t.isBuiltIn || t.kind === 'FESTIVAL');
    return all;
  });

  protected previewStyle = computed(() => {
    const t = this.draftTokens();
    return {
      '--pv-bg': t['color-midnight'] || '#05070b',
      '--pv-navy': t['color-navy'] || '#0b1426',
      '--pv-accent': t['color-gold'] || '#c5a572',
      '--pv-text': t['color-ivory'] || '#f5eedf',
      '--pv-surface': t['color-charcoal'] || '#181b21',
      '--pv-radius': '8px',
      '--pv-card-radius': '10px',
    } as Record<string, string>;
  });

  protected effectSummary = computed(() => {
    const e = this.draftEffects();
    return this.effectKeys.filter((k) => e[k]).join(', ');
  });

  protected canManage = () => this.auth.can('themes.manage') || this.auth.hasRole('SUPER_ADMIN');
  protected canSchedule = () => this.auth.can('themes.schedule') || this.auth.hasRole('SUPER_ADMIN');
  protected canUndo = () => this.undoStack.length > 0;
  protected canRedo = () => this.redoStack.length > 0;

  ngOnInit() {
    this.reload();
  }

  protected setPanel(id: StudioPanel) {
    this.panel.set(id);
    if (id === 'calendar') this.loadCalendar();
  }

  private reload() {
    this.api.themesStudio().subscribe({
      next: (data) => {
        this.themes.set(data.themes || []);
        this.templates.set(data.templates || []);
        this.festivals.set(data.festivals || []);
        this.festivalsView.set(data.festivals || []);
        this.assets.set(data.assets || []);
        this.animations.set(data.animations || []);
        this.countries.set(data.countries || []);
        if (data.settings) {
          this.flags = {
            festivalAutoEnabled: data.settings.festivalAutoEnabled,
            effectsEnabled: data.settings.effectsEnabled,
            allowReaderPreference: data.settings.allowReaderPreference,
            allowVisitorRegionSelect: data.settings.allowVisitorRegionSelect ?? true,
            allowAdminGlobalChange: data.settings.allowAdminGlobalChange,
            schedulerTestAsOf: data.settings.schedulerTestAsOf || '',
          };
        }
      },
      error: (e) => this.flash(e?.error?.message || 'Failed to load studio', true),
    });
    this.api.themesOverview().subscribe({
      next: (o) => {
        this.schedules.set(o.schedules || []);
        this.history.set(o.history || []);
      },
    });
  }

  protected tokenColor(key: string) {
    const v = this.draftTokens()[key] || '#000000';
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000';
  }

  protected setToken(key: string, value: string) {
    this.pushUndo();
    this.draftTokens.update((t) => ({ ...t, [key]: value }));
  }

  protected toggleEffect(key: string, on: boolean) {
    this.pushUndo();
    this.draftEffects.update((e) => ({ ...e, [key]: on }));
  }

  protected setEffect(key: string, value: any) {
    this.pushUndo();
    this.draftEffects.update((e) => ({ ...e, [key]: value }));
  }

  private pushUndo() {
    this.undoStack.push({
      tokens: { ...this.draftTokens() },
      effects: { ...this.draftEffects() },
    });
    this.redoStack = [];
  }

  protected undo() {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push({ tokens: { ...this.draftTokens() }, effects: { ...this.draftEffects() } });
    this.draftTokens.set(prev.tokens);
    this.draftEffects.set(prev.effects);
  }

  protected redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push({ tokens: { ...this.draftTokens() }, effects: { ...this.draftEffects() } });
    this.draftTokens.set(next.tokens);
    this.draftEffects.set(next.effects);
  }

  protected resetTokens() {
    const t = this.selectedTemplate();
    if (!t) return;
    this.pushUndo();
    this.draftTokens.set({ ...(t.tokens || {}) });
    this.draftEffects.set({ ...(t.effects || {}) });
  }

  protected selectTemplate(t: any) {
    this.selectedTemplate.set(t);
    this.draftTokens.set({ ...(t.tokens || {}) });
    this.draftEffects.set({ ...(t.effects || {}) });
    this.undoStack = [];
    this.redoStack = [];
    this.panel.set('creator');
  }

  protected newTemplate() {
    this.api.createThemeTemplate({ name: 'Untitled Festival Theme', baseThemeSlug: 'midnight-dark' }).subscribe({
      next: (t) => {
        this.flash('Draft created');
        this.reload();
        this.selectTemplate(t);
      },
      error: (e) => this.flash(e?.error?.message || 'Create failed', true),
    });
  }

  protected createFromTheme(slug: string) {
    const theme = this.themes().find((t) => t.slug === slug);
    this.api
      .createThemeTemplate({
        name: `${theme?.name || slug} Template`,
        baseThemeSlug: slug,
      })
      .subscribe({
        next: (t) => {
          this.flash('Template from library');
          this.reload();
          this.selectTemplate(t);
        },
        error: (e) => this.flash(e?.error?.message || 'Create failed', true),
      });
  }

  protected createFromFestival(f: any) {
    this.api
      .createThemeTemplate({
        name: `${f.name} Theme`,
        festivalId: f.id,
        countryCode: f.countryCode,
        regionCode: f.regionCode,
        baseThemeSlug: f.defaultThemeSlug || 'midnight-dark',
      })
      .subscribe({
        next: (t) => {
          this.flash(`Template for ${f.name}`);
          this.reload();
          this.selectTemplate(t);
        },
        error: (e) => this.flash(e?.error?.message || 'Create failed', true),
      });
  }

  protected saveDraft() {
    const t = this.selectedTemplate();
    if (!t) return;
    this.api
      .updateThemeTemplate(t.id, {
        tokens: this.draftTokens(),
        effects: this.draftEffects(),
        note: 'Studio draft save',
      })
      .subscribe({
        next: (updated) => {
          this.flash('Draft saved');
          this.selectedTemplate.set(updated);
          this.reload();
        },
        error: (e) => this.flash(e?.error?.message || 'Save failed', true),
      });
  }

  protected publish() {
    const t = this.selectedTemplate();
    if (!t) return;
    this.api
      .updateThemeTemplate(t.id, {
        tokens: this.draftTokens(),
        effects: this.draftEffects(),
        note: 'Pre-publish',
        saveVersion: true,
      })
      .subscribe({
        next: () => {
          this.api.publishThemeTemplate(t.id).subscribe({
            next: (res) => {
              this.flash(`Published as ${res.theme?.slug}`);
              this.selectTemplate(res.template);
              this.reload();
            },
            error: (e) => this.flash(e?.error?.message || 'Publish failed', true),
          });
        },
      });
  }

  protected duplicate() {
    const t = this.selectedTemplate();
    if (!t) return;
    this.api.duplicateThemeTemplate(t.id).subscribe({
      next: (copy) => {
        this.flash('Duplicated');
        this.reload();
        this.selectTemplate(copy);
      },
      error: (e) => this.flash(e?.error?.message || 'Duplicate failed', true),
    });
  }

  protected restoreVersion(versionId: string) {
    const t = this.selectedTemplate();
    if (!t) return;
    this.api.restoreThemeTemplateVersion(t.id, versionId).subscribe({
      next: (updated) => {
        this.flash('Version restored');
        this.selectTemplate(updated);
        this.reload();
      },
      error: (e) => this.flash(e?.error?.message || 'Restore failed', true),
    });
  }

  protected applyAnimation(a: any) {
    this.pushUndo();
    this.draftEffects.update((e) => ({ ...e, ...(a.config || {}) }));
    this.flash(`Applied ${a.name}`);
  }

  protected filterFestivals() {
    const c = this.festCountry;
    this.festivalsView.set(c ? this.festivals().filter((f) => f.countryCode === c) : this.festivals());
  }

  protected loadCalendar() {
    this.api.themesCalendar(this.calYear, this.calCountry || undefined).subscribe({
      next: (data) => {
        this.calendarSchedules.set(data.schedules || []);
        this.calendarSamples.set(data.sampleWindows || []);
      },
      error: (e) => this.flash(e?.error?.message || 'Calendar failed', true),
    });
  }

  protected openSchedule() {
    this.panel.set('schedules');
    const t = this.selectedTemplate();
    if (t?.publishedSlug) this.schedForm.themeSlug = t.publishedSlug;
  }

  protected editSchedule(s: any) {
    this.schedForm = {
      id: s.id,
      name: s.name,
      eventKey: s.eventKey,
      themeSlug: s.themeSlug,
      countryCode: s.countryCode || '',
      startsAt: s.startsAt?.slice(0, 16) || '',
      endsAt: s.endsAt?.slice(0, 16) || '',
      timezone: s.timezone || 'UTC',
      priority: s.priority ?? 50,
    };
  }

  protected saveSchedule() {
    const body = {
      ...this.schedForm,
      startsAt: new Date(this.schedForm.startsAt).toISOString(),
      endsAt: new Date(this.schedForm.endsAt).toISOString(),
      countryCode: this.schedForm.countryCode || null,
      enabled: true,
      status: 'SCHEDULED',
    };
    this.api.upsertThemeSchedule(body).subscribe({
      next: () => {
        this.flash('Schedule saved');
        this.reload();
      },
      error: (e) => this.flash(e?.error?.message || 'Schedule failed', true),
    });
  }

  protected saveFlags() {
    const body = {
      ...this.flags,
      schedulerTestAsOf: this.flags.schedulerTestAsOf || null,
    };
    this.api.updateThemeSettings(body).subscribe({
      next: () => this.flash('Settings saved'),
      error: (e) => this.flash(e?.error?.message || 'Settings failed', true),
    });
  }

  private flash(text: string, err = false) {
    this.msg.set(text);
    this.msgError.set(err);
    setTimeout(() => this.msg.set(''), 4000);
  }
}

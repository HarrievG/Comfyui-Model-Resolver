import { app } from "../../../../scripts/app.js";
import { api } from "../../../../scripts/api.js";
import { $el } from "../../../../scripts/ui.js";
import { getSvgIcon } from "../utils/icon_utils.js";
export const optionsMethods = {
    displayOptions() {
        if (!this.contentElement) return;
        this.contentElement.style.overflowY = 'hidden';

        const tokens = this.getStoredTokens();
        const sourceDefaultsRows = this.getSearchSourceDefinitions()
            .filter(def => this.isSourceAvailable(def.source))
            .map(def => {
                const iconName = this.getSearchSourceIconName(def.source);
                const checked = tokens.search_source_enabled?.[def.source] !== false;
                const inputId = `ml-options-source-${def.source.replace(/_/g, '-')}`;
                return `
                    <label class="ml-options-toggle-row">
                        <div class="ml-options-toggle-copy">
                            <span class="ml-options-toggle-title">
                                <span class="ml-options-source-icon" aria-hidden="true">${getSvgIcon(iconName)}</span>
                                <span>${this.escapeHtml(this.getSearchSourceLabel(def.source))}</span>
                                <span class="ml-tooltip-badge" data-tooltip="${this.escapeHtml(def.tooltip)}">?</span>
                            </span>
                        </div>
                        <span class="ml-options-toggle-control">
                            <input id="${inputId}" class="ml-options-switch-input ml-options-source-enabled" type="checkbox" data-source="${this.escapeHtml(def.source)}" data-storage-key="${this.escapeHtml(def.storageKey)}" ${checked ? 'checked' : ''}>
                            <span class="ml-options-switch"></span>
                        </span>
                    </label>
                `;
            })
            .join('');
        this.contentElement.innerHTML = `
            <div class="ml-options-wrap">
                <div class="ml-options-shell">
                    <aside class="ml-options-sidebar">
                        <div class="ml-options-sidebar-group">
                            <h3 class="ml-options-sidebar-title">Application Settings</h3>
                        </div>
                        <div class="ml-options-sidebar-group">
                            <div class="ml-options-sidebar-label">Download</div>
                            <div class="ml-options-nav">
                                <button type="button" class="ml-options-nav-btn is-active" data-target="ml-options-section-sources">
                                    <span class="ml-options-nav-main">
                                        <span class="ml-options-nav-icon" aria-hidden="true">${getSvgIcon('download')}</span>
                                        <span>Sources</span>
                                    </span>
                                    <span class="ml-options-nav-meta">01</span>
                                </button>
                                <button type="button" class="ml-options-nav-btn" data-target="ml-options-section-local-db">
                                    <span class="ml-options-nav-main">
                                        <span class="ml-options-nav-icon ml-options-comfyui-icon" aria-hidden="true">${getSvgIcon('comfyui')}</span>
                                        <span>Local Database</span>
                                    </span>
                                    <span class="ml-options-nav-meta">02</span>
                                </button>
                            </div>
                        </div>
                        <div class="ml-options-sidebar-group">
                            <div class="ml-options-sidebar-label">Providers</div>
                            <div class="ml-options-nav">
                                <button type="button" class="ml-options-nav-btn" data-target="ml-options-section-civitai">
                                    <span class="ml-options-nav-main">
                                        <span class="ml-options-nav-icon ml-options-provider-icon ml-options-provider-icon-civitai" aria-hidden="true">${getSvgIcon('civitai')}</span>
                                        <span>CivitAI</span>
                                    </span>
                                    <span class="ml-options-nav-meta">03</span>
                                </button>
                                <button type="button" class="ml-options-nav-btn" data-target="ml-options-section-hf">
                                    <span class="ml-options-nav-main">
                                        <span class="ml-options-nav-icon ml-options-provider-icon ml-options-provider-icon-huggingface" aria-hidden="true">${getSvgIcon('huggingface')}</span>
                                        <span>HuggingFace</span>
                                    </span>
                                    <span class="ml-options-nav-meta">04</span>
                                </button>
                            </div>
                        </div>
                        <div class="ml-options-actions">
                            <div id="ml-options-status" class="ml-options-status">Saved only on this machine.</div>
                            <button id="ml-options-save" class="ml-btn ml-btn-primary ml-footer-btn">Save</button>
                        </div>
                    </aside>
                    <div class="ml-options-main">
                        <section id="ml-options-section-sources" class="ml-options-card ml-options-section">
                            <div class="ml-options-section-head">
                                <h4 class="ml-options-section-title">Download Sources</h4>
                            </div>
                            <div class="ml-options-grid">
                                <div class="ml-options-panel">
                                    <div class="ml-options-toggle-list">
                                        ${sourceDefaultsRows}
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section id="ml-options-section-local-db" class="ml-options-card ml-options-section is-hidden">
                            <div class="ml-options-section-head">
                                <h4 class="ml-options-section-title">Local Database</h4>
                            </div>
                            <div class="ml-options-grid">
                                <div class="ml-options-panel">
                                    <div class="ml-options-stack">
                                        <div class="ml-options-db-summary">
                                            <div class="ml-options-db-row">
                                                <span>Models</span>
                                                <strong id="ml-options-model-list-count">Loading...</strong>
                                            </div>
                                            <div class="ml-options-db-row">
                                                <span>Last update</span>
                                                <strong id="ml-options-model-list-updated">Loading...</strong>
                                            </div>
                                            <div class="ml-options-db-row">
                                                <span>Status</span>
                                                <strong id="ml-options-model-list-state">Checking local file...</strong>
                                            </div>
                                        </div>
                                        <div id="ml-options-model-list-message" class="ml-options-db-message">Local Database uses ComfyUI-Manager model-list.json.</div>
                                        <div class="ml-options-db-actions">
                                            <button id="ml-options-model-list-check" type="button" class="ml-btn ml-btn-secondary">${getSvgIcon('refreshCw')} Check latest</button>
                                            <button id="ml-options-model-list-update" type="button" class="ml-btn ml-btn-primary">${getSvgIcon('download')} Update Local Database</button>
                                            <a class="ml-options-inline-link" href="https://github.com/Comfy-Org/ComfyUI-Manager/blob/main/model-list.json" target="_blank" rel="noopener noreferrer">Source</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section id="ml-options-section-civitai" class="ml-options-card ml-options-section">
                            <div class="ml-options-section-head">
                                <h4 class="ml-options-section-title">CivitAI</h4>
                            </div>
                            <div class="ml-options-grid">
                                <div class="ml-options-panel">
                                    <div class="ml-options-toggle-list">
                                        <label class="ml-options-toggle-row">
                                            <div class="ml-options-toggle-copy">
                                                <span class="ml-options-toggle-title">Use CivitAI tRPC search <span class="ml-tooltip-badge" data-tooltip="Main CivitAI search method. Keep this enabled unless CivitAI search stops working.">?</span></span>
                                            </div>
                                            <span class="ml-options-toggle-control">
                                                <input id="ml-options-civitai-use-trpc-search" class="ml-options-switch-input" type="checkbox" ${tokens.civitai_use_trpc_search ? 'checked' : ''}>
                                                <span class="ml-options-switch"></span>
                                            </span>
                                        </label>
                                        <div class="ml-options-dependent-block">
                                            <div class="ml-options-field">
                                                <div class="ml-options-input-row">
                                                    <label for="ml-options-civitai" class="ml-options-label">CivitAI API Key <a href="https://civitai.com/user/account" target="_blank" rel="noopener noreferrer" class="ml-options-inline-link">Get key</a> <span class="ml-tooltip-badge" data-tooltip="Optional. Used when downloading from CivitAI requires your account. Add this if CivitAI downloads fail or need access to models available to your account.">?</span></label>
                                                    <input id="ml-options-civitai" class="ml-options-input" type="password" placeholder="Paste CivitAI API key" value="${tokens.civitai_key}">
                                                    <button id="ml-options-civitai-toggle" type="button" class="ml-options-visibility-btn" aria-label="Toggle visibility for saved CivitAI API key" data-tooltip="Show saved value">
                                                        ${getSvgIcon('eye')}
                                                    </button>
                                                </div>
                                                <div class="ml-options-token-check">
                                                    <button id="ml-options-civitai-key-check" type="button" class="ml-btn ml-btn-secondary ml-btn-sm">${getSvgIcon('refreshCw')} Check API key</button>
                                                    <span id="ml-options-civitai-key-check-status" class="ml-options-token-check-status">Not checked</span>
                                                </div>
                                            </div>
                                            <div class="ml-options-field">
                                                <div class="ml-options-input-row">
                                                    <label for="ml-options-civitai-session" class="ml-options-label">CivitAI Session Token <span class="ml-tooltip-badge" data-tooltip="Optional. Makes CivitAI search use your logged-in session, so results can match what you see in the browser. Useful for NSFW or account-visible results.">?</span></label>
                                                    <input id="ml-options-civitai-session" class="ml-options-input" type="password" placeholder="Paste __Secure-civitai-token" value="${tokens.civitai_session_token}">
                                                    <button id="ml-options-civitai-session-toggle" type="button" class="ml-options-visibility-btn" aria-label="Toggle visibility for saved CivitAI session token" data-tooltip="Show saved value">
                                                        ${getSvgIcon('eye')}
                                                    </button>
                                                </div>
                                                <details class="ml-options-help">
                                                    <summary>How to find the session token</summary>
                                                    <ol>
                                                        <li>Sign in on civitai.com in your browser.</li>
                                                        <li>Open DevTools, then Application or Storage.</li>
                                                        <li>Open Cookies for civitai.com and copy <code>__Secure-civitai-token</code>.</li>
                                                    </ol>
                                                    <p>Treat it like a password. It is only needed when session-aware CivitAI search is required.</p>
                                                </details>
                                                <div class="ml-options-token-check">
                                                    <button id="ml-options-civitai-session-check" type="button" class="ml-btn ml-btn-secondary ml-btn-sm">${getSvgIcon('refreshCw')} Check session</button>
                                                    <span id="ml-options-civitai-session-check-status" class="ml-options-token-check-status">Not checked</span>
                                                </div>
                                            </div>
                                        </div>
                                        <label class="ml-options-toggle-row">
                                            <div class="ml-options-toggle-copy">
                                                <span class="ml-options-toggle-title">Use CivitAI HTML fallback <span class="ml-tooltip-badge" data-tooltip="Backup CivitAI search. Leave this enabled to try the regular CivitAI page when the main search does not find enough results.">?</span></span>
                                            </div>
                                            <span class="ml-options-toggle-control">
                                                <input id="ml-options-civitai-use-html-fallback" class="ml-options-switch-input" type="checkbox" ${tokens.civitai_use_html_fallback ? 'checked' : ''}>
                                                <span class="ml-options-switch"></span>
                                            </span>
                                        </label>
                                        <div class="ml-options-dependent-block">
                                            <div class="ml-options-number-row">
                                                <div class="ml-options-number-copy">
                                                    <span class="ml-options-label">CivitAI Models To Inspect <span class="ml-tooltip-badge" data-tooltip="How many CivitAI results to check for the exact file. Higher values may find more matches, but searches can take longer. Range: 1-20.">?</span></span>
                                                </div>
                                                <input id="ml-options-civitai-limit" class="ml-options-input" type="number" min="1" max="20" step="1" value="${tokens.civitai_candidate_limit}">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <section id="ml-options-section-hf" class="ml-options-card ml-options-section">
                            <div class="ml-options-section-head">
                                <h4 class="ml-options-section-title">HuggingFace</h4>
                            </div>
                            <div class="ml-options-grid">
                                <div class="ml-options-panel">
                                    <div class="ml-options-toggle-list">
                                        <label class="ml-options-toggle-row">
                                            <div class="ml-options-toggle-copy">
                                                <span class="ml-options-toggle-title">Use HuggingFace API repo search <span class="ml-tooltip-badge" data-tooltip="Main Hugging Face search method. It searches by filename, then checks matching repos for the actual file.">?</span></span>
                                            </div>
                                            <span class="ml-options-toggle-control">
                                                <input id="ml-options-hf-use-api-search" class="ml-options-switch-input" type="checkbox" ${tokens.hf_use_api_search ? 'checked' : ''}>
                                                <span class="ml-options-switch"></span>
                                            </span>
                                        </label>
                                        <div class="ml-options-dependent-block">
                                            <div class="ml-options-field">
                                                <div class="ml-options-input-row">
                                                    <label for="ml-options-hf" class="ml-options-label">HuggingFace Token <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" class="ml-options-inline-link">Get key</a> <span class="ml-tooltip-badge" data-tooltip="Optional. Used to search and download files from Hugging Face repos your account can access, including gated repos. A read-only token is enough.">?</span></label>
                                                    <input id="ml-options-hf" class="ml-options-input" type="password" placeholder="Paste HuggingFace token" value="${tokens.hf_token}">
                                                    <button id="ml-options-hf-toggle" type="button" class="ml-options-visibility-btn" aria-label="Toggle visibility for saved HuggingFace token" data-tooltip="Show saved value">
                                                        ${getSvgIcon('eye')}
                                                    </button>
                                                </div>
                                                <div class="ml-options-token-check">
                                                    <button id="ml-options-hf-token-check" type="button" class="ml-btn ml-btn-secondary ml-btn-sm">${getSvgIcon('refreshCw')} Check token</button>
                                                    <span id="ml-options-hf-token-check-status" class="ml-options-token-check-status">Not checked</span>
                                                </div>
                                            </div>
                                        </div>
                                        <label class="ml-options-toggle-row">
                                            <div class="ml-options-toggle-copy">
                                                <span class="ml-options-toggle-title">Use Comfy-Org fallback <span class="ml-tooltip-badge" data-tooltip="Checks Comfy-Org repositories directly. Useful for ComfyUI model packs that normal Hugging Face search may miss.">?</span></span>
                                            </div>
                                            <span class="ml-options-toggle-control">
                                                <input id="ml-options-hf-use-comfy-org-fallback" class="ml-options-switch-input" type="checkbox" ${tokens.hf_use_comfy_org_fallback ? 'checked' : ''}>
                                                <span class="ml-options-switch"></span>
                                            </span>
                                        </label>
                                        <div class="ml-options-dependent-block">
                                            <div class="ml-options-db-summary">
                                                <div class="ml-options-db-row">
                                                    <span>Comfy-Org files</span>
                                                    <strong id="ml-options-hf-index-count">Loading...</strong>
                                                </div>
                                                <div class="ml-options-db-row">
                                                    <span>Last refresh</span>
                                                    <strong id="ml-options-hf-index-updated">Loading...</strong>
                                                </div>
                                                <div class="ml-options-db-row">
                                                    <span>Status</span>
                                                    <strong id="ml-options-hf-index-state">Checking local index...</strong>
                                                </div>
                                            </div>
                                            <div id="ml-options-hf-index-message" class="ml-options-db-message">Comfy-Org fallback uses a cached HuggingFace file index.</div>
                                            <div class="ml-options-db-actions">
                                                <button id="ml-options-hf-index-refresh" type="button" class="ml-btn ml-btn-secondary">${getSvgIcon('refreshCw')} Refresh Comfy-Org Index</button>
                                            </div>
                                        </div>
                                        <label class="ml-options-toggle-row">
                                            <div class="ml-options-toggle-copy">
                                                <span class="ml-options-toggle-title">Use Brave fallback <span class="ml-tooltip-badge" data-tooltip="Last-resort web search for the exact filename on huggingface.co. Results are still checked before Model Linker offers them.">?</span></span>
                                            </div>
                                            <span class="ml-options-toggle-control">
                                                <input id="ml-options-hf-use-brave-fallback" class="ml-options-switch-input" type="checkbox" ${tokens.hf_use_brave_fallback ? 'checked' : ''}>
                                                <span class="ml-options-switch"></span>
                                            </span>
                                        </label>
                                        <div class="ml-options-dependent-block">
                                            <div class="ml-options-field">
                                                <div class="ml-options-input-row">
                                                    <label for="ml-options-brave" class="ml-options-label">Brave Search API Key <a href="https://api-dashboard.search.brave.com/app/keys" target="_blank" rel="noopener noreferrer" class="ml-options-inline-link">Get key</a> <span class="ml-tooltip-badge" data-tooltip="Optional. Used only by the Brave fallback. It helps find Hugging Face files when Hugging Face search does not show the right repo.">?</span></label>
                                                    <input id="ml-options-brave" class="ml-options-input" type="password" placeholder="Paste Brave Search API key" value="${tokens.brave_search_api_key}">
                                                    <button id="ml-options-brave-toggle" type="button" class="ml-options-visibility-btn" aria-label="Toggle visibility for saved Brave Search API key" data-tooltip="Show saved value">
                                                        ${getSvgIcon('eye')}
                                                    </button>
                                                </div>
                                                <div class="ml-options-token-check">
                                                    <button id="ml-options-brave-key-check" type="button" class="ml-btn ml-btn-secondary ml-btn-sm">${getSvgIcon('refreshCw')} Check API key</button>
                                                    <span id="ml-options-brave-key-check-status" class="ml-options-token-check-status">Not checked</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        `;

        const civitaiInput = this.contentElement.querySelector('#ml-options-civitai');
        const civitaiSessionInput = this.contentElement.querySelector('#ml-options-civitai-session');
        const hfInput = this.contentElement.querySelector('#ml-options-hf');
        const braveInput = this.contentElement.querySelector('#ml-options-brave');
        const civitaiToggle = this.contentElement.querySelector('#ml-options-civitai-toggle');
        const civitaiSessionToggle = this.contentElement.querySelector('#ml-options-civitai-session-toggle');
        const hfToggle = this.contentElement.querySelector('#ml-options-hf-toggle');
        const braveToggle = this.contentElement.querySelector('#ml-options-brave-toggle');
        const civitaiLimitInput = this.contentElement.querySelector('#ml-options-civitai-limit');
        const civitaiUseTrpcSearchInput = this.contentElement.querySelector('#ml-options-civitai-use-trpc-search');
        const civitaiUseHtmlFallbackInput = this.contentElement.querySelector('#ml-options-civitai-use-html-fallback');
        const civitaiKeyCheckBtn = this.contentElement.querySelector('#ml-options-civitai-key-check');
        const civitaiKeyCheckStatus = this.contentElement.querySelector('#ml-options-civitai-key-check-status');
        const civitaiSessionCheckBtn = this.contentElement.querySelector('#ml-options-civitai-session-check');
        const civitaiSessionCheckStatus = this.contentElement.querySelector('#ml-options-civitai-session-check-status');
        const hfUseApiSearchInput = this.contentElement.querySelector('#ml-options-hf-use-api-search');
        const hfUseComfyOrgFallbackInput = this.contentElement.querySelector('#ml-options-hf-use-comfy-org-fallback');
        const hfUseBraveFallbackInput = this.contentElement.querySelector('#ml-options-hf-use-brave-fallback');
        const hfTokenCheckBtn = this.contentElement.querySelector('#ml-options-hf-token-check');
        const hfTokenCheckStatus = this.contentElement.querySelector('#ml-options-hf-token-check-status');
        const braveKeyCheckBtn = this.contentElement.querySelector('#ml-options-brave-key-check');
        const braveKeyCheckStatus = this.contentElement.querySelector('#ml-options-brave-key-check-status');
        const sourceEnabledInputs = Array.from(this.contentElement.querySelectorAll('.ml-options-source-enabled'));
        const status = this.contentElement.querySelector('#ml-options-status');
        const saveBtn = this.contentElement.querySelector('#ml-options-save');
        const modelListCountEl = this.contentElement.querySelector('#ml-options-model-list-count');
        const modelListUpdatedEl = this.contentElement.querySelector('#ml-options-model-list-updated');
        const modelListStateEl = this.contentElement.querySelector('#ml-options-model-list-state');
        const modelListMessageEl = this.contentElement.querySelector('#ml-options-model-list-message');
        const modelListCheckBtn = this.contentElement.querySelector('#ml-options-model-list-check');
        const modelListUpdateBtn = this.contentElement.querySelector('#ml-options-model-list-update');
        const hfIndexCountEl = this.contentElement.querySelector('#ml-options-hf-index-count');
        const hfIndexUpdatedEl = this.contentElement.querySelector('#ml-options-hf-index-updated');
        const hfIndexStateEl = this.contentElement.querySelector('#ml-options-hf-index-state');
        const hfIndexMessageEl = this.contentElement.querySelector('#ml-options-hf-index-message');
        const hfIndexRefreshBtn = this.contentElement.querySelector('#ml-options-hf-index-refresh');
        const navButtons = Array.from(this.contentElement.querySelectorAll('.ml-options-nav-btn'));
        const optionSections = Array.from(this.contentElement.querySelectorAll('.ml-options-section'));
        const trackedInputs = [
            civitaiInput,
            civitaiSessionInput,
            hfInput,
            braveInput,
            civitaiLimitInput,
            civitaiUseTrpcSearchInput,
            civitaiUseHtmlFallbackInput,
            hfUseApiSearchInput,
            hfUseComfyOrgFallbackInput,
            hfUseBraveFallbackInput,
            ...sourceEnabledInputs,
        ].filter(Boolean);

        const setStatus = (text, mode = '') => {
            if (!status) return;
            status.textContent = text;
            status.classList.remove('is-dirty', 'is-saved');
            if (mode) status.classList.add(mode);
        };

        const formatOptionDate = (value) => {
            if (!value) return 'Bundled';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;
            return date.toLocaleString();
        };

        const shortSha = (value) => value ? String(value).slice(0, 8) : '';

        const setModelListBusy = (busy) => {
            if (modelListCheckBtn) modelListCheckBtn.disabled = busy;
            if (modelListUpdateBtn) modelListUpdateBtn.disabled = busy;
        };

        const setHfIndexBusy = (busy) => {
            if (hfIndexRefreshBtn) hfIndexRefreshBtn.disabled = busy;
        };

        const setTokenCheckStatus = (statusEl, text, mode = '') => {
            if (!statusEl) return;
            statusEl.textContent = text;
            statusEl.classList.remove('is-valid', 'is-invalid', 'is-pending');
            if (mode) statusEl.classList.add(mode);
        };

        const checkCredential = async ({ input, button, statusEl, endpoint, payloadKey, missingText }) => {
            const value = (input?.value || '').trim();
            if (!value) {
                setTokenCheckStatus(statusEl, missingText, 'is-invalid');
                return;
            }

            try {
                if (button) button.disabled = true;
                setTokenCheckStatus(statusEl, 'Checking...', 'is-pending');
                const response = await api.fetchApi(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [payloadKey]: value })
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `Check failed: ${response.status}`);
                }
                setTokenCheckStatus(
                    statusEl,
                    data.message || (data.valid ? 'Valid' : 'Invalid'),
                    data.valid ? 'is-valid' : 'is-invalid'
                );
            } catch (error) {
                console.error('Model Linker: Credential check error:', error);
                setTokenCheckStatus(statusEl, error.message || 'Check failed', 'is-invalid');
            } finally {
                if (button) button.disabled = false;
            }
        };

        const renderModelListStatus = (data = {}, checkedRemote = false) => {
            if (modelListCountEl) {
                modelListCountEl.textContent = Number.isFinite(Number(data.local_count))
                    ? Number(data.local_count).toLocaleString()
                    : '-';
            }
            if (modelListUpdatedEl) {
                modelListUpdatedEl.textContent = formatOptionDate(data.local_updated_at);
            }
            if (modelListStateEl) {
                if (checkedRemote && data.can_compare && data.update_available) {
                    modelListStateEl.textContent = 'Update available';
                } else if (checkedRemote && data.can_compare) {
                    modelListStateEl.textContent = 'Up to date';
                } else if (checkedRemote && !data.can_compare) {
                    modelListStateEl.textContent = 'Remote checked';
                } else {
                    modelListStateEl.textContent = data.local_sha ? 'Tracked' : 'Bundled';
                }
            }
            if (modelListMessageEl) {
                const localSha = shortSha(data.local_sha);
                const remoteSha = shortSha(data.remote_sha);
                if (checkedRemote && data.update_available) {
                    modelListMessageEl.textContent = `A newer ComfyUI-Manager model-list.json is available (${localSha || 'local'} -> ${remoteSha}).`;
                } else if (checkedRemote && data.can_compare) {
                    modelListMessageEl.textContent = `Local Database is current (${localSha}).`;
                } else if (checkedRemote) {
                    modelListMessageEl.textContent = `Remote file was checked. Local SHA is not recorded yet; run update once to track future changes.`;
                } else {
                    modelListMessageEl.textContent = `Local Database uses ComfyUI-Manager model-list.json.`;
                }
            }
        };

        const loadModelListStatus = async (checkRemote = false) => {
            try {
                setModelListBusy(true);
                if (modelListStateEl) {
                    modelListStateEl.textContent = checkRemote ? 'Checking GitHub...' : 'Loading...';
                }
                const response = await api.fetchApi(`/model_linker/model-list/status${checkRemote ? '?check_remote=1' : ''}`);
                if (!response.ok) {
                    throw new Error(`Status failed: ${response.status}`);
                }
                const data = await response.json();
                renderModelListStatus(data, checkRemote);
                return data;
            } catch (error) {
                console.error('Model Linker: model-list status error:', error);
                if (modelListStateEl) modelListStateEl.textContent = 'Error';
                if (modelListMessageEl) modelListMessageEl.textContent = error.message || 'Failed to read Local Database status.';
                return null;
            } finally {
                setModelListBusy(false);
            }
        };

        const updateModelList = async () => {
            try {
                setModelListBusy(true);
                if (modelListStateEl) modelListStateEl.textContent = 'Updating...';
                if (modelListMessageEl) modelListMessageEl.textContent = 'Downloading latest ComfyUI-Manager model-list.json...';
                const response = await api.fetchApi('/model_linker/model-list/update', {
                    method: 'POST'
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `Update failed: ${response.status}`);
                }
                await this.clearSearchCaches();
                renderModelListStatus(data, false);
                if (modelListStateEl) modelListStateEl.textContent = 'Updated';
                if (modelListMessageEl) modelListMessageEl.textContent = `Local Database updated. ${Number(data.local_count || 0).toLocaleString()} models loaded.`;
                this.showNotification('Local Database updated', 'success');
            } catch (error) {
                console.error('Model Linker: model-list update error:', error);
                if (modelListStateEl) modelListStateEl.textContent = 'Error';
                if (modelListMessageEl) modelListMessageEl.textContent = error.message || 'Failed to update Local Database.';
                this.showNotification('Local Database update failed', 'error');
            } finally {
                setModelListBusy(false);
            }
        };

        const renderHfIndexStatus = (data = {}) => {
            if (hfIndexCountEl) {
                hfIndexCountEl.textContent = Number.isFinite(Number(data.file_count))
                    ? Number(data.file_count).toLocaleString()
                    : '-';
            }
            if (hfIndexUpdatedEl) {
                hfIndexUpdatedEl.textContent = data.updated_at
                    ? formatOptionDate(Number(data.updated_at) * 1000)
                    : 'Never';
            }
            if (hfIndexStateEl) {
                if (!data.exists) {
                    hfIndexStateEl.textContent = 'Not cached';
                } else if (data.stale) {
                    hfIndexStateEl.textContent = 'Refresh due';
                } else {
                    hfIndexStateEl.textContent = 'Cached';
                }
            }
            if (hfIndexMessageEl) {
                if (!data.exists) {
                    hfIndexMessageEl.textContent = 'The first Comfy-Org fallback search will build the local HuggingFace file index.';
                } else if (data.stale) {
                    hfIndexMessageEl.textContent = `Index has ${Number(data.repo_count || 0).toLocaleString()} repos and should be refreshed.`;
                } else {
                    hfIndexMessageEl.textContent = `Index has ${Number(data.repo_count || 0).toLocaleString()} repos and is used before per-repo fallback checks.`;
                }
            }
        };

        const loadHfIndexStatus = async () => {
            try {
                setHfIndexBusy(true);
                if (hfIndexStateEl) hfIndexStateEl.textContent = 'Loading...';
                const response = await api.fetchApi('/model_linker/huggingface/author-index/status');
                if (!response.ok) {
                    throw new Error(`Status failed: ${response.status}`);
                }
                const data = await response.json();
                renderHfIndexStatus(data);
                return data;
            } catch (error) {
                console.error('Model Linker: HuggingFace index status error:', error);
                if (hfIndexStateEl) hfIndexStateEl.textContent = 'Error';
                if (hfIndexMessageEl) hfIndexMessageEl.textContent = error.message || 'Failed to read HuggingFace index status.';
                return null;
            } finally {
                setHfIndexBusy(false);
            }
        };

        const refreshHfIndex = async () => {
            try {
                setHfIndexBusy(true);
                if (hfIndexStateEl) hfIndexStateEl.textContent = 'Refreshing...';
                if (hfIndexMessageEl) hfIndexMessageEl.textContent = 'Downloading Comfy-Org file index from HuggingFace...';
                const response = await api.fetchApi('/model_linker/huggingface/author-index/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hf_token: hfInput?.value || '' })
                });
                const data = await response.json();
                if (!response.ok || data.success === false) {
                    throw new Error(data.error || `Refresh failed: ${response.status}`);
                }
                await this.clearSearchCaches();
                renderHfIndexStatus(data);
                if (hfIndexStateEl) hfIndexStateEl.textContent = 'Refreshed';
                this.showNotification('HuggingFace Comfy-Org index refreshed', 'success');
            } catch (error) {
                console.error('Model Linker: HuggingFace index refresh error:', error);
                if (hfIndexStateEl) hfIndexStateEl.textContent = 'Error';
                if (hfIndexMessageEl) hfIndexMessageEl.textContent = error.message || 'Failed to refresh HuggingFace index.';
                this.showNotification('HuggingFace index refresh failed', 'error');
            } finally {
                setHfIndexBusy(false);
            }
        };

        const setActiveNav = (targetId) => {
            navButtons.forEach((btn) => {
                btn.classList.toggle('is-active', btn.dataset.target === targetId);
            });
        };

        const setVisibleSection = (targetId) => {
            optionSections.forEach((section) => {
                section.classList.toggle('is-hidden', section.id !== targetId);
            });
            setActiveNav(targetId);
        };

        const getVisibilityIcon = (visible) => visible
            ? getSvgIcon('eye')
            : getSvgIcon('eyeOff');

        const syncVisibilityToggle = (input, button) => {
            if (!input || !button) return;
            const visible = input.type === 'text';
            button.innerHTML = getVisibilityIcon(visible);
            button.classList.toggle('ml-is-active-text', visible);
            button.classList.toggle('ml-is-muted', !visible);
            button.setAttribute('aria-pressed', visible ? 'true' : 'false');
            this.setTooltip(button, visible ? 'Hide saved value' : 'Show saved value');
        };

        const bindVisibilityToggle = (input, button) => {
            if (!input || !button) return;
            syncVisibilityToggle(input, button);
            button.addEventListener('click', () => {
                input.type = input.type === 'password' ? 'text' : 'password';
                syncVisibilityToggle(input, button);
            });
        };

        bindVisibilityToggle(civitaiInput, civitaiToggle);
        bindVisibilityToggle(civitaiSessionInput, civitaiSessionToggle);
        bindVisibilityToggle(hfInput, hfToggle);
        bindVisibilityToggle(braveInput, braveToggle);
        setStatus('Saved only on this machine.');
        setVisibleSection('ml-options-section-sources');

        trackedInputs.forEach((input) => {
            const eventName = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventName, () => {
                setStatus('You have unsaved changes.', 'is-dirty');
            });
        });

        this.bindTooltips(this.contentElement);

        navButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                if (!targetId) return;
                setVisibleSection(targetId);
                if (targetId === 'ml-options-section-local-db') {
                    loadModelListStatus(false);
                } else if (targetId === 'ml-options-section-hf') {
                    loadHfIndexStatus();
                }
            });
        });

        if (modelListCheckBtn) {
            modelListCheckBtn.addEventListener('click', () => {
                loadModelListStatus(true);
            });
        }

        if (modelListUpdateBtn) {
            modelListUpdateBtn.addEventListener('click', () => {
                updateModelList();
            });
        }

        if (hfIndexRefreshBtn) {
            hfIndexRefreshBtn.addEventListener('click', () => {
                refreshHfIndex();
            });
        }

        if (civitaiSessionCheckBtn) {
            civitaiSessionCheckBtn.addEventListener('click', () => {
                checkCredential({
                    input: civitaiSessionInput,
                    button: civitaiSessionCheckBtn,
                    statusEl: civitaiSessionCheckStatus,
                    endpoint: '/model_linker/civitai/session-token/check',
                    payloadKey: 'civitai_session_token',
                    missingText: 'Paste token first'
                });
            });
        }

        if (civitaiKeyCheckBtn) {
            civitaiKeyCheckBtn.addEventListener('click', () => {
                checkCredential({
                    input: civitaiInput,
                    button: civitaiKeyCheckBtn,
                    statusEl: civitaiKeyCheckStatus,
                    endpoint: '/model_linker/civitai/api-key/check',
                    payloadKey: 'civitai_key',
                    missingText: 'Paste API key first'
                });
            });
        }

        if (hfTokenCheckBtn) {
            hfTokenCheckBtn.addEventListener('click', () => {
                checkCredential({
                    input: hfInput,
                    button: hfTokenCheckBtn,
                    statusEl: hfTokenCheckStatus,
                    endpoint: '/model_linker/huggingface/token/check',
                    payloadKey: 'hf_token',
                    missingText: 'Paste token first'
                });
            });
        }

        if (braveKeyCheckBtn) {
            braveKeyCheckBtn.addEventListener('click', () => {
                checkCredential({
                    input: braveInput,
                    button: braveKeyCheckBtn,
                    statusEl: braveKeyCheckStatus,
                    endpoint: '/model_linker/brave/api-key/check',
                    payloadKey: 'brave_search_api_key',
                    missingText: 'Paste API key first'
                });
            });
        }

        loadModelListStatus(false);
        loadHfIndexStatus();

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const civitaiCandidateLimitRaw = parseInt(civitaiLimitInput?.value || `${tokens.civitai_candidate_limit}`, 10);
                const civitaiCandidateLimit = Number.isFinite(civitaiCandidateLimitRaw)
                    ? Math.min(20, Math.max(1, civitaiCandidateLimitRaw))
                    : 5;
                localStorage.setItem('modelLinker.civitaiApiKey', civitaiInput?.value || '');
                localStorage.setItem('modelLinker.civitaiSessionToken', civitaiSessionInput?.value || '');
                localStorage.setItem('modelLinker.civitaiUseTrpcSearch', civitaiUseTrpcSearchInput?.checked ? 'true' : 'false');
                localStorage.setItem('modelLinker.civitaiUseHtmlFallback', civitaiUseHtmlFallbackInput?.checked ? 'true' : 'false');
                localStorage.setItem('modelLinker.huggingFaceToken', hfInput?.value || '');
                localStorage.setItem('modelLinker.braveSearchApiKey', braveInput?.value || '');
                localStorage.setItem('modelLinker.hfUseApiSearch', hfUseApiSearchInput?.checked ? 'true' : 'false');
                localStorage.setItem('modelLinker.hfUseComfyOrgFallback', hfUseComfyOrgFallbackInput?.checked ? 'true' : 'false');
                localStorage.setItem('modelLinker.hfUseBraveFallback', hfUseBraveFallbackInput?.checked ? 'true' : 'false');
                localStorage.setItem('modelLinker.civitaiCandidateLimit', `${civitaiCandidateLimit}`);
                if (sourceEnabledInputs.length && !sourceEnabledInputs.some(input => input.checked)) {
                    const localInput = sourceEnabledInputs.find(input => input.dataset.source === 'local');
                    if (localInput) {
                        localInput.checked = true;
                    }
                }
                sourceEnabledInputs.forEach((input) => {
                    const key = input.dataset.storageKey;
                    if (key) {
                        localStorage.setItem(key, input.checked ? 'true' : 'false');
                    }
                });
                if (civitaiLimitInput) {
                    civitaiLimitInput.value = `${civitaiCandidateLimit}`;
                }
                await this.clearSearchCaches();
                setStatus('Options saved locally.', 'is-saved');
                this.showNotification('Options saved and search cache cleared', 'success');
            });
        }

    }
};

import { app } from "../../../../scripts/app.js";
import { api } from "../../../../scripts/api.js";
import { $el } from "../../../../scripts/ui.js";
import { getSvgIcon } from "../utils/icon_utils.js";
export const missingBrowserMethods = {
    getMissingFilename(missing = {}) {
        return missing.original_path?.split('/').pop()?.split('\\').pop() || missing.name || 'Missing model';
    },

    getMissingNodeDisplay(missing = {}) {
        const isSubgraphNode = missing.node_type && missing.node_type.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        let nodeLabel;
        if (missing.subgraph_name) {
            nodeLabel = missing.subgraph_name;
        } else if (isSubgraphNode) {
            nodeLabel = 'Subgraph';
        } else {
            nodeLabel = missing.node_type || 'Node';
        }

        const nodeId = missing.node_id ?? '';
        const customNodeTitle = String(missing.node_title || '').trim();
        const hasCustomNodeTitle = customNodeTitle && customNodeTitle !== nodeLabel;
        const text = hasCustomNodeTitle
            ? `${nodeLabel} #${nodeId} · ${customNodeTitle}`
            : `${nodeLabel} #${nodeId}`;

        return {
            label: nodeLabel,
            text,
            canLocate: missing.is_top_level !== false && nodeId !== ''
        };
    },

    getBestLocalMatch(missing = {}, minConfidence = 0) {
        const matches = Array.isArray(missing.matches) ? missing.matches : [];
        return matches
            .filter(match => Number(match.confidence) >= minConfidence)
            .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || null;
    },

    getMissingModelSummaryStats(missingModels = []) {
        return missingModels.reduce((stats, missing) => {
            const best = this.getBestLocalMatch(missing, 70);
            if (best?.confidence === 100) {
                stats.exact += 1;
            } else if (best) {
                stats.partial += 1;
            } else {
                stats.none += 1;
            }
            return stats;
        }, { exact: 0, partial: 0, none: 0 });
    },

    getMissingSourceStatus(missing = {}, source = '') {
        const state = this.searchResultCache.get(this.getMissingSearchKey(missing));
        const progress = state?.sourceProgress?.[source];
        const resultStatus = this.getMissingSourceResultStatus(missing, source, state);
        if (progress?.status === 'found') return resultStatus || 'found';
        if (progress?.status) return progress.status;

        if (resultStatus) return resultStatus;

        return 'idle';
    },

    getMissingSourceResultStatus(missing = {}, source = '', state = null) {
        const results = state?.results || {};
        const candidates = [];

        if (source === 'local') {
            candidates.push(results.model_list, results.popular);
        } else if (source === 'huggingface') {
            candidates.push(results.huggingface);
        } else if (source === 'civitai') {
            candidates.push(results.civitai);
        } else if (source === 'civarchive') {
            candidates.push(results.civarchive);
        } else if (source === 'lora_manager_archive') {
            candidates.push(results.lora_manager_archive);
        }

        const downloadSource = missing.download_source || {};
        const mappedDownloadSource = {
            model_list: 'local',
            popular: 'local',
            workflow: 'civitai'
        }[downloadSource.source] || downloadSource.source;
        if (mappedDownloadSource === source && downloadSource.url) {
            candidates.push(downloadSource);
        }

        return this.getSearchResultStatusLevel(candidates);
    },

    getSearchResultStatusLevel(resultOrResults) {
        const results = Array.isArray(resultOrResults)
            ? resultOrResults.flatMap(result => Array.isArray(result) ? result : [result])
            : [resultOrResults];
        let hasPartial = false;
        let hasUnknownFound = false;

        for (const result of results) {
            if (!result) continue;

            const confidence = Number(result.confidence);
            const hasConfidence = Number.isFinite(confidence);
            const matchType = String(result.match_type || '').toLowerCase();

            if (hasConfidence) {
                if (confidence >= 100) return 'exact';
                if (confidence > 0) {
                    hasPartial = true;
                    continue;
                }
            }

            if (matchType === 'exact' || result.source === 'popular') {
                return 'exact';
            }
            if (matchType === 'partial' || matchType === 'fuzzy' || matchType === 'similar') {
                hasPartial = true;
                continue;
            }
            if (result.url || result.download_url) {
                hasUnknownFound = true;
            }
        }

        if (hasPartial) return 'partial';
        if (hasUnknownFound) return 'found';
        return '';
    },

    renderMissingSourcesSummary(missing = {}) {
        const sourceItems = this.getEnabledSearchSources().map(source => ({ source }));

        return sourceItems.map(item => {
            const status = this.getMissingSourceStatus(missing, item.source);
            const statusClass = String(status || 'idle').replace(/[^a-z0-9_-]/gi, '');
            const label = this.getSearchSourceLabel(item.source);
            const statusLabels = {
                pending: 'Queued',
                running: 'Searching',
                exact: 'Exact match',
                partial: 'Partial match',
                found: 'Found',
                none: 'No match',
                error: 'Error',
                idle: 'Not searched'
            };
            const title = `${label}: ${statusLabels[status] || status}`;
            const iconName = this.getSearchSourceIconName(item.source);
            const iconHtml = getSvgIcon(iconName, 'currentColor', 'ml-missing-source-icon');
            return `<span class="ml-missing-source-dot ml-missing-source-${statusClass}" data-tooltip="${this.escapeHtml(title)}" aria-label="${this.escapeHtml(title)}">${iconHtml}</span>`;
        }).join('');
    },

    hasRenderableSearchState(state = {}) {
        return Boolean(
            (state.lastAttemptSources || []).length
            || Object.keys(state.sourceProgress || {}).length
            || this.hasSearchResults(state.results || {})
            || state.lastAttemptError
        );
    },

    getMissingModelsListLayout(missingModels = []) {
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const textWidth = (value, charPx) => Math.ceil(String(value || '').length * charPx);

        let modelPx = 180;
        let typePx = 66;
        for (const missing of missingModels) {
            const filename = this.getMissingFilename(missing);
            const nodeLabel = this.getMissingNodeDisplay(missing).text;
            const typeLabel = missing.category ? this.getCategoryDisplayName(missing.category) : 'unknown';
            modelPx = Math.max(
                modelPx,
                textWidth(filename, 7.2) + 12,
                textWidth(nodeLabel, 5.5) + 34
            );
            typePx = Math.max(typePx, textWidth(typeLabel, 5.8) + 18);
        }

        return {
            modelPx: clamp(modelPx, 180, 430),
            typePx: clamp(typePx, 66, 120)
        };
    },

    renderMissingModelsBrowser(missingModels, selectedKey, totalMissing, activeCount, hasAny100Match) {
        const stats = this.getMissingModelSummaryStats(missingModels);
        const detailIndex = missingModels.findIndex(missing => this.getMissingModelKey(missing) === selectedKey);
        const detailMissing = detailIndex >= 0 ? missingModels[detailIndex] : null;
        const activeHint = activeCount > 0
            ? `${activeCount} downloading`
            : (hasAny100Match ? 'Auto-link ready for exact matches' : 'Review matches or search online');
        const listLayout = this.getMissingModelsListLayout(missingModels);
        let savedDetailWidth = null;
        try {
            savedDetailWidth = parseInt(localStorage.getItem(this.missingBrowserSplitStorageKey) || '', 10);
        } catch (e) {}
        const splitStyle = Number.isFinite(savedDetailWidth) && savedDetailWidth > 0
            ? `--ml-missing-detail-track:${savedDetailWidth}px;`
            : '';
        const listStyle = `--ml-missing-model-col:${listLayout.modelPx}px;--ml-missing-type-col:${listLayout.typePx}px;`;

        let html = `
            <div class="ml-missing-browser" style="${listStyle}">
                <section class="ml-missing-list-pane" aria-label="Missing model list">
                    <div class="ml-missing-list-toolbar">
                        <div>
                            <div class="ml-missing-list-title">${totalMissing} missing model${totalMissing === 1 ? '' : 's'}</div>
                            <div class="ml-missing-list-meta">${this.escapeHtml(activeHint)}</div>
                        </div>
                        <div class="ml-missing-list-stats">
                            <span class="ml-missing-stat ml-missing-stat-exact">${stats.exact} exact</span>
                            <span class="ml-missing-stat ml-missing-stat-partial">${stats.partial} partial</span>
                            <span class="ml-missing-stat ml-missing-stat-none">${stats.none} no match</span>
                        </div>
                    </div>
                    <div class="ml-missing-list-head">
                        <span class="ml-missing-head-select">
                            <input type="checkbox" class="ml-missing-select-all-check" aria-label="Select or deselect all missing models">
                        </span>
                        <span>#</span>
                        <span>Missing Model</span>
                        <span>Type</span>
                        <span>Best Local Match</span>
                        <span>Match</span>
                        <span>Sources</span>
                    </div>
                    <div class="ml-missing-list">
        `;

        missingModels.forEach((missing, index) => {
            const key = this.getMissingModelKey(missing);
            const isSelected = key === selectedKey;
            const isBatchSelected = this.batchSelectedMissingKeys?.has(key);
            const filename = this.getMissingFilename(missing);
            const formattedFilename = this.formatFilename(filename, 46);
            const bestMatch = this.getBestLocalMatch(missing, 70);
            const confidence = bestMatch ? Number(bestMatch.confidence || 0) : 0;
            const matchName = bestMatch?.model?.relative_path || bestMatch?.filename || bestMatch?.path || '';
            const matchDisplay = matchName || 'No local match';
            const matchClass = confidence === 100 ? 'exact' : (bestMatch ? 'partial' : 'none');
            const typeLabel = missing.category ? this.getCategoryDisplayName(missing.category) : 'unknown';
            const typeColorClass = this.getModelTypeColorClass(missing.category || typeLabel);
            const nodeDisplay = this.getMissingNodeDisplay(missing);
            const nodeId = missing.node_id ?? '';
            const rowNodeHtml = nodeDisplay.canLocate
                ? `<button type="button" class="ml-node-chip is-locatable ml-missing-row-node ml-missing-row-locate" data-node-id="${this.escapeHtml(String(nodeId))}" data-tooltip="Center this node in the ComfyUI graph." aria-label="Center ${this.escapeHtml(nodeDisplay.text)} in the ComfyUI graph">${this.getLocateIconHtml()}<span class="ml-missing-row-node-label">${this.escapeHtml(nodeDisplay.text)}</span></button>`
                : `<span class="ml-missing-row-node">${this.escapeHtml(nodeDisplay.text)}</span>`;

            html += `
                <div role="button" tabindex="0"
                    class="ml-missing-list-row ${isSelected ? 'is-selected' : ''} ${isBatchSelected ? 'is-batch-selected' : ''}"
                    data-missing-key="${this.escapeHtml(key)}">
                    <span class="ml-missing-row-select">
                        <input type="checkbox" class="ml-missing-row-check" data-ml-no-drag="1" aria-label="Select ${this.escapeHtml(filename)}" ${isBatchSelected ? 'checked' : ''}>
                    </span>
                    <span class="ml-missing-row-index">${index + 1}</span>
                    <span class="ml-missing-row-model">
                        <span class="ml-missing-row-name" data-tooltip="${this.escapeHtml(filename)}">${this.escapeHtml(formattedFilename.display)}</span>
                        ${rowNodeHtml}
                    </span>
                    <span class="ml-missing-row-type ${typeColorClass}">${this.escapeHtml(typeLabel)}</span>
                    <span class="ml-missing-row-best" data-tooltip="${this.escapeHtml(matchDisplay)}">
                        ${bestMatch ? this.escapeHtml(matchDisplay) : '<span class="ml-missing-row-none">-- No local match</span>'}
                    </span>
                    <span class="ml-missing-row-match ml-missing-row-match-${matchClass}">
                        <strong>${bestMatch ? `${confidence.toFixed(confidence % 1 ? 1 : 0)}%` : '--'}</strong>
                    </span>
                    <span class="ml-missing-row-sources">${this.renderMissingSourcesSummary(missing)}</span>
                </div>
            `;
        });

        html += `
                    </div>
                </section>
                <div class="ml-missing-browser-splitter" role="separator" aria-orientation="vertical" aria-label="Resize missing model panes" tabindex="0"></div>
                <section class="ml-missing-detail-pane" aria-label="Missing model details" style="${splitStyle}">
                    ${detailMissing ? this.renderMissingModel(detailMissing, detailIndex) : this.renderStatusMessage('Select a missing model to inspect details.', 'info')}
                </section>
            </div>
        `;
        return html;
    },

    wireMissingModelsBrowser(container, data, sortedMissingModels) {
        this.wireMissingBrowserSplitter(container);

        const selectRow = (row) => {
            const key = row.dataset.missingKey;
            if (!key || key === this.selectedMissingModelKey) return;
            this.selectedMissingModelKey = key;
            this.displayMissingModels(container, data);
        };

        const selectAllCheckbox = container.querySelector('.ml-missing-select-all-check');
        if (selectAllCheckbox) {
            this.updateBatchSelectAllCheckbox();
            selectAllCheckbox.addEventListener('click', (event) => {
                event.stopPropagation();
            });
            selectAllCheckbox.addEventListener('change', () => {
                const shouldSelectAll = selectAllCheckbox.checked;
                this.batchSelectedMissingKeys = shouldSelectAll
                    ? new Set((sortedMissingModels || []).map(missing => this.getMissingModelKey(missing)))
                    : new Set();
                this.lastBatchSelectedMissingKey = null;
                this.refreshBatchSelectionUi();
                this.updateBatchFooterButtons();
            });
        }

        container.querySelectorAll('.ml-missing-list-row').forEach(row => {
            const checkbox = row.querySelector('.ml-missing-row-check');
            if (checkbox) {
                checkbox.addEventListener('click', (event) => {
                    event.stopPropagation();
                    checkbox.dataset.shiftClick = event.shiftKey ? '1' : '0';
                });
                checkbox.addEventListener('change', (event) => {
                    const key = row.dataset.missingKey;
                    if (!key) return;
                    const selected = checkbox.checked;
                    const isShiftRange = event.shiftKey || checkbox.dataset.shiftClick === '1';

                    if (isShiftRange && this.lastBatchSelectedMissingKey) {
                        this.applyBatchSelectionRange(
                            sortedMissingModels,
                            this.lastBatchSelectedMissingKey,
                            key,
                            selected
                        );
                    } else {
                        this.setBatchSelectionForKey(key, selected);
                    }

                    this.lastBatchSelectedMissingKey = key;
                    this.refreshBatchSelectionUi();
                    this.updateBatchFooterButtons();
                });
            }

            row.addEventListener('click', (event) => {
                const clickedLocate = event.target instanceof Element && event.target.closest('.ml-missing-row-locate');
                if (clickedLocate) return;
                selectRow(row);
            });

            row.addEventListener('keydown', (event) => {
                if (event.target !== row || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                selectRow(row);
            });
        });

        container.querySelectorAll('.ml-missing-row-locate').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const rawNodeId = button.dataset.nodeId;
                const numericNodeId = Number(rawNodeId);
                this.locateNodeInGraph(Number.isNaN(numericNodeId) ? rawNodeId : numericNodeId);
            });
        });

        const selectedMissing = sortedMissingModels.find(missing => this.getMissingModelKey(missing) === this.selectedMissingModelKey);
        if (!selectedMissing) return;

        const selectedIndex = sortedMissingModels.indexOf(selectedMissing);
        this.wireMissingModelDetail(container, selectedMissing, selectedIndex);
    },

    wireMissingBrowserSplitter(container) {
        const browser = container.querySelector('.ml-missing-browser');
        const splitter = browser?.querySelector('.ml-missing-browser-splitter');
        if (!(browser instanceof HTMLElement) || !(splitter instanceof HTMLElement)) return;

        this.restoreMissingBrowserSplitWidth(browser);

        splitter.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            this.startMissingBrowserSplitDrag(event, browser);
        });

        splitter.addEventListener('dblclick', () => {
            browser.querySelector('.ml-missing-detail-pane')?.style.removeProperty('--ml-missing-detail-track');
            try {
                localStorage.removeItem(this.missingBrowserSplitStorageKey);
            } catch (e) {}
        });

        splitter.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            this.resizeMissingBrowserDetailBy(browser, event.key === 'ArrowLeft' ? 32 : -32);
        });

        this._missingBrowserResizeObserver?.disconnect?.();
        if (typeof ResizeObserver === 'function') {
            this._missingBrowserResizeObserver = new ResizeObserver(() => {
                if (!this._missingBrowserSplitDragging) {
                    this.restoreMissingBrowserSplitWidth(browser);
                }
            });
            this._missingBrowserResizeObserver.observe(browser);
        }
    },

    restoreMissingBrowserSplitWidth(browser) {
        try {
            const savedWidth = parseInt(localStorage.getItem(this.missingBrowserSplitStorageKey) || '', 10);
            if (Number.isFinite(savedWidth) && savedWidth > 0) {
                this.setMissingBrowserDetailWidth(browser, savedWidth, { persist: false });
            }
        } catch (e) {}
    },

    startMissingBrowserSplitDrag(event, browser) {
        if (!(browser instanceof HTMLElement)) return;

        const detailPane = browser.querySelector('.ml-missing-detail-pane');
        if (!(detailPane instanceof HTMLElement)) return;

        event.preventDefault();
        this._missingBrowserSplitDragging = true;
        this._missingBrowserSplitStart = {
            x: event.clientX,
            width: detailPane.getBoundingClientRect().width,
            bounds: this.getMissingBrowserSplitBounds(browser)
        };
        this._lastMissingBrowserSplitApply = 0;
        this._missingBrowserSplitBrowser = browser;
        this._missingBrowserSplitDetailPane = detailPane;
        this._missingBrowserPrevUserSelect = document.body.style.userSelect;
        this._missingBrowserPrevCursor = document.body.style.cursor;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        browser.classList.add('is-resizing');

        this._onMissingBrowserSplitMove = (moveEvent) => this.onMissingBrowserSplitDrag(moveEvent);
        this._onMissingBrowserSplitUp = () => this.endMissingBrowserSplitDrag();
        document.addEventListener('mousemove', this._onMissingBrowserSplitMove);
        document.addEventListener('mouseup', this._onMissingBrowserSplitUp, { once: true });
    },

    onMissingBrowserSplitDrag(event) {
        if (!this._missingBrowserSplitDragging || !this._missingBrowserSplitStart || !this._missingBrowserSplitBrowser) return;

        const nextWidth = this._missingBrowserSplitStart.width - (event.clientX - this._missingBrowserSplitStart.x);
        const bounds = this._missingBrowserSplitStart.bounds;
        this._pendingMissingBrowserSplitWidth = Math.round(Math.max(bounds.min, Math.min(bounds.max, nextWidth)));
        const now = performance.now();
        if (this._lastMissingBrowserSplitApply && now - this._lastMissingBrowserSplitApply < 33) return;
        this._lastMissingBrowserSplitApply = now;
        if (this._missingBrowserSplitFrame) return;
        this._missingBrowserSplitFrame = requestAnimationFrame(() => {
            this._missingBrowserSplitFrame = null;
            if (!this._missingBrowserSplitDragging || !this._missingBrowserSplitDetailPane || !this._pendingMissingBrowserSplitWidth) return;
            this._missingBrowserSplitDetailPane.style.setProperty('--ml-missing-detail-track', `${this._pendingMissingBrowserSplitWidth}px`);
        });
    },

    endMissingBrowserSplitDrag() {
        if (!this._missingBrowserSplitDragging) return;

        this._missingBrowserSplitDragging = false;
        document.removeEventListener('mousemove', this._onMissingBrowserSplitMove);
        if (this._missingBrowserSplitFrame) {
            cancelAnimationFrame(this._missingBrowserSplitFrame);
            this._missingBrowserSplitFrame = null;
        }
        if (this._missingBrowserSplitDetailPane && this._pendingMissingBrowserSplitWidth) {
            this._missingBrowserSplitDetailPane.style.setProperty('--ml-missing-detail-track', `${this._pendingMissingBrowserSplitWidth}px`);
            try {
                localStorage.setItem(this.missingBrowserSplitStorageKey, String(this._pendingMissingBrowserSplitWidth));
            } catch (e) {}
        }
        this._missingBrowserSplitBrowser?.classList.remove('is-resizing');
        this._missingBrowserSplitBrowser = null;
        this._missingBrowserSplitDetailPane = null;
        this._missingBrowserSplitStart = null;
        this._pendingMissingBrowserSplitWidth = null;
        this._lastMissingBrowserSplitApply = 0;
        try {
            document.body.style.userSelect = this._missingBrowserPrevUserSelect || '';
            document.body.style.cursor = this._missingBrowserPrevCursor || '';
        } catch (e) {}
    },

    resizeMissingBrowserDetailBy(browser, delta) {
        const detailPane = browser.querySelector('.ml-missing-detail-pane');
        if (!(detailPane instanceof HTMLElement)) return;

        this.setMissingBrowserDetailWidth(browser, detailPane.getBoundingClientRect().width + delta);
    },

    setMissingBrowserDetailWidth(browser, width, { persist = true } = {}) {
        const bounds = this.getMissingBrowserSplitBounds(browser);
        const nextWidth = Math.round(Math.max(bounds.min, Math.min(bounds.max, width)));
        const detailPane = browser.querySelector('.ml-missing-detail-pane');
        const target = detailPane instanceof HTMLElement ? detailPane : browser;
        target.style.setProperty('--ml-missing-detail-track', `${nextWidth}px`);

        if (persist) {
            try {
                localStorage.setItem(this.missingBrowserSplitStorageKey, String(nextWidth));
            } catch (e) {}
        }
    },

    getMissingBrowserSplitBounds(browser) {
        const browserRect = browser.getBoundingClientRect();
        const splitter = browser.querySelector('.ml-missing-browser-splitter');
        const splitterWidth = splitter instanceof HTMLElement
            ? splitter.getBoundingClientRect().width
            : 10;
        const available = Math.max(1, browserRect.width - splitterWidth);
        const minListWidth = Math.min(360, Math.max(240, Math.floor(available * 0.28)));
        const max = Math.max(1, available - minListWidth);
        const min = Math.min(max, Math.min(420, Math.max(300, Math.floor(available * 0.3))));

        return { min, max };
    },

    wireMissingModelDetail(container, missing, missingIndex) {
        this.wireLocalMatchButtons(container, missing, missingIndex);
        this.wireDownloadSearchPanel(container, missing);
        this.updateSelectedBarForMissing(missing);

        const locateId = `locate-${missing.node_id}-${missing.widget_index}`;
        const locateBtn = container.querySelector(`#${locateId}`);
        if (locateBtn && missing.is_top_level !== false) {
            locateBtn.addEventListener('click', () => {
                this.locateNodeInGraph(missing.node_id);
            });
        }

        const comboId = `combo-${missing.node_id}-${missing.widget_index}`;
        const comboInput = container.querySelector(`#combo-input-${comboId}`);
        const comboList = container.querySelector(`#combo-list-${comboId}`);
        const comboRefresh = container.querySelector(`#combo-refresh-${comboId}`);

        if (comboList) {
            this.enableWheelScrollChaining(comboList);
        }

        const allModels = Array.isArray(this.allModels) ? this.allModels : [];
        const buildLabel = (m) => `${m.category ? m.category + ': ' : ''}${m.relative_path || m.filename || ''}`;
        const getFolder = (m) => m.path || m.base_directory || '';

        const populateComboOptions = (filterText, highlightIdx = -1) => {
            if (!comboList) return;
            const f = (filterText || '').toLowerCase();
            const filtered = f
                ? allModels.filter(m => buildLabel(m).toLowerCase().includes(f))
                : allModels.slice();

            let html = '';
            for (let i = 0; i < filtered.length; i++) {
                const m = filtered[i];
                const label = buildLabel(m);
                const folder = getFolder(m);
                const isHighlighted = i === highlightIdx;
                const folderDisplay = folder ? folder.replace(/\\/g, '/').replace(/:/, '') : '';
                html += `<div data-idx="${allModels.indexOf(m)}" class="ml-combo-option ${isHighlighted ? 'is-highlighted' : ''}">`;
                html += `<div class="ml-combo-option-row">`;
                html += `<code>${this.escapeHtml(label)}</code>`;
                html += `</div>`;
                if (folderDisplay) {
                    html += `<div class="ml-combo-folder" data-tooltip="${this.escapeHtml(folderDisplay)}">Folder ${this.escapeHtml(folderDisplay)}</div>`;
                }
                html += `</div>`;
            }
            comboList.innerHTML = html;

            comboList.querySelectorAll('div[data-idx]').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.dataset.idx, 10);
                    if (!Number.isNaN(idx) && idx >= 0 && idx < allModels.length) {
                        const chosenModel = allModels[idx];
                        if (chosenModel) {
                            this.queueResolution(missing, chosenModel);
                        }
                    }
                });
            });
        };

        if (comboList) {
            populateComboOptions('');
        }

        if (comboInput) {
            const debouncedFilter = this.debounce(() => {
                populateComboOptions(comboInput.value);
            }, 200);
            comboInput.addEventListener('input', debouncedFilter);
            comboInput.addEventListener('focus', () => {
                if (comboList) {
                    comboList.classList.remove('ml-is-hidden');
                    comboList.classList.add('ml-is-visible');
                }
                populateComboOptions(comboInput.value);
            });
            comboInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (comboList) {
                        comboList.classList.remove('ml-is-visible');
                        comboList.classList.add('ml-is-hidden');
                    }
                }, 200);
            });
        }

        if (comboRefresh) {
            comboRefresh.addEventListener('click', async () => {
                this.allModels = null;
                await this.ensureAllModelsLoaded();
                populateComboOptions(comboInput?.value || '');
            });
        }

        const state = this.searchResultCache.get(this.getMissingSearchKey(missing));
        const searchResultsDiv = container.querySelector(`#search-results-${missing.node_id}-${missing.widget_index}`);
        if (state && searchResultsDiv && this.hasRenderableSearchState(state)) {
            searchResultsDiv.classList.remove('ml-is-hidden');
            searchResultsDiv.classList.add('ml-is-visible');
            this.displaySearchResults(missing, state, searchResultsDiv);
        }
    },

    /**
     * Display missing models in the dialog
     */
    displayMissingModels(container, data) {
        const missingModels = data.missing_models || [];
        const totalMissing = data.total_missing || 0;
        this.missingModels = missingModels;
        this.syncBatchSelectionForMissingModels(missingModels);

        // Check if there are active downloads
        const activeCount = Object.keys(this.activeDownloads).length;

        // Check if any model has a 100% confidence match
        const hasAny100Match = missingModels.some(m =>
            (m.matches || []).some(match => match.confidence === 100)
        );

        // Show/hide Auto-Link button based on whether 100% matches exist
        this.setMissingFooterControlsVisible(totalMissing > 0 || activeCount > 0);
        if (this.autoResolveButton) {
            this.autoResolveButton.style.display = hasAny100Match ? 'inline-flex' : 'none';
        }

        // Hide download all button if no missing models
        if (this.downloadAllButton) {
            this.downloadAllButton.style.display = (totalMissing > 0 || activeCount > 0) ? 'inline-flex' : 'none';
        }

        if (totalMissing === 0 && activeCount === 0) {
            container.innerHTML = this.renderStatusMessage('All models are available! No missing models found.', 'success');
            return;
        }

        // If no missing models but downloads are active, show a waiting message
        if (totalMissing === 0 && activeCount > 0) {
            container.innerHTML = this.renderStatusMessage(
                `${activeCount} download${activeCount > 1 ? 's' : ''} in progress. Models will be auto-linked when complete.`,
                'info'
            );
            return;
        }

        // Skip rendering if active tab is not "missing"
        if (this.activeTab !== 'missing') {
            container.innerHTML = '';
            return;
        }

        // Sort missing models: those with 100% confidence matches first, then others
        const sortedMissingModels = [...missingModels].sort((a, b) => {
            const aMatches = a.matches || [];
            const bMatches = b.matches || [];

            // Filter to 70%+ confidence
            const aFiltered = aMatches.filter(m => m.confidence >= 70);
            const bFiltered = bMatches.filter(m => m.confidence >= 70);

            // Check if they have 100% matches
            const aHas100 = aFiltered.some(m => m.confidence === 100);
            const bHas100 = bFiltered.some(m => m.confidence === 100);

            // If one has 100% and the other doesn't, prioritize the one with 100%
            if (aHas100 && !bHas100) return -1;
            if (!aHas100 && bHas100) return 1;

            // If both have 100% or neither has 100%, sort by best confidence
            const aBestConf = aFiltered.length > 0 ? Math.max(...aFiltered.map(m => m.confidence)) : 0;
            const bBestConf = bFiltered.length > 0 ? Math.max(...bFiltered.map(m => m.confidence)) : 0;

            return bBestConf - aBestConf; // Higher confidence first
        });

        for (let mi = 0; mi < sortedMissingModels.length; mi++) {
            sortedMissingModels[mi].__displayIndex = mi;
        }

        const selectedStillExists = sortedMissingModels.some(missing => (
            this.getMissingModelKey(missing) === this.selectedMissingModelKey
        ));
        if (!selectedStillExists) {
            this.selectedMissingModelKey = sortedMissingModels.length
                ? this.getMissingModelKey(sortedMissingModels[0])
                : null;
        }

        this.missingModels = sortedMissingModels;
        container.innerHTML = this.renderMissingModelsBrowser(
            sortedMissingModels,
            this.selectedMissingModelKey,
            totalMissing,
            activeCount,
            hasAny100Match
        );
        this.wireMissingModelsBrowser(container, data, sortedMissingModels);
        this.scheduleInitialUrnLocalMatchRefresh(sortedMissingModels, container, data);
        this.updateBatchFooterButtons();
    },

    renderMissingModel(missing, missingIndex = 0) {
        const allMatches = missing.matches || [];

        // Filter out matches below 70% confidence threshold
        const filteredMatches = allMatches.filter(m => m.confidence >= 70);
        const hasMatches = filteredMatches.length > 0;

        // Calculate 100% matches upfront (needed for download section)
        const perfectMatches = filteredMatches.filter(m => m.confidence === 100);
        const otherMatches = filteredMatches.filter(m => m.confidence < 100 && m.confidence >= 70);

        // Format the missing filename for display
        const missingFilename = this.formatFilename(missing.original_path, 60);

        // Determine node info for the chip
        const nodeDisplay = this.getMissingNodeDisplay(missing);
        const nodeChipText = this.escapeHtml(nodeDisplay.text);

        // Start card
        let html = `<div class="ml-card">`;

        // Card Header: Filename as headline + node chip
        html += `<div class="ml-card-header">`;
        html += `<div class="ml-card-title-wrap">`;

        const titleMetaParts = [];
        let titlePrimaryHtml = `<span class="ml-card-title-primary" data-tooltip="${this.escapeHtml(missingFilename.full)}">${missingFilename.display}</span>`;
        let titleSecondaryHtml = '';

        const modelId = missing.urn_model_id || missing.urn?.model_id;
        const versionId = missing.urn_version_id || missing.urn?.version_id;
        const modelUrl = missing.is_urn && modelId ? `https://civitai.com/models/${modelId}${versionId ? '?modelVersionId=' + versionId : ''}` : '';
        const urnLoadingId = `urn-loading-${missing.node_id}-${missing.widget_index}`;

        if (missing.is_urn) {
            titleMetaParts.push(`<span class="ml-card-title-eyebrow" data-tooltip="${this.escapeHtml(missingFilename.full)}">${missingFilename.display}</span>`);
        }

        if (missing.is_urn && !missing.civitai_info) {
            // URN without info - show Loading and fetch async in background
            titlePrimaryHtml = `<span class="ml-card-title-primary" id="${urnLoadingId}">Resolving CivitAI model...</span>`;
            setTimeout(() => this.resolveUrnAsync(modelId, versionId, urnLoadingId, modelUrl), 10);
        } else if (missing.is_urn && missing.civitai_info) {
            // URN with resolved info - show model name/version
            const civitaiInfo = missing.civitai_info;
            const civitaiLabelHtml = this.renderVersionedModelNameHtml(civitaiInfo.model_name, civitaiInfo.version_name);
            if (civitaiLabelHtml) {
                const linkHtml = modelUrl ? `<a href="${modelUrl}" target="_blank" class="ml-inline-civitai-link">${civitaiLabelHtml}</a>` : `<span class="ml-inline-civitai-link">${civitaiLabelHtml}</span>`;
                titlePrimaryHtml = `<span class="ml-card-title-primary">${linkHtml}</span>`;
            }
            if (civitaiInfo.expected_filename) {
                titleSecondaryHtml = `<span class="ml-card-title-secondary">Expected file: ${civitaiInfo.expected_filename}</span>`;
            }
        }

        html += `<div class="ml-card-title-meta">`;
        html += titleMetaParts.join('');
        html += `<h3 class="ml-card-title">${titlePrimaryHtml}</h3>`;
        if (titleSecondaryHtml) {
            html += titleSecondaryHtml;
        }
        html += `</div>`;
        const locateId = `locate-${missing.node_id}-${missing.widget_index}`;
        const nodeChipClasses = missing.is_top_level !== false ? 'ml-node-chip is-locatable' : 'ml-node-chip';
        const nodeChipTitle = missing.is_top_level !== false ? 'Center this node in the ComfyUI graph.' : '';

        html += `<div class="ml-card-subtitle">`;
        if (missing.category) {
            html += `<span class="ml-category-chip ${this.getModelTypeColorClass(missing.category)}" data-tooltip="${this.escapeHtml(missing.category)}">${this.getCategoryDisplayName(missing.category)}</span>`;
        }
        html += `<span id="${locateId}" class="${nodeChipClasses}"${nodeChipTitle ? ` data-tooltip="${this.escapeHtml(nodeChipTitle)}"` : ''}>`;
        if (missing.is_top_level !== false) {
            html += this.getLocateIconHtml();
        }
        html += `${nodeChipText}</span>`;
        html += `</div>`;
        html += `</div>`;
        html += `</div>`;

        // Selected bar - shows if this slot has a queued selection (BELOW card header)
        const selectedBarId = `selected-bar-${missing.node_id}-${missing.widget_index}`;
        html += `<div id="${selectedBarId}" class="model-linker-selected"></div>`;

        // Two-column layout
        html += `<div class="ml-columns">`;

        // LEFT COLUMN: Local Matches
        html += `<div class="ml-column">`;
        html += `<div class="ml-column-header">Local Matches</div>`;
        html += `<div id="local-matches-body-${missing.node_id}-${missing.widget_index}">`;
        html += this.renderLocalMatchesContent(missing, missingIndex);
        html += `</div>`;

        // Add all-models search picker - combo-style dropdown
        const comboId = `combo-${missing.node_id}-${missing.widget_index}`;
        html += `<div class="ml-combo-section">`;
        html += `<div class="ml-combo-row">`;
        html += `<label class="ml-combo-label">Model</label>`;
        html += `<input id="combo-input-${comboId}" class="ml-combo-input" type="text" placeholder="Type to filter local models...">`;
        html += `<button id="combo-refresh-${comboId}" type="button" aria-label="Reload local model list" data-tooltip="Reload local model list" class="ml-btn ml-btn-secondary ml-btn-sm ml-btn-icon-only ml-combo-refresh-btn">${getSvgIcon('refreshCw', 'currentColor', 'ml-combo-refresh-icon')}</button>`;
        html += `</div>`;
        html += `<div id="combo-list-${comboId}" class="ml-combo-list"></div>`;
        html += `</div>`;

        html += `</div>`; // End left column

        // RIGHT COLUMN: Download Option
        html += `<div class="ml-column">`;
        html += `<div class="ml-column-header">Download</div>`;

        const filename = missing.original_path?.split('/').pop()?.split('\\').pop() || '';
        const downloadSource = missing.download_source;
        const urnDownloadId = `urn-download-${missing.node_id}-${missing.widget_index}`;

        if (downloadSource && downloadSource.url) {
            html += this.renderKnownDownloadPanel(missing, downloadSource);
        } else if (perfectMatches.length > 0) {
            // Has perfect local match - download not needed, but allow online re-check.
            html += `<div class="ml-download-section">`;
            html += this.renderSearchControls(missing, { buttonText: 'Search Online' });
            html += this.renderDownloadTargetControls(missing, missing.category || 'checkpoints');
            html += `</div>`;
            html += `<div id="search-results-${missing.node_id}-${missing.widget_index}" class="ml-search-results"></div>`;
        } else if (missing.is_urn) {
            html += `<div id="${urnDownloadId}" class="ml-download-section">`;
            html += `<div class="ml-download-info">Resolving CivitAI download for this URN...</div>`;
            html += `</div>`;
        } else {
            // No known download - offer search
            html += `<div class="ml-download-section">`;
            html += this.renderSearchControls(missing);
            html += this.renderDownloadTargetControls(missing, missing.category || 'checkpoints');
            html += `</div>`;
            html += `<div id="search-results-${missing.node_id}-${missing.widget_index}" class="ml-search-results"></div>`;
        }

        // Progress container (for downloads)
        html += `<div id="download-progress-${missing.node_id}-${missing.widget_index}" class="ml-download-progress-slot"></div>`;

        html += `</div>`; // End right column
        html += `</div>`; // End columns

        html += `</div>`; // End card
        return html;
    },

    /**
     * Show a notification banner (similar to ComfyUI's "Reconnecting" banner)
     */
    showNotification(message, type = 'success') {
        // Build children array, filtering out nulls
        const children = [];

        if (type === 'success') {
            children.push($el("span", {
                textContent: "✓",
                className: "ml-notification-icon"
            }));
        } else if (type === 'error') {
            children.push($el("span", {
                textContent: "×",
                className: "ml-notification-icon"
            }));
        } else if (type === 'info') {
            children.push($el("span", {
                textContent: "ℹ",
                className: "ml-notification-icon"
            }));
        }

        // Create notification banner
        const notification = $el("div", {
            className: `ml-notification ml-notification--${type}`
        }, [
            ...children,
            $el("span", {
                textContent: message
            }),
            $el("button", {
                className: "ml-notification-close",
                textContent: "×",
                onclick: () => {
                    if (notification.parentNode) {
                        notification.style.opacity = "0";
                        notification.style.transform = "translateX(-50%) translateY(-100%)";
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 300);
                    }
                }
            })
        ]);

        document.body.appendChild(notification);

        // Auto-dismiss after 4 seconds for success, 6 seconds for errors
        const dismissTime = type === 'success' ? 4000 : 6000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = "0";
                notification.style.transform = "translateX(-50%) translateY(-100%)";
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, dismissTime);
    }
};

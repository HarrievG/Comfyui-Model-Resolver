import { app } from "../../../../../scripts/app.js";
import { api } from "../../../../../scripts/api.js";
import { $el } from "../../../../../scripts/ui.js";
import { getSvgIcon } from "../../utils/icon_utils.js";
export const modelInfoMethods = {
    /**
     * Handle click outside context menu to hide it
     */
    handleContextMenuOutsideClick(e) {
        if (!this.contextMenu) return;
        if (this.contextMenu.style.display === 'none') return;

        // Check if click is outside the context menu
        if (!this.contextMenu.contains(e.target)) {
            this.hideContextMenu();
        }
    },

    /**
     * Show context menu at the specified position
     */
    showContextMenu(x, y, model) {
        if (!this.contextMenu) return;

        this._contextMenuModel = model;

        // Position the menu
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = 'block';

        // Adjust position if menu would go off screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    },

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (!this.contextMenu) return;
        this.contextMenu.style.display = 'none';
        this._contextMenuModel = null;
    },

    /**
     * Handle context menu item click
     */
    handleContextMenuAction(action) {
        const model = this._contextMenuModel;
        this.hideContextMenu();

        if (!model) return;

        if (action === 'civitai') {
            this.openInCivitAI(model);
        } else if (action === 'openFolder') {
            this.openContainingFolder(model);
        } else if (action === 'showInfo') {
            this.showModelInfo(model);
        }
    },

    async openContainingFolder(model) {
        const path = model?.path || model?.resolved_path || '';
        if (!path) {
            this.showNotification('No local file path available', 'error');
            return;
        }

        try {
            const response = await api.fetchApi('/model_resolver/open-containing-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });

            if (!response.ok) {
                throw new Error(`Open folder failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Model Resolver: Open folder error:', error);
            this.showNotification('Failed to open containing folder', 'error');
        }
    },

    /**
     * Open model in CivitAI
     */
    async openInCivitAI(model) {
        if (!model) return;

        const name = model.name || model.original_path?.split(/[\/\\]/).pop() || '';
        if (!name) return;

        try {
            // Search CivitAI for this model using hash (pass resolved_path for hash lookup)
            const response = await api.fetchApi('/model_resolver/civitai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: name,
                    category: model.category,
                    resolved_path: model.resolved_path || ''
                })
            });

            if (!response.ok) {
                this.showNotification('Nie znaleziono modelu na CivitAI', 'error');
                return;
            }

            const data = await response.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                // Try direct search on CivitAI
                const searchName = name.replace(/\.(safetensors|ckpt|pt|pth|bin|pkl|sft|onnx|gguf)$/i, '');
                const searchUrl = `https://civitai.com/search?q=${encodeURIComponent(searchName)}`;
                window.open(searchUrl, '_blank');
            }
        } catch (e) {
            console.error('Model Resolver: Error searching CivitAI:', e);
            // Fall back to direct search
            const searchName = name.replace(/\.(safetensors|ckpt|pt|pth|bin|pkl|sft|onnx|gguf)$/i, '');
            const searchUrl = `https://civitai.com/search?q=${encodeURIComponent(searchName)}`;
            window.open(searchUrl, '_blank');
        }
    },

    /**
     * Show model info dialog (similar to rgthree's RgthreeLoraInfoDialog)
     */
    async showModelInfo(model) {
        if (!model) return;

        const name = model.name || model.original_path?.split(/[\/\\]/).pop() || '';
        if (!name) return;

        // Create and show the info dialog
        this.showModelInfoDialog(name, model);
    },

    /**
     * Show the model info dialog
     */
    showModelInfoDialog(loraName, modelData) {
        // Create info dialog element
        const dialog = this.createInfoDialog(loraName, modelData);
        this.restoreInfoDialogSize(dialog);

        // Show the dialog
        document.body.appendChild(dialog);
        this.bindTooltips(dialog);
        this.bindInfoDialogResizePersistence(dialog);

        // Add close handlers
        const closeBtn = dialog.querySelector('.mr-info-dialog-close');
        const footerCloseBtn = dialog.querySelector('.mr-info-dialog-close-btn');
        const backdrop = dialog.querySelector('.mr-info-dialog-backdrop');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeInfoDialog(dialog));
        }
        if (footerCloseBtn) {
            footerCloseBtn.addEventListener('click', () => this.closeInfoDialog(dialog));
        }
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                // Only close if clicking backdrop itself, not its children
                if (e.target === backdrop) {
                    this.closeInfoDialog(dialog);
                }
            });
        }

        // Fetch CivitAI info
        this.fetchModelInfoForDialog(loraName, modelData, dialog);
    },

    /**
     * Create the info dialog element
     */
    createInfoDialog(loraName, modelData) {
        const loraDisplayName = loraName.replace(/\.(safetensors|ckpt|pt|pth|bin|pkl|sft|onnx|gguf)$/i, '');

        const dialog = document.createElement('div');
        dialog.className = 'mr-info-dialog-backdrop';
        dialog._selectedTrainedWords = new Set();
        dialog.innerHTML = `
            <div class="mr-info-dialog">
                <div class="mr-info-dialog-header">
                    <h3 class="mr-info-dialog-title">${loraDisplayName}</h3>
                    <button class="mr-info-dialog-close">×</button>
                </div>
                <div class="mr-info-dialog-content">
                    <div class="mr-info-dialog-loading">Loading...</div>
                    <div class="mr-info-dialog-body mr-hidden-initial">
                        <div class="mr-info-area">
                            <span class="mr-info-tag mr-info-type"></span>
                            <span class="mr-info-tag mr-info-basemodel"></span>
                        </div>
                        <table class="mr-info-table">
                            <tbody>
                                <tr class="mr-info-file-row">
                                    <td><span>File <span class="mr-tooltip-badge" data-tooltip="The model file name found locally or returned by CivitAI.">?</span></span></td>
                                    <td><span class="mr-info-file"></span></td>
                                </tr>
                                <tr class="mr-info-hash-row">
                                    <td><span>Hash (sha256) <span class="mr-tooltip-badge" data-tooltip="Unique fingerprint of the local file. Model Resolver uses it to confirm the exact CivitAI version.">?</span></span></td>
                                    <td><span class="mr-info-hash"></span></td>
                                </tr>
                                <tr class="mr-info-civitai-row">
                                    <td><span>CivitAI <span class="mr-tooltip-badge" data-tooltip="Opens the matching CivitAI model or version page when one was found.">?</span></span></td>
                                    <td><span class="mr-info-civitai-link"></span></td>
                                </tr>
                                <tr class="mr-info-name-row">
                                    <td><span>Name <span class="mr-tooltip-badge" data-tooltip="Model name from CivitAI or local metadata.">?</span></span></td>
                                    <td><span class="mr-info-name"></span></td>
                                </tr>
                                <tr class="mr-info-basemodel-row">
                                    <td><span>Base Model <span class="mr-tooltip-badge" data-tooltip="Base model this resource was made for, for example SD1.5, SDXL or Flux.">?</span></span></td>
                                    <td><span class="mr-info-base-model"></span></td>
                                </tr>
                                <tr class="mr-info-trainedwords-row mr-hidden-initial">
                                    <td>
                                        <div class="mr-info-trained-words-label">
                                            Trained Words <span class="mr-tooltip-badge" data-tooltip="Trigger words recommended by the model author. Click the words you want, then copy them into your prompt.">?</span>
                                            <small class="mr-info-trained-words-meta">
                                                <span class="mr-info-trained-words-count">0 selected</span>
                                                <button type="button" class="mr-info-copy-trained-words" disabled>Copy</button>
                                            </small>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="mr-info-trained-words-hint">Click words to select them.</div>
                                        <div class="mr-info-trained-words"></div>
                                    </td>
                                </tr>
                                <tr class="mr-info-clipskip-row mr-hidden-initial">
                                    <td><span>Clip Skip <span class="mr-tooltip-badge" data-tooltip="Recommended Clip Skip value from the model author, if one is provided.">?</span></span></td>
                                    <td><span class="mr-info-clip-skip"></span></td>
                                </tr>
                                <tr class="mr-info-description-row mr-hidden-initial">
                                    <td><span>Description <span class="mr-tooltip-badge" data-tooltip="Model description from CivitAI or local metadata. Long descriptions are shortened until you click Show more.">?</span></span></td>
                                    <td>
                                        <div class="mr-info-description-wrap">
                                            <div class="mr-info-description"></div>
                                            <div class="mr-info-description-actions mr-hidden-initial">
                                                <button type="button" class="mr-info-description-toggle">Show more</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="mr-info-images"></div>
                    </div>
                </div>
                <div class="mr-info-dialog-footer">
                    <button class="mr-btn mr-btn-secondary mr-info-dialog-close-btn">Close</button>
                </div>
            </div>
        `;

        return dialog;
    },

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeJsString(value) {
        return this.escapeHtml(JSON.stringify(String(value ?? '')));
    },

    truncateText(value, maxLength = 160) {
        const text = String(value ?? '').trim();
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    },

    sanitizeDescriptionHtml(html) {
        const raw = String(html ?? '').trim();
        if (!raw) return '';

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${raw}</div>`, 'text/html');
        const root = doc.body.firstElementChild;
        if (!root) return this.escapeHtml(raw);

        const allowedTags = new Set([
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
            'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'a', 'span'
        ]);
        const allowedStyles = new Set(['color']);

        const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                node.remove();
                return;
            }

            const tag = node.tagName.toLowerCase();
            if (!allowedTags.has(tag)) {
                const parent = node.parentNode;
                if (!parent) {
                    node.remove();
                    return;
                }

                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
                return;
            }

            const attrs = Array.from(node.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on') || name === 'id' || name === 'class' || name.startsWith('data-')) {
                    node.removeAttribute(attr.name);
                    continue;
                }

                if (name === 'href' && tag === 'a') {
                    const href = node.getAttribute('href') || '';
                    if (!/^https?:\/\//i.test(href)) {
                        node.removeAttribute('href');
                    } else {
                        node.setAttribute('target', '_blank');
                        node.setAttribute('rel', 'noopener noreferrer');
                    }
                    continue;
                }

                if (name === 'style') {
                    const safeStyles = [];
                    const styleValue = node.getAttribute('style') || '';
                    for (const part of styleValue.split(';')) {
                        const [prop, value] = part.split(':').map(v => v?.trim());
                        if (!prop || !value) continue;
                        if (allowedStyles.has(prop.toLowerCase())) {
                            safeStyles.push(`${prop}: ${value}`);
                        }
                    }
                    if (safeStyles.length) {
                        node.setAttribute('style', safeStyles.join('; '));
                    } else {
                        node.removeAttribute('style');
                    }
                    continue;
                }

                if (!(tag === 'a' && (name === 'target' || name === 'rel')) ) {
                    node.removeAttribute(attr.name);
                }
            }

            Array.from(node.childNodes).forEach(child => sanitizeNode(child));
        };

        Array.from(root.childNodes).forEach(child => sanitizeNode(child));
        return root.innerHTML;
    },

    normalizeTrainedWords(words) {
        if (Array.isArray(words)) {
            return [...new Set(words.map(word => String(word || '').trim()).filter(Boolean))];
        }

        if (typeof words === 'string') {
            return [...new Set(
                words
                    .split(/[\n,|;]/)
                    .map(word => word.trim())
                    .filter(Boolean)
            )];
        }

        return [];
    },

    updateSelectedTrainedWordsSummary(dialog) {
        if (!dialog) return;

        const countEl = dialog.querySelector('.mr-info-trained-words-count');
        const copyBtn = dialog.querySelector('.mr-info-copy-trained-words');
        const selected = dialog._selectedTrainedWords instanceof Set
            ? Array.from(dialog._selectedTrainedWords)
            : [];

        if (countEl) {
            countEl.textContent = `${selected.length} selected`;
        }
        if (copyBtn) {
            copyBtn.disabled = selected.length === 0;
            copyBtn.textContent = 'Copy';
        }
    },

    bindInfoDialogInteractions(dialog) {
        if (!dialog || dialog.dataset.mlInfoBound === 'true') return;
        dialog.dataset.mlInfoBound = 'true';

        dialog.addEventListener('click', async (event) => {
            const wordBtn = event.target.closest('.mr-info-trained-word');
            if (wordBtn && dialog.contains(wordBtn)) {
                const word = wordBtn.dataset.word || '';
                if (word) {
                    if (!(dialog._selectedTrainedWords instanceof Set)) {
                        dialog._selectedTrainedWords = new Set();
                    }

                    if (dialog._selectedTrainedWords.has(word)) {
                        dialog._selectedTrainedWords.delete(word);
                        wordBtn.classList.remove('is-selected');
                        wordBtn.setAttribute('aria-pressed', 'false');
                    } else {
                        dialog._selectedTrainedWords.add(word);
                        wordBtn.classList.add('is-selected');
                        wordBtn.setAttribute('aria-pressed', 'true');
                    }

                    this.updateSelectedTrainedWordsSummary(dialog);
                }
                return;
            }

            const copyBtn = event.target.closest('.mr-info-copy-trained-words');
            if (copyBtn && dialog.contains(copyBtn)) {
                const words = dialog._selectedTrainedWords instanceof Set
                    ? Array.from(dialog._selectedTrainedWords)
                    : [];

                if (!words.length) return;

                try {
                    await navigator.clipboard.writeText(words.join(', '));
                    copyBtn.textContent = 'Copied';
                } catch (error) {
                    console.error('Model Resolver: Failed to copy trained words:', error);
                    copyBtn.textContent = 'Failed';
                }

                setTimeout(() => {
                    if (copyBtn.isConnected) {
                        copyBtn.textContent = 'Copy';
                    }
                }, 1200);
                return;
            }

            const descToggleBtn = event.target.closest('.mr-info-description-toggle');
            if (descToggleBtn && dialog.contains(descToggleBtn)) {
                const descEl = dialog.querySelector('.mr-info-description');
                if (!descEl) return;

                const isExpanded = descEl.classList.toggle('is-expanded');
                descToggleBtn.textContent = isExpanded ? 'Show less' : 'Show more';
            }
        });
    },

    getInfoDialogElement(dialog) {
        return dialog?.querySelector?.('.mr-info-dialog') || null;
    },

    restoreInfoDialogSize(dialog) {
        const panel = this.getInfoDialogElement(dialog);
        if (!panel) return;

        try {
            const saved = JSON.parse(localStorage.getItem('model_resolver_info_dialog_size') || 'null');
            if (!saved || typeof saved !== 'object') return;

            const width = Number(saved.w);
            const height = Number(saved.h);
            if (!Number.isFinite(width) || !Number.isFinite(height)) return;

            const maxWidth = Math.floor(window.innerWidth * 0.9);
            const maxHeight = Math.floor(window.innerHeight * 0.8);
            const clampedWidth = Math.max(420, Math.min(width, maxWidth));
            const clampedHeight = Math.max(320, Math.min(height, maxHeight));

            panel.style.width = `${clampedWidth}px`;
            panel.style.height = `${clampedHeight}px`;
        } catch (error) {
            console.warn('Model Resolver: Failed to restore info dialog size:', error);
        }
    },

    saveInfoDialogSize(dialog) {
        const panel = this.getInfoDialogElement(dialog);
        if (!panel) return;

        const rect = panel.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (!width || !height) return;

        try {
            localStorage.setItem('model_resolver_info_dialog_size', JSON.stringify({ w: width, h: height }));
        } catch (error) {
            console.warn('Model Resolver: Failed to save info dialog size:', error);
        }
    },

    bindInfoDialogResizePersistence(dialog) {
        const panel = this.getInfoDialogElement(dialog);
        if (!panel || typeof ResizeObserver === 'undefined') return;
        if (dialog._infoDialogResizeObserver) return;

        let resizeSaveTimer = null;
        const observer = new ResizeObserver(() => {
            clearTimeout(resizeSaveTimer);
            resizeSaveTimer = setTimeout(() => this.saveInfoDialogSize(dialog), 180);
            dialog._infoDialogResizeSaveTimer = resizeSaveTimer;
        });

        observer.observe(panel);
        dialog._infoDialogResizeObserver = observer;
        dialog._infoDialogResizeSaveTimer = resizeSaveTimer;
    },

    /**
     * Fetch model info and update the dialog
     */
    async fetchModelInfoForDialog(loraName, modelData, dialog) {
        try {
            const response = await api.fetchApi('/model_resolver/civitai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: loraName,
                    category: modelData?.category || '',
                    resolved_path: modelData?.resolved_path || ''
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.updateInfoDialogWithData(dialog, data);
            } else {
                this.updateInfoDialogError(dialog, 'Model not found on CivitAI');
            }
        } catch (e) {
            console.error('Model Resolver: Error fetching model info:', e);
            this.updateInfoDialogError(dialog, 'Error fetching info');
        }
    },

    /**
     * Update the info dialog with data
     */
    updateInfoDialogWithData(dialog, data) {
        const loadingDiv = dialog.querySelector('.mr-info-dialog-loading');
        const bodyDiv = dialog.querySelector('.mr-info-dialog-body');
        this.bindInfoDialogInteractions(dialog);

        if (loadingDiv) loadingDiv.style.display = 'none';
        if (bodyDiv) bodyDiv.style.display = 'block';

        if (!data) {
            this.updateInfoDialogError(dialog, 'No data received');
            return;
        }

        // Update title
        const titleEl = dialog.querySelector('.mr-info-dialog-title');
        if (titleEl) {
            const modelName = data.model_name || data.modelName || 'Unknown Model';
            const versionName = data.version_name || data.versionName || '';
            titleEl.innerHTML = this.renderVersionedModelNameHtml(modelName, versionName) || this.escapeHtml(modelName);
        }

        // Update type tag
        const typeTag = dialog.querySelector('.mr-info-type');
        if (typeTag) {
            const modelType = data.model_type || data.modelType || '';
            typeTag.textContent = modelType.toUpperCase();
            typeTag.className = `mr-info-tag mr-info-type ${this.getModelTypeColorClass(modelType)}`;
        }

        // Update base model tag
        const baseModelTag = dialog.querySelector('.mr-info-basemodel');
        if (baseModelTag) {
            const baseModel = data.base_model || data.baseModel || '';
            baseModelTag.textContent = baseModel || '';
            if (baseModel) {
                baseModelTag.style.display = '';
                baseModelTag.className = `mr-info-tag mr-info-basemodel -basemodel-${baseModel.toLowerCase().replace(/\s+/g, '-')}`;
            } else {
                baseModelTag.style.display = 'none';
            }
        }

        // Update file
        const fileEl = dialog.querySelector('.mr-info-file');
        if (fileEl && data.filename) {
            fileEl.textContent = data.filename;
        }

        // Update hash
        const hashEl = dialog.querySelector('.mr-info-hash');
        if (hashEl) {
            hashEl.textContent = data.sha256 || data.hash || '';
        }

        // Update CivitAI link
        const civitaiLinkEl = dialog.querySelector('.mr-info-civitai-link');
        if (civitaiLinkEl) {
            if (data.url || data.version_url) {
                const url = data.version_url || data.url;
                civitaiLinkEl.innerHTML = `
                    <a href="${url}" target="_blank" class="mr-info-link">
                        ${getSvgIcon('civitai', 'currentColor', 'mr-info-civitai-logo')}
                        View on Civitai
                    </a>
                `;
            } else {
                const searchName = data.model_name || data.modelName || 'Unknown';
                civitaiLinkEl.innerHTML = `
                    <span class="mr-info-not-found">Model not found</span>
                    <a href="https://civitai.com/search?q=${encodeURIComponent(searchName)}" target="_blank" class="mr-info-link">
                        ${this.getSearchIconHtml()} Search on CivitAI
                    </a>
                `;
            }
        }

        // Update name
        const nameEl = dialog.querySelector('.mr-info-name');
        if (nameEl) {
            nameEl.textContent = data.model_name || data.modelName || '';
        }

        // Update base model row
        const baseModelRowEl = dialog.querySelector('.mr-info-base-model');
        if (baseModelRowEl) {
            const baseModel = data.base_model || data.baseModel || '';
            baseModelRowEl.textContent = baseModel;
            const row = baseModelRowEl.closest('tr');
            if (row && baseModel) {
                row.style.display = '';
            } else if (row) {
                row.style.display = 'none';
            }
        }

        // Update trained words
        const trainedWordsEl = dialog.querySelector('.mr-info-trained-words');
        if (trainedWordsEl) {
            const words = this.normalizeTrainedWords(data.trained_words || data.trainedWords || []);
            if (words.length > 0) {
                dialog._selectedTrainedWords = new Set();
                trainedWordsEl.innerHTML = `<div class="mr-info-trained-words-list">${words.map(word => `
                    <button
                        type="button"
                        class="mr-info-trained-word"
                        data-word="${this.escapeHtml(word)}"
                        data-tooltip="${this.escapeHtml(word)}"
                        aria-pressed="false"
                    >
                        ${this.escapeHtml(word)}
                    </button>
                `).join('')}</div>`;
                const row = trainedWordsEl.closest('tr');
                if (row) row.style.display = '';
                this.bindTooltips(trainedWordsEl);
                this.updateSelectedTrainedWordsSummary(dialog);
            } else {
                const row = trainedWordsEl.closest('tr');
                if (row) row.style.display = 'none';
            }
        }

        // Update clip skip
        const clipSkipEl = dialog.querySelector('.mr-info-clip-skip');
        if (clipSkipEl) {
            const clipSkip = data.clip_skip || data.clipSkip;
            if (clipSkip && clipSkip !== 'None') {
                clipSkipEl.textContent = clipSkip;
                const row = clipSkipEl.closest('tr');
                if (row) row.style.display = '';
            } else {
                const row = clipSkipEl.closest('tr');
                if (row) row.style.display = 'none';
            }
        }

        // Update description
        const descEl = dialog.querySelector('.mr-info-description');
        if (descEl) {
            const desc = data.description || data.model_description || data.modelDescription || '';
            if (desc) {
                const actionsEl = dialog.querySelector('.mr-info-description-actions');
                const toggleBtn = dialog.querySelector('.mr-info-description-toggle');

                let sanitizedHtml = '';
                try {
                    sanitizedHtml = this.sanitizeDescriptionHtml(desc);
                } catch (error) {
                    console.error('Model Resolver: Failed to sanitize description HTML:', error);
                }

                const fallbackText = this.escapeHtml(String(desc).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
                const finalHtml = sanitizedHtml && sanitizedHtml.trim() ? sanitizedHtml : `<p>${fallbackText}</p>`;
                const textOnly = finalHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

                descEl.innerHTML = finalHtml;
                descEl.classList.remove('is-expanded');

                const shouldCollapse = textOnly.length > 520 || finalHtml.length > 900;
                if (actionsEl) {
                    actionsEl.style.display = shouldCollapse ? '' : 'none';
                }
                if (toggleBtn) {
                    toggleBtn.textContent = 'Show more';
                }
                if (!shouldCollapse) {
                    descEl.classList.add('is-expanded');
                }

                const row = descEl.closest('tr');
                if (row) row.style.display = '';
            } else {
                const row = descEl.closest('tr');
                if (row) row.style.display = 'none';
            }
        }

        // Update images
        this.updateInfoDialogImages(dialog, data.images || data.modelImages || []);
    },

    /**
     * Update images in the info dialog
     */
    updateInfoDialogImages(dialog, images) {
        const imagesContainer = dialog.querySelector('.mr-info-images');
        if (!imagesContainer) return;
        if (!images.length) {
            imagesContainer.innerHTML = '';
            return;
        }

        const visibleImages = images.slice(0, 8).filter(img => img?.url);

        const renderImageCard = (img) => {
            const captionParts = [];
            if (img.civitaiUrl) {
                captionParts.push(`<a href="${this.escapeHtml(img.civitaiUrl)}" target="_blank" rel="noopener noreferrer" class="mr-info-image-link">civitai</a>`);
            }
            if (img.seed) captionParts.push(`<span><label>seed</label> ${this.escapeHtml(img.seed)}</span>`);
            if (img.steps) captionParts.push(`<span><label>steps</label> ${this.escapeHtml(img.steps)}</span>`);
            if (img.cfg) captionParts.push(`<span><label>cfg</label> ${this.escapeHtml(img.cfg)}</span>`);
            if (img.sampler) captionParts.push(`<span><label>sampler</label> ${this.escapeHtml(img.sampler)}</span>`);
            if (img.model) captionParts.push(`<span><label>model</label> ${this.escapeHtml(this.truncateText(img.model, 72))}</span>`);
            if (img.positive) captionParts.push(`<span><label>positive</label> ${this.escapeHtml(this.truncateText(img.positive, 180))}</span>`);
            if (img.negative) captionParts.push(`<span><label>negative</label> ${this.escapeHtml(this.truncateText(img.negative, 180))}</span>`);

            return `
                <div class="mr-info-image-item">
                    <figure>
                        <img src="${this.escapeHtml(img.url)}" alt="Example" loading="lazy" />
                        <figcaption>${captionParts.join('')}</figcaption>
                    </figure>
                </div>
            `;
        };

        let imagesHtml = '<div class="mr-info-images-header">Example Images</div><div class="mr-info-images-layout">';
        imagesHtml += visibleImages.map(renderImageCard).join('');
        imagesHtml += '</div>';
        imagesContainer.innerHTML = imagesHtml;
    },

    /**
     * Update the info dialog with error
     */
    updateInfoDialogError(dialog, message) {
        const civitaiLink = dialog.querySelector('.mr-info-civitai-link');
        if (civitaiLink) {
            civitaiLink.innerHTML = `<span class="mr-info-error">${message}</span>`;
        }
    },

    /**
     * Close the info dialog
     */
    closeInfoDialog(dialog) {
        if (dialog?._infoDialogResizeObserver) {
            dialog._infoDialogResizeObserver.disconnect();
            dialog._infoDialogResizeObserver = null;
        }
        if (dialog?._infoDialogResizeSaveTimer) {
            clearTimeout(dialog._infoDialogResizeSaveTimer);
            dialog._infoDialogResizeSaveTimer = null;
        }
        this.saveInfoDialogSize(dialog);

        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }
    }
};

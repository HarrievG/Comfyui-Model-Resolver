import { app } from "../../../../scripts/app.js";
import { api } from "../../../../scripts/api.js";
import { $el } from "../../../../scripts/ui.js";
import { getSvgIcon } from "../utils/icon_utils.js";
export const dialogShellMethods = {
    createHeader() {
        // Create tabs
        this.missingTab = $el("button.ml-tab.ml-tab-active", {
            onclick: () => this.switchTab('missing')
        }, [$el("span.ml-tab-label", { textContent: "Missing Models" })]);

        this.loadedTab = $el("button.ml-tab", {
            onclick: () => this.switchTab('loaded')
        }, [$el("span.ml-tab-label", { textContent: "Loaded Models" })]);

        this.optionsTab = $el("button.ml-tab", {
            onclick: () => this.switchTab('options')
        }, [$el("span.ml-tab-label", { textContent: "Options" })]);
        if (this.activeTab === 'missing') {
            this.updateTabButtonStates();
        }

        const dragHandle = $el("div", {
            id: "model-linker-drag-handle",
            ondragstart: (e) => e.preventDefault()
        }, [
            $el("span", { textContent: "⠿" })
        ]);
        this.setTooltip(dragHandle, "Drag window");

        const fullscreenButton = $el("button", {
            id: "model-linker-fullscreen-toggle",
            className: "ml-window-btn ml-window-btn--fullscreen",
            innerHTML: getSvgIcon('windowMaximize', 'currentColor', 'ml-window-btn-icon'),
            ariaLabel: "Toggle full screen",
            onclick: () => this.toggleFullScreen()
        });
        this.setTooltip(fullscreenButton, "Toggle full screen");

        this.dockButton = $el("button", {
            id: "model-linker-dock-toggle",
            className: "ml-window-btn ml-window-btn--dock",
            innerHTML: getSvgIcon('internalLink', 'currentColor', 'ml-window-btn-icon'),
            ariaLabel: "Dock Model Linker to sidebar",
            onclick: () => this.dockToSidebar()
        });
        this.setTooltip(this.dockButton, "Dock to sidebar");

        this.undockButton = $el("button", {
            id: "model-linker-undock-toggle",
            className: "ml-window-btn ml-window-btn--undock",
            innerHTML: getSvgIcon('externalLink', 'currentColor', 'ml-window-btn-icon'),
            ariaLabel: "Undock Model Linker",
            onclick: () => this.undockToFloating()
        });
        this.setTooltip(this.undockButton, "Undock to floating window");

        return $el("div.ml-dialog-shell", {}, [
            $el("div.ml-dialog-topbar", {}, [
                $el("div.ml-dialog-brand", {}, [
                    dragHandle,
                    $el("div.ml-tabs", {}, [
                        this.missingTab,
                        this.loadedTab,
                        this.optionsTab
                    ])
                ]),
                $el("div.ml-dialog-controls", {}, [
                    this.dockButton,
                    this.undockButton,
                    fullscreenButton,
                    $el("button", {
                        className: "ml-window-btn ml-window-btn--close",
                        innerHTML: getSvgIcon('x', 'currentColor', 'ml-window-btn-icon'),
                        ariaLabel: "Close Model Linker",
                        onclick: () => this.close()
                    })
                ])
            ])
        ]);
    },

    captureFloatingRect() {
        if (!this.element || this.docked || getComputedStyle(this.element).display === 'none') return;

        const rect = this.element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        this._floatingRectBeforeDock = {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
    },

    clearModalPlacementStyles() {
        if (!this.element) return;

        [
            'position',
            'top',
            'left',
            'right',
            'bottom',
            'inset',
            'transform',
            'width',
            'height',
            'maxWidth',
            'maxHeight',
            'minWidth',
            'minHeight',
            'borderRadius',
            'resize'
        ].forEach((property) => {
            this.element.style[property] = '';
        });
    },

    restoreFloatingGeometry() {
        const el = this.element;
        if (!el) return;

        el.style.width = '1100px';
        el.style.height = '700px';
        el.style.maxWidth = '100vw';
        el.style.maxHeight = '100vh';
        el.style.minWidth = '640px';
        el.style.minHeight = '420px';
        el.style.resize = 'both';
        el.style.borderRadius = '7px';

        const rect = this._floatingRectBeforeDock;
        if (rect?.width && rect?.height) {
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;
            el.style.top = `${rect.top}px`;
            el.style.left = `${rect.left}px`;
            el.style.transform = 'none';
            return;
        }

        try {
            const wh = JSON.parse(localStorage.getItem('model_linker_modal_size_before_fs') || 'null');
            if (wh?.w && wh?.h) {
                el.style.width = `${wh.w}px`;
                el.style.height = `${wh.h}px`;
            }

            const pos = JSON.parse(localStorage.getItem('model_linker_modal_pos') || 'null');
            if (pos && Number.isFinite(pos.top) && Number.isFinite(pos.left)) {
                el.style.top = `${pos.top}px`;
                el.style.left = `${pos.left}px`;
                el.style.transform = 'none';
                return;
            }
        } catch (e) {
            // Fall back to centered floating geometry below.
        }

        el.style.top = '50%';
        el.style.left = '50%';
        el.style.transform = 'translate(-50%, -50%)';
    },

    rememberSidebarOpenMode(mode) {
        try {
            localStorage.setItem(this.sidebarOpenModeStorageKey, mode === 'floating' ? 'floating' : 'docked');
        } catch (e) {}
    },

    shouldOpenFromSidebarFloating() {
        try {
            return localStorage.getItem(this.sidebarOpenModeStorageKey) === 'floating';
        } catch (e) {
            return false;
        }
    },

    isVisible() {
        if (!this.element?.isConnected) return false;
        return getComputedStyle(this.element).display !== 'none';
    },

    dockTo(container) {
        if (!container || !this.element) return;

        if (!this.docked) {
            this.captureFloatingRect();
        }

        if (this.fullscreen) {
            this.setFullScreen(false);
        }

        this.docked = true;
        this.dockContainer = container;
        this.lastDockContainer = container;
        this.pendingDockToSidebar = false;
        this.rememberSidebarOpenMode('docked');
        this.backdrop.style.display = 'none';
        container.classList.add('ml-sidebar-dock-panel');
        this.element.classList.add('ml-is-docked');
        this.clearModalPlacementStyles();
        this.element.style.display = 'flex';

        if (this.element.parentNode !== container) {
            container.appendChild(this.element);
        }
    },

    dockToSidebar() {
        if (this.docked) return;

        this.rememberSidebarOpenMode('docked');
        this.pendingDockToSidebar = true;

        if (this.isUsableDockContainer(this.lastDockContainer)) {
            this.dockTo(this.lastDockContainer);
            return;
        }

        this.tryOpenComfySidebarState();

        requestAnimationFrame(() => {
            if (!this.pendingDockToSidebar || this.docked) return;

            const button = document.querySelector(`.${this.sidebarTabId}-tab-button`);
            if (button instanceof HTMLElement) {
                const isActive = button.matches([
                    '[aria-pressed="true"]',
                    '[aria-selected="true"]',
                    '[data-active="true"]',
                    '[data-selected="true"]',
                    '.active',
                    '.is-active',
                    '.selected',
                    '.p-highlight'
                ].join(','));

                if (!isActive) {
                    button.click();
                }
            }
        });
    },

    isUsableDockContainer(container) {
        if (!(container instanceof HTMLElement) || !container.isConnected) return false;

        const style = getComputedStyle(container);
        if (style.display === 'none' || style.visibility === 'hidden') return false;

        const rect = container.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    },

    trySetSidebarStateProperty(target, property, value) {
        try {
            if (!(property in target)) return false;
            return Reflect.set(target, property, value);
        } catch (error) {
            return false;
        }
    },

    tryOpenComfySidebarState() {
        const extensionManager = app.extensionManager;
        let opened = false;
        const candidates = [
            extensionManager?.sidebarTab,
            extensionManager?.sidebarTabs,
            extensionManager?.sidebar,
            extensionManager
        ].filter(Boolean);

        for (const candidate of candidates) {
            try {
                if (typeof candidate.openSidebar === 'function') {
                    candidate.openSidebar(this.sidebarTabId);
                    opened = true;
                }
                if (typeof candidate.openSidebarTab === 'function') {
                    candidate.openSidebarTab(this.sidebarTabId);
                    opened = true;
                }
                if (typeof candidate.setActiveSidebarTab === 'function') {
                    candidate.setActiveSidebarTab(this.sidebarTabId);
                    opened = true;
                }
                if (typeof candidate.setActiveSidebarTabId === 'function') {
                    candidate.setActiveSidebarTabId(this.sidebarTabId);
                    opened = true;
                }
                if (this.trySetSidebarStateProperty(candidate, 'activeSidebarTabId', this.sidebarTabId)) {
                    opened = true;
                }
            } catch (error) {
                // Sidebar internals differ between ComfyUI versions; unsupported state APIs are ignored.
            }
        }

        return opened;
    },

    undockToFloating({ persist = true, closeSidebar = true } = {}) {
        if (!this.element) return;

        const wasDocked = this.docked;
        const dockContainer = this.dockContainer;
        this.docked = false;
        this.dockContainer = null;
        this.element.classList.remove('ml-is-docked');
        this.clearModalPlacementStyles();

        if (this.element.parentNode !== document.body) {
            document.body.appendChild(this.element);
        }

        this.element.style.display = 'flex';
        this.restoreFloatingGeometry();
        this.ensureModalHandleInViewport({ persist });

        if (wasDocked && closeSidebar) {
            this.closeComfySidebar(dockContainer);
        }
    },

    closeComfySidebar(dockContainer = null) {
        const closedByState = this.tryCloseComfySidebarState();

        requestAnimationFrame(() => {
            if (dockContainer && !dockContainer.isConnected) return;

            const button = document.querySelector(`.${this.sidebarTabId}-tab-button`);
            if (!(button instanceof HTMLElement)) return;

            const isActive = button.matches([
                '[aria-pressed="true"]',
                '[aria-selected="true"]',
                '[data-active="true"]',
                '[data-selected="true"]',
                '.active',
                '.is-active',
                '.selected',
                '.p-highlight'
            ].join(','));

            if (!closedByState || isActive) {
                button.click();
            }
        });
    },

    tryCloseComfySidebarState() {
        const extensionManager = app.extensionManager;
        let closed = false;
        const candidates = [
            extensionManager?.sidebarTab,
            extensionManager?.sidebarTabs,
            extensionManager?.sidebar,
            extensionManager
        ].filter(Boolean);

        for (const candidate of candidates) {
            try {
                if (typeof candidate.closeSidebar === 'function') {
                    candidate.closeSidebar();
                    closed = true;
                }
                if (typeof candidate.closeSidebarTab === 'function') {
                    candidate.closeSidebarTab(this.sidebarTabId);
                    closed = true;
                }
                if (typeof candidate.setActiveSidebarTab === 'function') {
                    candidate.setActiveSidebarTab(null);
                    closed = true;
                }
                if (typeof candidate.setActiveSidebarTabId === 'function') {
                    candidate.setActiveSidebarTabId(null);
                    closed = true;
                }
                if (
                    this.trySetSidebarStateProperty(candidate, 'activeSidebarTabId', null) ||
                    this.trySetSidebarStateProperty(candidate, 'activeSidebarTab', null)
                ) {
                    closed = true;
                }
            } catch (error) {
                // Sidebar internals differ between ComfyUI versions; unsupported state APIs are ignored.
            }
        }

        return closed;
    },

    // Toggle full screen mode for the dialog
    toggleFullScreen() {
        this.setFullScreen(!this.fullscreen);
    },

    setFullScreen(enable) {
        const shouldReturnToDocked = !enable && this.returnToDockedAfterFullscreen;
        if (enable && this.docked) {
            this.returnToDockedAfterFullscreen = true;
            this.undockToFloating({ persist: false });
        } else if (enable) {
            this.returnToDockedAfterFullscreen = false;
        }

        this.fullscreen = !!enable;
        const el = this.element;
        if (!el) return;
        const btn = document.getElementById('model-linker-fullscreen-toggle');
        if (enable) {
            // Save current size
            try {
                const rect = el.getBoundingClientRect();
                localStorage.setItem('model_linker_modal_size_before_fs', JSON.stringify({ w: Math.round(rect.width), h: Math.round(rect.height) }));
            } catch (e) {}
            el.style.top = '0';
            el.style.left = '0';
            el.style.transform = 'none';
            el.style.width = '100vw';
            el.style.height = '100vh';
            el.style.maxWidth = '100vw';
            el.style.maxHeight = '100vh';
            el.style.borderRadius = '0';
            el.style.resize = 'none';
            if (btn) {
                btn.innerHTML = getSvgIcon('windowRestore', 'currentColor', 'ml-window-btn-icon');
                btn.setAttribute('aria-label', 'Exit full screen');
                this.setTooltip(btn, 'Exit full screen');
            }
            try { localStorage.setItem('model_linker_modal_fullscreen', '1'); } catch (e) {}
        } else {
            this.returnToDockedAfterFullscreen = false;
            // Restore centered sizing
            el.style.maxWidth = '100vw';
            el.style.maxHeight = '100vh';
            el.style.borderRadius = '8px';
            el.style.resize = 'both';
            // Restore saved pre-FS size if available
            let wh = null;
            try { wh = JSON.parse(localStorage.getItem('model_linker_modal_size_before_fs') || 'null'); } catch (e) {}
            if (wh && wh.w && wh.h) {
                el.style.width = `${wh.w}px`;
                el.style.height = `${wh.h}px`;
            } else {
                el.style.width = '1100px';
                el.style.height = '700px';
            }
            // Restore last known position if available, else center
            try {
                const pos = JSON.parse(localStorage.getItem('model_linker_modal_pos') || 'null');
                if (pos && Number.isFinite(pos.top) && Number.isFinite(pos.left)) {
                    el.style.top = `${pos.top}px`;
                    el.style.left = `${pos.left}px`;
                    el.style.transform = 'none';
                } else {
                    el.style.top = '50%';
                    el.style.left = '50%';
                    el.style.transform = 'translate(-50%, -50%)';
                }
            } catch (e) {
                el.style.top = '50%';
                el.style.left = '50%';
                el.style.transform = 'translate(-50%, -50%)';
            }
            if (btn) {
                btn.innerHTML = getSvgIcon('windowMaximize', 'currentColor', 'ml-window-btn-icon');
                btn.setAttribute('aria-label', 'Enter full screen');
                this.setTooltip(btn, 'Enter full screen');
            }
            this.ensureModalHandleInViewport({ persist: true });
            try { localStorage.setItem('model_linker_modal_fullscreen', '0'); } catch (e) {}

            if (shouldReturnToDocked) {
                this.dockToSidebar();
            }
        }
    },

    getViewportClampedModalPosition(top, left) {
        const el = this.element;
        if (!el) return { top, left };

        const vw = window.innerWidth || document.documentElement.clientWidth || 0;
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        const pad = 4;
        const handle = document.getElementById('model-linker-drag-handle');

        if (handle) {
            const elRect = el.getBoundingClientRect();
            const handleRect = handle.getBoundingClientRect();
            const handleOffsetLeft = handleRect.left - elRect.left;
            const handleOffsetTop = handleRect.top - elRect.top;
            const handleWidth = handleRect.width || handle.offsetWidth;
            const handleHeight = handleRect.height || handle.offsetHeight;
            const minLeft = pad - handleOffsetLeft;
            const maxLeft = vw - pad - handleOffsetLeft - handleWidth;
            const minTop = pad - handleOffsetTop;
            const maxTop = vh - pad - handleOffsetTop - handleHeight;

            left = Math.max(minLeft, Math.min(maxLeft, left));
            top = Math.max(minTop, Math.min(maxTop, top));
        } else {
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            left = Math.max(-w + pad, Math.min(vw - pad, left));
            top = Math.max(-h + pad, Math.min(vh - pad, top));
        }

        return { top, left };
    },

    saveModalPosition() {
        if (this.docked) return;

        try {
            const el = this.element;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            localStorage.setItem('model_linker_modal_pos', JSON.stringify({ top: Math.round(rect.top), left: Math.round(rect.left) }));
        } catch (e) { /* ignore */ }
    },

    ensureModalHandleInViewport({ persist = false } = {}) {
        if (this.docked) return;
        if (this.fullscreen) return;
        const el = this.element;
        if (!el || getComputedStyle(el).display === 'none') return;

        const rect = el.getBoundingClientRect();
        const { top, left } = this.getViewportClampedModalPosition(rect.top, rect.left);
        const nextTop = Math.round(top);
        const nextLeft = Math.round(left);

        if (Math.round(rect.top) === nextTop && Math.round(rect.left) === nextLeft) return;

        el.style.top = `${nextTop}px`;
        el.style.left = `${nextLeft}px`;
        el.style.transform = 'none';

        if (persist) this.saveModalPosition();
    },

    scheduleModalViewportClamp(persist = false) {
        if (this._viewportClampFrame) {
            cancelAnimationFrame(this._viewportClampFrame);
        }

        this._viewportClampFrame = requestAnimationFrame(() => {
            this._viewportClampFrame = null;
            this.ensureModalHandleInViewport({ persist });
        });
    },

    // Begin window drag
    startDrag(e) {
        if (this.docked) return;

        try {
            const el = this.element;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            // Switch to absolute top/left (no transform) before dragging
            el.style.top = `${rect.top}px`;
            el.style.left = `${rect.left}px`;
            el.style.transform = 'none';
            this._dragging = true;
            this._dragStart = {
                x: e.clientX,
                y: e.clientY,
                top: rect.top,
                left: rect.left
            };
            // Prevent text selection while dragging
            this._prevUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            // Attach listeners
            this._onMouseMove = (ev) => this.onDrag(ev);
            this._onMouseUp = () => this.endDrag();
            document.addEventListener('mousemove', this._onMouseMove);
            document.addEventListener('mouseup', this._onMouseUp, { once: true });
        } catch (err) { /* ignore */ }
    },

    onDrag(e) {
        if (!this._dragging || !this._dragStart) return;
        const el = this.element;
        if (!el) return;
        const dx = e.clientX - this._dragStart.x;
        const dy = e.clientY - this._dragStart.y;
        let top = this._dragStart.top + dy;
        let left = this._dragStart.left + dx;
        ({ top, left } = this.getViewportClampedModalPosition(top, left));
        el.style.top = `${Math.round(top)}px`;
        el.style.left = `${Math.round(left)}px`;
    },

    endDrag() {
        if (!this._dragging) return;
        this._dragging = false;
        document.removeEventListener('mousemove', this._onMouseMove);
        // Persist position
        this.saveModalPosition();
        // Restore selection
        try { document.body.style.userSelect = this._prevUserSelect || ''; } catch (e) {}
    },

    /**
     * Simple debounce helper
     */
    debounce(callback, wait = 250) {
        let t = null;
        return (...args) => {
            if (t) clearTimeout(t);
            t = setTimeout(() => {
                callback.apply(this, args);
            }, wait);
        };
    }
};

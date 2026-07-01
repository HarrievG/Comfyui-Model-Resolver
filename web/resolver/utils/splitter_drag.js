/**
 * Helper to initiate a splitter drag interaction.
 * Handles mouse/pointer event listening, touch/cancellation, and RAF throttling.
 */
export function startSplitterDrag(event, {
    anchor = 'right',
    startWidth,
    bounds = { min: 100, max: 800 },
    onBeforeDrag = null,
    onDrag = () => {},
    onEnd = () => {}
}) {
    if (event?.button !== undefined && event.button !== 0) return null;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const startX = event.clientX;
    let pendingWidth = startWidth;
    let appliedWidth = startWidth;
    let animationFrame = null;
    let isDragging = true;

    const moveEvent = event?.type === 'pointerdown' ? 'pointermove' : 'mousemove';
    const upEvent = event?.type === 'pointerdown' ? 'pointerup' : 'mouseup';
    const cancelEvent = event?.type === 'pointerdown' ? 'pointercancel' : null;

    const handleMove = (e) => {
        if (!isDragging) return;
        e?.preventDefault?.();
        e?.stopPropagation?.();

        const dx = e.clientX - startX;
        let newWidth = anchor === 'right' ? startWidth - dx : startWidth + dx;

        if (onBeforeDrag) {
            newWidth = onBeforeDrag(newWidth);
        } else {
            if (newWidth < bounds.min) newWidth = bounds.min;
            if (newWidth > bounds.max) newWidth = bounds.max;
        }

        pendingWidth = Math.round(newWidth);

        if (pendingWidth === appliedWidth) return;

        if (!animationFrame) {
            animationFrame = requestAnimationFrame(() => {
                animationFrame = null;
                if (!isDragging) return;
                onDrag(pendingWidth);
                appliedWidth = pendingWidth;
            });
        }
    };

    const handleUp = (e) => {
        if (!isDragging) return;
        e?.preventDefault?.();
        e?.stopPropagation?.();

        isDragging = false;

        document.removeEventListener(moveEvent, handleMove, true);
        document.removeEventListener(upEvent, handleUp, true);
        if (cancelEvent) {
            document.removeEventListener(cancelEvent, handleUp, true);
        }

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        onEnd(pendingWidth || appliedWidth);
    };

    document.addEventListener(moveEvent, handleMove, true);
    document.addEventListener(upEvent, handleUp, { once: true, capture: true });
    if (cancelEvent) {
        document.addEventListener(cancelEvent, handleUp, { once: true, capture: true });
    }

    return {
        cancel: () => {
            isDragging = false;
            document.removeEventListener(moveEvent, handleMove, true);
            document.removeEventListener(upEvent, handleUp, true);
            if (cancelEvent) {
                document.removeEventListener(cancelEvent, handleUp, true);
            }
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
        }
    };
}

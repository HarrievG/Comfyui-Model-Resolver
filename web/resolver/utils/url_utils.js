/**
 * URL Utilities for Model Resolver
 */

/**
 * Parsuje adres URL pobierania i zwraca adres karty modelu (Model Card).
 * Obsługuje platformy HuggingFace oraz CivitAI.
 * @param {string} downloadUrl 
 * @returns {string|null} URL karty modelu lub null w przypadku niepowodzenia
 */
export function getModelCardUrl(downloadUrl) {
    if (!downloadUrl) return null;

    try {
        // HuggingFace URLs
        if (downloadUrl.includes('huggingface.co')) {
            const fileMatch = downloadUrl.match(/huggingface\.co\/([^\/]+\/[^\/]+)\/(?:resolve|blob)\/([^\/]+)\/(.+)$/);
            if (fileMatch) {
                const repo = fileMatch[1];
                const revision = fileMatch[2];
                const filePath = fileMatch[3].split(/[?#]/)[0];
                return `https://huggingface.co/${repo}/blob/${revision}/${filePath}`;
            }

            const match = downloadUrl.match(/huggingface\.co\/([^\/]+\/[^\/]+)/);
            if (match) {
                return `https://huggingface.co/${match[1]}`;
            }
        }

        // CivitAI URLs
        if (downloadUrl.includes('civitai.com')) {
            // Format: /api/download/models/123456 or /models/123456/...
            const modelIdMatch = downloadUrl.match(/models\/(\d+)/);
            if (modelIdMatch) {
                return `https://civitai.com/models/${modelIdMatch[1]}`;
            }
        }
    } catch (e) {
        console.error('Error parsing model card URL:', e);
    }

    return null;
}

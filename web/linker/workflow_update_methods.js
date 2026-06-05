import { app } from "../../../../scripts/app.js";
import { api } from "../../../../scripts/api.js";
import { $el } from "../../../../scripts/ui.js";
import { getSvgIcon } from "../utils/icon_utils.js";
export const workflowUpdateMethods = {
    /**
     * Extract model page URL from a download URL
     * HuggingFace file: https://huggingface.co/Owner/Repo/resolve/main/file.safetensors -> https://huggingface.co/Owner/Repo/blob/main/file.safetensors
     * CivitAI: https://civitai.com/api/download/models/123?type=Model -> https://civitai.com/models/123
     */
    getModelCardUrl(downloadUrl) {
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
    },

    /**
     * Update workflow in ComfyUI's UI/memory
     * Updates the current workflow in place instead of creating a new tab
     */
    async updateWorkflowInComfyUI(workflow) {
        if (!app || !app.graph) {
            console.warn('Model Linker: Could not update workflow - app or app.graph not available');
            return;
        }

        try {
            // Method 1: Try to directly update the current graph using configure
            // This is the most direct way to update in place
            if (app.graph && typeof app.graph.configure === 'function') {
                app.graph.configure(workflow);
                return;
            }

            // Method 2: Try deserialize to update the graph in place
            if (app.graph && typeof app.graph.deserialize === 'function') {
                app.graph.deserialize(workflow);
                return;
            }

            // Method 3: Use loadGraphData with explicit parameters to update current tab
            // The key is to NOT create a new workflow - pass null or undefined for the workflow parameter
            // clean=false means don't clear the graph first
            // restore_view=false means don't restore the viewport
            // workflow=null means update current workflow instead of creating new one
            if (app.loadGraphData) {
                // Try with null as 4th parameter first
                await app.loadGraphData(workflow, false, false, null);
                return;
            }

            console.warn('Model Linker: No method available to update workflow');
        } catch (error) {
            console.error('Model Linker: Error updating workflow in ComfyUI:', error);
            // Don't throw - allow the workflow update to continue even if UI update fails
            // The backend has already updated the workflow data
        }
    }
};

import axios from 'axios';
import { DocumentJob } from '../types';

const API_BASE_URL = "http://127.0.0.1:8000";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

export const documentService = {

    uploadDocument: async (file: File): Promise<DocumentJob> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    updateResult: async (docId: number, newData: any) => {
            const response = await apiClient.put(`/update-result/${docId}`, newData);
            return response.data;
    },

    getJobStatus: async (docId: number): Promise<DocumentJob> => {
        const response = await apiClient.get(`/status/${docId}`);
        return response.data;
    },

    getLiveProgress: async (docId: number) => {
        const response = await apiClient.get(`/stream-progress/${docId}`);
        return response.data;
    },

    retryJob: async (docId: number) => {
        const response = await apiClient.post(`/retry/${docId}`);
        return response.data;
    },


// This will allow the user to download the Json results directly
    exportToJson: (job: DocumentJob) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(job.result, null, 2))
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${job.filename}_result.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

// For exporting the document in the csv format.
    exportToCsv: (job: DocumentJob) => {
        const result = job.result;
        if(!result) return;
        const headers = ["Title", "Summary", "Extension", "Processed At"];
        const values = [
            `"${result.title}"`,
            `"${result.summary}"`,
            `"${result.metadata?.extension}"`,
            `"${result.metadata?.processed_at}`
        ];

        const csvContent = [headers.join(","), values.join(",")].join("\n");
        const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${job.filename}_result.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }    
};

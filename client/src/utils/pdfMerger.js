import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

/**
 * Normalizes URL with https protocol
 */
export const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
};

/**
 * Downloads a file as ArrayBuffer with CORS fallback to backend proxy
 */
export const fetchPdfBuffer = async (url, originalName = 'document.pdf', customAxios = axios) => {
    const targetUrl = getFullUrl(url);

    // Attempt 1: Direct fetch (fastest when Cloudinary CORS is open)
    try {
        const response = await fetch(targetUrl);
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            if (buffer && buffer.byteLength > 0) {
                return buffer;
            }
        }
    } catch (directErr) {
        console.warn('Direct PDF fetch failed, falling back to backend proxy:', directErr);
    }

    // Attempt 2: Backend proxy (/api/order/download-file)
    const proxyRes = await customAxios.get('/api/order/download-file', {
        params: { url: targetUrl, filename: originalName },
        responseType: 'arraybuffer'
    });

    if (proxyRes.data) {
        return proxyRes.data;
    }

    throw new Error(`Failed to retrieve file data for ${originalName}`);
};

/**
 * Sorts split files sequentially by part number
 */
export const sortSplitFiles = (files = []) => {
    return [...files].sort((a, b) => {
        const aPart = a.splitPart || (() => {
            const m = (a.originalName || '').match(/-split(\d+)\.pdf$/i);
            return m ? parseInt(m[1], 10) : 0;
        })();
        const bPart = b.splitPart || (() => {
            const m = (b.originalName || '').match(/-split(\d+)\.pdf$/i);
            return m ? parseInt(m[1], 10) : 0;
        })();

        if (aPart && bPart) return aPart - bPart;
        return (a.originalName || '').localeCompare(b.originalName || '');
    });
};

/**
 * Merges multiple PDF files into a single master PDF document.
 * 
 * @param {Array<{ url: string, originalName?: string, splitPart?: number, pageRange?: string }>} fileList
 * @param {Object} options
 * @param {Function} options.onProgress - Progress callback ({ stage, current, total, percent, message })
 * @param {Object} options.axiosInstance - Axios instance to use for authenticated requests
 * @returns {Promise<{ blob: Blob, blobUrl: string, totalPages: number, fileName: string }>}
 */
export const mergePdfFiles = async (fileList = [], options = {}) => {
    const { onProgress = () => {}, axiosInstance = axios, outputName = 'MERGED_DOCUMENT.pdf' } = options;

    if (!fileList || fileList.length === 0) {
        throw new Error('No files provided for merging.');
    }

    const sorted = sortSplitFiles(fileList);
    const totalFiles = sorted.length;

    onProgress({
        stage: 'init',
        current: 0,
        total: totalFiles,
        percent: 5,
        message: `Initializing merger for ${totalFiles} parts...`
    });

    const masterDoc = await PDFDocument.create();
    let totalPagesCount = 0;

    for (let i = 0; i < totalFiles; i++) {
        const fileItem = sorted[i];
        const partLabel = fileItem.splitPart ? `Part ${fileItem.splitPart}` : `File ${i + 1}`;
        const nameLabel = fileItem.originalName || `part_${i + 1}.pdf`;

        onProgress({
            stage: 'downloading',
            current: i + 1,
            total: totalFiles,
            percent: Math.round(10 + ((i / totalFiles) * 60)),
            message: `Fetching ${partLabel} of ${totalFiles} (${nameLabel})...`
        });

        const buffer = await fetchPdfBuffer(fileItem.url, nameLabel, axiosInstance);

        onProgress({
            stage: 'parsing',
            current: i + 1,
            total: totalFiles,
            percent: Math.round(10 + (((i + 0.5) / totalFiles) * 60)),
            message: `Extracting pages from ${partLabel}...`
        });

        const subDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageIndices = subDoc.getPageIndices();
        const copiedPages = await masterDoc.copyPages(subDoc, pageIndices);

        for (const page of copiedPages) {
            masterDoc.addPage(page);
            totalPagesCount++;
        }
    }

    onProgress({
        stage: 'saving',
        current: totalFiles,
        total: totalFiles,
        percent: 85,
        message: `Assembling and optimizing ${totalPagesCount} total pages...`
    });

    const mergedBytes = await masterDoc.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    onProgress({
        stage: 'complete',
        current: totalFiles,
        total: totalFiles,
        percent: 100,
        message: `Merged successfully (${totalPagesCount} pages)! Ready to print.`
    });

    return {
        blob,
        blobUrl,
        totalPages: totalPagesCount,
        fileName: outputName,
        sizeBytes: mergedBytes.length
    };
};

/**
 * Triggers browser download for a Blob
 */
export const downloadPdfBlob = (blob, fileName = 'merged_document.pdf') => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};

/**
 * Opens a PDF Blob in an iframe or print window ready for printing
 */
export const printPdfBlob = (blob, title = 'Print Express - Merged Order') => {
    const blobUrl = URL.createObjectURL(blob);
    
    // Create an invisible iframe to trigger the native browser print dialog seamlessly
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    iframe.onload = () => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            // Fallback: open in new tab if iframe printing blocked
            window.open(blobUrl, '_blank');
        }
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }, 60000);
    };

    document.body.appendChild(iframe);
};

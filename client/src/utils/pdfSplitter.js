import { PDFDocument } from 'pdf-lib';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const TARGET_SPLIT_SIZE_BYTES = 9.2 * 1024 * 1024; // Safe target under 10MB

export const isPdfFile = (file) => {
    return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
};

export const isOversized = (file) => {
    return (file?.size || 0) > MAX_FILE_SIZE_BYTES;
};

export const getBaseName = (fileName) => {
    return fileName ? fileName.replace(/\.[^.]+$/, '') : 'document';
};

/**
 * Splits a PDF file into parts strictly under 10 MB each.
 * @param {File} file 
 * @param {Function} onProgress ({ pct, status })
 * @returns {Promise<Array<{ file: File, name: string, originalParentName: string, partNumber: number, totalParts: number, pageCount: number, fromPage: number, toPage: number, pageRange: string, size: number, blobUrl: string, warn: boolean }>>}
 */
export const splitPdfFile = async (file, onProgress = () => {}) => {
    if (!isPdfFile(file)) {
        throw new Error('Only PDF documents can be split by pages.');
    }

    onProgress({ pct: 5, status: 'Reading PDF document...' });
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true, updateMetadata: false });
    const totalPages = srcDoc.getPageCount();

    if (totalPages <= 1) {
        throw new Error('This PDF has only 1 page and cannot be split into multiple page files. Please compress images or reduce file size.');
    }

    // Step 1: Measure size of individual pages to build balanced splits
    const pageSizes = [];
    for (let p = 0; p < totalPages; p++) {
        onProgress({
            pct: 5 + Math.round((p / totalPages) * 30),
            status: `Analyzing page ${p + 1} of ${totalPages}...`
        });
        const d = await PDFDocument.create();
        const [pg] = await d.copyPages(srcDoc, [p]);
        d.addPage(pg);
        const bytes = await d.save();
        pageSizes.push(bytes.length);
    }

    // Step 2: Form balanced page chunks based on target size
    const totalBytes = pageSizes.reduce((a, b) => a + b, 0);
    const targetCount = Math.max(2, Math.ceil(file.size / TARGET_SPLIT_SIZE_BYTES));
    const groups = Array.from({ length: targetCount }, () => []);
    let accumulated = 0;

    for (let p = 0; p < totalPages; p++) {
        const bucket = Math.min(
            targetCount - 1,
            Math.floor((accumulated + pageSizes[p] / 2) / (totalBytes / targetCount))
        );
        groups[bucket].push(p);
        accumulated += pageSizes[p];
    }

    const workQueue = groups.filter(g => g.length > 0);
    const splitParts = [];
    let completedPages = 0;

    // Step 3: Build PDF files for each chunk and ensure under 10MB
    while (workQueue.length > 0) {
        const pageIndices = workQueue.shift();
        const currentPartNum = splitParts.length + 1;
        onProgress({
            pct: 35 + Math.round((completedPages / totalPages) * 60),
            status: `Building split part ${currentPartNum} (pages ${pageIndices[0] + 1}–${pageIndices[pageIndices.length - 1] + 1})...`
        });

        const partDoc = await PDFDocument.create();
        const copied = await partDoc.copyPages(srcDoc, pageIndices);
        copied.forEach(page => partDoc.addPage(page));
        const partBytes = await partDoc.save({ useObjectStreams: true });

        // If part is still over 10 MB and has more than 1 page, bisect into 2 halves
        if (partBytes.length > MAX_FILE_SIZE_BYTES && pageIndices.length > 1) {
            const mid = Math.floor(pageIndices.length / 2);
            workQueue.unshift(pageIndices.slice(0, mid), pageIndices.slice(mid));
            continue;
        }

        const fromPage = pageIndices[0] + 1;
        const toPage = pageIndices[pageIndices.length - 1] + 1;
        const partBlob = new Blob([partBytes], { type: 'application/pdf' });

        splitParts.push({
            from: fromPage,
            to: toPage,
            pageCount: pageIndices.length,
            size: partBytes.length,
            blob: partBlob,
            warn: partBytes.length > MAX_FILE_SIZE_BYTES
        });
        completedPages += pageIndices.length;
    }

    const totalParts = splitParts.length;
    const baseName = getBaseName(file.name);

    const results = splitParts.map((part, index) => {
        const partNumber = index + 1;
        const partName = `${baseName}-split${partNumber}.pdf`;
        const partFile = new File([part.blob], partName, { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(part.blob);

        return {
            file: partFile,
            name: partName,
            originalParentName: file.name,
            partNumber,
            totalParts,
            pageCount: part.pageCount,
            fromPage: part.from,
            toPage: part.to,
            pageRange: `Pages ${part.from} - ${part.to}`,
            size: part.size,
            blobUrl,
            warn: part.warn
        };
    });

    onProgress({ pct: 100, status: `Complete! Generated ${results.length} split parts.` });
    return results;
};

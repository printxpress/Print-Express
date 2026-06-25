// Document detection utility functions
import { PDFDocument } from 'pdf-lib';

/**
 * Detects document type and properties
 * @param {File} file - The uploaded file
 * @returns {Promise<Object>} Document metadata
 */
export const detectDocument = async (file) => {
    const result = {
        name: file.name,
        size: file.size,
        type: null,
        subType: null,
        pageCount: 0,
        isValid: false,
        error: null,
        previewURL: null
    };

    try {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const mimeType = file.type.toLowerCase();

        // PDF Detection
        if (fileExtension === 'pdf' || mimeType === 'application/pdf') {
            result.type = 'PDF';
            result.isValid = true;

            // Count PDF pages
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            result.pageCount = pdfDoc.getPageCount();

            // Detect if it might be an ID card (typically 1-2 pages)
            if (result.pageCount <= 2) {
                result.subType = 'Possible ID Card';
            } else {
                result.subType = 'Document';
            }
        }
        // Image Detection
        else if (
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension) ||
            mimeType.startsWith('image/')
        ) {
            result.type = 'Image';
            result.pageCount = 1;
            result.isValid = true;
            result.previewURL = URL.createObjectURL(file);

            // Detect if it might be an ID card based on aspect ratio
            const img = await createImageBitmap(file);
            const aspectRatio = img.width / img.height;

            // ID cards typically have aspect ratio around 1.586 (credit card size)
            if (aspectRatio >= 1.4 && aspectRatio <= 1.8 && file.size < 5 * 1024 * 1024) {
                result.subType = 'Possible ID Card';
            } else {
                result.subType = 'Photo/Image';
            }
        }
        // Other Files (Rejected)
        else {
            result.type = 'Other';
            result.subType = fileExtension.toUpperCase();
            result.pageCount = 1; // Default to 1 for unknown types or ask user
            result.isValid = false;
            result.error = 'only upload pdf documents';
            // For other files, we might not know the page count accurately without specific parsers
        }
    } catch (error) {
        result.isValid = false;
        result.error = `Error processing file: ${error.message}`;
    }

    return result;
};

/**
 * Validates if file is an accepted type
 * @param {File} file - The file to validate
 * @returns {boolean}
 */
export const isAcceptedFileType = (file) => {
    const acceptedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    const acceptedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type.toLowerCase();

    return acceptedExtensions.includes(fileExtension) || acceptedMimeTypes.includes(mimeType);
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get icon for document type
 * @param {string} type - Document type
 * @param {string} subType - Document subtype
 * @returns {string} Emoji icon
 */
export const getDocumentIcon = (type, subType) => {
    if (subType === 'Possible ID Card') return '🪪';
    if (type === 'PDF') return '📄';
    if (type === 'Image') return '🖼️';
    return '📎';
};

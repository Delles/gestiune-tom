// Extend the Window interface to include showSaveFilePicker
interface Window {
    showSaveFilePicker?: (
        options?: SaveFilePickerOptions
    ) => Promise<FileSystemFileHandle>;
}

// Define the types for SaveFilePickerOptions and FileSystemFileHandle if needed
interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: {
        description: string;
        accept: Record<string, string[]>;
    }[];
}

interface FileSystemFileHandle {
    createWritable: () => Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
}

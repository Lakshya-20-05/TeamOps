import React, { useRef, useState } from 'react';
import { Paperclip, X, Download, File } from 'lucide-react';
import type { TaskAttachment } from '../db/schemas';
import { cn } from '../lib/utils';

interface FileAttachmentProps {
    attachments: TaskAttachment[];
    onAttach?: (attachment: TaskAttachment) => void;
    onRemove?: (attachmentId: string) => void;
    readOnly?: boolean;
    maxSizeMB?: number;
}

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

// Helper to download base64 file
const downloadBase64File = (attachment: TaskAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Helper to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};



export const FileAttachment: React.FC<FileAttachmentProps> = ({
    attachments,
    onAttach,
    onRemove,
    readOnly = false,
    maxSizeMB = 5
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || !onAttach) return;

        setError(null);
        const maxBytes = maxSizeMB * 1024 * 1024;

        for (const file of Array.from(files)) {
            if (file.size > maxBytes) {
                setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
                continue;
            }

            try {
                const base64Data = await fileToBase64(file);
                const attachment: TaskAttachment = {
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64Data,
                    createdAt: new Date().toISOString()
                };
                onAttach(attachment);
            } catch (err) {
                console.error('Error processing file:', err);
                setError(`Failed to process "${file.name}"`);
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    return (
        <div className="space-y-3">
            {/* File Input Zone */}
            {!readOnly && (
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                    />
                    <Paperclip className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Drop files here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Max {maxSizeMB}MB per file
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Attached Files List */}
            {attachments.length > 0 && (
                <div className="space-y-2">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                    <File className="h-5 w-5 text-violet-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-foreground">
                                        {attachment.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(attachment.size)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                                    onClick={() => downloadBase64File(attachment)}
                                    title="Download"
                                >
                                    <Download className="h-5 w-5" />
                                </button>
                                {!readOnly && onRemove && (
                                    <button
                                        className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                                        onClick={() => onRemove(attachment.id)}
                                        title="Remove"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [value]);

    return (
        <button
            onClick={handleCopy}
            className="copy-on-hover inline-flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-primary flex-shrink-0"
            title="Copy to clipboard"
        >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}
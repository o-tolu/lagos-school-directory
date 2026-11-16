import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('crm-dark-mode');
        if (saved !== null) return saved === 'true';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('crm-dark-mode', dark.toString());
    }, [dark]);

    return (
        <button
            onClick={() => setDark(d => !d)}
            className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
}
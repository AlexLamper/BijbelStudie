'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface DownloadButtonProps {
  selectedBook: string;
  selectedChapter: number;
  selectedVersion: string | null;
  t: (key: string) => string;
}

export default function DownloadButton({
  selectedBook,
  selectedChapter,
  selectedVersion,
  t
}: DownloadButtonProps) {
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [fileType, setFileType] = useState<'txt' | 'json'>('txt');

  const API_BASE_URL = '/api/bible';

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDownloadOptions && !target.closest('.download-dropdown')) {
        setShowDownloadOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadOptions]);

  // Download functionality
  const downloadContent = useCallback((content: string, filename: string, format: 'txt' | 'json' = 'txt') => {
    let mimeType = 'text/plain';
    if (format === 'json') mimeType = 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadChapter = useCallback(async () => {
    if (!selectedBook || !selectedChapter || !selectedVersion) return;
    try {
      const params = new URLSearchParams({ 
        book: selectedBook, 
        chapter: selectedChapter.toString() 
      });
      if (selectedVersion) {
        params.append('version', selectedVersion);
      }
      const response = await fetch(`${API_BASE_URL}/chapter?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let verses;
        if (Array.isArray(data)) {
          verses = data;
        } else if (data.verses && Array.isArray(data.verses)) {
          verses = data.verses;
        } else if (data.verses && typeof data.verses === 'object') {
          verses = Object.entries(data.verses).map(([verse, text]) => ({ verse: Number(verse), text }));
        } else {
          console.error('Unexpected API response format:', data);
          return;
        }
        let content = '';
        let filename = `${selectedBook}_${selectedChapter}_${selectedVersion || 'default'}`;
        if (fileType === 'txt') {
          content = verses.map((verse: { verse: number; text: string }) => `${verse.verse}: ${verse.text}`).join('\n');
          filename += '.txt';
        } else if (fileType === 'json') {
          content = JSON.stringify(verses, null, 2);
          filename += '.json';
        }
        downloadContent(content, filename, fileType);
      }
    } catch (error) {
      console.error('Error downloading chapter:', error);
    }
    setShowDownloadOptions(false);
  }, [selectedBook, selectedChapter, selectedVersion, downloadContent, fileType]);

  return (
    <div className="relative download-dropdown">
      <button 
        className="p-1 sm:p-2 bg-gray-100 hover:bg-gray-200 hover:ring-2 hover:ring-[#0D9488] transition shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] dark:bg-card dark:hover:bg-accent dark:hover:ring-[#0D9488] dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed" 
        title={t('print_download')}
        onClick={() => setShowDownloadOptions(!showDownloadOptions)}
      >
        <svg width="14" height="14" className="sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 17v4H7v-4M12 12v6m0 0l-3-3m3 3l3-3M21 15V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8" />
        </svg>
      </button>
      {showDownloadOptions && (
        <div className="absolute right-0 mt-2 w-48 max-w-xs bg-white dark:bg-card border border-gray-200 dark:border-border shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] z-10 rounded-md">
          <div className="p-2 space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <span className="text-xs font-medium text-gray-700 dark:text-muted-foreground whitespace-nowrap">{t('file_type') || 'File type'}:</span>
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input type="radio" name="fileType" value="txt" checked={fileType === 'txt'} onChange={() => setFileType('txt')} /> txt
              </label>
              <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                <input type="radio" name="fileType" value="json" checked={fileType === 'json'} onChange={() => setFileType('json')} /> json
              </label>
            </div>
            <button
              onClick={handleDownloadChapter}
              disabled={!selectedBook || !selectedChapter}
              className="w-full text-left px-2 py-1 text-xs sm:text-sm font-inter text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('download_chapter')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

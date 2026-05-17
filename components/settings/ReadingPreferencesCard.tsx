'use client';

import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useReadingPreferences } from '../../hooks/useReadingPreferences';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../app/i18n/client';

export function ReadingPreferencesCard() {
  const { preferences, updatePreferences } = useReadingPreferences();
  const { t } = useTranslation('preferences');

  const fontSizes = ['sm', 'base', 'lg', 'xl'];
  const fontFamilies = [
    { value: 'sans', label: t('sans') },
    { value: 'serif', label: t('serif') },
    { value: 'mono', label: t('mono') },
  ];
  const lineHeights = [
    { value: 'normal', label: t('compact') },
    { value: 'relaxed', label: t('normal') },
    { value: 'loose', label: t('loose') },
  ];
  const letterSpacings = [
    { value: 'tight', label: t('tight') },
    { value: 'normal', label: t('normal') },
    { value: 'wide', label: t('wide') },
  ];

  const handleFontSizeChange = (delta: number) => {
    const currentIndex = fontSizes.indexOf(preferences.fontSize);
    const newIndex = Math.max(0, Math.min(fontSizes.length - 1, currentIndex + delta));
    updatePreferences({ fontSize: fontSizes[newIndex] });
  };

  const handleReset = () => {
    if (window.confirm(t('reset_confirm'))) {
      updatePreferences({
        fontSize: 'base',
        fontFamily: 'sans',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
        highContrast: false,
        showVerseNumbers: true,
      });
    }
  };

  return (
    <Card className="border border-border shadow-none rounded-lg bg-white dark:bg-card">
      <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className=" text-xl font-bold text-gray-800 dark:text-white">
          {t('reading_preferences')}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleReset}
          title={t('reset_to_default')}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('reset_to_default')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('font_size')}</Label>
            <span className="text-xs font-medium text-muted-foreground">{preferences.fontSize}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-9"
              onClick={(e) => {
                e.preventDefault();
                handleFontSizeChange(-1);
              }}
              disabled={preferences.fontSize === fontSizes[0]}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center font-serif text-lg">Aa</div>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-9"
              onClick={(e) => {
                e.preventDefault();
                handleFontSizeChange(1);
              }}
              disabled={preferences.fontSize === fontSizes[fontSizes.length - 1]}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Font Family */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('font_family')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {fontFamilies.map((font) => (
              <Button
                key={font.value}
                variant={preferences.fontFamily === font.value ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-9",
                  font.value === 'serif' && "font-serif",
                  font.value === 'mono' && "font-mono"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  updatePreferences({ fontFamily: font.value });
                }}
              >
                {font.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Line Height */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('line_height')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {lineHeights.map((lh) => (
              <Button
                key={lh.value}
                variant={preferences.lineHeight === lh.value ? "secondary" : "outline"}
                size="sm"
                className="h-9"
                onClick={(e) => {
                  e.preventDefault();
                  updatePreferences({ lineHeight: lh.value });
                }}
              >
                {lh.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('letter_spacing')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {letterSpacings.map((ls) => (
              <Button
                key={ls.value}
                variant={preferences.letterSpacing === ls.value ? "secondary" : "outline"}
                size="sm"
                className="h-9"
                onClick={(e) => {
                  e.preventDefault();
                  updatePreferences({ letterSpacing: ls.value });
                }}
              >
                {ls.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="card-show-verse-numbers" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('verse_numbers')}</Label>
            <Switch
              id="card-show-verse-numbers"
              checked={preferences.showVerseNumbers}
              onCheckedChange={(checked) => updatePreferences({ showVerseNumbers: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="card-high-contrast" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('high_contrast')}</Label>
            <Switch
              id="card-high-contrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => updatePreferences({ highContrast: checked })}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}


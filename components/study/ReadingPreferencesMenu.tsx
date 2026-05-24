import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ReadingPreferences } from '../../hooks/useReadingPreferences';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../app/i18n/client';

interface ReadingPreferencesMenuProps {
  preferences: ReadingPreferences;
  onUpdate: (prefs: Partial<ReadingPreferences>) => void;
}

export function ReadingPreferencesMenu({ preferences, onUpdate }: ReadingPreferencesMenuProps) {
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
    onUpdate({ fontSize: fontSizes[newIndex] });
  };

  const handleReset = () => {
    if (window.confirm(t('reset_confirm'))) {
      onUpdate({
        fontSize: 'base',
        fontFamily: 'sans',
        lineHeight: 'relaxed',
        letterSpacing: 'normal',
        showVerseNumbers: true,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" title={t('reading_preferences')}>
          <span className="font-serif text-lg font-medium">Aa</span>
          <span className="sr-only">{t('reading_preferences')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="center">
        <DropdownMenuLabel className="flex items-center justify-between">
          {t('reading_preferences')}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleReset}
            title={t('reset_to_default')}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Font Size */}
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground">{t('font_size')}</Label>
            <span className="text-xs font-medium">{preferences.fontSize}</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8"
              onClick={(e) => {
                e.preventDefault();
                handleFontSizeChange(-1);
              }}
              disabled={preferences.fontSize === fontSizes[0]}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="flex-1 text-center font-serif text-lg">Aa</div>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8"
              onClick={(e) => {
                e.preventDefault();
                handleFontSizeChange(1);
              }}
              disabled={preferences.fontSize === fontSizes[fontSizes.length - 1]}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Font Family */}
        <div className="p-2">
          <Label className="text-xs text-muted-foreground mb-2 block">{t('font_family')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {fontFamilies.map((font) => (
              <Button
                key={font.value}
                variant={preferences.fontFamily === font.value ? "secondary" : "outline"}
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  font.value === 'serif' && "font-serif",
                  font.value === 'mono' && "font-mono"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  onUpdate({ fontFamily: font.value });
                }}
              >
                {font.label}
              </Button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Line Height */}
        <div className="p-2">
          <Label className="text-xs text-muted-foreground mb-2 block">{t('line_height')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {lineHeights.map((lh) => (
              <Button
                key={lh.value}
                variant={preferences.lineHeight === lh.value ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  onUpdate({ lineHeight: lh.value });
                }}
              >
                {lh.label}
              </Button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Letter Spacing */}
        <div className="p-2">
          <Label className="text-xs text-muted-foreground mb-2 block">{t('letter_spacing')}</Label>
          <div className="grid grid-cols-3 gap-2">
            {letterSpacings.map((ls) => (
              <Button
                key={ls.value}
                variant={preferences.letterSpacing === ls.value ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  onUpdate({ letterSpacing: ls.value });
                }}
              >
                {ls.label}
              </Button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Toggles */}
        <div className="p-2 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-verse-numbers" className="text-sm">{t('verse_numbers')}</Label>
            <Switch
              id="show-verse-numbers"
              checked={preferences.showVerseNumbers}
              onCheckedChange={(checked) => onUpdate({ showVerseNumbers: checked })}
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

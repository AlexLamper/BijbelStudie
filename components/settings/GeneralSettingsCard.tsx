'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useGeneralSettings } from '../../hooks/useGeneralSettings';
import { useTranslation } from '../../app/i18n/client';
import { Loader2 } from 'lucide-react';

interface BibleVersion {
  id: string;
  name: string;
}

export function GeneralSettingsCard() {
  const { settings, updateSettings, loading } = useGeneralSettings();
  const { t } = useTranslation('settings');
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch('/api/bible/versions');
        if (res.ok) {
          const data = await res.json();
          setVersions(data);
        }
      } catch (e) {
        console.error("Failed to fetch versions", e);
      } finally {
        setVersionsLoading(false);
      }
    };
    fetchVersions();
  }, []);

  const languages = [
    { code: "en", name: "English" },
    { code: "nl", name: "Nederlands" },
    { code: "de", name: "Deutsch" },
  ];

  if (loading || versionsLoading) {
      return (
        <Card className="border border-border shadow-none rounded-lg bg-white dark:bg-card">
            <CardContent className="p-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </CardContent>
        </Card>
      )
  }

  return (
    <Card className="border border-border shadow-none rounded-lg bg-white dark:bg-card">
      <CardHeader className="pb-4 border-b border-border">
        <CardTitle className=" text-xl font-bold text-gray-800 dark:text-white">
          {t('general_settings', { defaultValue: 'General Settings' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('language', { defaultValue: 'Language' })}
          </Label>
          <Select 
            value={settings.language} 
            onValueChange={(val) => updateSettings({ language: val })}
          >
            <SelectTrigger id="language" className="w-full bg-white dark:bg-secondary border-border">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Default Bible Version */}
        <div className="space-y-2">
          <Label htmlFor="translation" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('default_bible_version', { defaultValue: 'Default Bible Version' })}
          </Label>
          <Select 
            value={settings.translation} 
            onValueChange={(val) => updateSettings({ translation: val })}
          >
            <SelectTrigger id="translation" className="w-full bg-white dark:bg-secondary border-border">
              <SelectValue placeholder="Select Version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </CardContent>
    </Card>
  );
}


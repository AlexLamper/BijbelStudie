'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from '../i18n/client';
import PlanCard from '../../components/plans/PlanCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Plus, Search, X } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { LoadingSpinner } from '../../components/ui/loading-spinner';

interface Reading {
  day: number;
  book: string;
  chapter: number;
  verses?: string;
}

interface BiblePlan {
  _id: string;
  title: string;
  description: string;
  isPublic: boolean;
  duration: number;
  category: string;
  readings: Reading[];
  createdBy: {
    _id: string;
    name: string;
  };
  enrolledUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export default function PlansPage() {
  const { t } = useTranslation('plans');
  const { data: session } = useSession();

  const [publicPlans, setPublicPlans] = useState<BiblePlan[]>([]);
  const [myPlans, setMyPlans] = useState<BiblePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'public' | 'my'>('public');

  const sessionUserId = (session?.user as { id?: string })?.id;

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/bible-plans');
      const data = await response.json();

      if (data.plans) {
        const plans = data.plans;
        
        const publicPlans = plans.filter((plan: BiblePlan) => plan.isPublic);
        const myPlans = plans.filter((plan: BiblePlan) => 
          !plan.isPublic && plan.createdBy._id === sessionUserId
        );

        setPublicPlans(publicPlans);
        setMyPlans(myPlans);
      } else {
        console.error('Frontend: No plans property in response:', data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handlePlanCreated = () => {
    loadPlans();
    setIsCreateModalOpen(false);
  };

  const handlePlanDeleted = () => {
    loadPlans();
  };

  const filteredPlans = (plans: BiblePlan[]) => {
    return plans.filter(plan => {
      const matchesSearch = plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plan.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  };

  // Inline CreatePlanModal component
  const CreatePlanModal = ({ isOpen, onClose, onPlanCreated }: {
    isOpen: boolean;
    onClose: () => void;
    onPlanCreated: () => void;
  }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: 'evangelie',
      isPublic: false
    });
    const [readings, setReadings] = useState([{
      day: 1,
      book: 'Genesis',
      chapter: 1,
      verses: ''
    }]);

    const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin || false;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.title || !formData.description) {
        toast({
          title: 'Vul alle verplichte velden in',
          variant: 'destructive'
        });
        return;
      }

      setLoading(true);

      try {
        const response = await fetch('/api/bible-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            duration: readings.length,
            readings: readings,
            isPublic: isAdmin ? formData.isPublic : false
          })
        });

        if (response.ok) {
          onPlanCreated();
          handleClose();
          toast({
            title: 'Leesplan succesvol aangemaakt'
          });
        } else {
          const error = await response.json();
          toast({
            title: error.error || 'Fout bij het aanmaken van het plan',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Error creating plan:', error);
        toast({
          title: 'Fout bij het aanmaken van het plan',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    const handleClose = () => {
      setFormData({
        title: '',
        description: '',
        category: 'evangelie',
        isPublic: false
      });
      setReadings([{
        day: 1,
        book: 'Genesis',
        chapter: 1,
        verses: ''
      }]);
      onClose();
    };

    const addReading = () => {
      setReadings(prev => [...prev, {
        day: prev.length + 1,
        book: 'Genesis',
        chapter: 1,
        verses: ''
      }]);
    };

    const removeReading = (index: number) => {
      setReadings(prev => {
        const newReadings = prev.filter((_, i) => i !== index);
        // Renumber days
        return newReadings.map((reading, i) => ({
          ...reading,
          day: i + 1
        }));
      });
    };

    const updateReading = (index: number, field: string, value: string | number) => {
      setReadings(prev => prev.map((reading, i) => 
        i === index ? { ...reading, [field]: value } : reading
      ));
    };

    if (!isOpen) return null;

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-card border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Nieuw Leesplan</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-900 dark:text-gray-300">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Bijv. 30 Dagen Genesis"
                className="bg-gray-50 dark:bg-background border-gray-200 dark:border-gray-700 text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-900 dark:text-gray-300">Beschrijving *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Beschrijf wat dit leesplan uniek maakt..."
                className="bg-gray-50 dark:bg-background border-gray-200 dark:border-gray-700 text-foreground"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-gray-300">Categorie</Label>
              <Input 
                value={formData.category} 
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Bijv. evangelie, psalmen, etc."
                className="bg-gray-50 dark:bg-background border-gray-200 dark:border-gray-700 text-foreground"
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <Label htmlFor="public" className="text-sm text-gray-900 dark:text-gray-300">
                    Openbaar maken (alleen voor admins)
                  </Label>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold text-foreground">Lezingen</Label>
                <Button type="button" onClick={addReading} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  Voeg toe
                </Button>
              </div>

              <div className="space-y-3 max-h-40 overflow-y-auto">
                {readings.map((reading, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-foreground">Dag {index + 1}</span>
                      {readings.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeReading(index)}
                          className="text-gray-600 dark:text-gray-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-gray-900 dark:text-gray-300">Boek</Label>
                        <Input
                          value={reading.book}
                          onChange={(e) => updateReading(index, 'book', e.target.value)}
                          placeholder="Genesis"
                          className="bg-white dark:bg-card border-gray-200 dark:border-gray-600 text-foreground text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-900 dark:text-gray-300">Hoofdstuk</Label>
                        <Input
                          type="number"
                          min="1"
                          value={reading.chapter}
                          onChange={(e) => updateReading(index, 'chapter', parseInt(e.target.value) || 1)}
                          className="bg-white dark:bg-card border-gray-200 dark:border-gray-600 text-foreground text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-900 dark:text-gray-300">Verzen (optioneel)</Label>
                        <Input
                          value={reading.verses || ''}
                          onChange={(e) => updateReading(index, 'verses', e.target.value)}
                          placeholder="1-10"
                          className="bg-white dark:bg-card border-gray-200 dark:border-gray-600 text-foreground text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleClose} className="border-gray-200 dark:border-gray-700 text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 rounded-none">
                Annuleren
              </Button>
              <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
                {loading ? 'Bezig...' : 'Opslaan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  if (!session) {
    return (
      <div className="w-full h-full overflow-y-auto">
        <div className="px-6 xl:px-10 py-6">
          <div className="p-8 bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-lg text-muted-foreground">
              {t('loginRequired', 'Log in om leesplannen te bekijken')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {t('title', 'Bijbel Leesplannen')}
          </h1>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            {t('createPlan', 'Nieuw Plan')}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-secondary p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'public'
                ? 'bg-white dark:bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('publicPlans', 'Openbare Plannen')}
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'my'
                ? 'bg-white dark:bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('myPlans', 'Mijn Plannen')}
          </button>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('searchPlans', 'Zoek leesplannen...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white dark:bg-card border-gray-200 dark:border-gray-700 text-foreground"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'public' && filteredPlans(publicPlans).map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              onEnrollmentChange={handlePlanDeleted}
              t={t}
            />
          ))}
          {activeTab === 'my' && filteredPlans(myPlans).map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              onEnrollmentChange={handlePlanDeleted}
              t={t}
            />
          ))}
          {activeTab === 'public' && filteredPlans(publicPlans).length === 0 && (
            <div className="col-span-full text-center py-12 p-6 bg-white dark:bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">
                {t('noPublicPlans', 'Geen openbare leesplannen gevonden')}
              </p>
            </div>
          )}
          {activeTab === 'my' && filteredPlans(myPlans).length === 0 && (
            <div className="col-span-full text-center py-12 p-6 bg-white dark:bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">
                {t('noMyPlans', 'Je hebt nog geen persoonlijke leesplannen')}
              </p>
            </div>
          )}
        </div>
      )}

      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPlanCreated={handlePlanCreated}
      />
      </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Check, CheckCircle, Circle, ArrowLeft, Book, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { toast } from '../../../hooks/use-toast';

interface Reading {
  day: number;
  book: string;
  chapter: number;
  title?: string;
}

interface BiblePlan {
  _id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  readings: Reading[];
  createdBy: {
    _id: string;
    name: string;
  };
  isEnrolled?: boolean;
  completedDays?: number[];
  progressPercentage?: number;
}

interface PlanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PlanDetailPage({ params }: PlanDetailPageProps) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  const { data: session } = useSession();
  const router = useRouter();

  const [plan, setPlan] = useState<BiblePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingProgress, setUpdatingProgress] = useState<number | null>(null);

  const loadPlan = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bible-plans/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlan(data.plan);
      } else {
        toast({
          title: 'Plan niet gevonden',
          description: 'Het gevraagde leesplan kon niet worden geladen',
          variant: 'destructive',
        });
        router.push(`/plans`);
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het laden van het plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (session && id) {
      loadPlan();
    }
  }, [session, id, loadPlan]);

  const toggleDayCompletion = async (day: number) => {
    if (!plan || updatingProgress === day) return;

    setUpdatingProgress(day);
    try {
      const isCompleted = plan.completedDays?.includes(day);
      const method = isCompleted ? 'DELETE' : 'POST';
      const url = isCompleted 
        ? `/api/bible-plans/progress?planId=${plan._id}&day=${day}`
        : '/api/bible-plans/progress';

      const response = await fetch(url, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: method === 'POST' ? JSON.stringify({ planId: plan._id, day }) : undefined,
      });

      if (response.ok) {
        const data = await response.json();
        setPlan(prev => prev ? {
          ...prev,
          completedDays: isCompleted 
            ? prev.completedDays?.filter(d => d !== day) || []
            : [...(prev.completedDays || []), day].sort((a, b) => a - b),
          progressPercentage: data.progressPercentage
        } : null);
        
        toast({
          title: isCompleted ? 'Dag gemarkeerd als niet voltooid' : 'Dag voltooid!',
          description: `Dag ${day} is ${isCompleted ? 'niet meer' : 'nu'} voltooid`,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Fout',
          description: error.error || 'Er is een fout opgetreden',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: 'Fout',
        description: 'Er is een onverwachte fout opgetreden',
        variant: 'destructive',
      });
    } finally {
      setUpdatingProgress(null);
    }
  };

  const handleEnrollment = async () => {
    if (!plan) return;
    
    try {
      const response = await fetch('/api/bible-plans/enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: plan._id }),
      });

      if (response.ok) {
        toast({
          title: 'Succesvol ingeschreven!',
          description: `Je bent nu ingeschreven voor "${plan.title}"`,
        });
        loadPlan();
      } else {
        const error = await response.json();
        toast({
          title: 'Inschrijving mislukt',
          description: error.error || 'Er is een fout opgetreden',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        title: 'Inschrijving mislukt',
        description: 'Er is een onverwachte fout opgetreden',
        variant: 'destructive',
      });
    }
  };

  const openBibleReading = (reading: Reading) => {
    const queryParams = new URLSearchParams({
      book: reading.book,
      chapter: reading.chapter.toString(),
      plan: plan?._id || '',
      day: reading.day.toString()
    });
    
    router.push(`/read?${queryParams.toString()}`);
  };

  const getNextReading = () => {
    if (!plan || !plan.isEnrolled) return null;
    const completedDays = plan.completedDays || [];
    const nextDay = completedDays.length > 0 ? Math.max(...completedDays) + 1 : 1;
    return plan.readings.find(r => r.day === nextDay);
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">
            Log in om leesplannen te bekijken
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner fullHeight message="Plan laden..." />
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Plan niet gevonden</p>
        </div>
      </div>
    );
  }

  const completedCount = plan.completedDays?.length || 0;
  const progressPercentage = plan.duration > 0 ? Math.round((completedCount / plan.duration) * 100) : 0;
  const nextReading = getNextReading();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/plans`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar plannen
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{plan.title}</h1>
            <p className="text-muted-foreground mb-4">{plan.description}</p>
            <div className="flex gap-2 items-center">
              <Badge variant="secondary">{plan.category}</Badge>
              <span className="text-sm text-muted-foreground">
                {plan.duration} dagen • Gemaakt door {plan.createdBy?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {plan.isEnrolled && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              Je Voortgang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Voltooid</span>
                <span>{completedCount} van {plan.duration} dagen ({progressPercentage}%)</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {plan.isEnrolled && nextReading && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
              <Book className="w-5 h-5" />
              Volgende Lezing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dag {nextReading.day}</p>
                <p className="font-semibold">{nextReading.book} {nextReading.chapter}</p>
                {nextReading.title && <p className="text-sm text-muted-foreground">{nextReading.title}</p>}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => openBibleReading(nextReading)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Lees Nu
                </Button>
                <Button
                  onClick={() => toggleDayCompletion(nextReading.day)}
                  variant="outline"
                  size="sm"
                  disabled={updatingProgress === nextReading.day}
                >
                  {updatingProgress === nextReading.day ? 'Bezig...' : 'Voltooid'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Dagelijkse Lezingen</h2>
        <div className="grid gap-4">
          {plan.readings.map((reading) => {
            const isCompleted = plan.completedDays?.includes(reading.day);
            const isUpdating = updatingProgress === reading.day;
            const isNext = nextReading?.day === reading.day;
            
            return (
              <Card key={reading.day} className={`transition-all ${
                isCompleted ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 
                isNext ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Dag {reading.day}
                        </span>
                        {plan.isEnrolled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDayCompletion(reading.day)}
                            disabled={isUpdating}
                            className="h-6 w-6 p-0"
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={isCompleted ? 'default' : isNext ? 'secondary' : 'outline'}>
                        {isCompleted ? 'Voltooid' : isNext ? 'Volgende' : 'Niet voltooid'}
                      </Badge>
                    </div>
                  </div>
                  {reading.title && (
                    <CardTitle className="text-lg">{reading.title}</CardTitle>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Book className="w-4 h-4" />
                      <span>{reading.book} {reading.chapter}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBibleReading(reading)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Lees Online
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {!plan.isEnrolled && (
        <Card className="mt-8 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 dark:text-blue-100">Schrijf je in voor dit plan</h3>
              <p className="text-muted-foreground mb-4 dark:text-blue-200">
                Om je voortgang bij te houden en meldingen te ontvangen, schrijf je in voor dit leesplan.
              </p>
              <Button onClick={handleEnrollment} className="bg-brand hover:bg-brand/90 dark:bg-[#e0e0e0] dark:hover:bg-[#d0d0d0] text-white dark:text-black">
                Inschrijven
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
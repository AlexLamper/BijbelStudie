import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { toast } from '../../hooks/use-toast';

interface Reading {
  day: number;
  book: string;
  chapter: number;
  verses?: string;
  title?: string;
}

interface BiblePlan {
  _id: string;
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
  duration: number;
  readings: Reading[];
  createdBy: {
    _id: string;
    name: string;
  };
  isEnrolled?: boolean;
  completedDays?: number;
  progressPercentage?: number;
}

interface PlanCardProps {
  plan: BiblePlan;
  onEnrollmentChange?: () => void;
  t?: unknown;
}

export default function PlanCard({ plan, onEnrollmentChange }: PlanCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEnrollment = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
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
        onEnrollmentChange?.();
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnenrollment = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bible-plans/enrollment?planId=${plan._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Uitgeschreven',
          description: `Je bent uitgeschreven van "${plan.title}"`,
        });
        onEnrollmentChange?.();
      } else {
        const error = await response.json();
        toast({
          title: 'Uitschrijving mislukt',
          description: error.error || 'Er is een fout opgetreden',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error unenrolling:', error);
      toast({
        title: 'Uitschrijving mislukt',
        description: 'Er is een onverwachte fout opgetreden',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      // Fetch the plan details to get the current day's reading
      const response = await fetch(`/api/bible-plans/${plan._id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plan details');
      }
      
      const { plan: planDetails } = await response.json();
      
      // Find the next uncompleted day or first day if none completed
      const completedDays = planDetails.completedDays || [];
      let currentDay = 1;
      
      if (completedDays.length > 0) {
        // Find the next day after the latest completed day
        const maxCompletedDay = Math.max(...completedDays);
        currentDay = maxCompletedDay < planDetails.duration ? maxCompletedDay + 1 : maxCompletedDay;
      }
      
      // Find the reading for the current day
      const currentReading = planDetails.readings?.find((reading: Reading) => reading.day === currentDay);
      
      if (currentReading) {
        // Navigate to /read with the specific book and chapter
        const queryParams = new URLSearchParams({
          book: currentReading.book,
          chapter: currentReading.chapter.toString(),
          plan: plan._id,
          day: currentDay.toString()
        });
        
        router.push(`/read?${queryParams.toString()}`);
      } else {
        // Fallback to plan detail page
        router.push(`/plans/${plan._id}`);
      }
    } catch (error) {
      console.error('Error continuing plan:', error);
      // Fallback to plan detail page
      router.push(`/plans/${plan._id}`);
    }
  };

  const handleStartReading = async () => {
    try {
      // For non-enrolled users, start with day 1
      const firstReading = plan.readings?.[0];
      if (firstReading) {
        const queryParams = new URLSearchParams({
          book: firstReading.book,
          chapter: firstReading.chapter.toString(),
          plan: plan._id,
          day: firstReading.day.toString()
        });
        
        router.push(`/read?${queryParams.toString()}`);
      }
    } catch (error) {
      console.error('Error starting reading:', error);
    }
  };
  
  return (
    <div className="h-full bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow">
      <div className="p-5 border-b border-border">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">{plan.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          </div>
          <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 text-xs rounded-full">
            {plan.category}
          </span>
        </div>
      </div>
      
      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{plan.duration || plan.readings?.length || 0} dagen</span>
          <span>{plan.readings?.length || 0} lezingen</span>
        </div>
        
        {plan.isEnrolled && (
          <div className="bg-muted rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Voortgang</span>
              <span className="text-teal-600 font-semibold">{plan.progressPercentage || 0}%</span>
            </div>
            <div className="w-full bg-border h-1.5 mt-2 rounded-full">
              <div
                className="bg-teal-600 h-1.5 rounded-full transition-all"
                style={{ width: `${plan.progressPercentage || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {plan.completedDays || 0} van {plan.duration || plan.readings?.length || 0} dagen voltooid
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {!plan.isEnrolled && (
            <>
              <Button 
                onClick={handleEnrollment} 
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Bezig...' : 'Inschrijven'}
              </Button>
              <Button 
                onClick={handleStartReading}
                className="border border-border text-foreground hover:bg-accent rounded-lg"
                disabled={isLoading}
              >
                Preview
              </Button>
            </>
          )}
          {plan.isEnrolled && (
            <>
              <Button 
                onClick={handleContinue}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                disabled={isLoading}
              >
                Lees verder
              </Button>
              <Button 
                onClick={handleUnenrollment}
                className="bg-white dark:bg-background text-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626] rounded-none font-inter text-sm"
                disabled={isLoading}
              >
                {isLoading ? 'Bezig...' : 'Uitschrijven'}
              </Button>
            </>
          )}
        </div>

        <div className="text-xs font-inter text-gray-500 dark:text-gray-400 pt-2">
          Gemaakt door {plan.createdBy?.name || 'Onbekend'}
        </div>
        
        {plan.isPublic && (
          <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-background text-gray-700 dark:text-gray-300 text-xs font-inter rounded-none border border-gray-200 dark:border-gray-700">
            Openbaar
          </span>
        )}
      </div>
    </div>
  );
}


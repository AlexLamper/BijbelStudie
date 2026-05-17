// Dashboard component commented out - Study page is now the default
export function SummaryCard() {
  return null;
}

/*
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowRight } from "lucide-react";
import type React from "react";

interface SummaryCardProps {
  icon: React.ReactNode;
  value: string;
  description: string;
}

export function SummaryCardOld({ icon, value, description }: SummaryCardProps) {
  return (
  <Card className="p-6 bg-white shadow-sm rounded-lg">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">{icon}</div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{value}</div>
            <div className="text-sm text-gray-600">{description}</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4 flex justify-end">
        <Button variant="link" className="text-sm text-gray-600 p-0 h-auto">
          View details <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
*/


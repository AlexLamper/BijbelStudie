// Dashboard component commented out - Study page is now the default
export function HomeworkCompletionRatesCard() {
  return null;
}

/*
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { ArrowRight } from "lucide-react";
import type React from "react";

interface HomeworkCompletionRatesCardProps {
  BarChart: React.ComponentType;
}

export function HomeworkCompletionRatesCardOld({ BarChart }: HomeworkCompletionRatesCardProps) {
  return (
  <Card className="lg:col-span-2 p-6 bg-white shadow-sm rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800">Course Completion Rates</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 text-sm text-gray-600 bg-transparent">
              Monthly <ArrowRight className="ml-2 h-4 w-4 rotate-90" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Daily</DropdownMenuItem>
            <DropdownMenuItem>Weekly</DropdownMenuItem>
            <DropdownMenuItem>Yearly</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-0">
        <BarChart />
      </CardContent>
    </Card>
  );
}
*/


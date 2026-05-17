// Dashboard component commented out - Study page is now the default
export function AssignmentsCard() {
  return null;
}

/*
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle } from "lucide-react";
import type React from "react";

interface AssignmentItemProps {
  text: string;
  completed?: boolean;
  dueDate?: string;
}

function AssignmentItem({ text, completed, dueDate }: AssignmentItemProps) {
  return (
    <div className="flex items-center gap-2">
      {completed ? <CheckCircle className="h-5 w-5 text-gray-500" /> : <span className="h-5 w-5 rounded-full bg-gray-300 inline-block" />}
      <div className="flex flex-col">
        <span className={completed ? "text-gray-500 line-through" : "text-gray-800"}>{text}</span>
        {dueDate && <span className="text-xs text-gray-500">{dueDate}</span>}
      </div>
    </div>
  );
}

export function AssignmentsCard() {
  return (
  <Card className="p-6 bg-white shadow-sm rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-4 gap-2">
        <CardTitle className="text-lg font-semibold text-gray-800">Assignments</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View All</DropdownMenuItem>
            <DropdownMenuItem>Filter</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-3 text-sm">
          <AssignmentItem text="Renaissne Painting Assignment" completed />
          <AssignmentItem text="Math Test Preparation" completed />
          <AssignmentItem text="Poetry Analysis Essay" completed />
          <AssignmentItem text="Chemistry Quiz Table" dueDate="Aug 1 - Due tomorrow" />
          <AssignmentItem text="Impressionist Art" dueDate="Aug 2 - Due in 2 days" />
          <AssignmentItem text="Ancient Civilizations Essay" dueDate="Aug 10" />
        </div>
      </CardContent>
      <CardFooter className="p-0 pt-4 text-sm text-gray-600 flex items-center gap-1">
        <CheckCircle className="h-4 w-4 text-gray-500" />
        <span>3/6 Complete</span>
      </CardFooter>
    </Card>
  );
}
*/

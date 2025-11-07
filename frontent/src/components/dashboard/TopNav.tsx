import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, User } from "lucide-react";

interface TopNavProps {
  dateRange?: string;
  onDateRangeChange?: (range: string) => void;
}

export function TopNav({ dateRange = "90days", onDateRangeChange }: TopNavProps) {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground">Predictive Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Date Range Selector */}
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="7days">Last 7 days | Predict Next 7</SelectItem>
            <SelectItem value="30days">Last 30 days | Predict Next 30</SelectItem>
            <SelectItem value="90days">Last 90 days | Predict Next 30</SelectItem>
            <SelectItem value="60predict">Predict Next 60 Days</SelectItem>
          </SelectContent>
        </Select>

        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warning animate-pulse" />
        </Button>

        {/* Profile */}
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

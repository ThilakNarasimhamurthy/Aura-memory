import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, TrendingUp, Coffee, Calendar, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const insights = [
  {
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning/10",
    title: "Churn Alert",
    message: "12 customers likely to churn this week",
    priority: "high"
  },
  {
    icon: Calendar,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "Optimal Campaign Time",
    message: "Thursday 4–6 PM for email campaigns",
    priority: "medium"
  },
  {
    icon: Coffee,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Product Trend",
    message: "Cold Brew demand increasing by 15%",
    priority: "medium"
  },
  {
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
    title: "Revenue Surge",
    message: "Next weekend: +22% predicted revenue",
    priority: "high"
  },
  {
    icon: Brain,
    color: "text-accent",
    bg: "bg-accent/10",
    title: "AI Memory Insight",
    message: "Loyalty pattern detected in Students segment",
    priority: "low"
  }
];

export function PredictiveInsightsSidebar() {
  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          AI Insights
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time predictions</p>
      </div>

      <div className="p-4 space-y-3 flex-1">
        {insights.map((insight, index) => (
          <Card
            key={index}
            className={cn(
              "border-l-4 animate-fade-in",
              insight.priority === "high" && "border-l-warning",
              insight.priority === "medium" && "border-l-accent",
              insight.priority === "low" && "border-l-muted"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", insight.bg)}>
                  <insight.icon className={cn("h-4 w-4", insight.color)} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">{insight.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-muted-foreground">{insight.message}</p>
            </CardContent>
          </Card>
        ))}

        {/* Memory Metrics */}
        <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" />
              Memory Layer Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Recall Accuracy</span>
              <span className="text-accent font-semibold">94.2%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Active Patterns</span>
              <span className="text-foreground font-semibold">2,847</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Predictions Today</span>
              <span className="text-foreground font-semibold">156</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

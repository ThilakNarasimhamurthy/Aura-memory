import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Target, ArrowUp, ArrowDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const sparkData = [
  { value: 4000 }, { value: 3000 }, { value: 5000 }, { value: 4500 }, 
  { value: 6000 }, { value: 5500 }, { value: 7000 }
];

const kpis = [
  {
    title: "Predicted Revenue",
    subtitle: "Next 30 Days",
    value: "$247,500",
    trend: "+18.2%",
    isPositive: true,
    icon: DollarSign,
    gradient: "from-success/20 to-success/5",
    iconBg: "bg-success/10",
    iconColor: "text-success"
  },
  {
    title: "Customer Churn Risk",
    subtitle: "Probability",
    value: "12.4%",
    trend: "-3.1%",
    isPositive: true,
    icon: Users,
    gradient: "from-warning/20 to-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning"
  },
  {
    title: "Predicted LTV",
    subtitle: "Average per Customer",
    value: "$542",
    trend: "+22.5%",
    isPositive: true,
    icon: TrendingUp,
    gradient: "from-accent/20 to-accent/5",
    iconBg: "bg-accent/10",
    iconColor: "text-accent"
  },
  {
    title: "Campaign ROI",
    subtitle: "Projected",
    value: "184%",
    trend: "+12.8%",
    isPositive: true,
    icon: Target,
    gradient: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary"
  }
];

export function ExecutiveSummary() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card
          key={index}
          className={`bg-gradient-to-br ${kpi.gradient} border-border/50 hover:border-accent/30 transition-all animate-fade-in`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
                <div className={`flex items-center text-sm font-medium ${kpi.isPositive ? 'text-success' : 'text-destructive'}`}>
                  {kpi.isPositive ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                  {kpi.trend}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              
              {/* Sparkline */}
              <div className="h-12 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={`hsl(var(--${kpi.iconColor.replace('text-', '')}))`}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

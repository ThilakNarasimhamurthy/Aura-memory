import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";

const revenueData = [
  { date: "Week 1", actual: 18500, predicted: 19200 },
  { date: "Week 2", actual: 22000, predicted: 23100 },
  { date: "Week 3", actual: 19800, predicted: 20500 },
  { date: "Week 4", actual: 24200, predicted: 25800 },
  { date: "Next 1", actual: null, predicted: 26500 },
  { date: "Next 2", actual: null, predicted: 28200 },
  { date: "Next 3", actual: null, predicted: 27800 },
  { date: "Next 4", actual: null, predicted: 30100 }
];

const seasonalData = [
  { season: "Winter", performance: 85 },
  { season: "Spring", performance: 92 },
  { season: "Summer", performance: 78 },
  { season: "Autumn", performance: 88 }
];

const footfallData = [
  { time: "6 AM", Mon: 20, Tue: 22, Wed: 25, Thu: 28, Fri: 35, Sat: 45, Sun: 42 },
  { time: "9 AM", Mon: 65, Tue: 68, Wed: 70, Thu: 72, Fri: 75, Sat: 88, Sun: 85 },
  { time: "12 PM", Mon: 85, Tue: 88, Wed: 90, Thu: 92, Fri: 95, Sat: 100, Sun: 98 },
  { time: "3 PM", Mon: 70, Tue: 72, Wed: 75, Thu: 78, Fri: 85, Sat: 92, Sun: 88 },
  { time: "6 PM", Mon: 55, Tue: 58, Wed: 60, Thu: 65, Fri: 80, Sat: 75, Sun: 70 }
];

export function SalesForecast() {
  return (
    <div className="space-y-4">
      {/* Revenue Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Revenue Forecast (Next 30 Days)
          </CardTitle>
          <p className="text-sm text-muted-foreground">Predicted vs Actual Revenue Comparison</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                name="Actual Revenue"
                dot={{ fill: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Predicted Revenue"
                dot={{ fill: 'hsl(var(--accent))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Footfall Prediction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-accent" />
              Footfall Prediction by Day & Hour
            </CardTitle>
            <p className="text-xs text-muted-foreground">Brighter areas = higher predicted traffic</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={footfallData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '10px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '10px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="Fri" fill="hsl(180, 85%, 55%)" />
                <Bar dataKey="Sat" fill="hsl(160, 84%, 39%)" />
                <Bar dataKey="Sun" fill="hsl(25, 45%, 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Seasonal Demand */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seasonal Demand Predictor</CardTitle>
            <p className="text-xs text-muted-foreground">Performance forecast by season</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seasonalData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <YAxis type="category" dataKey="season" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="performance" fill="hsl(180, 85%, 55%)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

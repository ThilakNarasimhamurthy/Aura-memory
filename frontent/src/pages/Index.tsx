import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { PredictiveInsightsSidebar } from "@/components/dashboard/PredictiveInsightsSidebar";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { CustomerInsights } from "@/components/dashboard/CustomerInsights";
import { CampaignPredictor } from "@/components/dashboard/CampaignPredictor";
import { SalesForecast } from "@/components/dashboard/SalesForecast";
import { SocialBannerGenerator } from "@/components/dashboard/SocialBannerGenerator";

const Index = () => {
  const [dateRange, setDateRange] = useState("90days");

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav dateRange={dateRange} onDateRangeChange={setDateRange} />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Center Dashboard */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Executive Summary Cards */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Executive Summary</h2>
                <ExecutiveSummary />
              </section>

              {/* Predictive Customer Insights */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Predictive Customer Insights</h2>
                <CustomerInsights dateRange={dateRange} />
              </section>

              {/* Campaign Performance Predictor */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Campaign Performance Predictor</h2>
                <CampaignPredictor />
              </section>

              {/* AI Social Media Banner Generator */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-foreground">AI Social Media Banner Generator</h2>
                <SocialBannerGenerator dateRange={dateRange} />
              </section>

              {/* Sales & Footfall Forecast */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-foreground">Sales & Footfall Forecast</h2>
                <SalesForecast />
              </section>
            </div>
          </main>

          {/* Right Insights Sidebar */}
          <PredictiveInsightsSidebar />
        </div>
      </div>
    </div>
  );
};

export default Index;

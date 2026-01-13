import { memo } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCharts } from "@/components/DashboardCharts";

export const ChartsWidget = memo(() => {
  return (
    <>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        <DashboardCharts />
      </div>
    </>
  );
});

ChartsWidget.displayName = "ChartsWidget";

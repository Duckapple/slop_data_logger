import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { LineChart as LineChartIcon } from 'lucide-react';
import { useChartTheme } from '../../hooks/useChartTheme';

type Datum = { date: string; count: number };

export function IncidentsOverTimeChart({ data }: { data: Datum[] }) {
  const t = useChartTheme();
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Incidents over time
      </h3>
      {data.length === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title="Nothing to plot yet"
          description="Once incidents pile up, they'll show up here."
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="grad-time" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: t.tick }}
                stroke={t.axis}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: t.tick }}
                stroke={t.axis}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${t.tooltip.border}`,
                  background: t.tooltip.background,
                  color: t.tooltip.color,
                  fontSize: 12,
                }}
                labelStyle={{ color: t.tooltip.color }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#grad-time)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

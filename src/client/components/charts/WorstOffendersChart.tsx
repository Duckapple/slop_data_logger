import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { Users } from 'lucide-react';
import { useChartTheme } from '../../hooks/useChartTheme';

type Datum = { offenderName: string; count: number };

export function WorstOffendersChart({ data }: { data: Datum[] }) {
  const t = useChartTheme();
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Worst offenders
      </h3>
      {data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No offenders on record"
          description="Innocence presumed, for now."
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: t.tick }}
                stroke={t.axis}
              />
              <YAxis
                type="category"
                dataKey="offenderName"
                width={140}
                tick={{ fontSize: 12, fill: t.tick }}
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
                cursor={{ fill: t.grid }}
              />
              <Bar dataKey="count" fill={t.primary} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

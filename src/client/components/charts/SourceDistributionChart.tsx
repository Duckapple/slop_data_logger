import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useChartTheme } from '../../hooks/useChartTheme';

type Datum = { source: string; count: number };

const COLORS = ['#f43f5e', '#fb923c', '#facc15', '#10b981', '#0ea5e9', '#8b5cf6', '#64748b'];

export function SourceDistributionChart({ data }: { data: Datum[] }) {
  const t = useChartTheme();
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Where the crimes happen
      </h3>
      {data.length === 0 ? (
        <EmptyState
          icon={PieChartIcon}
          title="No source data yet"
          description="Add a source to incidents to see where the typos are coming from."
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="source"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
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
              <Legend
                wrapperStyle={{ fontSize: 12, color: t.tick }}
                iconType="circle"
                verticalAlign="bottom"
                height={28}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

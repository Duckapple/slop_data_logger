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

type Datum = { offenderName: string; count: number };

export function WorstOffendersChart({ data }: { data: Datum[] }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis
                type="category"
                dataKey="offenderName"
                width={140}
                tick={{ fontSize: 12, fill: '#334155' }}
                stroke="#cbd5e1"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="#0f172a"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

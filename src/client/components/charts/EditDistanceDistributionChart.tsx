import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Card } from '../Card';
import { EmptyState } from '../EmptyState';
import { Ruler } from 'lucide-react';

type Datum = { editDistance: number; count: number };

function colorFor(d: number): string {
  if (d <= 1) return '#10b981';
  if (d <= 3) return '#f59e0b';
  return '#f43f5e';
}

export function EditDistanceDistributionChart({ data }: { data: Datum[] }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Edit-distance distribution
      </h3>
      <p className="text-xs text-slate-500 mb-2">
        How wrong, character-for-character, is each crime?
      </p>
      {data.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No data yet"
          description="Once you log an incident the distribution will appear here."
        />
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="editDistance"
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
                formatter={(value) => [String(value), 'Incidents']}
                labelFormatter={(label) => `Edit distance ${label}`}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.editDistance} fill={colorFor(d.editDistance)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

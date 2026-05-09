import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Users,
  Type,
  Ruler,
  Award,
  UserMinus,
  Plus,
  FileWarning,
} from 'lucide-react';
import { Card } from '../components/Card';
import { KpiCard } from '../components/KpiCard';
import { EmptyState } from '../components/EmptyState';
import { IncidentsOverTimeChart } from '../components/charts/IncidentsOverTimeChart';
import { TopMisspellingsChart } from '../components/charts/TopMisspellingsChart';
import { WorstOffendersChart } from '../components/charts/WorstOffendersChart';
import { SourceDistributionChart } from '../components/charts/SourceDistributionChart';
import { EditDistanceDistributionChart } from '../components/charts/EditDistanceDistributionChart';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

export default function Dashboard() {
  useEffect(() => {
    document.title = 'Name Crimes Dashboard';
  }, []);

  const { data, error, loading } = useApi(() => api.stats(), []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Name Crimes Dashboard
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Track, analyze, and emotionally process every spelling offense.
          </p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition w-fit"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Log new incident
        </Link>
      </header>

      {error ? (
        <Card className="p-5">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Failed to load stats: {error.message}
          </p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard
          label="Total incidents"
          value={data?.totalIncidents ?? 0}
          icon={AlertCircle}
          loading={loading}
        />
        <KpiCard
          label="Unique offenders"
          value={data?.uniqueOffenders ?? 0}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          label="Unique misspellings"
          value={data?.uniqueMisspellings ?? 0}
          icon={Type}
          loading={loading}
        />
        <KpiCard
          label="Avg edit distance"
          value={data?.averageEditDistance ?? 0}
          icon={Ruler}
          loading={loading}
        />
        <KpiCard
          label="Most common"
          value={data?.mostCommonMisspelling?.value ?? '—'}
          hint={
            data?.mostCommonMisspelling
              ? `${data.mostCommonMisspelling.count} time${data.mostCommonMisspelling.count === 1 ? '' : 's'}`
              : undefined
          }
          icon={Award}
          loading={loading}
        />
        <KpiCard
          label="Worst offender"
          value={data?.worstOffender?.value ?? '—'}
          hint={
            data?.worstOffender
              ? `${data.worstOffender.count} time${data.worstOffender.count === 1 ? '' : 's'}`
              : undefined
          }
          icon={UserMinus}
          loading={loading}
        />
      </section>

      {!loading && (data?.totalIncidents ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={FileWarning}
            title="No name crimes logged yet"
            description="Either everyone is behaving, or you have not started collecting evidence."
            action={
              <Link
                to="/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition"
              >
                <Plus className="w-4 h-4" aria-hidden />
                Log the first incident
              </Link>
            }
          />
        </Card>
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <IncidentsOverTimeChart data={data?.overTime ?? []} />
          </div>
          <TopMisspellingsChart data={data?.byMisspelling ?? []} />
          <WorstOffendersChart data={data?.byOffender ?? []} />
          <SourceDistributionChart data={data?.bySource ?? []} />
          <EditDistanceDistributionChart data={data?.byEditDistance ?? []} />
        </section>
      )}
    </div>
  );
}

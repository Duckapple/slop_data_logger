import { Hono } from 'hono';
import type { Env } from '../env';
import { errorResponse } from '../errors';
import { firstZodError, statsFiltersSchema } from '../validation';
import type { StatsResponse } from '../../shared/types';
import { requireAuth, type AuthVariables } from '../auth/middleware';

const stats = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
stats.use('*', requireAuth);

stats.get('/', async (c) => {
  const parsed = statsFiltersSchema.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const { from, to } = parsed.data;
  const viewer = c.get('user');

  const where: string[] = [];
  const args: unknown[] = [];
  if (from) {
    where.push('occurred_at >= ?');
    args.push(from);
  }
  if (to) {
    where.push('occurred_at <= ?');
    args.push(to);
  }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const bind = (sql: string) => c.env.DB.prepare(sql).bind(...args);

  // Private-field stats (offender, source) are computed only across the
  // viewer's own incidents — the privacy model hides those fields from
  // other users, so they must not show up in aggregates either.
  const privateWhereParts = [...where, 'created_by_user_id = ?'];
  const privateWhereClause = `WHERE ${privateWhereParts.join(' AND ')}`;
  const privateArgs = [...args, viewer.id];
  const bindPrivate = (sql: string) =>
    c.env.DB.prepare(sql).bind(...privateArgs);

  const [
    totals,
    ownTotals,
    mostCommon,
    worstOffender,
    byMisspelling,
    byOffender,
    bySource,
    byEditDistance,
    overTime,
  ] = await Promise.all([
    bind(
      `SELECT
         COUNT(*)                             AS totalIncidents,
         COUNT(DISTINCT misspelled_name)      AS uniqueMisspellings,
         COALESCE(AVG(edit_distance), 0)      AS averageEditDistance
       FROM misspellings ${whereClause}`,
    ).first<{
      totalIncidents: number;
      uniqueMisspellings: number;
      averageEditDistance: number;
    }>(),
    bindPrivate(
      `SELECT COUNT(DISTINCT offender_name) AS uniqueOffenders
         FROM misspellings ${privateWhereClause}`,
    ).first<{ uniqueOffenders: number }>(),
    bind(
      `SELECT misspelled_name AS value, COUNT(*) AS count
         FROM misspellings ${whereClause}
         GROUP BY misspelled_name
         ORDER BY count DESC, misspelled_name ASC
         LIMIT 1`,
    ).first<{ value: string; count: number }>(),
    bindPrivate(
      `SELECT offender_name AS value, COUNT(*) AS count
         FROM misspellings ${privateWhereClause}
         GROUP BY offender_name
         ORDER BY count DESC, offender_name ASC
         LIMIT 1`,
    ).first<{ value: string; count: number }>(),
    bind(
      `SELECT misspelled_name AS misspelledName, COUNT(*) AS count
         FROM misspellings ${whereClause}
         GROUP BY misspelled_name
         ORDER BY count DESC, misspelled_name ASC
         LIMIT 10`,
    ).all<{ misspelledName: string; count: number }>(),
    bindPrivate(
      `SELECT offender_name AS offenderName, COUNT(*) AS count
         FROM misspellings ${privateWhereClause}
         GROUP BY offender_name
         ORDER BY count DESC, offender_name ASC
         LIMIT 10`,
    ).all<{ offenderName: string; count: number }>(),
    bindPrivate(
      `SELECT source, COUNT(*) AS count
         FROM misspellings ${privateWhereClause} AND source IS NOT NULL
         GROUP BY source
         ORDER BY count DESC, source ASC`,
    ).all<{ source: string; count: number }>(),
    bind(
      `SELECT edit_distance AS editDistance, COUNT(*) AS count
         FROM misspellings ${whereClause}
         GROUP BY edit_distance
         ORDER BY edit_distance ASC`,
    ).all<{ editDistance: number; count: number }>(),
    bind(
      `SELECT substr(occurred_at, 1, 10) AS date, COUNT(*) AS count
         FROM misspellings ${whereClause}
         GROUP BY date
         ORDER BY date ASC`,
    ).all<{ date: string; count: number }>(),
  ]);

  const response: StatsResponse = {
    totalIncidents: totals?.totalIncidents ?? 0,
    uniqueOffenders: ownTotals?.uniqueOffenders ?? 0,
    uniqueMisspellings: totals?.uniqueMisspellings ?? 0,
    averageEditDistance: Number(
      ((totals?.averageEditDistance ?? 0) as number).toFixed(2),
    ),
    mostCommonMisspelling: mostCommon ?? null,
    worstOffender: worstOffender ?? null,
    byMisspelling: byMisspelling.results,
    byOffender: byOffender.results,
    bySource: bySource.results,
    byEditDistance: byEditDistance.results,
    overTime: overTime.results,
  };

  return c.json(response);
});

export default stats;

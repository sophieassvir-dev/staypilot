import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('property_id')
  const year = searchParams.get('year') || new Date().getFullYear().toString()
  const month = searchParams.get('month')

  const whereProperty = propertyId ? `AND property_id = ${propertyId}` : ''
  const whereMonth = month
    ? `AND strftime('%Y-%m', checkin_date) = '${year}-${month.padStart(2, '0')}'`
    : `AND strftime('%Y', checkin_date) = '${year}'`

  const revenues = db.prepare(`
    SELECT
      strftime('%Y-%m', checkin_date) as month,
      SUM(total_revenue) as revenue,
      SUM(nights) as nights_booked,
      COUNT(*) as reservations
    FROM reservations
    WHERE status != 'cancelled' ${whereProperty} ${whereMonth}
    GROUP BY month
    ORDER BY month
  `).all()

  const totals = db.prepare(`
    SELECT
      SUM(total_revenue) as total_revenue,
      SUM(nights) as total_nights,
      COUNT(*) as total_reservations
    FROM reservations
    WHERE status != 'cancelled' ${whereProperty} ${whereMonth}
  `).get() as { total_revenue: number, total_nights: number, total_reservations: number }

  const daysInPeriod = month ? new Date(parseInt(year), parseInt(month), 0).getDate() : 365
  const occupancyRate = totals?.total_nights
    ? Math.round((totals.total_nights / daysInPeriod) * 100)
    : 0

  return NextResponse.json({ revenues, totals, occupancyRate })
}

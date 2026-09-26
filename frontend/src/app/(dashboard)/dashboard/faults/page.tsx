import type { Metadata } from 'next'
import { requireAuth } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { FaultReportForm } from '@/features/faults/components/FaultReportForm'
import { FaultReportsList } from '@/features/faults/components/FaultReportsList'

export const metadata: Metadata = { title: 'Fault reports' }

export default async function FaultReportsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fault reports"
        description="Lodge an issue and track its resolution status."
      />
      <FaultReportForm />
      <section className="space-y-3" aria-labelledby="fault-reports-heading">
        <h2 id="fault-reports-heading" className="text-lg font-semibold">
          Your reports
        </h2>
        <FaultReportsList />
      </section>
    </div>
  )
}

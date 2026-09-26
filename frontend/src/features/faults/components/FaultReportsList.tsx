'use client'

import { useMemo, useState } from 'react'
import { orderBy, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { resolveFaultReport } from '@/features/faults/actions/faults.actions'
import { useAuth } from '@/hooks/useAuth'
import { useCollection } from '@/hooks/useFirestore'
import { getFaultReportsCollection } from '@/lib/firebase/firestore'
import { formatDatetime } from '@/lib/utils'
import type { FaultCategory } from '@/types/firestore'

const categoryLabels: Record<FaultCategory, string> = {
  connection: 'Connection',
  speed: 'Speed',
  equipment: 'Equipment',
  billing: 'Billing',
}

function AuthenticatedFaultReportsList({ uid }: { uid: string }) {
  const collectionRef = useMemo(() => getFaultReportsCollection(), [])
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const {
    data: reports,
    loading,
    error,
  } = useCollection(
    collectionRef,
    where('uid', '==', uid),
    where('deletedAt', '==', null),
    orderBy('createdAt', 'desc')
  )

  const handleResolve = async (reportId: string) => {
    setResolvingId(reportId)
    const result = await resolveFaultReport(reportId)
    setResolvingId(null)

    if (result.success) {
      toast.success('Fault report resolved')
      return
    }

    toast.error(result.error ?? 'Failed to resolve fault report')
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">Failed to load fault reports.</p>
  if (reports.length === 0) {
    return (
      <EmptyState
        title="No fault reports yet"
        description="Reports you lodge will appear here automatically."
      />
    )
  }

  return (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li
          key={report.id}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{report.title}</h3>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {categoryLabels[report.category]}
                </span>
                <span
                  className={
                    report.status === 'open'
                      ? 'inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-200'
                  }
                >
                  {report.status === 'open' ? 'Open' : 'Resolved'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                {report.description}
              </p>
              <p className="text-xs text-zinc-500">{formatDatetime(report.createdAt.toDate())}</p>
            </div>

            {report.status === 'open' && (
              <button
                type="button"
                disabled={resolvingId !== null}
                onClick={() => handleResolve(report.id)}
                className="inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {resolvingId === report.id ? 'Resolving…' : 'Mark resolved'}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function FaultReportsList() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user) return <p className="text-sm text-red-600">Sign in to view fault reports.</p>

  return <AuthenticatedFaultReportsList uid={user.uid} />
}

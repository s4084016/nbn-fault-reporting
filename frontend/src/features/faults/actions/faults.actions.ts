'use server'

import { z } from 'zod'
import { Timestamp } from 'firebase-admin/firestore'
import { requireAuth } from '@/actions/auth.actions'
import { lodgeFaultReportSchema } from '@/features/faults/validation'
import { adminDb } from '@/lib/firebase/admin'
import type { ActionResult } from '@/types'

const resolveFaultReportSchema = z.string().trim().min(1, 'Report id is required')

class FaultActionError extends Error {}

export async function lodgeFaultReport(input: unknown): Promise<ActionResult<string>> {
  const session = await requireAuth()

  const parsed = lodgeFaultReportSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  try {
    const ref = await adminDb.collection('faultReports').add({
      uid: session.uid,
      title: parsed.data.title,
      category: parsed.data.category,
      description: parsed.data.description,
      status: 'open',
      createdAt: Timestamp.now(),
      deletedAt: null,
      _schemaVersion: 1,
    })

    return { success: true, data: ref.id }
  } catch {
    return { success: false, error: 'Failed to lodge fault report' }
  }
}

export async function resolveFaultReport(reportId: unknown): Promise<ActionResult> {
  const session = await requireAuth()

  const parsed = resolveFaultReportSchema.safeParse(reportId)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid report id' }
  }

  try {
    const reportRef = adminDb.collection('faultReports').doc(parsed.data)

    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reportRef)

      if (!snapshot.exists) {
        throw new FaultActionError('Fault report not found')
      }

      const report = snapshot.data()
      if (report?.uid !== session.uid) {
        throw new FaultActionError('You can only resolve your own fault reports')
      }

      if (report.status !== 'open') {
        throw new FaultActionError('Fault report is already resolved')
      }

      transaction.update(reportRef, { status: 'resolved' })
    })

    return { success: true }
  } catch (error) {
    if (error instanceof FaultActionError) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'Failed to resolve fault report' }
  }
}

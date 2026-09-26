import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const documentRef = { id: 'fault-123' }
  const transaction = {
    get: vi.fn(),
    update: vi.fn(),
  }

  return {
    add: vi.fn(),
    collection: vi.fn(),
    document: vi.fn(),
    documentRef,
    requireAuth: vi.fn(),
    runTransaction: vi.fn(),
    timestampNow: vi.fn(),
    transaction,
  }
})

vi.mock('@/actions/auth.actions', () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: mocks.collection,
    runTransaction: mocks.runTransaction,
  },
}))

vi.mock('firebase-admin/firestore', () => ({
  Timestamp: { now: mocks.timestampNow },
}))

import { lodgeFaultReport, resolveFaultReport } from '@/features/faults/actions/faults.actions'

const validInput = {
  title: 'Intermittent connection',
  category: 'connection',
  description: 'The connection drops every few minutes.',
}

describe('lodgeFaultReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireAuth.mockResolvedValue({ uid: 'owner-1' })
    mocks.timestampNow.mockReturnValue({ seconds: 1_700_000_000, nanoseconds: 0 })
    mocks.add.mockResolvedValue({ id: 'fault-123' })
    mocks.collection.mockReturnValue({ add: mocks.add, doc: mocks.document })
    mocks.document.mockReturnValue(mocks.documentRef)
    mocks.runTransaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => Promise<unknown>) =>
        callback(mocks.transaction)
    )
  })

  it('requires authentication before touching Firestore', async () => {
    const authError = new Error('NEXT_REDIRECT')
    mocks.requireAuth.mockRejectedValue(authError)

    await expect(lodgeFaultReport(validInput)).rejects.toBe(authError)
    expect(mocks.collection).not.toHaveBeenCalled()
  })

  it.each([
    ['title below the minimum', { ...validInput, title: 'ab' }],
    ['title above the maximum', { ...validInput, title: 'a'.repeat(81) }],
    ['description below the minimum', { ...validInput, description: 'a'.repeat(9) }],
    ['description above the maximum', { ...validInput, description: 'a'.repeat(501) }],
    ['an unsupported category', { ...validInput, category: 'other' }],
  ])('rejects %s', async (_caseName, input) => {
    const result = await lodgeFaultReport(input)

    expect(mocks.requireAuth).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ success: false })
    expect(mocks.add).not.toHaveBeenCalled()
  })

  it.each([
    ['minimum title length', { ...validInput, title: 'abc' }],
    ['maximum title length', { ...validInput, title: 'a'.repeat(80) }],
    ['minimum description length', { ...validInput, description: 'a'.repeat(10) }],
    ['maximum description length', { ...validInput, description: 'a'.repeat(500) }],
  ])('accepts the %s', async (_caseName, input) => {
    const result = await lodgeFaultReport(input)

    expect(result).toEqual({ success: true, data: 'fault-123' })
  })

  it.each(['connection', 'speed', 'equipment', 'billing'])(
    'accepts the %s category',
    async (category) => {
      const result = await lodgeFaultReport({ ...validInput, category })

      expect(result).toEqual({ success: true, data: 'fault-123' })
    }
  )

  it('derives protected fields on the server and ignores client-supplied values', async () => {
    const createdAt = { seconds: 1_700_000_000, nanoseconds: 0 }
    mocks.timestampNow.mockReturnValue(createdAt)

    const result = await lodgeFaultReport({
      ...validInput,
      uid: 'attacker-controlled',
      status: 'resolved',
      createdAt: 'attacker-controlled',
      deletedAt: 'attacker-controlled',
      _schemaVersion: 999,
    })

    expect(result).toEqual({ success: true, data: 'fault-123' })
    expect(mocks.requireAuth.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.collection.mock.invocationCallOrder[0]!
    )
    expect(mocks.collection).toHaveBeenCalledWith('faultReports')
    expect(mocks.add).toHaveBeenCalledWith({
      uid: 'owner-1',
      title: validInput.title,
      category: validInput.category,
      description: validInput.description,
      status: 'open',
      createdAt,
      deletedAt: null,
      _schemaVersion: 1,
    })
  })
})

describe('resolveFaultReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.requireAuth.mockResolvedValue({ uid: 'owner-1' })
    mocks.collection.mockReturnValue({ add: mocks.add, doc: mocks.document })
    mocks.document.mockReturnValue(mocks.documentRef)
    mocks.runTransaction.mockImplementation(
      async (callback: (transaction: typeof mocks.transaction) => Promise<unknown>) =>
        callback(mocks.transaction)
    )
  })

  it('requires authentication before touching Firestore', async () => {
    const authError = new Error('NEXT_REDIRECT')
    mocks.requireAuth.mockRejectedValue(authError)

    await expect(resolveFaultReport('fault-123')).rejects.toBe(authError)
    expect(mocks.collection).not.toHaveBeenCalled()
  })

  it('rejects an invalid report id without touching Firestore', async () => {
    const result = await resolveFaultReport('')

    expect(mocks.requireAuth).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ success: false })
    expect(mocks.collection).not.toHaveBeenCalled()
  })

  it('rejects a missing report without updating it', async () => {
    mocks.transaction.get.mockResolvedValue({ exists: false })

    const result = await resolveFaultReport('fault-123')

    expect(result).toMatchObject({ success: false })
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })

  it('rejects a report owned by another user without updating it', async () => {
    mocks.transaction.get.mockResolvedValue({
      exists: true,
      data: () => ({ uid: 'owner-2', status: 'open' }),
    })

    const result = await resolveFaultReport('fault-123')

    expect(result).toMatchObject({ success: false })
    expect(mocks.transaction.update).not.toHaveBeenCalled()
  })

  it('allows the owner to resolve an open report', async () => {
    mocks.transaction.get.mockResolvedValue({
      exists: true,
      data: () => ({ uid: 'owner-1', status: 'open' }),
    })

    const result = await resolveFaultReport('fault-123')

    expect(result).toEqual({ success: true })
    expect(mocks.collection).toHaveBeenCalledWith('faultReports')
    expect(mocks.document).toHaveBeenCalledWith('fault-123')
    expect(mocks.transaction.update).toHaveBeenCalledWith(mocks.documentRef, {
      status: 'resolved',
    })
  })
})

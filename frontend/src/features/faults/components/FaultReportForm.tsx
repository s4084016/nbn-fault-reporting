'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { lodgeFaultReport } from '@/features/faults/actions/faults.actions'
import { FAULT_CATEGORIES, lodgeFaultReportSchema } from '@/features/faults/validation'

type FaultReportFormInput = z.infer<typeof lodgeFaultReportSchema>

const categoryLabels: Record<(typeof FAULT_CATEGORIES)[number], string> = {
  connection: 'Connection',
  speed: 'Speed',
  equipment: 'Equipment',
  billing: 'Billing',
}

export function FaultReportForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FaultReportFormInput>({
    resolver: zodResolver(lodgeFaultReportSchema),
    defaultValues: { category: 'connection' },
  })

  const onSubmit = async (data: FaultReportFormInput) => {
    const result = await lodgeFaultReport(data)
    if (result.success) {
      toast.success('Fault report lodged')
      reset()
      return
    }

    toast.error(result.error ?? 'Failed to lodge fault report')
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="space-y-1.5">
        <label htmlFor="fault-title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="fault-title"
          type="text"
          maxLength={80}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'fault-title-error' : undefined}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Briefly describe the fault"
          {...register('title')}
        />
        {errors.title && (
          <p id="fault-title-error" className="text-xs text-red-600" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fault-category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="fault-category"
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? 'fault-category-error' : undefined}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-950"
          {...register('category')}
        >
          {FAULT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </select>
        {errors.category && (
          <p id="fault-category-error" className="text-xs text-red-600" role="alert">
            {errors.category.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fault-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="fault-description"
          rows={4}
          maxLength={500}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'fault-description-error' : undefined}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-500 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="Include when the problem started and what you have observed"
          {...register('description')}
        />
        {errors.description && (
          <p id="fault-description-error" className="text-xs text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isSubmitting ? 'Lodging…' : 'Lodge report'}
      </button>
    </form>
  )
}

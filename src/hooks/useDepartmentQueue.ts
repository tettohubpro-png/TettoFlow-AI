import { useMemo } from 'react'
import { useOperations } from '@/hooks/useOperations'
import type { Department, Operation } from '@/types/database'
import { classifyDepartment, DEPARTMENT_ORDER } from '@/utils/departments'

export function useDepartmentQueue() {
  const { operations, loading, updateStatus, assignResponsible } = useOperations()

  const activeOps = useMemo(
    () => operations.filter((op) => op.status !== 'DONE' && !op.archived_at),
    [operations],
  )

  const byDepartment = useMemo(() => {
    const map = Object.fromEntries(
      DEPARTMENT_ORDER.map((d) => [d, [] as Operation[]]),
    ) as Record<Department, Operation[]>

    for (const op of activeOps) {
      const dept = classifyDepartment(op.title)
      map[dept].push(op)
    }

    return map
  }, [activeOps])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        DEPARTMENT_ORDER.map((d) => [d, byDepartment[d].length]),
      ) as Record<Department, number>,
    [byDepartment],
  )

  return { byDepartment, counts, loading, updateStatus, assignResponsible }
}

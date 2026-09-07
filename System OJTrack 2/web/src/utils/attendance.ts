const ATTENDANCE_TIME_ZONE = 'Asia/Manila'

/**
 * Mirrors functions/src/attendance.ts's isLate — kept in sync there. Needed
 * client-side too because correcting a pending log's time (App.tsx's
 * correctAttendanceLogTime) has to recompute `late` itself; the Cloud
 * Function only runs on log creation, not on a later correction.
 */
export function isLate(actual: Date, expectedTimeIn: string | undefined, thresholdMinutes: number): boolean {
  if (!expectedTimeIn) return false
  const match = /^(\d{1,2}):(\d{2})$/.exec(expectedTimeIn)
  if (!match) return false
  const expectedMinutes = Number(match[1]) * 60 + Number(match[2])

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ATTENDANCE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(actual)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const actualMinutes = hour * 60 + minute

  return actualMinutes > expectedMinutes + thresholdMinutes
}

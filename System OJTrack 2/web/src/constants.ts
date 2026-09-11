export const TERM_OPTIONS = ['1st Semester', '2nd Semester', 'Summer'] as const

/**
 * "2024-2025" style school-year labels for a dropdown, spanning a couple of
 * years back through a few years ahead of today. Always includes `current`
 * even if it falls outside that range, so editing a class created with an
 * older/unusual school year never silently swaps it to whatever option
 * happens to be first.
 */
export function schoolYearOptions(current?: string): string[] {
  const startYear = new Date().getFullYear()
  const options: string[] = []
  for (let offset = -2; offset <= 3; offset++) {
    options.push(`${startYear + offset}-${startYear + offset + 1}`)
  }
  if (current && !options.includes(current)) {
    options.unshift(current)
  }
  return options
}

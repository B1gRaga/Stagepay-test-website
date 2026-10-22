import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PUBLIC_PAGES } from './helpers'

// axe-core accessibility checks (WCAG 2.1 A and AA) on every public page.
// Serious and critical problems fail the test; the rest are listed. Motion is
// reduced so axe checks the finished page, not text mid-fade.
test.use({ reducedMotion: 'reduce' })

for (const { path } of PUBLIC_PAGES) {
  test(`${path} has no serious accessibility problems`, async ({ page }, info) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const describe = (v: (typeof results.violations)[number]) =>
      `${v.impact}: ${v.id} — ${v.help} (${v.nodes.length}×: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')})`
    const minor = results.violations.filter(v => v.impact === 'minor' || v.impact === 'moderate')
    if (minor.length) info.annotations.push({ type: 'accessibility', description: minor.map(describe).join('\n') })

    const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    expect(blocking.map(describe), blocking.map(describe).join('\n')).toEqual([])
  })
}

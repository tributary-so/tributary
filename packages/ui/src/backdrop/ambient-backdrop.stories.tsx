import type { Meta, StoryObj } from '@storybook/react-vite'

import { AmbientBackdrop } from '../backdrop/ambient-backdrop'

const meta = {
  title: 'Design/AmbientBackdrop',
  component: AmbientBackdrop,
  parameters: {
    layout: 'fullscreen',
    // Self-driving animation: keep storybook's a11y/interaction runners calm.
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof AmbientBackdrop>

export default meta
type Story = StoryObj<typeof meta>

const HeroContent = () => (
  <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 p-12 text-center">
    <h1 className="text-4xl font-bold text-foreground">Recurring payments on Solana</h1>
    <p className="max-w-xl text-sm text-muted-foreground">
      Hero copy sits above the ambient canvas — grid, drifting key squares and a
      whisper of brand glow stay decently in the background.
    </p>
  </div>
)

/** Self-driving (wall-clock) — how a landing hero consumes it. */
export const Light: Story = {
  args: { seed: 'tributary' },
  render: (args) => (
    <div className="relative min-h-screen bg-background">
      <AmbientBackdrop {...args} />
      <HeroContent />
    </div>
  ),
}

/** Deterministic frame — same pixels every render (video/test usage). */
export const StaticFrame: Story = {
  ...Light,
  args: { seed: 'tributary', frame: 140 },
}

/** Tokens flip on <html> via the themes addon — same alphas, dark palette. */
export const Dark: Story = {
  ...Light,
  parameters: { ...meta.parameters, themes: { themeOverride: 'dark' } },
}

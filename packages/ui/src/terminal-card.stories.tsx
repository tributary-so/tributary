import type { Meta, StoryObj } from '@storybook/react-vite'
import TerminalCard from './terminal-card'

const meta = {
  title: 'Primitives/TerminalCard',
  component: TerminalCard,
} satisfies Meta<typeof TerminalCard>

export default meta
type Story = StoryObj<typeof meta>

const code = `import { Tributary, getPaymentFrequency } from "@tributary-so/sdk";

const ixs = await sdk.createSubscription(
  tokenMint,
  recipient,
  gateway,
  new BN("1000000"),
  true,  // auto-renew
  12,    // max renewals
  getPaymentFrequency("monthly"),
);`

export const Default: Story = {
  args: { filename: 'subscription.ts', code, language: 'typescript', tag: 'SDK' },
}

export const WithCaption: Story = {
  args: {
    filename: 'terminal',
    code: '$ tributary-manager policy list --gateway 9xQeW…',
    tag: 'CLI',
    caption: 'One delegate approval; money moves on schedule.',
    captionAttribution: 'Tributary docs',
  },
}

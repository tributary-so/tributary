import type { Meta, StoryObj } from '@storybook/react-vite'
import { Footer } from './footer'

const meta = {
  title: 'Layout/Footer',
  component: Footer,
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Minimal: Story = {
  args: {
    linkGroups: [{ title: 'Resources', links: [{ label: 'Documentation', href: 'https://docs.tributary.so' }] }],
    copyright: '© 2026 Example.',
  },
}

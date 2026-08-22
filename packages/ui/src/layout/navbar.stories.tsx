import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import { Navbar } from './navbar'

const meta: Meta<typeof Navbar> = {
  title: 'Layout/Navbar',
  component: Navbar,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Product: Story = {
  args: {
    items: [
      { label: 'Docs', href: 'https://docs.tributary.so', external: true },
      { label: 'Referral', href: '/referral' },
      { label: 'Gateways', href: '/gateways' },
    ],
  },
}

export const Marketing: Story = {
  args: {
    items: [
      { label: 'How It Works', href: 'how-it-works' },
      { label: 'Protocol', href: 'primitive' },
      { label: 'FAQ', href: 'faq' },
    ],
  },
}

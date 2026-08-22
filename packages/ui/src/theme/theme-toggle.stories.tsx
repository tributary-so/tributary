import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThemeToggle } from './theme-toggle'

const meta = {
  title: 'Primitives/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

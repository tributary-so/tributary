import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClusterProvider } from './cluster-data-access'
import { ClusterUiSelect, ExplorerLink } from './cluster-ui'

const meta: Meta<typeof ClusterUiSelect> = {
  title: 'Solana/Cluster',
  component: ClusterUiSelect,
  decorators: [
    (Story) => (
      <ClusterProvider>
        <Story />
      </ClusterProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Select: Story = {}

export const Explorer: Story = {
  render: () => (
    <p className="p-4 font-mono text-sm">
      <ExplorerLink path="address/9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin" label="view on explorer" />
    </p>
  ),
}

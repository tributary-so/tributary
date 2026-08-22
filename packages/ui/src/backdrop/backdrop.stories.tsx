import type { Meta, StoryObj } from '@storybook/react-vite'
import { Backdrop } from '../backdrop/backdrop'

const meta = {
  title: 'Design/Backdrop',
  component: Backdrop,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Backdrop>

export default meta
type Story = StoryObj<typeof meta>

export const Grid: Story = {
  args: { variant: 'grid', intensity: 'normal' },
  render: (args) => (
    <div className="relative min-h-screen bg-background">
      <Backdrop {...args} />
      <div className="p-12 font-mono text-sm text-foreground">hero content sits above the backdrop</div>
    </div>
  ),
}

export const Mesh: Story = { ...Grid, args: { variant: 'mesh', intensity: 'normal' } }
export const Scanlines: Story = { ...Grid, args: { variant: 'scanlines', intensity: 'normal' } }
export const GridBold: Story = { ...Grid, args: { variant: 'grid', intensity: 'bold' } }
export const MeshSubtle: Story = { ...Grid, args: { variant: 'mesh', intensity: 'subtle' } }

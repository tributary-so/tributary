import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaymentDetails } from './payment-details'
import type { TributaryJWTPayload } from '@tributary-so/payments'

const meta = {
  title: 'Tributary/PaymentDetails',
  component: PaymentDetails,
} satisfies Meta<typeof PaymentDetails>

export default meta
type Story = StoryObj<typeof meta>

const payload: TributaryJWTPayload = {
  policyId: '3',
  recipient: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  gateway: 'Gate1Gh5Y7kPMwLSrUAwKdzuUGuLZd4UqoMKGvyLgRzG',
  policies: [
    {
      type: 'subscription',
      amount: '1000000',
      paymentFrequency: 2629800,
      nextPaymentDue: 1767225600,
      autoRenew: true,
      maxRenewals: 12,
    },
    {
      type: 'payAsYouGo',
      maxChunkAmount: '250000',
      maxAmountPerPeriod: '1000000',
      periodLengthSeconds: 604800,
      claimedThisPeriod: '250000',
      periodStart: 1766620800,
    },
    {
      type: 'oneTime',
      amount: '500000',
      dueDate: 1767225600,
      executed: false,
    },
  ],
} as unknown as TributaryJWTPayload

export const Loaded: Story = {
  args: { payload, loading: false, error: null },
}

export const Loading: Story = {
  args: { payload: null as unknown as TributaryJWTPayload, loading: true, error: null },
}

export const ErrorState: Story = {
  args: { payload: null as unknown as TributaryJWTPayload, loading: false, error: 'Session expired — request a new payment link.' },
}

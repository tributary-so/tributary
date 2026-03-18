import { Link } from 'react-router'
import { ExternalLink, Play, BookOpen, Code, Heart, Github, PlusCircle, Droplets } from 'lucide-react'

const actions = [
  {
    icon: Play,
    title: 'Quickstart',
    description: 'Set up your first recurring payment',
    link: '/quickstart',
    internal: true,
  },
  {
    icon: BookOpen,
    title: 'Read Documentation',
    description: 'Learn how to integrate recurring payments in your app',
    link: 'https://docs.tributary.so',
    internal: false,
  },
  {
    icon: Code,
    title: 'Try the SDK',
    description: 'Get started with our TypeScript SDK',
    link: 'https://github.com/tributary-so/tributary/tree/main/sdk',
    internal: false,
  },
  {
    icon: Heart,
    title: 'Contribute',
    description: 'Support the project and get rewarded',
    link: 'https://contribute.so',
    internal: false,
  },
  {
    icon: Github,
    title: 'GitHub Repository',
    description: 'Explore the code, report issues, contribute',
    link: 'https://github.com/tributary-so/tributary',
    internal: false,
  },
  {
    icon: PlusCircle,
    title: 'Add Token',
    description: 'Apply to enable your token on Tributary.so',
    link: 'https://forms.gle/gskQ4wD7ctu6fxX3A',
    internal: false,
  },
]

const stats = [
  { label: 'Network', value: 'Solana' },
  { label: 'Type', value: 'Recurring Payments' },
  { label: 'UX', value: 'set & forget' },
]

function ActionCard({ action }: { action: (typeof actions)[number] }) {
  const IconComponent = action.icon

  const content = (
    <div className="border border-border/50 hover:border-primary/30 transition-all group h-full">
      <div className="p-5 space-y-3">
        <IconComponent className="h-6 w-6 text-primary" />
        <h3 className="font-bold text-foreground">{action.title}</h3>
        <p className="text-sm text-muted-foreground">{action.description}</p>
        <div className="flex items-center gap-2 text-sm text-primary group-hover:gap-3 transition-all">
          Get Started
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
    </div>
  )

  if (action.internal) {
    return <Link to={action.link}>{content}</Link>
  }

  return (
    <a href={action.link} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  )
}

export default function DashboardFeature() {
  return (
    <section className="py-12">
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-4 text-left">
          <h1 className="text-3xl font-bold leading-snug tracking-tighter md:text-4xl">
            Accept and manage recurring payments in minutes
          </h1>
          <p className="text-xl text-muted-foreground">
            Web2 subscription UX with Web3 transparency using token delegation
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/quickstart"
              className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 h-11 px-6"
            >
              <Play className="h-4 w-4" />
              Get Started
            </Link>
            <a
              href="https://docs.tributary.so"
              target="_blank"
              rel="noopener noreferrer"
              className="border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 h-11 px-6"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </a>
          </div>
        </div>
        <div className="flex flex-col justify-center space-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <div className="font-mono text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {stat.label === 'Network' && <img src="/solana-logomark.svg" className="h-5 w-5 text-primary" />}
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="font-mono text-sm text-muted-foreground/30 select-none py-8" aria-hidden="true">
        //
      </div>

      <div className="mb-8 max-w-2xl space-y-3">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <p className="text-muted-foreground">Get started with Tributary in minutes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <ActionCard key={action.title} action={action} />
        ))}
      </div>

      <div className="font-mono text-sm text-muted-foreground/30 select-none py-8" aria-hidden="true">
        //
      </div>

      <div className=" border border-border bg-muted/20 p-12 text-center">
        <h2 className="mb-4 text-2xl font-bold">Ready to Accept Recurring Payments?</h2>
        <p className="mb-8 text-muted-foreground">Connect your wallet and create your first payment policy</p>
        <Link
          to="/quickstart"
          className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 h-11 px-6"
        >
          <Play className="h-4 w-4" />
          Start Now
        </Link>
      </div>
    </section>
  )
}

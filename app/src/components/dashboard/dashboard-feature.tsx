import { Button } from '@heroui/button'
import { ExternalLink, Play, BookOpen, Code, Heart, Github, PlusCircle } from 'lucide-react'

const actions = [
  {
    icon: Play,
    title: 'Quickstart',
    description: 'Set up your first recurring payment',
    link: 'https://app.tributary.so/#/quickstart',
    color: 'bg-primary',
  },
  {
    icon: BookOpen,
    title: 'Read Documentation',
    description: 'Learn how to integrate recurring payments in your app',
    link: 'https://docs.tributary.so',
    color: 'bg-primary',
  },
  {
    icon: Code,
    title: 'Try the SDK',
    description: 'Get started with our TypeScript SDK',
    link: 'https://github.com/tributary-so/tributary/tree/main/sdk',
    color: 'bg-primary',
  },
  {
    icon: Heart,
    title: 'Contribute',
    description: 'Support the project and get rewarded',
    link: 'https://contribute.so',
    color: 'bg-primary',
  },
  {
    icon: Github,
    title: 'GitHub Repository',
    description: 'Explore the code, report issues, contribute',
    link: 'https://github.com/tributary-so/tributary',
    color: 'bg-primary',
  },
  {
    icon: PlusCircle,
    title: 'Add Token',
    description: 'Apply to enable your token on Tributary.so',
    link: 'https://forms.gle/gskQ4wD7ctu6fxX3A',
    color: 'bg-primary',
  },
]

export default function DashboardFeature() {
  return (
    // <div className="flex flex-col items-center justify-center w-full px-4 py-8 space-y-8">
    <div className="flex w-full flex-col items-center justify-center">
      {/* Hero Text */}
      <div className="text-center max-w-md mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Accept and manage recurring payments</h1>
        <p className="text-xl text-gray-600">in minutes</p>
      </div>

      {/* Actionable Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        {actions.map((action, index) => {
          const IconComponent = action.icon
          return (
            <div
              key={index}
              className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer h-full flex flex-col"
              onClick={() => window.open(action.link, '_blank')}
            >
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-full ${action.color} text-white`}>
                    <IconComponent size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-4">{action.title}</h3>
                </div>
                <p className="text-gray-600">{action.description}</p>
              </div>
              <Button
                color="primary"
                variant="flat"
                endContent={<ExternalLink size={16} />}
                className="w-full mt-4"
                onPress={() => window.open(action.link, '_blank')}
              >
                Get Started
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

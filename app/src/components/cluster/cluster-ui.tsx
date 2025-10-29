import { useConnection } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'

import { useCluster } from './cluster-data-access'
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Alert } from '@heroui/react'

export function ExplorerLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const { getExplorerUrl } = useCluster()
  return (
    <a
      href={getExplorerUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? className : `link font-mono`}
    >
      {label}
    </a>
  )
}

export function ClusterChecker({ children }: { children: React.ReactNode }) {
  const { cluster } = useCluster()
  const { connection } = useConnection()

  const query = useQuery({
    queryKey: ['version', { cluster, endpoint: connection.rpcEndpoint }],
    queryFn: () => connection.getVersion(),
    retry: 1,
  })
  if (query.isLoading) {
    return null
  }
  if (query.isError || !query.data) {
    return (
      <Alert
        title="Connection Error"
        description={
          <>
            Error connecting to cluster <span className="font-bold">{cluster.name}</span>.
            <Button variant="flat" onClick={() => query.refetch()} className="ml-2">
              Refresh
            </Button>
          </>
        }
        color="danger"
      />
    )
  }
  return children
}

export function ClusterUiSelect() {
  const { clusters, setCluster, cluster } = useCluster()

  const buttonClass =
    'flex items-center justify-center gap-2 px-3 py-1.5 border border-[var(--color-primary)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-all duration-200 cursor-pointer uppercase text-sm'
  return (
    <Dropdown>
      <DropdownTrigger>
        <button className={`${buttonClass}`}>{cluster.name}</button>
      </DropdownTrigger>
      <DropdownMenu>
        {clusters.map((item) => (
          <DropdownItem key={item.name} onClick={() => setCluster(item)}>
            {item.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}

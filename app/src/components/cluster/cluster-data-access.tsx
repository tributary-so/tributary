import { clusterApiUrl, Connection } from '@solana/web3.js'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import React, { createContext, useContext } from 'react'

export interface SolanaCluster {
  name: string
  endpoint: string
  network?: ClusterNetwork
  active?: boolean
}

export enum ClusterNetwork {
  Mainnet = 'mainnet-beta',
  Testnet = 'testnet',
  Devnet = 'devnet',
  Custom = 'custom',
}

const getDefaultEndpoint = (): string => {
  return import.meta.env.VITE_SOLANA_API || clusterApiUrl('devnet')
}

const getDefaultNetwork = (): ClusterNetwork => {
  const customEndpoint = import.meta.env.VITE_SOLANA_API
  if (!customEndpoint) return ClusterNetwork.Devnet

  if (customEndpoint.includes('mainnet')) return ClusterNetwork.Mainnet
  if (customEndpoint.includes('testnet')) return ClusterNetwork.Testnet
  if (customEndpoint.includes('devnet')) return ClusterNetwork.Devnet
  return ClusterNetwork.Custom
}

export const defaultClusters: SolanaCluster[] = [
  {
    name: import.meta.env.VITE_SOLANA_API ? 'custom' : 'devnet',
    endpoint: getDefaultEndpoint(),
    network: getDefaultNetwork(),
  },
  { name: 'local', endpoint: 'http://localhost:8899' },
  {
    name: 'testnet',
    endpoint: clusterApiUrl('testnet'),
    network: ClusterNetwork.Testnet,
  },
]

const clusterAtom = atomWithStorage<SolanaCluster>('solana-cluster', defaultClusters[0])
const clustersAtom = atomWithStorage<SolanaCluster[]>('solana-clusters', defaultClusters)

const activeClustersAtom = atom<SolanaCluster[]>((get) => {
  const clusters = get(clustersAtom)
  const cluster = get(clusterAtom)
  return clusters.map((item) => ({
    ...item,
    active: item.name === cluster.name,
  }))
})

const activeClusterAtom = atom<SolanaCluster>((get) => {
  const clusters = get(activeClustersAtom)

  return clusters.find((item) => item.active) || clusters[0]
})

export interface ClusterProviderContext {
  cluster: SolanaCluster
  clusters: SolanaCluster[]
  addCluster: (cluster: SolanaCluster) => void
  deleteCluster: (cluster: SolanaCluster) => void
  setCluster: (cluster: SolanaCluster) => void

  getExplorerUrl(path: string): string
}

const Context = createContext<ClusterProviderContext>({} as ClusterProviderContext)

export function ClusterProvider({ children }: { children: React.ReactNode }) {
  const cluster = useAtomValue(activeClusterAtom)
  const clusters = useAtomValue(activeClustersAtom)
  const setCluster = useSetAtom(clusterAtom)
  const setClusters = useSetAtom(clustersAtom)

  const value: ClusterProviderContext = {
    cluster,
    clusters: clusters.sort((a, b) => (a.name > b.name ? 1 : -1)),
    addCluster: (cluster: SolanaCluster) => {
      try {
        new Connection(cluster.endpoint)
        setClusters([...clusters, cluster])
      } catch (err) {
        console.error(`${err}`)
      }
    },
    deleteCluster: (cluster: SolanaCluster) => {
      setClusters(clusters.filter((item) => item.name !== cluster.name))
    },
    setCluster: (cluster: SolanaCluster) => setCluster(cluster),
    getExplorerUrl: (path: string) => `https://explorer.solana.com/${path}${getClusterUrlParam(cluster)}`,
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useCluster() {
  return useContext(Context)
}

function getClusterUrlParam(cluster: SolanaCluster): string {
  let suffix = ''
  switch (cluster.network) {
    case ClusterNetwork.Devnet:
      suffix = 'devnet'
      break
    case ClusterNetwork.Mainnet:
      suffix = ''
      break
    case ClusterNetwork.Testnet:
      suffix = 'testnet'
      break
    default:
      suffix = `custom&customUrl=${encodeURIComponent(cluster.endpoint)}`
      break
  }

  return suffix.length ? `?cluster=${suffix}` : ''
}

/**
 * Cache navigateur du dernier snapshot RPC OK — reprise instantanée au chargement
 * (IndexedDB, pas de serveur).
 */
import type { RpcSnapWire } from './rpcSnapshotWire'
import { isRpcSnapWire } from './rpcSnapshotWire'

const DB_NAME = 'rayls-dash-rpc-v1'
const STORE = 'rpcSnap'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

type Row = { key: string; wire: RpcSnapWire; savedAt: number }

export async function idbReadRpcSnap(rpcUrl: string): Promise<RpcSnapWire | null> {
  if (typeof indexedDB === 'undefined') return null
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const st = tx.objectStore(STORE)
      const g = st.get(rpcUrl)
      g.onerror = () => reject(g.error ?? new Error('idb get'))
      g.onsuccess = () => {
        const row = g.result as Row | undefined
        db.close()
        if (!row?.wire || !isRpcSnapWire(row.wire)) {
          resolve(null)
          return
        }
        resolve(row.wire)
      }
    })
  } catch {
    return null
  }
}

export async function idbWriteRpcSnap(rpcUrl: string, wire: RpcSnapWire): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  if (wire.status !== 'ok') return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const st = tx.objectStore(STORE)
      const row: Row = { key: rpcUrl, wire, savedAt: Date.now() }
      const p = st.put(row)
      p.onerror = () => reject(p.error ?? new Error('idb put'))
      p.onsuccess = () => {
        db.close()
        resolve()
      }
    })
  } catch {
    /* ignore quota / private mode */
  }
}

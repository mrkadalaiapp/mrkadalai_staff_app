import React, { useState, useEffect } from 'react'
import { apiRequest } from '../utils/api'
import { useOutletDetails } from '../utils/outletUtils'
import { toast } from 'react-hot-toast'

const CATEGORY_COLORS = {
  Ingredient: 'bg-green-100 text-green-700',
  Packaging: 'bg-blue-100 text-blue-700',
  ServingItem: 'bg-purple-100 text-purple-700',
  Consumable: 'bg-orange-100 text-orange-700',
  Cleaning: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-700',
}

const STATUS_CONFIG = {
  HEALTHY:      { label: 'Healthy',       dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200' },
  LOW_STOCK:    { label: 'Low Stock',     dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  OUT_OF_STOCK: { label: 'Out of Stock',  dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200' },
}

const CATEGORIES = ['All', 'Ingredient', 'Packaging', 'ServingItem', 'Consumable', 'Cleaning', 'Other']
const SOURCES = ['All', 'EXPENDITURE_ENTRY', 'MANUAL_ADD', 'APP_SALE', 'POS_SALE', 'MANUAL_DEDUCTION', 'CANCELLATION_REVERSAL']

const today = () => new Date().toISOString().split('T')[0]
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }

export default function Inventory() {
  const { outletId } = useOutletDetails()
  const [tab, setTab] = useState('stock') // stock | history
  const [stocks, setStocks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [histLoading, setHistLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState(weekAgo())
  const [dateTo, setDateTo] = useState(today())
  const [srcFilter, setSrcFilter] = useState('All')
  const [histItem, setHistItem] = useState('')

  // Stock adjustment modal
  const [adjModal, setAdjModal] = useState(false)
  const [adjMode, setAdjMode] = useState('add')
  const [adjItem, setAdjItem] = useState(null)
  const [adjQty, setAdjQty] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjLoading, setAdjLoading] = useState(false)

  useEffect(() => { if (outletId) fetchStocks() }, [outletId])

  const fetchStocks = async () => {
    setLoading(true)
    try {
      const res = await apiRequest(`/staff/outlets/get-stocks/${outletId}`)
      setStocks(res.stocks || [])
    } catch (e) { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }

  const fetchHistory = async () => {
    setHistLoading(true)
    try {
      const payload = {
        outletId,
        startDate: dateFrom,
        endDate: dateTo,
        ...(srcFilter !== 'All' ? { source: srcFilter } : {}),
        ...(histItem ? { inventoryItemId: parseInt(histItem) } : {}),
      }
      const res = await apiRequest('/staff/outlets/get-stock-history', { method: 'POST', body: payload })
      setHistory(res.history || [])
    } catch (e) { toast.error('Failed to load history') }
    finally { setHistLoading(false) }
  }

  const openAdj = (item, mode) => {
    setAdjItem(item); setAdjMode(mode); setAdjQty(''); setAdjReason(''); setAdjModal(true)
  }

  const submitAdj = async () => {
    if (!adjQty || parseFloat(adjQty) <= 0) return toast.error('Enter a valid quantity')
    if (adjMode === 'deduct' && !adjReason) return toast.error('Reason is required for deduction')
    setAdjLoading(true)
    try {
      const endpoint = adjMode === 'add' ? '/staff/outlets/add-stock/' : '/staff/outlets/deduct-stock/'
      await apiRequest(endpoint, {
        method: 'POST',
        body: {
          inventoryItemId: adjItem.id,
          outletId,
          addedQuantity: adjMode === 'add' ? parseFloat(adjQty) : undefined,
          quantity: adjMode === 'deduct' ? parseFloat(adjQty) : undefined,
          remarks: adjReason,
          reason: adjReason,
        },
      })
      toast.success(`Stock ${adjMode === 'add' ? 'added' : 'deducted'}`)
      setAdjModal(false)
      fetchStocks()
    } catch (e) { toast.error(e.message || 'Failed') }
    finally { setAdjLoading(false) }
  }

  const filtered = stocks.filter(s => {
    const matchCat = catFilter === 'All' || s.category === catFilter
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const counts = { HEALTHY: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 }
  stocks.forEach(s => { if (counts[s.stockStatus] !== undefined) counts[s.stockStatus]++ })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Raw materials &amp; stock tracking</p>
        </div>
        <button onClick={fetchStocks} className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">↻ Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Healthy',      count: counts.HEALTHY,      color: 'bg-green-50  border-green-200',  text: 'text-green-700'  },
          { label: 'Low Stock',    count: counts.LOW_STOCK,    color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
          { label: 'Out of Stock', count: counts.OUT_OF_STOCK, color: 'bg-red-50    border-red-200',    text: 'text-red-700'    },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.color}`}>
            <p className={`text-2xl font-bold ${c.text}`}>{c.count}</p>
            <p className="text-sm text-gray-600 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {[['stock', 'Current Stock'], ['history', 'Stock History']].map(([key, label]) => (
            <button key={key}
              onClick={() => { setTab(key); if (key === 'history') fetchHistory() }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Current Stock ──────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading inventory...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No items found</p>
              <p className="text-sm mt-1">Ask the admin to add inventory items first</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Item', 'Category', 'Stock', 'Threshold', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item => {
                    const sc = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.HEALTHY
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'}`}>{item.category}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {item.currentStock} <span className="text-gray-400 font-normal text-xs">{item.stockUnit}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{item.reorderThreshold} {item.stockUnit}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium border ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openAdj(item, 'add')} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">+ Add</button>
                            <button onClick={() => openAdj(item, 'deduct')} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">- Deduct</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Stock History ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select value={srcFilter} onChange={e => setSrcFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {SOURCES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sources' : s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Item</label>
              <select value={histItem} onChange={e => setHistItem(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Items</option>
                {stocks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={fetchHistory} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">Apply</button>
          </div>

          {histLoading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Date & Time', 'Item', 'Movement', 'Qty', 'Source', 'Reference', 'Remarks'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.inventoryItem?.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.movementType === 'INWARD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.movementType === 'INWARD' ? '▲ IN' : '▼ OUT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{row.quantity} <span className="text-gray-400 text-xs font-normal">{row.unit}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.source?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{row.referenceId || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{row.remarks || '—'}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No history found for selected filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Adjustment Modal ──────────────────────────────────────────────── */}
      {adjModal && adjItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-900">
                {adjMode === 'add' ? '➕ Add Stock' : '➖ Deduct Stock'} — {adjItem.name}
              </h2>
              <button onClick={() => setAdjModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Current Stock: </span>
                <span className="font-semibold">{adjItem.currentStock} {adjItem.stockUnit}</span>
                <span className={`ml-3 px-2 py-0.5 rounded-full text-xs border ${STATUS_CONFIG[adjItem.stockStatus]?.badge}`}>
                  {STATUS_CONFIG[adjItem.stockStatus]?.label}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({adjItem.stockUnit}) *
                </label>
                <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)}
                  min="0.001" step="0.001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder={`e.g. 5 ${adjItem.stockUnit}`} />
              </div>
              {adjMode === 'deduct' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <input value={adjReason} onChange={e => setAdjReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="e.g. Spillage, expiry..." />
                </div>
              )}
              {adjMode === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
                  <input value={adjReason} onChange={e => setAdjReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g. Restock delivery..." />
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setAdjModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={submitAdj} disabled={adjLoading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50
                  ${adjMode === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {adjLoading ? 'Processing...' : adjMode === 'add' ? 'Add Stock' : 'Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
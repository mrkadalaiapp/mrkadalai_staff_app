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
  const [tab, setTab] = useState('stock')
  const [stocks, setStocks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [histLoading, setHistLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState(weekAgo())
  const [dateTo, setDateTo] = useState(today())
  const [srcFilters, setSrcFilters] = useState([]) // Multi-select sources
  const [histItems, setHistItems] = useState([]) // Multi-select items (autocomplete)

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
    } catch (e) { toast.error('Failed to load inventory list') }
    finally { setLoading(false) }
  }

  const openAdj = (item, mode) => {
    setAdjItem(item)
    setAdjMode(mode)
    setAdjQty('')
    setAdjReason('')
    setAdjModal(true)
  }

  const submitAdj = async () => {
    if (!adjQty || parseFloat(adjQty) <= 0) return toast.error('Enter valid quantity')
    if (adjMode === 'deduct' && !adjReason) return toast.error('Reason is required')

    setAdjLoading(true)
    try {
      const endpoint = adjMode === 'add' ? '/staff/outlets/add-stock' : '/staff/outlets/deduct-stock'
      const payload = {
        inventoryItemId: adjItem.id,
        outletId,
        [adjMode === 'add' ? 'addedQuantity' : 'quantity']: parseFloat(adjQty),
        [adjMode === 'add' ? 'remarks' : 'reason']: adjReason
      }
      await apiRequest(endpoint, { method: 'POST', body: payload })
      toast.success('Stock updated successfully')
      setAdjModal(false)
      fetchStocks()
      if (tab === 'history') fetchHistory()
    } catch (e) {
      toast.error(e.message || 'Failed to update stock')
    } finally {
      setAdjLoading(false)
    }
  }

  const filtered = stocks.filter(s => {
    const matchCat = catFilter === 'All' || s.category === catFilter
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const counts = { HEALTHY: 0, LOW_STOCK: 0, OUT_OF_STOCK: 0 }
  stocks.forEach(s => { if (counts[s.stockStatus] !== undefined) counts[s.stockStatus]++ })

  const fetchHistory = async () => {
    setHistLoading(true)
    try {
      const payload = {
        outletId,
        startDate: dateFrom,
        endDate: dateTo,
        ...(srcFilters.length > 0 ? { source: srcFilters } : {}),
        ...(histItems.length > 0 ? { inventoryItemId: histItems.map(i => i.id) } : {}),
      }
      const res = await apiRequest('/staff/outlets/get-stock-history', { method: 'POST', body: payload })
      setHistory(res.history || [])
    } catch (e) { toast.error('Failed to load history') }
    finally { setHistLoading(false) }
  }

  const [showSrcDropdown, setShowSrcDropdown] = useState(false)
  const toggleSrc = (src) => {
    setSrcFilters(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src])
  }

  const [itemSearch, setItemSearch] = useState('')
  const [showItemSuggestions, setShowItemSuggestions] = useState(false)
  const filteredSuggestions = stocks.filter(s => 
    s.name.toLowerCase().includes(itemSearch.toLowerCase()) && 
    !histItems.find(hi => hi.id === s.id)
  )

  useEffect(() => {
    if (outletId) {
      fetchStocks();
      fetchHistory();
    }
  }, [outletId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage outlet stock levels & history</p>
        </div>
        <button onClick={tab === 'history' ? fetchHistory : fetchStocks} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
          ↻ Refresh {tab === 'history' ? 'History' : 'Stock'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Healthy',      count: counts.HEALTHY,      color: 'bg-green-50  border-green-200',  text: 'text-green-700'  },
          { label: 'Low Stock',    count: counts.LOW_STOCK,    color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
          { label: 'Out of Stock', count: counts.OUT_OF_STOCK, color: 'bg-red-50    border-red-200',    text: 'text-red-700'    },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 ${c.color} shadow-sm`}>
            <p className={`text-2xl font-bold ${c.text}`}>{c.count}</p>
            <p className="text-sm text-gray-600 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

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

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-sm" />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none shadow-sm">
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading inventory...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white border border-gray-100 rounded-xl">
              <p className="text-lg font-medium text-gray-600">No items found</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Item', 'Category', 'Stock', 'Threshold', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(item => {
                      const sc = STATUS_CONFIG[item.stockStatus] || STATUS_CONFIG.HEALTHY
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'}`}>{item.category}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {item.currentStock} <span className="text-gray-400 font-normal text-xs">{item.stockUnit}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs font-medium">{item.reorderThreshold} {item.stockUnit}</td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.badge} tracking-tight`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                              {sc.label.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openAdj(item, 'add')} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 transition-all">+ ADD</button>
                              <button onClick={() => openAdj(item, 'deduct')} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700 transition-all">- DEDUCT</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border border-gray-200 rounded-xl flex gap-4 flex-wrap items-end shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none w-40" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 outline-none w-40" />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Sources</label>
              <button onClick={() => setShowSrcDropdown(!showSrcDropdown)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 text-left bg-white flex justify-between items-center">
                <span className="truncate">{srcFilters.length === 0 ? 'All Sources' : `${srcFilters.length} selected`}</span>
                <span className="text-gray-400 text-xs">▼</span>
              </button>
              {showSrcDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSrcDropdown(false)}></div>
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 space-y-1">
                    {SOURCES.filter(s => s !== 'All').map(s => (
                      <label key={s} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                        <input type="checkbox" checked={srcFilters.includes(s)} onChange={() => toggleSrc(s)} className="rounded text-gray-900 focus:ring-gray-900 h-4 w-4" />
                        {s.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative flex-1 min-w-[250px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Filter Items</label>
              <div className="border border-gray-300 rounded-lg p-1 bg-white flex flex-wrap gap-1 min-h-[38px] items-center">
                {histItems.map(item => (
                  <span key={item.id} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded flex items-center gap-1 text-xs font-medium border border-gray-200">
                    {item.name}
                    <button onClick={() => setHistItems(prev => prev.filter(i => i.id !== item.id))} className="hover:text-red-500 ml-0.5 text-[10px]">✕</button>
                  </span>
                ))}
                <input value={itemSearch} onChange={e => setItemSearch(e.target.value)} onFocus={() => setShowItemSuggestions(true)} placeholder={histItems.length === 0 ? "Search items..." : ""} className="flex-1 outline-none px-2 py-1 text-sm bg-transparent min-w-[120px]" />
              </div>
              {showItemSuggestions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowItemSuggestions(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                    {itemSearch ? (
                      filteredSuggestions.map(s => (
                        <button key={s.id} onClick={() => { setHistItems([...histItems, s]); setItemSearch(''); setShowItemSuggestions(false) }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex justify-between border-b last:border-0 border-gray-50">
                          <span className="font-medium text-gray-700">{s.name}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{s.category}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-400 italic">Type to search...</div>
                    )}
                  </div>
                </>
              )}
            </div>
            <button onClick={fetchHistory} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all h-[38px]">Apply Filters</button>
          </div>

          {histLoading ? (
            <div className="text-center py-20 text-gray-400">Loading History...</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date & Time', 'Item', 'Movement', 'Qty', 'Source', 'Reference', 'Remarks'].map(h => (
                        <th key={h} className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-xs font-medium">
                          {new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{row.inventoryItem?.itemName}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold">{row.inventoryItem?.itemCategory}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-tight ${row.movementType === 'INWARD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {row.movementType === 'INWARD' ? '▲ INWARD' : '▼ OUTWARD'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-gray-900">{row.quantity}</span> 
                          <span className="text-gray-400 ml-1 text-[10px] font-bold uppercase">{row.unit}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100 text-gray-600 font-medium">{row.source?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-4 text-gray-400 text-xs font-mono">{row.referenceId || '—'}</td>
                        <td className="px-4 py-4 text-gray-500 text-xs max-w-[200px] truncate" title={row.remarks}>{row.remarks || '—'}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-20 bg-gray-50/30 text-gray-400">No records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adjModal && adjItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h2 className="font-bold text-gray-900 uppercase tracking-tight">
                {adjMode === 'add' ? '➕ Add Stock' : '➖ Deduct Stock'} — {adjItem.name}
              </h2>
              <button onClick={() => setAdjModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm flex justify-between items-center">
                <div>
                  <p className="text-blue-600 font-bold uppercase text-[10px] tracking-widest mb-1">Current Balance</p>
                  <p className="text-xl font-black text-blue-900">{adjItem.currentStock} <span className="text-sm font-normal opacity-70">{adjItem.stockUnit}</span></p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${STATUS_CONFIG[adjItem.stockStatus]?.badge}`}>
                  {STATUS_CONFIG[adjItem.stockStatus]?.label}
                </span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Quantity to {adjMode === 'add' ? 'Increase' : 'Decrease'}</label>
                <input type="number" value={adjQty} onChange={e => setAdjQty(e.target.value)} min="0.001" step="0.001" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-gray-900 outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{adjMode === 'deduct' ? 'Reason *' : 'Remarks'}</label>
                <textarea value={adjReason} onChange={e => setAdjReason(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 outline-none" placeholder={adjMode === 'deduct' ? "Reason required..." : "Optional..."} />
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setAdjModal(false)} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">CANCEL</button>
              <button onClick={submitAdj} disabled={adjLoading} className={`flex-1 py-3 rounded-xl text-sm font-black text-white shadow-lg disabled:opacity-50 ${adjMode === 'add' ? 'bg-green-600 shadow-green-100' : 'bg-red-600 shadow-red-100'}`}>
                {adjLoading ? 'PROCESSING...' : adjMode === 'add' ? 'CONFIRM ADD' : 'CONFIRM DEDUCT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
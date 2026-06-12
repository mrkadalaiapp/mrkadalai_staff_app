import React, { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { apiRequest } from '../utils/api'
import { useOutletDetails } from '../utils/outletUtils'
import Loader from '../components/ui/Loader'

const Dashboard = () => {
    const [orderInput, setOrderInput] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('') // New status filter state
    const [orders, setOrders] = useState([]) // Orders for the current page
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedItems, setSelectedItems] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedOrderForModal, setSelectedOrderForModal] = useState(null)
    const [modalAction, setModalAction] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [ordersPerPage] = useState(10) // 10 orders per page
    const [totalOrdersCount, setTotalOrdersCount] = useState(0)
    
    // New state for home data
    const [homeData, setHomeData] = useState({
        totalRevenue: 0,
        appOrders: 0,
        manualOrders: 0,
        peakSlot: null,
        bestSellerProduct: null,
        totalRechargedAmount: 0,
        lowStockProducts: [],
        ticketsCount: 0 // Added tickets count
    })
    const [homeDataLoading, setHomeDataLoading] = useState(true)

    const { outletId } = useOutletDetails()

    const formatDate = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const date = new Date(dateString);
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const options = { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' };
        return utcDate.toLocaleDateString('en-GB', options);
    };

    const formatSlot = (slot) => {
        if (!slot || slot === 'N/A') return 'N/A';
        try {
            const parts = slot.replace('SLOT_', '').split('_');
            const startTime = parseInt(parts[0], 10);
            const endTime = parseInt(parts[1], 10);
            const formatHour = (hour) => {
                if (hour === 12) return '12 PM';
                if (hour === 0) return '12 AM';
                const ampm = hour < 12 ? 'AM' : 'PM';
                const h = hour % 12 || 12;
                return `${h} ${ampm}`;
            };
            return `${formatHour(startTime)} - ${formatHour(endTime)}`;
        } catch (e) {
            return slot;
        }
    };

    // Fetch home data from API
    useEffect(() => {
        const fetchHomeData = async () => {
            if (!outletId) {
                setHomeDataLoading(false)
                return
            }

            try {
                setHomeDataLoading(true)
                const [homeResponse, ticketsResponse] = await Promise.all([
                    apiRequest('/staff/outlets/get-home-data/'),
                    apiRequest('/staff/tickets/count/') // New endpoint for ticket count
                ])
                
                if (homeResponse) {
                    setHomeData({
                        totalRevenue: homeResponse.totalRevenue || 0,
                        appOrders: homeResponse.appOrders || 0,
                        manualOrders: homeResponse.manualOrders || 0,
                        peakSlot: homeResponse.peakSlot || null,
                        bestSellerProduct: homeResponse.bestSellerProduct || null,
                        totalRechargedAmount: homeResponse.totalRechargedAmount || 0,
                        lowStockProducts: homeResponse.lowStockProducts || [],
                        ticketsCount: ticketsResponse?.count || 0
                    })
                }
            } catch (err) {
                console.error('Error fetching home data:', err)
                // Fallback if tickets endpoint fails
                try {
                    const homeResponse = await apiRequest('/staff/outlets/get-home-data/')
                    if (homeResponse) {
                        setHomeData({
                            ...homeResponse,
                            ticketsCount: 0
                        })
                    }
                } catch (fallbackErr) {
                    console.error('Error fetching fallback home data:', fallbackErr)
                }
            } finally {
                setHomeDataLoading(false)
            }
        }

        fetchHomeData()
    }, [outletId])

    // Fetch recent orders with pagination and filtering
    const fetchRecentOrders = async (page = 1) => {
        if (!outletId) { 
            setError('Outlet ID not found'); 
            setLoading(false); 
            return; 
        }
        
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: ordersPerPage });
            if (statusFilter) params.append('status', statusFilter);
            
            const response = await apiRequest(`/staff/outlets/get-recent-orders/${outletId}/?${params.toString()}`);
            
            if (response.orders) {
                setOrders(response.orders);
                setTotalOrdersCount(response.total);
                setCurrentPage(response.currentPage);
            } else {
                setOrders([]);
            }
            setError(null);
        } catch (err) {
            console.error('Error fetching recent orders:', err);
            setError('Failed to fetch recent orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and fetch when status filter changes
    useEffect(() => {
        if (outletId) {
            fetchRecentOrders(1);
        }
    }, [outletId, statusFilter]);

    // Fetch when page changes
    useEffect(() => {
        if (outletId) {
            fetchRecentOrders(currentPage);
        }
    }, [currentPage]);

    const getStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'pending'
            case 'preparing': return 'info'
            case 'completed': case 'delivered': return 'success'
            case 'partially_delivered': return 'warning'
            case 'cancelled': return 'danger'
            default: return 'default'
        }
    }

    const openDetailsModal = (order) => {
        setSelectedOrderForModal(order);
        setShowDetailsModal(true);
    };

    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedOrderForModal(null);
    };

    const handleButtonClick = (value) => {
        if (value === 'clear') {
            setOrderInput('')
            setSelectedOrder(null)
            setSelectedItems([])
        } else if (value === 'backspace') {
            setOrderInput(prev => prev.slice(0, -1))
        } else if (value === 'search') {
            searchOrder()
        } else {
            setOrderInput(prev => prev + value)
        }
    }

    const handleInputChange = (e) => {
        const value = e.target.value
        // Only allow numbers and # symbol
        if (/^[#0-9]*$/.test(value)) {
            setOrderInput(value)
        }
    }

    const searchOrder = async () => {
        const cleanId = orderInput.replace('#', '')
        if (!cleanId) return

        try {
            setSelectedOrder({ loading: true })
            const response = await apiRequest(`/staff/outlets/get-order/${outletId}/${cleanId}/`)

            if (response.order) {
                const order = response.order
                setSelectedOrder({
                    id: `#${order.orderId}`,
                    customer: order.customerName,
                    items: order.items.map(item => ({
                        id: item.id,
                        name: item.productName,
                        quantity: item.quantity,
                        price: item.unitPrice,
                        totalPrice: item.totalPrice,
                        status: item.itemStatus,
                        description: item.productDescription
                    })),
                    status: order.orderStatus.toLowerCase(),
                    total: order.totalPrice,
                    createdAt: order.createdAt,
                    outletName: order.outletName
                })
                setSelectedItems([])
            }
        } catch (err) {
            console.error('Error fetching order:', err)
            setSelectedOrder({ notFound: true })
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            searchOrder()
        }
    }

    // Check if an item is delivered or if the whole order is completed
    const isItemDelivered = (itemStatus) => {
        const deliveredStatuses = ['delivered', 'completed']
        return deliveredStatuses.includes(itemStatus?.toLowerCase())
    }

    const isOrderCompleted = () => {
        if (!selectedOrder) return false
        const completedStatuses = ['completed', 'delivered', 'cancelled']
        return completedStatuses.includes(selectedOrder.status.toLowerCase())
    }

    const isOrderPartiallyDelivered = () => {
        if (!selectedOrder) return false
        return selectedOrder.status.toLowerCase() === 'partially_delivered'
    }

    const canSelectItem = (item) => {
        return !isItemDelivered(item.status) && !isOrderCompleted()
    }

    const handleItemSelection = (itemId) => {
        const item = selectedOrder.items.find(item => item.id === itemId)
        if (!canSelectItem(item)) return

        setSelectedItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId)
            } else {
                return [...prev, itemId]
            }
        })
    }

    const handleSelectAll = () => {
        if (isOrderCompleted()) return

        const selectableItems = selectedOrder.items.filter(canSelectItem)
        const selectableItemIds = selectableItems.map(item => item.id)

        if (selectedItems.length === selectableItemIds.length) {
            setSelectedItems([])
        } else {
            setSelectedItems(selectableItemIds)
        }
    }

    const openModal = (action) => {
        if (isOrderCompleted() && action !== 'cancel' && action !== 'partialCancel') return
        
        // Ensure there are selected items for delivery/partial delivery actions
        if ((action === 'delivered' || action === 'partially') && selectedItems.length === 0) {
            return
        }

        setModalAction(action)
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setModalAction('')
    }

    const handleOrderAction = async () => {
        if (!selectedOrder || !outletId) return

        try {
            setActionLoading(true)
            const orderId = selectedOrder.id.replace('#', '')

            let status
            let requestData = {
                orderId: parseInt(orderId),
                outletId: parseInt(outletId)
            }

            switch (modalAction) {
                case 'delivered':
                    status = 'DELIVERED'
                    requestData.orderItemIds = selectedItems.map(id => parseInt(id)) // Send multiple IDs
                    break
                case 'partially':
                    status = 'PARTIALLY_DELIVERED'
                    requestData.orderItemIds = selectedItems.map(id => parseInt(id)) // Send multiple IDs
                    break
                case 'cancel':
                    status = 'CANCELLED'
                    break
                case 'partialCancel':
                    status = 'PARTIAL_CANCEL'
                    break
                default:
                    return
            }

            requestData.status = status

            const response = await apiRequest('/staff/outlets/update-order/', {
                method: 'PUT',
                body: JSON.stringify(requestData),
            })

            if (response.message) {
                console.log('Order updated successfully:', response.message)
                // Dynamically re-fetch the order to reflect the changes
                searchOrder()
                // Refresh recent orders list in background
                fetchRecentOrders(1)
            }
        } catch (err) {
            console.error('Error updating order:', err)
            // You could add an error toast here
        } finally {
            setActionLoading(false)
            closeModal()
        }
    }

    const getModalContent = () => {
        // Add a null check here as a safety measure
        if (!selectedOrder) return { title: '', message: '' };

        switch (modalAction) {
            case 'delivered':
                return {
                    title: 'Mark All Delivered',
                    message: 'Are you sure you want to mark all undelivered items as delivered? This will complete the order.'
                }
            case 'partially':
                const selectedItemNames = selectedOrder.items
                    .filter(item => selectedItems.includes(item.id))
                    .map(item => item.name)

                const remainingItemNames = selectedOrder.items
                    .filter(item => !selectedItems.includes(item.id) && !isItemDelivered(item.status))
                    .map(item => item.name)

                return {
                    title: 'Deliver Selected Items',
                    message: `You are about to mark only the selected items in order ${selectedOrder.id} as delivered.\n\nDelivering:\n${selectedItemNames.map(name => `• ${name}`).join('\n')}\n\n${remainingItemNames.length > 0 ? `Remaining undelivered items:\n${remainingItemNames.map(name => `• ${name}`).join('\n')}` : ''}\n\nAre you sure you want to proceed?`
                }
            case 'cancel':
                return {
                    title: 'Cancel Order',
                    message: 'Are you sure you want to cancel this entire order? This will refund the full amount and restore all item quantities to stock. This action cannot be undone.'
                }
            case 'partialCancel':
                const undeliveredItems = selectedOrder.items.filter(item => !isItemDelivered(item.status))
                const undeliveredItemNames = undeliveredItems.map(item => item.name)
                const refundAmount = undeliveredItems.reduce((total, item) => total + (item.price * item.quantity), 0)
                
                return {
                    title: 'Cancel Remaining Items',
                    message: `You are about to cancel the undelivered items in this partially delivered order. This will:\n\n• Refund ₹${refundAmount.toFixed(2)} for undelivered items\n• Restore stock for cancelled items\n• Mark order as completed\n\nItems to be cancelled:\n${undeliveredItemNames.map(name => `• ${name}`).join('\n')}\n\nDelivered items will remain delivered. This action cannot be undone.`
                }
            default:
                return { title: '', message: '' }
        }
    }
    
    // ADDED NULL CHECKS TO ALL HELPER FUNCTIONS
    const getRemainingUndeliveredItemsCount = () => {
        if (!selectedOrder || !selectedOrder.items) return 0;
        return selectedOrder.items.filter(item => !isItemDelivered(item.status)).length
    }

    const getSelectableItemsCount = () => {
        if (!selectedOrder || !selectedOrder.items) return 0;
        return selectedOrder.items.filter(canSelectItem).length;
    }

    const getDeliveredItemsCount = () => {
        if (!selectedOrder || !selectedOrder.items) return 0;
        return selectedOrder.items.filter(item => isItemDelivered(item.status)).length;
    }

    // Helper function to format currency
    const formatCurrency = (amount) => {
        if (amount === 0 || amount === null || amount === undefined) return '0'
        return amount.toLocaleString('en-IN')
    }

    const DeliverySlot = {
        SLOT_11_12: '11:00-12:00',
        SLOT_12_13: '12:00-13:00',
        SLOT_13_14: '13:00-14:00',
        SLOT_14_15: '14:00-15:00',
        SLOT_15_16: '15:00-16:00',
        SLOT_16_17: '16:00-17:00',
    };

    const formatPeakSlot = (slot) => {
        if (!slot) return 'N/A'
        return DeliverySlot[slot] || 'Invalid Slot';
    }

    // Updated table data for Recent Orders
    const recentOrdersTableData = orders
        .filter(order => 
            String(order.billNumber).toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(order => [
            `#${order.billNumber}`,
            order.customerName,
            <Badge key={`${order.billNumber}-type`} variant={order.orderType === 'MANUAL' ? 'info' : 'success'}>{order.orderType}</Badge>,
            formatDate(order.deliveryDate),
            formatSlot(order.deliverySlot),
            `₹${order.totalAmount.toFixed(2)}`,
            <Badge key={`${order.billNumber}-status`} variant={getStatusVariant(order.status)}>{order.status}</Badge>,
            <Button key={`${order.billNumber}-view`} onClick={() => openDetailsModal(order)}>View</Button>
        ]);

    const totalPages = Math.ceil(totalOrdersCount / ordersPerPage) || 1;

    return (
        <div className="space-y-6">


            <div>
                <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-6">
                    {/* Calculator Section */}
                    <Card title='Order Look UP'>
                        {/* The display screen with your original dark styling */}
                        <div className="bg-gray-900 text-white p-4 rounded-lg mb-4">
                            <input
                                type="text"
                                value={orderInput}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter Order ID"
                                className="w-full bg-transparent text-2xl font-mono text-right border-none outline-none placeholder-gray-400"
                                maxLength={10}
                            />
                        </div>

                        {/* The keypad with your approved layout and original button colors */}
                        <div className="grid grid-cols-4 grid-rows-4 gap-2">
                            {/* --- Row 1 --- */}
                            <button onClick={() => handleButtonClick('7')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">7</button>
                            <button onClick={() => handleButtonClick('8')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">8</button>
                            <button onClick={() => handleButtonClick('9')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">9</button>
                            <button onClick={() => handleButtonClick('backspace')} className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded font-semibold text-xl">⌫</button>

                            {/* --- Row 2 --- */}
                            <button onClick={() => handleButtonClick('4')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">4</button>
                            <button onClick={() => handleButtonClick('5')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">5</button>
                            <button onClick={() => handleButtonClick('6')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">6</button>
                            <button onClick={() => handleButtonClick('clear')} className="bg-red-500 hover:bg-red-600 text-white p-3 rounded font-semibold">Clear</button>

                            {/* --- Row 3 --- */}
                            <button onClick={() => handleButtonClick('1')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">1</button>
                            <button onClick={() => handleButtonClick('2')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">2</button>
                            <button onClick={() => handleButtonClick('3')} className="bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl">3</button>

                            {/* Search button starts in row 3 and spans 2 rows down */}
                            <button
                                onClick={() => handleButtonClick('search')}
                                className="row-span-2 bg-green-500 hover:bg-green-600 text-white p-3 rounded font-semibold"
                            >
                                Search
                            </button>

                            {/* --- Row 4 --- */}
                            {/* Zero button starts in row 4 and spans 3 columns across */}
                            <button
                                onClick={() => handleButtonClick('0')}
                                className="col-span-3 bg-gray-300 hover:bg-gray-400 text-black p-3 rounded font-semibold text-xl"
                            >
                                0
                            </button>
                        </div>
                    </Card>

                    {/* Order Details Section */}
                    <Card title='Order Details' >
                        {!selectedOrder ? (
                            <div>
                                <div className="text-gray-400 text-4xl mb-2"></div>
                                <p className="text-gray-500">Enter an Order ID to view details</p>
                            </div>
                        ) : selectedOrder.loading ? (
                            <div>
                                {/* <div className="text-blue-400 text-4xl mb-2">⏳</div> */}
                                <p className='flex justify-center items-center'><Loader/></p>
                            </div>
                        ) : selectedOrder.notFound ? (
                            <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
                                {/* <div className="text-red-400 text-4xl mb-2">❌</div> */}
                                <p className="text-red-600 font-semibold">Order Not Found</p>
                                <p className="text-red-500 text-sm mt-1">Please check the Order ID and try again</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                {/* The lines below are the key to the fix. We are only calculating these variables if selectedOrder exists. */}
                                {(() => {
                                        const selectableItemsCount = getSelectableItemsCount()
                                        const isDeliverAllDisabled = selectedItems.length === 0 || selectedItems.length < selectableItemsCount
                                        const isPartiallyDeliverDisabled = selectedItems.length === 0 || selectedItems.length === selectableItemsCount

                                        return (
                                            <>
                                                {/* Order Header */}
                                                <div className="bg-gray-50 p-8 border-b -m-6 mb-6">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold text-lg">{selectedOrder.id}</h4>
                                                            <p className="text-gray-600">{selectedOrder.customer}</p>
                                                            {selectedOrder.outletName && (
                                                                <p className="text-sm text-blue-500">Outlet: {selectedOrder.outletName}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <Badge variant={getStatusVariant(selectedOrder.status)}>
                                                                {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1).replace('_', ' ')}
                                                            </Badge>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {new Date(selectedOrder.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Item Selection Controls */}
                                                {!isOrderCompleted() && selectableItemsCount > 0 && (
                                                    <div className="mb-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h5 className="font-medium">Items Ordered:</h5>
                                                            <button
                                                                onClick={handleSelectAll}
                                                                className="text-sm text-blue-600 hover:text-blue-800"
                                                            >
                                                                {selectedItems.length === selectableItemsCount ? 'Deselect All' : 'Select All'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Show completed order message */}
                                                {isOrderCompleted() && (
                                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                                                        {/* <div className="text-green-500 text-3xl mb-2">✅</div> */}
                                                        <p className="text-green-700 font-medium text-lg">
                                                            This order has been {selectedOrder.status === 'delivered' ? 'delivered' : selectedOrder.status === 'cancelled' ? 'cancelled' : 'completed'} successfully!
                                                        </p>
                                                        <p className="text-green-600 text-sm mt-1">
                                                            {selectedOrder.status === 'delivered' ? 'All items have been delivered to the customer.' :
                                                                selectedOrder.status === 'cancelled' ? 'This order has been cancelled and stock has been restored.' :
                                                                    'This order has been completed.'}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Show partially delivered order message */}
                                                {isOrderPartiallyDelivered() && !isOrderCompleted() && (
                                                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <div className="flex items-start space-x-3">
                                                            <div className="text-yellow-500 text-2xl">⚠️</div>
                                                            <div>
                                                                <p className="text-yellow-700 font-medium">Partially Delivered Order</p>
                                                                <p className="text-yellow-600 text-sm mt-1">
                                                                    {getDeliveredItemsCount()} of {selectedOrder.items.length} items delivered. 
                                                                    {selectedOrder && selectedOrder.items && getRemainingUndeliveredItemsCount() > 0 && (
                                                                        <span> You can cancel the remaining {getRemainingUndeliveredItemsCount()} undelivered item{getRemainingUndeliveredItemsCount() > 1 ? 's' : ''} if needed.</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Order Items with Checkboxes */}
                                                <div className="space-y-2 mb-4">
                                                    {selectedOrder.items.map((item, index) => (
                                                        <div key={index} className="flex items-center space-x-3 py-2 border-b border-gray-100 last:border-b-0">
                                                            {!isOrderCompleted() && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItems.includes(item.id)}
                                                                    onChange={() => handleItemSelection(item.id)}
                                                                    disabled={!canSelectItem(item)}
                                                                    className={`w-4 h-4 text-blue-600 rounded ${!canSelectItem(item) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                />
                                                            )}
                                                            <div className="flex-1 flex justify-between items-center">
                                                                <div>
                                                                    <span className={`font-medium ${isItemDelivered(item.status) ? 'text-gray-500' : ''}`}>
                                                                        {item.name}
                                                                    </span>
                                                                    <span className="text-gray-500 ml-2">×{item.quantity}</span>
                                                                    {item.status && (
                                                                        <Badge variant={getStatusVariant(item.status.toLowerCase())} className="ml-2 text-xs">
                                                                            {item.status}
                                                                        </Badge>
                                                                    )}
                                                                    {isItemDelivered(item.status) && (
                                                                        <span className="ml-2 text-green-600 text-xs">✓</span>
                                                                    )}
                                                                </div>
                                                                <span className={`font-medium ${isItemDelivered(item.status) ? 'text-gray-500' : ''}`}>
                                                                    ₹ {item.price.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Total - Moved above action buttons */}
                                                <div className="flex justify-between items-center py-3 border-t border-gray-200 mb-4">
                                                    <span className="font-semibold text-lg">Total:</span>
                                                    <span className="font-bold text-lg text-green-600">₹ {selectedOrder.total.toFixed(2)}</span>
                                                </div>

                                                {/* Action Buttons - Show different buttons based on order status */}
                                                {!isOrderCompleted() && (
                                                    <div className="space-y-2">
                                                        {/* Normal order actions (PENDING status) */}
                                                        {selectedOrder.status.toLowerCase() === 'pending' && (
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    onClick={() => openModal('delivered')}
                                                                    disabled={isDeliverAllDisabled}
                                                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                                                                >
                                                                    Mark All Delivered
                                                                </Button>
                                                                <Button
                                                                    onClick={() => openModal('partially')}
                                                                    disabled={isPartiallyDeliverDisabled}
                                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                                                                >
                                                                    Deliver Selected Items
                                                                </Button>
                                                                <Button
                                                                    onClick={() => openModal('cancel')}
                                                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                                                >
                                                                    Cancel Order
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* Partially delivered order actions */}
                                                        {isOrderPartiallyDelivered() && (
                                                            <div className="flex space-x-2">
                                                                <Button
                                                                    onClick={() => openModal('delivered')}
                                                                    disabled={isDeliverAllDisabled}
                                                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                                                                >
                                                                    Mark All Delivered
                                                                </Button>
                                                                <Button
                                                                    onClick={() => openModal('partially')}
                                                                    disabled={isPartiallyDeliverDisabled}
                                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                                                                >
                                                                    Deliver Selected Items
                                                                </Button>
                                                                <Button
                                                                    onClick={() => openModal('partialCancel')}
                                                                    disabled={getRemainingUndeliveredItemsCount() === 0}
                                                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                                                                >
                                                                    Cancel Remaining Items
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {/* Info text for partially delivered orders */}
                                                        {isOrderPartiallyDelivered() && (
                                                            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                                                                <p><strong>Tip:</strong> Use "Cancel Remaining Items" to refund and restore stock for all undelivered items, completing this order.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )
                                    })()}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div>
                <Card>
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <h2 className="text-lg font-semibold">Recent Orders</h2>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search by ID or Customer..."
                                className="border px-3 py-1.5 rounded text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="border px-3 py-1.5 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="PARTIALLY_DELIVERED">Partially Delivered</option>
                            </select>
                            <Button variant="black" onClick={() => fetchRecentOrders(1)} disabled={loading}>
                                {loading ? '...' : 'Refresh'}
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center"><Loader /></div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{error}</div>
                    ) : recentOrdersTableData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>{searchQuery || statusFilter ? 'No orders match your criteria.' : 'No recent orders found.'}</p>
                        </div>
                    ) : (
                        <>
                            <Table
                                headers={['Order ID', 'Customer', 'Type', 'Delivery Date', 'Delivery Slot', 'Total', 'Status', 'Action']}
                                data={recentOrdersTableData}
                            />
                            <div className="flex justify-center items-center gap-4 mt-4">
                                <Button onClick={() => setCurrentPage(prev => prev > 1 ? prev - 1 : 1)} disabled={currentPage === 1}>&lt;</Button>
                                <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                                <Button onClick={() => setCurrentPage(prev => prev < totalPages ? prev + 1 : totalPages)} disabled={currentPage >= totalPages}>&gt;</Button>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={closeDetailsModal}
                title={`Order Details - #${selectedOrderForModal?.billNumber}`}
                footer={<Button variant="secondary" onClick={closeDetailsModal}>Close</Button>}
            >
                {selectedOrderForModal && (
                    <div className="space-y-4 text-sm">
                        <div>
                            <p><strong>Customer Name:</strong> {selectedOrderForModal.customerName}</p>
                            <p><strong>Phone Number:</strong> {selectedOrderForModal.customerPhone}</p>
                            <p><strong>Status:</strong> <Badge variant={getStatusVariant(selectedOrderForModal.status)}>{selectedOrderForModal.status}</Badge></p>
                            <p><strong>Delivery Date:</strong> {formatDate(selectedOrderForModal.deliveryDate)}</p>
                            <p><strong>Delivery Slot:</strong> {formatSlot(selectedOrderForModal.deliverySlot)}</p>
                            <p><strong>Order Type:</strong> <Badge variant={selectedOrderForModal.orderType === 'MANUAL' ? 'info' : 'success'}>{selectedOrderForModal.orderType}</Badge></p>
                            {selectedOrderForModal.paymentMode && (<p><strong>Payment Method:</strong> {selectedOrderForModal.paymentMode}</p>)}
                        </div>
                        <table className="w-full border-collapse border border-gray-300 mt-4">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 border text-left">Item</th>
                                    <th className="p-2 border text-center">Quantity</th>
                                    <th className="p-2 border text-right">Unit Price</th>
                                    <th className="p-2 border text-right">Total Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrderForModal.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2 border">{item.name}</td>
                                        <td className="p-2 border text-center">{item.quantity}</td>
                                        <td className="p-2 border text-right">₹{item.unitPrice.toFixed(2)}</td>
                                        <td className="p-2 border text-right">₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold bg-gray-50">
                                    <td colSpan="3" className="p-2 border text-right">Grand Total</td>
                                    <td className="p-2 border text-right">₹{selectedOrderForModal.totalAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>

            {/* Action Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={getModalContent().title}
                footer={
                    <div className="flex space-x-2">
                        <Button
                            onClick={closeModal}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleOrderAction}
                            disabled={actionLoading}
                            className={`px-4 py-2 rounded disabled:bg-gray-300 text-white ${
                                modalAction === 'cancel' || modalAction === 'partialCancel' 
                                    ? 'bg-red-500 hover:bg-red-600' 
                                    : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        >
                            {actionLoading ? 'Processing...' : 'Confirm'}
                        </Button>
                    </div>
                }
            >
                <div className="text-gray-600">
                    <p className="whitespace-pre-line">{getModalContent().message}</p>
                    {selectedItems.length > 0 && modalAction !== 'cancel' && modalAction !== 'partialCancel' && selectedOrder && selectedOrder.items && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="font-medium">Selected Items:</p>
                            <ul className="list-disc list-inside mt-1">
                                {selectedOrder && selectedOrder.items // ADD NULL CHECK HERE
                                    .filter(item => selectedItems.includes(item.id))
                                    .map((item, index) => (
                                        <li key={index} className="text-sm">{item.name} (×{item.quantity})</li>
                                    ))
                                }
                            </ul>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}

export default Dashboard
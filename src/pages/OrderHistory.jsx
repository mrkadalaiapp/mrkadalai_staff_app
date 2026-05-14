import React, { useState, useEffect } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import dayjs from 'dayjs'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { apiRequest } from '../utils/api'
import { useOutletDetails } from '../utils/outletUtils'
import { toast } from 'react-hot-toast'
import Modal from '../components/ui/Modal'
import Loader from '../components/ui/Loader'

const OrderHistory = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs().startOf('day'))
    const [orders, setOrders] = useState([])
    const [availableDates, setAvailableDates] = useState([])
    const [loading, setLoading] = useState(false)
    const [datesLoading, setDatesLoading] = useState(false)
    const [error, setError] = useState(null)
    const [datesError, setDatesError] = useState(null)
    const [datePickerValue, setDatePickerValue] = useState('')
    const [selectedOrder, setSelectedOrder] = useState(null) // for modal

    const { outletId } = useOutletDetails()

    // Helper function to format date strings to 'DD Mon YYYY'
    const formatDate = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const date = new Date(dateString);
        // Use UTC methods to prevent timezone shifts
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const options = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
        return utcDate.toLocaleDateString('en-GB', options);
    };
    
    // Helper function to format delivery slots
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
                const h = hour % 12 || 12; // Converts 13 to 1, etc.
                return `${h} ${ampm}`;
            };
    
            return `${formatHour(startTime)} - ${formatHour(endTime)}`;
        } catch (e) {
            return slot; // Fallback if format is unexpected
        }
    };


    // Function to fetch orders for a specific date
    const fetchOrders = async (date) => {
        setLoading(true)
        setError(null)

        try {
            const response = await apiRequest(
                `/staff/outlets/get-order-history/?outletId=${outletId}&date=${date.format('YYYY-MM-DD')}`
            )

            setOrders(response.orders || [])
        } catch (err) {
            setError('Failed to fetch orders: ' + err.message)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }

    // Function to fetch available dates from the new endpoint
    const fetchAvailableDates = async () => {
        if (!outletId) return

        setDatesLoading(true)
        setDatesError(null)

        try {
            const response = await apiRequest(`/staff/outlets/get-orderdates/${outletId}`)
            const fetchedDates = response.data.map(dateObj => dayjs(dateObj.date))
            setAvailableDates(fetchedDates)

            if (fetchedDates.length > 0 && !fetchedDates.some(date => date.isSame(selectedDate, 'day'))) {
                setSelectedDate(fetchedDates[0])
            }
        } catch (err) {
            setDatesError('Failed to fetch available dates: ' + err.message)
            setAvailableDates([])
        } finally {
            setDatesLoading(false)
        }
    }

    // Effect to fetch orders when selectedDate or outletId changes
    useEffect(() => {
        if (selectedDate && outletId) {
            fetchOrders(selectedDate)
        }
    }, [selectedDate, outletId])

    // Effect to fetch available dates on component mount or when outletId changes
    useEffect(() => {
        fetchAvailableDates()
    }, [outletId])

    const handleDatePickerChange = (event) => {
        const selectedDateString = event.target.value
        setDatePickerValue(selectedDateString)
        if (selectedDateString) {
            const newDate = dayjs(selectedDateString).startOf('day')
            setSelectedDate(newDate)
        }
    }

    // Wrapper function to handle refresh button click
    const handleRefresh = () => {
        // Re-fetches orders for the currently selected date
        if (selectedDate && outletId) {
            fetchOrders(selectedDate);
        }
    };

    const downloadExcel = async () => {
        if (orders.length === 0) {
            toast.error('No orders found for the selected date');
            return;
        }

        try {
            const worksheetData = [
                ['Order ID', 'Customer Name', 'Order Type', 'Delivery Slot', 'Delivery Date', 'Items', 'Status'],
                ...orders.map(order => [
                    order.orderId,
                    order.customerName,
                    order.orderType,
                    formatSlot(order.deliverySlot),
                    formatDate(order.deliveryDate),
                    order.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
                    order.status
                ])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders')

            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
            const blob = new Blob([wbout], { type: 'application/octet-stream' })

            saveAs(blob, `orders_${selectedDate.format('YYYY-MM-DD')}.xlsx`)
        } catch (err) {
            toast.error('Failed to download Excel: ' + err.message)
        }
    }

    const getStatusVariant = (status) => {
        switch (status.toLowerCase()) {
            case 'delivered':
            case 'completed':
                return 'success';
            case 'preparing':
            case 'pending':
            case 'partially_delivered':
                return 'warning';
            case 'cancelled':
                return 'danger';
            default:
                return 'info';
        }
    };

    // Search state
    const [searchQuery, setSearchQuery] = useState('')

    // Transform orders data for table with filtering
    const filteredOrders = orders.filter(order => 
        String(order.orderId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const orderTableData = filteredOrders.map(order => {
        const itemDisplay =
            order.items.length > 2
                ? order.items
                    .slice(0, 2)
                    .map(item => `${item.quantity}x ${item.name}`)
                    .join(', ') + ` +${order.items.length - 2} more`
                : order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')

        return [
            `#${order.orderId}`,
            order.customerName,
            <Badge variant={order.orderType === 'MANUAL' ? 'info' : 'success'}>{order.orderType}</Badge>,
            formatSlot(order.deliverySlot),
            itemDisplay,
            <Badge key={order.orderId} variant={getStatusVariant(order.status)}>
                {order.status}
            </Badge>,
            <Button key={`view-${order.orderId}`} onClick={() => setSelectedOrder(order)}>
                View
            </Button>
        ]
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h1 className="text-2xl font-bold">Order History</h1>
                <div className="flex gap-2 items-center">
                    <input 
                        type="text"
                        placeholder="Search ID or Customer..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-200 outline-none w-64 shadow-sm"
                    />
                    <Button
                        variant="secondary"
                        onClick={downloadExcel}
                        disabled={loading || orders.length === 0}
                    >
                        Download Excel
                    </Button>
                </div>
            </div>
            
            <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex overflow-x-auto whitespace-nowrap gap-2 pb-2 scrollbar-hide">
                        {datesLoading && <p>Loading dates...</p>}
                        {datesError && <p className="text-red-600">{datesError}</p>}
                        {!datesLoading &&
                            !datesError &&
                            availableDates.map(date => (
                                <Button
                                    key={date.toISOString()}
                                    variant={selectedDate.isSame(date, 'day') ? 'black' : 'secondary'}
                                    onClick={() => setSelectedDate(date)}
                                    className="flex-shrink-0"
                                >
                                    {date.format('DD MMM')}
                                </Button>
                            ))}
                    </div>
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                    <label className="text-sm font-medium text-gray-700">Select Date:</label>
                    <input
                        type="date"
                        value={datePickerValue || (selectedDate ? selectedDate.format('YYYY-MM-DD') : '')}
                        onChange={handleDatePickerChange}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                        variant="black"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="disabled:bg-gray-700"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    {loading && (
                        <div className="flex justify-center items-center text-center py-4">
                            <Loader/>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-4 text-red-600">
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <Table
                            headers={[
                                'Order ID',
                                'Customer Name',
                                'Order Type',
                                'Delivery Slot',
                                'Items',
                                'Status',
                                'Action'
                            ]}
                            data={orderTableData}
                        />
                    )}

                    {!loading && !error && orders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No orders found for {selectedDate.format('DD MMM YYYY')}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Order Details Modal */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title={`Order Details - #${selectedOrder?.orderId || ''}`}
                footer={
                    <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
                        Close
                    </Button>
                }
            >
                {selectedOrder && (
                    <div className="space-y-4 text-sm">
                        <div>
                            <p><strong>Customer Name:</strong> {selectedOrder.customerName}</p>
                            <p><strong>Phone Number:</strong> {selectedOrder.customerPhone}</p>
                            <p><strong>Status:</strong> <Badge variant={getStatusVariant(selectedOrder.status)}>{selectedOrder.status}</Badge></p>
                            <p><strong>Delivery Date:</strong> {formatDate(selectedOrder.deliveryDate)}</p>
                            <p><strong>Delivery Slot:</strong> {formatSlot(selectedOrder.deliverySlot)}</p>
                            <p><strong>Order Type:</strong> <Badge variant={selectedOrder.orderType === 'MANUAL' ? 'info' : 'success'}>{selectedOrder.orderType}</Badge></p>
                            {selectedOrder.paymentMethod && (
                                <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
                            )}
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
                                {selectedOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2 border">{item.name}</td>
                                        <td className="p-2 border text-center">{item.quantity}</td>
                                        <td className="p-2 border text-right">₹{item.unitPrice.toFixed(2)}</td>
                                        <td className="p-2 border text-right">₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold bg-gray-50">
                                    <td colSpan="3" className="p-2 border text-right">Grand Total</td>
                                    <td className="p-2 border text-right">₹{selectedOrder.totalAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default OrderHistory;
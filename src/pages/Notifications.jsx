import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { apiRequest } from '../utils/api';
import { useOutletDetails } from '../utils/outletUtils';
import { toast } from 'react-hot-toast';
import Loader from '../components/ui/Loader';

const Notifications = () => {
    // --- All your existing state and logic remains unchanged ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [allOrders, setAllOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState('');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderModalAction, setOrderModalAction] = useState('');
    const [orderActionLoading, setOrderActionLoading] = useState(false);

    const navigate = useNavigate();
    const { outletId } = useOutletDetails();
    const orderRefs = useRef({}); // Ref for scrolling to orders

    // --- NEW HELPER FUNCTIONS to format date and slot ---
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const formatSlot = (slot) => {
        if (!slot || typeof slot !== 'string') return 'N/A';
        try {
            const parts = slot.replace('SLOT_', '').split('_');
            const startTime = parseInt(parts[0], 10);
            const endTime = parseInt(parts[1], 10);

            const formatHour = (hour) => {
                if (hour === 12) return '12 PM';
                if (hour === 0 || hour === 24) return '12 AM';
                const ampm = hour < 12 ? 'AM' : 'PM';
                const h = hour % 12 || 12;
                return `${h} ${ampm}`;
            };
            return `${formatHour(startTime)} - ${formatHour(endTime)}`;
        } catch (e) {
            return slot; // Fallback if format is unexpected
        }
    };

    useEffect(() => {
        if (outletId) {
            fetchPendingOrders();
        }
    }, [outletId]);

    const fetchPendingOrders = async () => {
        if (!outletId) {
            setOrdersError('Outlet ID not found');
            return;
        }
        setOrdersLoading(true);
        setOrdersError('');
        try {
            // Using the endpoint that fetches PENDING orders
            const response = await apiRequest(`/staff/outlets/get-current-order/${outletId}/`);
            if (response.orders) {
                const appOrders = response.orders
                    .filter(order => order.type?.toLowerCase() === 'app') // Ensure it's an app order
                    .map(order => ({
                        id: `#${order.id}`,
                        customer: order.customer?.user?.name || 'Guest',
                        date: new Date(order.createdAt).toLocaleDateString(),
                        time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        // --- ADDED deliveryDate and deliverySlot ---
                        deliveryDate: formatDate(order.deliveryDate),
                        deliverySlot: formatSlot(order.deliverySlot),
                        items: order.items.map(item => ({
                            name: item.product.name,
                            price: `₹${item.unitPrice.toFixed(2)}`,
                            description: item.product.description || 'No description',
                            qty: item.quantity
                        })),
                        totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
                        status: order.status.toLowerCase(),
                        orderId: order.id // Use the actual order ID for actions
                    }));
                setAllOrders(appOrders);
            } else {
                setAllOrders([]);
            }
        } catch (err) {
            console.error('Error fetching pending orders:', err);
            setOrdersError('Failed to fetch pending orders');
            setAllOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    };



    const handleOrderAction = (order, action) => {
        setSelectedOrder(order);
        setOrderModalAction(action);
        setShowOrderModal(true);
    };
    
    const handleConfirmOrderAction = async () => {
        if (!selectedOrder || !outletId) return;
        setOrderActionLoading(true);
        try {
            const status = orderModalAction === 'delivered' ? 'DELIVERED' : 'CANCELLED';
            await apiRequest('/staff/outlets/update-order/', {
                method: 'PUT',
                body: JSON.stringify({
                    orderId: parseInt(selectedOrder.orderId),
                    outletId: parseInt(outletId),
                    status
                }),
            });
            toast.success(`Order ${selectedOrder.id} marked as ${status.toLowerCase()}.`);
            fetchPendingOrders(); // Re-fetch to get the latest list
            handleCloseOrderModal();
        } catch (err) {
            toast.error(err.message || 'Error updating order');
        } finally {
            setOrderActionLoading(false);
        }
    };

    const handleCloseOrderModal = () => {
        setShowOrderModal(false);
        setSelectedOrder(null);
        setOrderModalAction('');
    };
    
    const getSortedOrders = () => {
        return [...allOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    };
    

    
    const handleOrderStackClick = (orderId) => {
        const ref = orderRefs.current[orderId];
        if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
            ref.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
            setTimeout(() => {
                ref.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
            }, 1500);
        }
    };

    const handleRefresh = () => {
        fetchPendingOrders();
    };
    
    return (
        <div className="space-y-6 p-6">
            {(error || ordersError) && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error || ordersError}</div>
            )}

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                       Pending App Orders
                    </h2>
                    <Button
                        variant="black"
                        onClick={handleRefresh}
                        disabled={loading || ordersLoading}
                    >
                        {loading || ordersLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ordersLoading ? (
                    <div className="col-span-full flex justify-center py-12"><Loader /></div>
                ) : allOrders.length > 0 ? (
                    allOrders.map((order) => (
                        <div 
                            key={order.orderId}
                            ref={el => orderRefs.current[order.orderId] = el}
                            className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                                <span className="font-bold text-gray-900">{order.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                    order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Customer</span>
                                    <span className="font-medium text-gray-900">{order.customer}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Scheduled For</span>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">{order.deliveryDate}</p>
                                        <p className="text-xs text-blue-600 font-semibold">{order.deliverySlot}</p>
                                    </div>
                                </div>
                                <div className="border-t border-dashed pt-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Items ({order.totalItems})</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                                <span className="text-gray-700">{item.qty}x {item.name}</span>
                                                <span className="text-gray-500">{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button 
                                        variant="success" 
                                        className="flex-1 text-xs py-2"
                                        onClick={() => handleOrderAction(order, 'delivered')}
                                    >
                                        Mark Delivered
                                    </Button>
                                    <Button 
                                        variant="danger" 
                                        className="text-xs py-2"
                                        onClick={() => handleOrderAction(order, 'cancel')}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium italic">No pending app orders for today</p>
                    </div>
                )}
            </div>

            <Modal isOpen={showOrderModal} onClose={handleCloseOrderModal} title={orderModalAction === 'delivered' ? 'Confirm Delivery' : 'Confirm Cancellation'} footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={handleCloseOrderModal} disabled={orderActionLoading}>Cancel</Button>
                    <Button variant={orderModalAction === 'delivered' ? 'success' : 'danger'} onClick={handleConfirmOrderAction} disabled={orderActionLoading}>
                        {orderActionLoading ? 'Processing...' : 'Confirm'}
                    </Button>
                </div>
            }>
                <p className="text-gray-600">{orderModalAction === 'delivered' ? `Mark order ${selectedOrder?.id} as delivered?` : `Cancel order ${selectedOrder?.id}?`}</p>
            </Modal>

        </div>
    );
};

export default Notifications;
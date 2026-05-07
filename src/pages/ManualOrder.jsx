import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { apiRequest } from '../utils/api';
import { useOutletDetails } from '../utils/outletUtils';
import { toast } from 'react-hot-toast';
import Loader from '../components/ui/Loader';

// Helper Component for the Menu Page
const MenuPage = ({
    selectedItems,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    isLoading,
    error,
    filteredMenuItems,
    categories,
    addToOrder,
    updateQuantity,
    getTotalAmount,
    handlePlaceOrder,
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 h-full gap-4 p-4">
        {/* Left: Order Summary */}
        <div className="lg:col-span-1 flex flex-col bg-white border border-gray-200 overflow-hidden rounded-lg shadow-sm">
            <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-xl font-semibold">Your Order</h2>
            </div>

            {/* Scrollable order items area */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {selectedItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <span className="text-4xl mb-2">🛒</span>
                        <p>Your order is empty.</p>
                        <p className="text-sm">Add items from the menu to get started!</p>
                    </div>
                )}
                <div className="space-y-4">
                    {selectedItems.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                            <img src={item.img} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">{item.name}</h4>
                                <p className="text-sm text-gray-600">₹{item.price}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="flex items-center justify-center w-7 h-7 bg-red-200 text-gray-700 rounded-full hover:bg-red-300 transition-colors duration-200"
                                    >
                                        <span className="text-xl font-semibold mb-1">−</span>
                                    </button>
                                    <span className="font-semibold text-lg min-w-[20px] text-center">
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="flex items-center justify-center w-7 h-7 bg-green-200 text-gray-700 rounded-full hover:bg-green-300 transition-colors duration-200"
                                    >
                                        <span className="text-xl font-semibold mb-1">+</span>
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-green-600">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fixed footer for total and button */}
            {selectedItems.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-xl">Total:</span>
                        <span className="font-bold text-xl text-green-600">₹{getTotalAmount()}</span>
                    </div>
                    <Button
                        className="w-full"
                        variant="success"
                        onClick={handlePlaceOrder}
                    >
                        Place Order ({selectedItems.length} items)
                    </Button>
                </div>
            )}
        </div>

        {/* Right: Menu Items */}
        <div className="lg:col-span-2 bg-white flex flex-col border border-gray-200 overflow-hidden rounded-lg shadow-sm">
            {/* Fixed header with search and categories */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full md:w-1/2 p-2 border rounded-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant={activeCategory === 'all' ? 'black' : 'secondary'}
                            onClick={() => setActiveCategory('all')}
                            size="sm"
                        >All</Button>
                        {categories.map(category => (
                            <Button
                                key={category}
                                variant={activeCategory === category ? 'black' : 'secondary'}
                                onClick={() => setActiveCategory(category)}
                                size="sm"
                            >
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrollable menu items area */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <Loader/>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center h-full text-red-500">
                        <p className="text-lg mb-2">Oops! Something went wrong.</p>
                        <p className="text-sm text-gray-500">{error}</p>
                        <Button
                            onClick={() => window.location.reload()}
                            className="mt-4"
                            size="sm"
                        >
                            Try Again
                        </Button>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredMenuItems.map(item => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:scale-105 cursor-pointer"
                                onClick={() => addToOrder(item)}
                            >
                                <div className="relative w-full h-48">
                                    <img
                                        src={item.img}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                    {item.quantityAvailable === 0 && (
                                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                            <span className="text-white text-lg font-semibold">Out of Stock</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h4 className="text-lg font-semibold truncate mb-1">{item.name}</h4>
                                    {/* --- MODIFIED: Truncated the description --- */}
                                    <p className="text-gray-600 text-sm mb-2 h-10">
                                        {item.description && item.description.length > 50
                                            ? `${item.description.substring(0, 35)}...`
                                            : item.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-green-600">₹{item.price}</span>
                                        <Badge variant={item.quantityAvailable > 0 ? 'success' : 'danger'}>
                                            {item.quantityAvailable > 0 ? `${item.quantityAvailable} in stock` : 'Sold out'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredMenuItems.length === 0 && (
                            <p className="col-span-full text-center text-gray-500 py-8">No items found</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// Helper Component for the Payment Page
const PaymentPage = ({
    currentOrder,
    paymentMethod,
    setPaymentMethod,
    isProcessingPayment,
    handleBackToMenu,
    handlePaymentComplete,
}) => (
    <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] h-full gap-4 p-4">
        <div className="overflow-y-auto scrollbar-hide">
            <Card title='Order Details'>
                <div className="space-y-4">
                    <div className="space-y-3">
                        {currentOrder?.items.map(item => (
                            <div key={item.id} className="border-b pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0 pr-3">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-600">
                                            ₹{item.price} × {item.quantity}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-2">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total Amount:</span>
                            <span>₹{currentOrder?.total}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
        <div className="overflow-y-auto scrollbar-hide">
            <Card title="Choose Payment Method">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'CASH', name: 'Cash', icon: '💵' },
                            { id: 'UPI', name: 'UPI', icon: '📱' },
                        ].map(method => (
                            <div
                                key={method.id}
                                className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === method.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setPaymentMethod(method.id)}
                            >
                                <div className="text-center">
                                    <div className="text-2xl mb-1">{method.icon}</div>
                                    <p className="font-medium text-sm">{method.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {paymentMethod && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-2">Selected: {
                                paymentMethod === 'CASH' ? 'Cash Payment' :
                                    paymentMethod === 'UPI' ? 'UPI Payment' :
                                        'Unknown'
                            }</h4>
                            <p className="text-sm text-gray-600 mb-4">
                                Amount to pay: ₹{currentOrder?.total}
                            </p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={handleBackToMenu}
                            className="flex-1"
                        >
                            Back to Menu
                        </Button>
                        <Button
                            variant="success"
                            onClick={handlePaymentComplete}
                            disabled={!paymentMethod || isProcessingPayment}
                            className="flex-1"
                        >
                            {isProcessingPayment ? 'Processing...' : 'Complete Payment'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    </div>
);


const ManualOrder = () => {
    const [selectedItems, setSelectedItems] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState('all')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [currentPage, setCurrentPage] = useState('menu') // 'menu' or 'payment'
    const [currentOrder, setCurrentOrder] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState('')
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)
    const [menuItems, setMenuItems] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    const { outletId } = useOutletDetails()

    // Fetch products from backend
    useEffect(() => {
        const fetchProducts = async () => {
            if (!outletId) return

            try {
                setIsLoading(true)
                setError(null)
                const response = await apiRequest(`/staff/outlets/get-products-in-stock/${outletId}`)
                
                // Transform backend data to match frontend structure
                const transformedProducts = response.products.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    category: product.category.toLowerCase(),
                    img: product.imageUrl || 'https://via.placeholder.com/100',
                    description: product.description,
                    quantityAvailable: product.quantityAvailable,
                    recipes: product.recipes || []
                }))
                
                setMenuItems(transformedProducts)
            } catch (error) {
                console.error('Error fetching products:', error)
                setError('Failed to load products. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchProducts()
    }, [outletId])

    const canAddQuantity = (product, additionalQty) => {
        const requiredMap = {};
        
        // Sum current cart simulation
        selectedItems.forEach(cartItem => {
            const qty = cartItem.id === product.id ? cartItem.quantity + additionalQty : cartItem.quantity;
            if (cartItem.recipes) {
                cartItem.recipes.forEach(r => {
                    const id = r.inventoryItemId;
                    if (!requiredMap[id]) requiredMap[id] = { req: 0, available: r.inventoryItem.currentStock, name: r.inventoryItem.itemName };
                    requiredMap[id].req += r.quantityPerServing * qty;
                });
            }
        });

        // Add the new product explicitly if it is missing from cart simulation
        if (!selectedItems.find(i => i.id === product.id)) {
            if (product.recipes) {
                product.recipes.forEach(r => {
                    const id = r.inventoryItemId;
                    if (!requiredMap[id]) requiredMap[id] = { req: 0, available: r.inventoryItem.currentStock, name: r.inventoryItem.itemName };
                    requiredMap[id].req += r.quantityPerServing * additionalQty;
                });
            }
        }

        for (const id in requiredMap) {
            if (requiredMap[id].req > requiredMap[id].available) {
                return { success: false, reason: requiredMap[id].name };
            }
        }
        return { success: true };
    };

    const addToOrder = (item) => {
        const exists = selectedItems.find(i => i.id === item.id);
        const currentQty = exists ? exists.quantity : 0;
        
        const check = canAddQuantity(item, 1);
        if (!check.success) {
            toast.error(`Out of stock! Insufficient shared raw material: ${check.reason}`);
            return;
        }

        if (exists) {
            setSelectedItems(selectedItems.map(i =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
        }
    }

    const removeFromOrder = (itemId) => {
        setSelectedItems(selectedItems.filter(item => item.id !== itemId));
    }

    const updateQuantity = (itemId, newQuantity) => {
        if (newQuantity === 0) {
            removeFromOrder(itemId);
        } else {
            const item = menuItems.find(i => i.id === itemId);
            const exists = selectedItems.find(i => i.id === itemId);
            const delta = newQuantity - (exists ? exists.quantity : 0);
            
            // Only strictly check bounds if attempting to INCREASE quantity
            if (delta > 0) {
                const check = canAddQuantity(item, delta);
                if (!check.success) {
                    toast.error(`Out of stock! Insufficient shared raw material: ${check.reason}`);
                    return;
                }
            }

            setSelectedItems(selectedItems.map(i =>
                i.id === itemId ? { ...i, quantity: newQuantity } : i
            ));
        }
    }

    const getTotalAmount = () => {
        const total = selectedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
        return total.toFixed(2);
    }

    const handlePlaceOrder = () => {
        if (selectedItems.length === 0) return
        setShowConfirmModal(true)
    }

    const handleConfirmOrder = () => {
        const order = {
            items: selectedItems,
            total: getTotalAmount(),
            timestamp: new Date().toISOString(),
        }
        setCurrentOrder(order)
        setShowConfirmModal(false)
        setCurrentPage('payment')
    }

    const handleCancelOrder = () => {
        setShowConfirmModal(false)
    }

    const handlePaymentComplete = async () => {
        if (!paymentMethod || !currentOrder) return

        setIsProcessingPayment(true)
        
        try {
            // Prepare order data for backend
            const orderData = {
                outletId: outletId,
                totalAmount: parseFloat(currentOrder.total),
                paymentMethod: paymentMethod.toUpperCase(),
                items: currentOrder.items.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    unitPrice: item.price
                }))
            }

            // Submit order to backend
            const response = await apiRequest('/staff/outlets/add-manual-order/', {
                method: 'POST',
                body: orderData
            })

            // Success
            toast.success(`Payment successful! Order #${response.order.id} has been placed.`)
            
            // Reset everything
            setSelectedItems([])
            setCurrentOrder(null)
            setPaymentMethod('')
            setCurrentPage('menu')
            
            // Re-fetch products to update available quantities
            const productsResponse = await apiRequest(`/staff/outlets/get-products-in-stock/${outletId}`)
            const transformedProducts = productsResponse.products.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category.toLowerCase(),
                img: product.imageUrl || 'https://via.placeholder.com/100',
                description: product.description,
                quantityAvailable: product.quantityAvailable,
                recipes: product.recipes || []
            }))
            setMenuItems(transformedProducts)

        } catch (error) {
            console.error('Error placing order:', error)
            toast.error(`Failed to place order: ${error.message}`)
        } finally {
            setIsProcessingPayment(false)
        }
    }

    const handleBackToMenu = () => {
        setCurrentPage('menu')
    }

    const filteredMenuItems = menuItems.filter(item =>
        (activeCategory === 'all' || item.category === activeCategory) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const categories = [...new Set(menuItems.map(item => item.category))]

    return (
        <div className="h-screen bg-bg overflow-hidden">
            {currentPage === 'menu' ? (
                <MenuPage
                    selectedItems={selectedItems}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    isLoading={isLoading}
                    error={error}
                    filteredMenuItems={filteredMenuItems}
                    categories={categories}
                    addToOrder={addToOrder}
                    updateQuantity={updateQuantity}
                    getTotalAmount={getTotalAmount}
                    handlePlaceOrder={handlePlaceOrder}
                />
            ) : (
                <PaymentPage
                    currentOrder={currentOrder}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    isProcessingPayment={isProcessingPayment}
                    handleBackToMenu={handleBackToMenu}
                    handlePaymentComplete={handlePaymentComplete}
                />
            )}

            {/* Order Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={handleCancelOrder}
                title="Confirm Order"
                footer={
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={handleCancelOrder}>
                            Cancel
                        </Button>
                        <Button variant="success" onClick={handleConfirmOrder}>
                            Proceed to Payment
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-gray-600">Please confirm your order details:</p>
                    <div className="bg-gray-50 p-3 rounded-lg max-h-48 overflow-y-auto scrollbar-hide">
                        {selectedItems.map(item => (
                            <div key={item.id} className="flex justify-between py-1 text-sm">
                                <span className="truncate pr-2">{item.name} × {item.quantity}</span>
                                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <hr className="my-2" />
                        <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span>₹{getTotalAmount()}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600">
                        Would you like to proceed with payment or cancel this order?
                    </p>
                </div>
            </Modal>
        </div>
    )
}

export default ManualOrder;
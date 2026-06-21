import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { apiRequest } from '../utils/api';
import { useOutletDetails } from '../utils/outletUtils';
import Loader from '../components/ui/Loader';

const Reports = () => {
    const reportContentRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false); // State for PDF generation
    const [error, setError] = useState(null);
    const { outletId } = useOutletDetails();

    const [dateRange, setDateRange] = useState({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    const [salesTrendData, setSalesTrendData] = useState([]);
    const [orderTypeData, setOrderTypeData] = useState([]);
    const [newCustomersData, setNewCustomersData] = useState([]);
    const [categoryBreakdownData, setCategoryBreakdownData] = useState([]);
    const [deliveryTimeData, setDeliveryTimeData] = useState([]);
    const [cancellationRefundData, setCancellationRefundData] = useState([]);
    const [quantitySoldData, setQuantitySoldData] = useState([]);

    const generatePDF = () => {
        const input = reportContentRef.current;
        if (input) {
            setPdfLoading(true);
            html2canvas(input, {
                scale: 2, 
                useCORS: true
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4'); 
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                
                const ratio = canvasWidth / canvasHeight;
                const imgHeight = pdfWidth / ratio;
                
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }
                
                pdf.save(`Staff_Report_${dateRange.from}_to_${dateRange.to}.pdf`);
                setPdfLoading(false);
            });
        }
    };

    const fetchAllData = async () => {
        if (!outletId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        const apiOptions = { method: 'POST', body: dateRange };
        const dataFetchers = [
            apiRequest(`/staff/outlets/sales-trend/${outletId}/`, apiOptions),
            apiRequest(`/staff/outlets/order-type-breakdown/${outletId}/`, apiOptions),
            apiRequest(`/staff/outlets/new-customers-trend/${outletId}/`, apiOptions),
            apiRequest(`/staff/outlets/category-breakdown/${outletId}/`, apiOptions),
            apiRequest(`/staff/outlets/delivery-time-orders/${outletId}/`, apiOptions),
            apiRequest(`/staff/outlets/cancellation-refunds/${outletId}/`, apiOptions),
            apiRequest(`/staff/outlets/quantity-sold/${outletId}/`, apiOptions)
        ];
        const results = await Promise.allSettled(dataFetchers);
        if (results[0].status === 'fulfilled') setSalesTrendData(results[0].value || []);
        if (results[1].status === 'fulfilled') setOrderTypeData(results[1].value || []);
        if (results[2].status === 'fulfilled') setNewCustomersData(results[2].value || []);
        if (results[3].status === 'fulfilled') setCategoryBreakdownData(results[3].value || []);
        if (results[4].status === 'fulfilled') setDeliveryTimeData(results[4].value || []);
        if (results[5].status === 'fulfilled') setCancellationRefundData(results[5].value || []);
        if (results[6].status === 'fulfilled') setQuantitySoldData(results[6].value || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchAllData();
    }, [outletId, dateRange]);

    const formatCurrency = (amount) => `₹${amount || 0}`;
    const formatDateForDisplay = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    const formatDeliverySlot = (slot) => {
        const slotMap = {'SLOT_11_12':'11:00-12:00','SLOT_12_13':'12:00-13:00','SLOT_13_14':'13:00-14:00','SLOT_14_15':'14:00-15:00','SLOT_15_16':'15:00-16:00','SLOT_16_17':'16:00-17:00'};
        return slotMap[slot] || slot;
    };
    const handleDateRangeChange = (field, value) => setDateRange(prev => ({ ...prev, [field]: value }));
    const setQuickDateRange = (days) => {
        const to = new Date().toISOString().split('T')[0];
        const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setDateRange({ from, to });
    };
    const isQuickDateRangeActive = (days) => {
        const expectedFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const expectedTo = new Date().toISOString().split('T')[0];
        return dateRange.from === expectedFrom && dateRange.to === expectedTo;
    };
    const SalesTrendTooltip = ({ active, payload, label }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{`Date: ${formatDateForDisplay(label)}`}</p><p className="text-blue-600">Revenue: {formatCurrency(payload[0].value)}</p></div>); } return null; };
    const OrderTypeTooltip = ({ active, payload }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{payload[0].name}</p><p className="text-blue-600">Orders: {payload[0].value}</p></div>); } return null; };
    const NewCustomersTooltip = ({ active, payload, label }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{`Date: ${formatDateForDisplay(label)}`}</p><p className="text-green-600">New Customers: {payload[0].value}</p></div>); } return null; };
    const CategoryTooltip = ({ active, payload }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{payload[0].name}</p><p className="text-purple-600">Orders: {payload[0].value}</p></div>); } return null; };
    const DeliveryTimeTooltip = ({ active, payload, label }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{`Time: ${formatDeliverySlot(label)}`}</p><p className="text-indigo-600">Orders: {payload[0].value}</p></div>); } return null; };
    const CancellationRefundTooltip = ({ active, payload, label }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{`Date: ${formatDateForDisplay(label)}`}</p>{payload.map((entry, index) => (<p key={index} style={{ color: entry.color }}>{`${entry.name}: ${entry.value}`}</p>))}</div>); } return null; };
    const QuantitySoldTooltip = ({ active, payload, label }) => { if (active && payload?.length) { return (<div className="bg-white p-3 border border-gray-300 rounded shadow-lg"><p className="font-semibold">{label}</p><p className="text-orange-600">Quantity Sold: {payload[0].value}</p></div>); } return null; };
    const getOrderTypePieData = () => { if (!orderTypeData || typeof orderTypeData.appOrders === 'undefined') return []; return [{ name: 'App Orders', value: orderTypeData.appOrders || 0, color: '#3b82f6' },{ name: 'Manual Orders', value: orderTypeData.manualOrders || 0, color: '#10b981' }].filter(item => item.value > 0); };
    const getCategoryPieData = () => { if (!Array.isArray(categoryBreakdownData)) return []; const colors = { 'Meals': '#3b82f6', 'Starters': '#10b981', 'Desserts': '#f59e0b', 'Beverages': '#8b5cf6', 'Combo': '#ec4899' }; return categoryBreakdownData.map(item => ({ name: item.category, value: item.orderCount, color: colors[item.category] || '#6b7280' })).filter(item => item.value > 0); };
    const getDeliveryTimeLineData = () => { if (!Array.isArray(deliveryTimeData)) return []; return deliveryTimeData.map(item => ({ ...item, time: formatDeliverySlot(item.deliverySlot) })); };
    
    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-4xl font-bold">Staff Reports</h1>
                <div className="flex justify-center items-center h-64"><Loader /></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold">Staff Reports</h1>
                <Button variant="black" onClick={generatePDF} disabled={pdfLoading}>
                    {pdfLoading ? 'Generating...' : 'Download Report'}
                </Button>
            </div>

            <div ref={reportContentRef} className="bg-white">
                <div className="space-y-6 p-4">
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700">Date Range:</span>
                            <div className="flex space-x-2">
                                <Button variant={isQuickDateRangeActive(7) ? 'black' : 'secondary'} onClick={() => setQuickDateRange(7)} className="text-sm px-3 py-1">7 Days</Button>
                                <Button variant={isQuickDateRangeActive(30) ? 'black' : 'secondary'} onClick={() => setQuickDateRange(30)} className="text-sm px-3 py-1">30 Days</Button>
                                <Button variant={isQuickDateRangeActive(90) ? 'black' : 'secondary'} onClick={() => setQuickDateRange(90)} className="text-sm px-3 py-1">90 Days</Button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Custom:</span>
                            <input type="date" value={dateRange.from} onChange={(e) => handleDateRangeChange('from', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                            <span className="text-gray-500">to</span>
                            <input type="date" value={dateRange.to} onChange={(e) => handleDateRangeChange('to', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                    </div>

                    {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4"><div className="text-red-700 text-sm">Error: {error}</div></div>}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Sales Trend">
                            {salesTrendData?.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="date" tickLine={true} tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }} height={80} interval={0} tickFormatter={formatDateForDisplay} />
                                            <YAxis tickLine={true} tick={{ fontSize: 12 }} label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip content={<SalesTrendTooltip />} />
                                            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <div className="text-center py-16 text-gray-500">No sales trend data found</div>}
                        </Card>

                        <Card title="Order Type Breakdown">
                            {getOrderTypePieData().length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={getOrderTypePieData()} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} innerRadius={40} dataKey="value">
                                                {getOrderTypePieData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip content={<OrderTypeTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <div className="text-center py-16 text-gray-500">No order type data found</div>}
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="New Customers Trend">
                            {newCustomersData?.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={newCustomersData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="date" tickLine={true} tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }} height={80} interval={0} tickFormatter={formatDateForDisplay} />
                                            <YAxis tickLine={true} tick={{ fontSize: 12 }} label={{ value: 'New Customers', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip content={<NewCustomersTooltip />} />
                                            <Bar dataKey="newCustomers" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <div className="text-center py-16 text-gray-500">No new customers data found</div>}
                        </Card>

                        <Card title="Category Wise Breakdown">
                            {getCategoryPieData().length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={getCategoryPieData()} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} innerRadius={40} dataKey="value">
                                                {getCategoryPieData().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip content={<CategoryTooltip />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <div className="text-center py-16 text-gray-500">No category breakdown data found</div>}
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Orders by Delivery Time">
                            {deliveryTimeData?.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={getDeliveryTimeLineData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="time" tickLine={true} tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }} height={80} interval={0} />
                                            <YAxis tickLine={true} tick={{ fontSize: 12 }} label={{ value: 'Number of Orders', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip content={<DeliveryTimeTooltip />} />
                                            <Line type="monotone" dataKey="orderCount" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <div className="text-center py-16 text-gray-500">No delivery time data found</div>}
                        </Card>

                        <Card title="Cancellations and Refunds">
                            {cancellationRefundData?.length > 0 ? (
                                <div className="h-96 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cancellationRefundData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="date" tickLine={true} tick={{ fontSize: 12, angle: -45, textAnchor: 'end' }} height={80} interval={0} tickFormatter={formatDateForDisplay} />
                                            <YAxis tickLine={true} tick={{ fontSize: 12 }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip content={<CancellationRefundTooltip />} />
                                            <Legend />
                                            <Bar dataKey="cancellations" fill="#ef4444" name="Cancellations" radius={[2, 2, 0, 0]} />
                                            <Bar dataKey="refunds" fill="#2563eb" name="Refunds" radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : <div className="text-center py-16 text-gray-500">No cancellation/refund data found</div>}
                        </Card>
                    </div>
                    
                    <Card title="Quantity Sold by Dishes">
                        {quantitySoldData?.length > 0 ? (
                            <div className="h-[750px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={quantitySoldData} margin={{ top: 20, right: 30, left: 20, bottom: 150 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="productName" tickLine={true} tick={{ fontSize: 12, angle: -60, textAnchor: 'end' }} height={150} interval={0} />
                                        <YAxis tickLine={true} tick={{ fontSize: 12 }} label={{ value: 'Quantity Sold', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip content={<QuantitySoldTooltip />} />
                                        <Bar dataKey="quantitySold" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <div className="text-center py-16 text-gray-500">No quantity sold data found</div>}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Reports;
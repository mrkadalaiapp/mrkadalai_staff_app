import React, { useContext, useState, useEffect } from 'react'
import { Search, Bell, User, Menu } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import { useOutletDetails } from '../utils/outletUtils'
import { apiRequest } from '../utils/api'
import logo from '../assets/logo3.png'

const Header = ({ onMenuClick }) => {
    const { user } = useContext(AuthContext)
    const { outletName } = useOutletDetails()
    const [staffProfile, setStaffProfile] = useState(null);

    useEffect(() => {
        const fetchStaffProfile = async () => {
            try {
                // Fetch profile data from the backend
                const data = await apiRequest('/staff/profile');
                if (data && data.profile) {
                    setStaffProfile(data.profile);
                }
            } catch (error) {
                console.error("Failed to fetch staff profile:", error);
            }
        };

        fetchStaffProfile();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Use fetched name and designation, with fallbacks to original logic or defaults
    const displayName = staffProfile?.name || user?.email?.split('@')[0] || 'Guest';
    const designation = staffProfile?.designation || 'Restaurant Manager';

    return (
        <header className="bg-header shadow-sm border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Mobile menu button */}
                    <button
                        type="button"
                        className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        onClick={onMenuClick}
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <img src={'https://ezjbzdcdqvarkkbteptl.supabase.co/storage/v1/object/public/images/logo3.png'} alt="logo" className="h-8 w-auto" />

                    {/* Outlet Name Display */}
                    <div className="flex-1 max-w-md mx-4">
                        <div className="text-center">
                            <h1 className="text-lg font-semibold text-gray-800">
                                {outletName || 'Loading...'}
                            </h1>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {/* Notifications */}
                        {/* <button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full">
                            <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
                        </button> */}

                        {/* Profile */}
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0">
                                {staffProfile?.imageUrl ? (
                                    <img
                                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover"
                                        src={staffProfile.imageUrl}
                                        alt="Profile"
                                    />
                                ) : (
                                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-theme flex items-center justify-center">
                                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                                    </div>
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">{displayName}</div>
                                <div className="text-xs text-gray-500">{designation}</div>
                            </div>
                        </div>

                        {/* Logout button */}
                        {/* <button
                            onClick={signOut}
                            className="ml-2 px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Logout
                        </button> */}
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header


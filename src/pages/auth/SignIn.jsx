import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { ROUTES } from '../../utils/constants.js';

const SignIn = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [formErrors, setFormErrors] = useState({});

    const { signIn, loading, error, clearError, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // *  Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || ROUTES.DASHBOARD;
            navigate(from, { replace: true });  
        }
    }, [isAuthenticated, navigate, location]);

    useEffect(() => {
        return () => {
            if (clearError) clearError();
        };
    }, [clearError]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                if (clearError) clearError();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, clearError]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email is invalid';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            await signIn(formData);
        } catch (err) {
        }
    };

    return (
        <div 
            className="min-h-screen w-full flex items-center justify-center p-4"
            style={{
                backgroundColor: 'black',
                backgroundImage: `url('https://ezjbzdcdqvarkkbteptl.supabase.co/storage/v1/object/public/images/stbg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl w-full max-w-md">
                <div className="text-center">
                    <img src="https://ezjbzdcdqvarkkbteptl.supabase.co/storage/v1/object/public/images/logo2.jpeg" alt="Logo" className="mx-auto h-20 w-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">
                        Welcome Back
                    </h2>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="text-sm font-semibold text-gray-700 block mb-1">
                            User Name
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            className={`w-full px-4 py-3 bg-white rounded-lg border-2 ${formErrors.email ? 'border-red-500' : 'border-gray-900'} focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200`}
                        />
                        {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                        <label htmlFor="password" className="text-sm font-semibold text-gray-700 block mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="************"
                            className={`w-full px-4 py-3 bg-white rounded-lg border-2 ${formErrors.password ? 'border-red-500' : 'border-gray-900'} focus:outline-none focus:ring-2 focus:ring-yellow-500 transition duration-200`}
                        />
                        {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-200 ease-in-out disabled:bg-yellow-300 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link
                        to={ROUTES.SIGN_UP}
                        className="font-medium text-yellow-600 hover:text-yellow-500"
                    >
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignIn;
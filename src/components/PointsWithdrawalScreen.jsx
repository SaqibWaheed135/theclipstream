import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Star, History, Clock, CheckCircle, XCircle, AlertCircle, Loader2, User, Mail, Phone, CreditCard, Building, RefreshCw, Wallet } from 'lucide-react';

const PointsWithdrawalScreen = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('withdraw');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedWithdrawalMethod, setSelectedWithdrawalMethod] = useState('paypal');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [withdrawalDetails, setWithdrawalDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    paypalEmail: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    swiftCode: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    usdtWalletAddress: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  const API_BASE_URL = 'https://theclipstream-backend.onrender.com/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Skeleton components
  const Skeleton = ({ className = "", children, ...props }) => (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] animate-shimmer rounded ${className}`}
      {...props}
    >
      {children}
    </div>
  );

  const WithdrawalSkeleton = () => (
    <div className="min-h-screen bg-black text-white">
      {/* Header Skeleton */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="text-right">
              <div className="flex items-center space-x-2 justify-end">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Balance Card Skeleton */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-4 w-32 mx-auto mb-1" />
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Skeleton className="h-3 w-28 mx-auto" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="bg-gray-900 rounded-lg p-1 mb-6">
          <div className="flex">
            <div className="flex-1 py-3 px-4">
              <Skeleton className="h-6 w-20 mx-auto" />
            </div>
            <div className="flex-1 py-3 px-4">
              <Skeleton className="h-6 w-16 mx-auto" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          {/* Amount Input Skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>

          {/* Methods Skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-6 h-6 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Skeleton */}
          <div className="bg-gray-900 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
            <div className="flex items-center mb-4">
              <Skeleton className="w-5 h-5 rounded mr-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Submit Button Skeleton */}
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );

  const HistorySkeleton = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-700 bg-gray-900 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div>
                  <Skeleton className="h-6 w-16 mb-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            
            <div className="space-y-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const withdrawalMethods = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: DollarSign,
      description: 'Withdraw to your PayPal account',
      minAmount: 10,
      processingTime: '1-2 business days',
      fees: '2% + $0.30'
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: Building,
      description: 'Direct deposit to your bank account',
      minAmount: 25,
      processingTime: '3-5 business days',
      fees: '$2.00 flat fee'
    },
    {
      id: 'card',
      name: 'Debit Card',
      icon: CreditCard,
      description: 'Instant withdrawal to debit card',
      minAmount: 5,
      processingTime: 'Instant',
      fees: '3% + $0.25'
    },
    {
      id: 'usdt',
      name: 'USDT Wallet',
      icon: Wallet,
      description: 'Withdraw to your USDT (Tether) wallet',
      minAmount: 20,
      processingTime: '1-3 business days',
      fees: '1% + $1.00'
    }
  ];

  // Fetch points balance
  const fetchPointsBalance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/points/balance`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPointsBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching points balance:', error);
      setPointsBalance(1250);
    }
  };

  // Fetch withdrawal history
  const fetchWithdrawalHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/withdrawals/history`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setWithdrawalHistory(data.withdrawals || []);
      } else {
        setWithdrawalHistory([
          {
            _id: '1',
            requestId: 'WD17265432109ABCD',
            amount: 50,
            pointsToDeduct: 500,
            method: 'paypal',
            status: 'pending',
            requestedAt: new Date().toISOString(),
            details: { fullName: 'John Doe', paypalEmail: 'user@example.com' }
          },
          {
            _id: '2',
            requestId: 'WD17265432108EFGH',
            amount: 25,
            pointsToDeduct: 250,
            method: 'bank',
            status: 'approved',
            requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            approvedAt: new Date(Date.now() - 86400000).toISOString(),
            details: { fullName: 'John Doe', bankName: 'Chase Bank' }
          },
          {
            _id: '3',
            requestId: 'WD17265432107IJKL',
            amount: 15,
            pointsToDeduct: 150,
            method: 'card',
            status: 'completed',
            requestedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
            approvedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
            completedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            details: { fullName: 'John Doe', cardholderName: 'John Doe' }
          },
          {
            _id: '4',
            requestId: 'WD17265432106MNOP',
            amount: 100,
            pointsToDeduct: 1000,
            method: 'usdt',
            status: 'rejected',
            requestedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
            rejectedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
            rejectionReason: 'Invalid wallet address',
            details: { fullName: 'John Doe', usdtWalletAddress: '0x1234567890abcdef1234567890abcdef12345678' }
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      setWithdrawalHistory([
        {
          _id: '1',
          requestId: 'WD17265432109ABCD',
          amount: 50,
          pointsToDeduct: 500,
          method: 'paypal',
          status: 'pending',
          requestedAt: new Date().toISOString(),
          details: { fullName: 'John Doe', paypalEmail: 'user@example.com' }
        },
        {
          _id: '2',
          requestId: 'WD17265432108EFGH',
          amount: 25,
          pointsToDeduct: 250,
          method: 'bank',
          status: 'approved',
          requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          approvedAt: new Date(Date.now() - 86400000).toISOString(),
          details: { fullName: 'John Doe', bankName: 'Chase Bank' }
        }
      ]);
    }
  };

  // Cancel withdrawal
  const cancelWithdrawal = async (withdrawalId) => {
    try {
      setProcessing(true);
      const response = await fetch(`${API_BASE_URL}/withdrawals/cancel/${withdrawalId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSuccess('Withdrawal request cancelled successfully');
        await fetchWithdrawalHistory();
      } else {
        const data = await response.json();
        setError(data.msg || 'Failed to cancel withdrawal request');
      }
    } catch (error) {
      console.error('Cancel withdrawal error:', error);
      setError('Failed to cancel withdrawal request');
    } finally {
      setProcessing(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPointsBalance(),
      fetchWithdrawalHistory()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPointsBalance(),
        fetchWithdrawalHistory()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  const pointsToUSD = (points) => {
    return points / 10; // 10 points = $1
  };

  const usdToPoints = (usd) => {
    return usd * 10; // $1 = 10 points
  };

  const validateForm = () => {
    const errors = {};

    if (!withdrawalDetails.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!withdrawalDetails.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(withdrawalDetails.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!withdrawalDetails.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    if (selectedWithdrawalMethod === 'paypal') {
      if (!withdrawalDetails.paypalEmail.trim()) {
        errors.paypalEmail = 'PayPal email is required';
      }
    } else if (selectedWithdrawalMethod === 'bank') {
      if (!withdrawalDetails.bankName.trim()) {
        errors.bankName = 'Bank name is required';
      }
      if (!withdrawalDetails.accountNumber.trim()) {
        errors.accountNumber = 'Account number is required';
      }
      if (!withdrawalDetails.accountHolderName.trim()) {
        errors.accountHolderName = 'Account holder name is required';
      }
    } else if (selectedWithdrawalMethod === 'card') {
      if (!withdrawalDetails.accountNumber.trim()) {
        errors.accountNumber = 'Card number is required';
      }
      if (!withdrawalDetails.accountHolderName.trim()) {
        errors.accountHolderName = 'Cardholder name is required';
      }
    } else if (selectedWithdrawalMethod === 'usdt') {
      if (!withdrawalDetails.usdtWalletAddress.trim()) {
        errors.usdtWalletAddress = 'USDT wallet address is required';
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawalDetails.usdtWalletAddress)) {
        errors.usdtWalletAddress = 'Please enter a valid Ethereum wallet address (0x followed by 40 hexadecimal characters)';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setWithdrawalDetails(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalAmount);
    const pointsRequired = usdToPoints(amount);
    const selectedMethod = withdrawalMethods.find(m => m.id === selectedWithdrawalMethod);

    // Validation
    if (!amount || amount <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    if (amount < selectedMethod.minAmount) {
      setError(`Minimum withdrawal amount for ${selectedMethod.name} is $${selectedMethod.minAmount}`);
      return;
    }

    if (pointsRequired > pointsBalance) {
      setError(`Insufficient points. You need ${pointsRequired.toLocaleString()} points but only have ${pointsBalance.toLocaleString()}`);
      return;
    }

    if (!validateForm()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/withdrawals/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount,
          pointsToDeduct: pointsRequired,
          method: selectedWithdrawalMethod,
          details: {
            fullName: withdrawalDetails.fullName,
            email: withdrawalDetails.email,
            phone: withdrawalDetails.phone,
            paypalEmail: selectedWithdrawalMethod === 'paypal' ? withdrawalDetails.paypalEmail : null,
            bankDetails: selectedWithdrawalMethod === 'bank' ? {
              bankName: withdrawalDetails.bankName,
              accountNumber: withdrawalDetails.accountNumber,
              routingNumber: withdrawalDetails.routingNumber,
              accountHolderName: withdrawalDetails.accountHolderName,
              swiftCode: withdrawalDetails.swiftCode
            } : null,
            cardDetails: selectedWithdrawalMethod === 'card' ? {
              cardNumber: withdrawalDetails.accountNumber,
              cardholderName: withdrawalDetails.accountHolderName
            } : null,
            usdtDetails: selectedWithdrawalMethod === 'usdt' ? {
              walletAddress: withdrawalDetails.usdtWalletAddress
            } : null,
            address: {
              street: withdrawalDetails.address,
              city: withdrawalDetails.city,
              state: withdrawalDetails.state,
              zipCode: withdrawalDetails.zipCode,
              country: withdrawalDetails.country || 'US'
            }
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Withdrawal request submitted successfully! Request ID: ${data.withdrawal.requestId}`);

        // Reset form
        setWithdrawalAmount('');
        setWithdrawalDetails({
          fullName: '',
          email: '',
          phone: '',
          paypalEmail: '',
          bankName: '',
          accountNumber: '',
          routingNumber: '',
          accountHolderName: '',
          swiftCode: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          usdtWalletAddress: ''
        });
        setValidationErrors({});

        // Refresh data
        await Promise.all([
          fetchPointsBalance(),
          fetchWithdrawalHistory()
        ]);

        // Switch to history tab
        setActiveTab('history');
      } else {
        setError(data.msg || 'Withdrawal request failed');
      }
    } catch (error) {
      console.error('Withdrawal request error:', error);
      setError('Withdrawal request failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'approved':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'approved':
      case 'completed':
        return 'text-green-400';
      case 'rejected':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/30 border-yellow-600/50';
      case 'approved':
      case 'completed':
        return 'bg-green-900/30 border-green-600/50';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-900/30 border-red-600/50';
      default:
        return 'bg-gray-900/30 border-gray-600/50';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'paypal':
        return <DollarSign className="w-5 h-5" />;
      case 'bank':
        return <Building className="w-5 h-5" />;
      case 'card':
        return <CreditCard className="w-5 h-5" />;
      case 'usdt':
        return <Wallet className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  // Loading screen with skeleton
  if (loading) {
    return <WithdrawalSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Custom styles for shimmer effect */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
          background-size: 200% 100%;
        }
        
        .animate-shimmer-slide {
          animation: shimmer-slide 2s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Withdraw Points</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-lg font-bold text-yellow-400">{pointsBalance.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400">
                ≈ ${pointsToUSD(pointsBalance).toFixed(2)} USD
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-green-600 to-blue-600 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <DollarSign className="w-8 h-8 text-green-200" />
              <h2 className="text-3xl font-bold text-white">
                ${pointsToUSD(pointsBalance).toFixed(2)}
              </h2>
            </div>
            <p className="text-green-100">Available for Withdrawal</p>
            <p className="text-sm text-green-200 mt-1">
              {pointsBalance.toLocaleString()} points
            </p>
            {/* 👇 Conversion Rate Note */}
            <p className="text-xs text-green-100 mt-2 italic">
              Conversion Rate: 10 points = $1
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${activeTab === 'withdraw'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Withdraw
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${activeTab === 'history'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-white'
              }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            History
          </button>
        </div>

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6">
            {/* Withdrawal Amount */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Withdrawal Amount</h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="1"
                  max={pointsToUSD(pointsBalance)}
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => {
                    setWithdrawalAmount(e.target.value);
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>
              {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                <div className="mt-2 flex items-center space-x-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">
                    {usdToPoints(parseFloat(withdrawalAmount)).toLocaleString()} points will be deducted
                  </span>
                </div>
              )}
            </div>

            {/* Withdrawal Methods */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Withdrawal Method</h3>
              <div className="grid grid-cols-1 gap-3">
                {withdrawalMethods.map((method) => {
                  const IconComponent = method.icon;
                  const isDisabled = withdrawalAmount && parseFloat(withdrawalAmount) < method.minAmount;

                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        if (!isDisabled) {
                          setSelectedWithdrawalMethod(method.id);
                          setError('');
                          setSuccess('');
                        }
                      }}
                      disabled={isDisabled}
                      className={`p-4 rounded-lg border-2 transition-all ${selectedWithdrawalMethod === method.id
                        ? 'border-green-500 bg-green-600/20'
                        : isDisabled
                          ? 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-6 h-6" />
                        <div className="text-left flex-1">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-gray-400">{method.description}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Min: ${method.minAmount} • {method.processingTime} • Fee: {method.fees}
                          </div>
                        </div>
                        {selectedWithdrawalMethod === method.id && !isDisabled && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </h3>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={withdrawalDetails.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.fullName ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.fullName && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={withdrawalDetails.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.email ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.email && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                  )}
                </div>

                <div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={withdrawalDetails.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.phone ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.phone && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Method Specific Fields */}
            {selectedWithdrawalMethod === 'paypal' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  PayPal Information
                </h3>

                <div>
                  <input
                    type="email"
                    placeholder="PayPal Email Address"
                    value={withdrawalDetails.paypalEmail}
                    onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.paypalEmail ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.paypalEmail && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.paypalEmail}</p>
                  )}
                </div>
              </div>
            )}

            {selectedWithdrawalMethod === 'bank' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Bank Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={withdrawalDetails.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.bankName ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.bankName && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Account Holder Name"
                      value={withdrawalDetails.accountHolderName}
                      onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.accountHolderName ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.accountHolderName && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.accountHolderName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={withdrawalDetails.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.accountNumber ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.accountNumber && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.accountNumber}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Routing Number (Optional)"
                      value={withdrawalDetails.routingNumber}
                      onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedWithdrawalMethod === 'card' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Debit Card Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Cardholder Name"
                      value={withdrawalDetails.accountHolderName}
                      onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.accountHolderName ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.accountHolderName && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.accountHolderName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Card Number"
                      value={withdrawalDetails.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.accountNumber ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.accountNumber && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.accountNumber}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedWithdrawalMethod === 'usdt' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  USDT Wallet Information
                </h3>

                <div>
                  <input
                    type="text"
                    placeholder="USDT Wallet Address (e.g., 0x1234567890abcdef1234567890abcdef12345678)"
                    value={withdrawalDetails.usdtWalletAddress}
                    onChange={(e) => handleInputChange('usdtWalletAddress', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${validationErrors.usdtWalletAddress ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.usdtWalletAddress && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.usdtWalletAddress}</p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleWithdrawalRequest}
              disabled={processing || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-blue-700 transition-all"
            >
              {processing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Request...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Request Withdrawal - ${withdrawalAmount || '0'}</span>
                </div>
              )}
            </button>

            {/* Important Notice */}
            <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-yellow-400 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Important Notice
              </h4>
              <ul className="text-sm text-yellow-100 space-y-1">
                <li>• All withdrawal requests require admin approval</li>
                <li>• Processing may take 1-5 business days depending on method</li>
                <li>• Points will be deducted upon approval, not upon request</li>
                <li>• Ensure all information is accurate to avoid delays</li>
                <li>• Contact support if you need to cancel a pending request</li>
              </ul>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Withdrawal History</h3>
              <div className="text-sm text-gray-400">
                {withdrawalHistory.length} total requests
              </div>
            </div>

            {withdrawalHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-400 mb-2">No Withdrawals Yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't made any withdrawal requests yet.
                </p>
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Make Your First Withdrawal
                </button>
              </div>
            ) : (
              <HistorySkeleton />
            )}

            {withdrawalHistory.length > 0 && (
              <div className="space-y-4">
                {withdrawalHistory.map((withdrawal) => (
                  <div
                    key={withdrawal._id}
                    className={`rounded-xl border p-4 ${getStatusBg(withdrawal.status)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getMethodIcon(withdrawal.method)}
                        <div>
                          <div className="font-semibold text-lg">${withdrawal.amount}</div>
                          <div className="text-sm text-gray-400">
                            {withdrawal.method.charAt(0).toUpperCase() +
                              withdrawal.method.slice(1)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(withdrawal.status)}
                        <span
                          className={`font-medium capitalize ${getStatusColor(withdrawal.status)}`}
                        >
                          {withdrawal.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Request ID:</span>
                        <span className="font-mono">{withdrawal.requestId}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Points Deducted:</span>
                        <span className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span>
                            {withdrawal.pointsToDeduct?.toLocaleString() ||
                              (withdrawal.amount * 10).toLocaleString()}
                          </span>
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Requested:</span>
                        <span>{formatDate(withdrawal.requestedAt)}</span>
                      </div>

                      {withdrawal.approvedAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Approved:</span>
                          <span className="text-green-400">
                            {formatDate(withdrawal.approvedAt)}
                          </span>
                        </div>
                      )}

                      {withdrawal.completedAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Completed:</span>
                          <span className="text-green-400">
                            {formatDate(withdrawal.completedAt)}
                          </span>
                        </div>
                      )}

                      {withdrawal.rejectedAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rejected:</span>
                          <span className="text-red-400">
                            {formatDate(withdrawal.rejectedAt)}
                          </span>
                        </div>
                      )}

                      {withdrawal.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-900/30 border border-red-600/50 rounded">
                          <div className="text-sm text-red-300">
                            <span className="font-medium">Rejection Reason: </span>
                            {withdrawal.rejectionReason}
                          </div>
                        </div>
                      )}

                      {withdrawal.adminNotes && (
                        <div className="mt-2 p-2 bg-blue-900/30 border border-blue-600/50 rounded">
                          <div className="text-sm text-blue-300">
                            <span className="font-medium">Admin Notes: </span>
                            {withdrawal.adminNotes}
                          </div>
                        </div>
                      )}

                      {/* Payment Details */}
                      {withdrawal.details && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="text-xs text-gray-500 mb-2">
                            Payment Details:
                          </div>
                          <div className="space-y-1 text-sm">
                            {withdrawal.details.fullName && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Name:</span>
                                <span>{withdrawal.details.fullName}</span>
                              </div>
                            )}

                            {withdrawal.method === 'paypal' &&
                              withdrawal.details.paypalEmail && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">PayPal:</span>
                                  <span>{withdrawal.details.paypalEmail}</span>
                                </div>
                              )}

                            {withdrawal.method === 'bank' &&
                              withdrawal.details.bankDetails && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Bank:</span>
                                  <span>
                                    {withdrawal.details.bankDetails.bankName ||
                                      withdrawal.details.bankName}
                                  </span>
                                </div>
                              )}

                            {withdrawal.method === 'card' &&
                              withdrawal.details.cardDetails && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Card:</span>
                                  <span>
                                    {withdrawal.details.cardDetails.cardholderName ||
                                      withdrawal.details.cardholderName}
                                  </span>
                                </div>
                              )}

                            {withdrawal.method === 'usdt' &&
                              withdrawal.details.usdtDetails && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">USDT Wallet:</span>
                                  <span className="font-mono truncate w-40">
                                    {withdrawal.details.usdtDetails.walletAddress}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {withdrawal.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <button
                            onClick={() => cancelWithdrawal(withdrawal._id)}
                            disabled={processing}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? (
                              <div className="flex items-center justify-center space-x-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Cancelling...</span>
                              </div>
                            ) : (
                              'Cancel Request'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Stats */}
            {withdrawalHistory.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      $
                      {withdrawalHistory
                        .filter((w) => w.status === 'completed')
                        .reduce((sum, w) => sum + w.amount, 0)
                        .toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">Total Withdrawn</div>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      $
                      {withdrawalHistory
                        .filter((w) => w.status === 'pending')
                        .reduce((sum, w) => sum + w.amount, 0)
                        .toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsWithdrawalScreen;
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CreditCard, DollarSign, Star, Gift, History, CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, Calendar, Lock, Upload, Copy, QrCode, ExternalLink, RefreshCw } from 'lucide-react';
import { QRCodeCanvas } from "qrcode.react";

const PointsRechargeScreen = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('recharge');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('usdt');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showUsdtPayment, setShowUsdtPayment] = useState(false);
  const [usdtPaymentData, setUsdtPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [countdown, setCountdown] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    paypalEmail: '',
    transactionScreenshot: null,
    transactionId: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const hasAlertedRef = useRef(false);
  const pollingIntervalRef = useRef(null);

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

  const RechargeSkeleton = () => (
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

      {/* Header Skeleton */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 justify-end">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-3 w-20 mt-1" />
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
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-4 w-28 mx-auto" />
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
          {/* Amount Options Skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="flex items-center space-x-2 mb-1">
                        <Skeleton className="h-6 w-12" />
                        {i === 2 && <Skeleton className="h-5 w-16 rounded-full" />}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Skeleton className="w-4 h-4 rounded" />
                        <Skeleton className="h-4 w-20" />
                        {i > 2 && <Skeleton className="h-3 w-16" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Amount Skeleton */}
          <div>
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>

          {/* Payment Methods Skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-900 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-6 h-6" />
                      <div className="text-left">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button Skeleton */}
          <Skeleton className="h-14 w-full rounded-xl" />

          {/* Usage Info Skeleton */}
          <div className="bg-gray-900 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
            <Skeleton className="h-5 w-24 mb-2" />
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const HistorySkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-900 rounded-lg p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] animate-shimmer-slide"></div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-6 w-12 mb-1" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const rechargeOptions = [
    { amount: 5, points: 50, popular: false, bonus: 0 },
    { amount: 10, points: 100, popular: true, bonus: 10 },
    { amount: 25, points: 250, popular: false, bonus: 50 },
    { amount: 50, points: 500, popular: false, bonus: 150 },
    { amount: 100, points: 1000, popular: false, bonus: 400 },
  ];

  const paymentMethods = [
    { id: 'usdt', name: 'USDT (TRC20)', icon: DollarSign, description: 'Fast & secure crypto payment' },
    { id: 'bank', name: 'Bank Transfer', icon: Gift, description: 'Manual verification required' },
  ];

  const getCategoryForIcon = (transaction) => {
    return transaction.category ||
      (transaction.status && `recharge_${transaction.status}`) ||
      transaction.type ||
      'unknown';
  };

  const getCategoryForColor = (transaction) => {
    return transaction.category ||
      (transaction.status && `recharge_${transaction.status}`) ||
      transaction.type ||
      'unknown';
  };

  const getTransactionIcon = (category) => {
    switch (category) {
      case 'recharge_approved':
      case 'usdt_recharge_approved':
      case 'recharge':
      case 'credit':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'recharge_request':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'recharge_rejected':
      case 'debit':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'recharge_cancelled':
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'gift':
      case 'award':
      case 'bonus':
        return <Gift className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTransactionColor = (category) => {
    switch (category) {
      case 'recharge_approved':
      case 'usdt_recharge_approved':
      case 'recharge':
      case 'award':
      case 'bonus':
      case 'credit':
        return 'text-green-400';
      case 'recharge_rejected':
      case 'debit':
        return 'text-red-400';
      case 'recharge_request':
      case 'recharge_cancelled':
      case 'pending':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const appBankDetails = {
    bankName: 'Example Bank',
    accountNumber: '1234567890',
    routingNumber: '0987654321',
    accountHolder: 'ClipStream Inc.',
    swiftCode: 'EXBKUS33',
    instructions: 'Please transfer the amount to this account and upload the transaction screenshot/receipt.'
  };

  const fetchPointsBalance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/points/balance`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPointsBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching points balance:', error);
    }
  };

  const fetchPointsHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = token ? JSON.parse(atob(token.split('.')[1])).id : null;

      const response = await fetch(`${API_BASE_URL}/recharges/history?userId=${userId}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const mappedHistory = (data.recharges || []).map(recharge => ({
          _id: recharge._id,
          transactionId: recharge.requestId,
          type: recharge.status === 'approved' ? 'credit' : 'pending',
          category: `recharge_${recharge.status}`,
          amount: recharge.pointsToAdd,
          balanceBefore: 0,
          balanceAfter: recharge.pointsToAdd,
          description: `${recharge.method.toUpperCase()} Recharge ${recharge.status}: $${recharge.amount}`,
          createdAt: recharge.requestedAt,
          metadata: {
            rechargeId: recharge._id,
            status: recharge.status,
            method: recharge.method
          }
        }));
        setHistory(mappedHistory);
      } else {
        console.error('Failed to fetch history:', await response.text());
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching points history:', error);
      setHistory([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPointsBalance(),
        fetchPointsHistory()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const calculatePoints = (amount) => {
    const basePoints = amount * 10;
    const option = rechargeOptions.find(opt => opt.amount === amount);
    const bonus = option?.bonus || 0;
    return basePoints + bonus;
  };

  const validateForm = () => {
    const errors = {};
    if (selectedPaymentMethod !== 'usdt') {
      if (!paymentDetails.fullName.trim()) {
        errors.fullName = 'Full name is required';
      }
      if (!paymentDetails.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(paymentDetails.email)) {
        errors.email = 'Please enter a valid email';
      }
      if (!paymentDetails.phone.trim()) {
        errors.phone = 'Phone number is required';
      }
    }
    if (selectedPaymentMethod === 'card') {
      if (!paymentDetails.cardNumber.trim()) {
        errors.cardNumber = 'Card number is required';
      }
      if (!paymentDetails.expiryDate.trim()) {
        errors.expiryDate = 'Expiry date is required';
      }
      if (!paymentDetails.cvv.trim()) {
        errors.cvv = 'CVV is required';
      }
      if (!paymentDetails.cardholderName.trim()) {
        errors.cardholderName = 'Cardholder name is required';
      }
      if (!paymentDetails.address.trim()) {
        errors.address = 'Billing address is required';
      }
      if (!paymentDetails.city.trim()) {
        errors.city = 'City is required';
      }
      if (!paymentDetails.zipCode.trim()) {
        errors.zipCode = 'ZIP code is required';
      }
    } else if (selectedPaymentMethod === 'paypal') {
      if (!paymentDetails.paypalEmail.trim()) {
        errors.paypalEmail = 'PayPal email is required';
      } else if (!/\S+@\S+\.\S+/.test(paymentDetails.paypalEmail)) {
        errors.paypalEmail = 'Please enter a valid PayPal email';
      }
    } else if (selectedPaymentMethod === 'bank') {
      if (!paymentDetails.transactionId.trim()) {
        errors.transactionId = 'Transaction ID/Reference is required';
      }
      if (!paymentDetails.transactionScreenshot) {
        errors.transactionScreenshot = 'Transaction screenshot is required';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setPaymentDetails(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentDetails(prev => ({ ...prev, transactionScreenshot: file }));
      if (validationErrors.transactionScreenshot) {
        setValidationErrors(prev => ({ ...prev, transactionScreenshot: '' }));
      }
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  const createUsdtOrder = async (amount) => {
    try {
      setRecharging(true);
      const response = await fetch(`${API_BASE_URL}/recharges/usdt/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount })
      });

      const data = await response.json();

      if (response.ok) {
        setUsdtPaymentData(data.data);
        setShowUsdtPayment(true);
        setPaymentStatus('pending');
        hasAlertedRef.current = false;

        const exp = new Date(data.data.expiresAt).getTime();
        const now = Date.now();
        const diff = Math.max(0, Math.floor((exp - now) / 1000));
        setCountdown(diff);

        if (timerInterval) clearInterval(timerInterval);
        const iv = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(iv);
              setPaymentStatus('expired');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerInterval(iv);

        startPaymentStatusCheck(data.data.orderId);
      } else {
        alert(data.errors?.[0]?.msg || data.msg || 'Failed to create USDT order');
      }
    } catch (error) {
      console.error('Error creating USDT order:', error);
      alert('Failed to create USDT payment order');
    } finally {
      setRecharging(false);
    }
  };

  const checkUsdtPayment = async (orderId) => {
    try {
      setCheckingPayment(true);
      const response = await fetch(`${API_BASE_URL}/recharges/usdt/check-payment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderId })
      });

      const data = await response.json();

      if (data.success && data.status === 'approved') {
        setPaymentStatus('approved');
        if (!hasAlertedRef.current) {
          alert('Payment confirmed! Points have been added to your account.');
          hasAlertedRef.current = true;
        }
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        await fetchPointsBalance();
        await fetchPointsHistory();
        resetForm();
        setActiveTab('history');
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (!hasAlertedRef.current) {
          alert('Order expired');
          hasAlertedRef.current = true;
        }
      } else {
        setPaymentStatus(data.status || 'pending');
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const startPaymentStatusCheck = (orderId) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(async () => {
      if (paymentStatus === 'approved' || paymentStatus === 'expired') {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        return;
      }
      await checkUsdtPayment(orderId);
    }, 10000);

    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (paymentStatus !== 'approved') {
        setPaymentStatus('expired');
        if (!hasAlertedRef.current) {
          alert('Order expired');
          hasAlertedRef.current = true;
        }
      }
    }, 15 * 60 * 1000);
  };

  const proceedToCheckout = () => {
    const amount = selectedAmount || parseFloat(customAmount);

    if (!amount || amount <= 0) {
      alert('Please select or enter a valid amount');
      return;
    }
    if (amount < 1) {
      alert('Minimum recharge amount is $1');
      return;
    }
    if (amount > 500) {
      alert('Maximum recharge amount is $500');
      return;
    }
    if (selectedPaymentMethod === 'usdt') {
      createUsdtOrder(amount);
    } else {
      setShowCheckout(true);
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setShowCheckout(false);
    setShowUsdtPayment(false);
    setUsdtPaymentData(null);
    setPaymentStatus('pending');
    setCountdown(0);
    if (timerInterval) clearInterval(timerInterval);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPaymentDetails({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      paypalEmail: '',
      transactionScreenshot: null,
      transactionId: '',
    });
    setValidationErrors({});
    hasAlertedRef.current = false;
  };

  // Loading screen with skeleton
  if (loading) {
    return <RechargeSkeleton />;
  }

  if (showUsdtPayment && usdtPaymentData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowUsdtPayment(false);
                  setUsdtPaymentData(null);
                  if (timerInterval) clearInterval(timerInterval);
                  if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                }}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">USDT Payment</h1>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-400">
                {usdtPaymentData.amount} USDT
              </div>
              <p className="text-xs text-gray-400">
                {usdtPaymentData.pointsToAdd.toLocaleString()} points
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto">
          <div className={`rounded-xl p-4 mb-6 ${paymentStatus === 'approved' ? 'bg-green-900/50 border border-green-500' :
              paymentStatus === 'expired' ? 'bg-red-900/50 border border-red-500' :
                'bg-yellow-900/50 border border-yellow-500'
            }`}>
            <div className="text-center">
              {paymentStatus === 'approved' ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-green-400">Payment Confirmed!</h3>
                  <p className="text-green-300">Points have been added to your account</p>
                </>
              ) : paymentStatus === 'expired' ? (
                <>
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-red-400">Order Expired</h3>
                  <p className="text-red-300">Please create a new order</p>
                </>
              ) : (
                <>
                  <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-yellow-400">Waiting for Payment</h3>
                  <p className="text-yellow-300">Send USDT to the address below</p>
                </>
              )}
            </div>
          </div>

          {paymentStatus === 'pending' && (
            <>
              <div className="bg-gray-900 rounded-xl p-4 mb-6 text-center">
                <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <QRCodeCanvas
                    value={`tron:${usdtPaymentData.walletAddress}?amount=${usdtPaymentData.amount}`}
                    size={180}
                    includeMargin={true}
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">Scan with your USDT wallet</p>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Wallet Address (TRC20)</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono break-all text-gray-300 flex-1">
                    {usdtPaymentData.walletAddress}
                  </p>
                  <button
                    onClick={() => copyToClipboard(usdtPaymentData.walletAddress)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </button>
                </div>
                {copyMsg && <p className="text-green-600 text-sm mt-1">{copyMsg}</p>}
              </div>

              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requested Amount:</span>
                    <span className="font-bold">{usdtPaymentData.originalAmount} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payable Amount:</span>
                    <span className="font-bold text-red-400">{usdtPaymentData.amount} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="font-bold">TRC20 (Tron)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Points:</span>
                    <span className="font-bold text-yellow-400">{usdtPaymentData.pointsToAdd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Order ID:</span>
                    <span className="font-mono text-sm">{usdtPaymentData.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expires in:</span>
                    <span className="font-bold">{formatTime(countdown)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-red-300 text-sm text-center">
                  ⚠️ Send exactly {usdtPaymentData.amount} USDT (otherwise payment won't be detected)
                </p>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>1. Send exactly <strong>{usdtPaymentData.amount} USDT</strong> to the wallet address above</p>
                  <p>2. Make sure to use the <strong>TRC20 network</strong></p>
                  <p>3. Payment will be confirmed automatically within 1-5 minutes</p>
                  <p>4. Points will be added to your account once confirmed</p>
                </div>
              </div>

              <button
                onClick={() => checkUsdtPayment(usdtPaymentData.orderId)}
                disabled={checkingPayment}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-6 flex items-center justify-center space-x-2"
              >
                {checkingPayment ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Check Payment Status</span>
                  </>
                )}
              </button>

              {usdtPaymentData.paymentUrl && (
                <a
                  href={usdtPaymentData.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold mb-6 flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Open in Wallet</span>
                </a>
              )}

              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-300 text-sm text-center">
                  ⚠️ Only send USDT on TRC20 network. Sending other tokens or using wrong network will result in loss of funds.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">Payment Details</h1>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-400">
                ${selectedAmount || customAmount}
              </div>
              <p className="text-xs text-gray-400">
                {calculatePoints(selectedAmount || parseFloat(customAmount)).toLocaleString()} points
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 mb-6">
            <div className="text-center text-white">
              <h3 className="text-lg font-bold mb-2">Order Summary</h3>
              <div className="flex justify-between items-center mb-2">
                <span>Amount:</span>
                <span className="font-bold">${selectedAmount || customAmount}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>Points:</span>
                <span className="font-bold text-yellow-300">
                  {calculatePoints(selectedAmount || parseFloat(customAmount)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Payment Method:</span>
                <span className="font-bold capitalize">{selectedPaymentMethod}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
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
                    value={paymentDetails.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.fullName ? 'border-red-500' : 'border-gray-700'
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
                    value={paymentDetails.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.email ? 'border-red-500' : 'border-gray-700'
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
                    value={paymentDetails.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.phone ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.phone && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {selectedPaymentMethod === 'card' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Card Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Cardholder Name"
                      value={paymentDetails.cardholderName}
                      onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.cardholderName ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.cardholderName && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.cardholderName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Card Number"
                      value={paymentDetails.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                      maxLength="19"
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.cardNumber ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.cardNumber && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.cardNumber}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={paymentDetails.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                        maxLength="5"
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.expiryDate ? 'border-red-500' : 'border-gray-700'
                          }`}
                      />
                      {validationErrors.expiryDate && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.expiryDate}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="CVV"
                        value={paymentDetails.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.cvv ? 'border-red-500' : 'border-gray-700'
                          }`}
                      />
                      {validationErrors.cvv && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.cvv}</p>
                      )}
                    </div>
                  </div>
                </div>

                <h4 className="text-md font-semibold mt-6 mb-4 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Billing Address
                </h4>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={paymentDetails.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.address ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.address && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="City"
                        value={paymentDetails.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.city ? 'border-red-500' : 'border-gray-700'
                          }`}
                      />
                      {validationErrors.city && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="ZIP Code"
                        value={paymentDetails.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.zipCode ? 'border-red-500' : 'border-gray-700'
                          }`}
                      />
                      {validationErrors.zipCode && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.zipCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="State/Province"
                      value={paymentDetails.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={paymentDetails.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'paypal' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  PayPal Information
                </h3>

                <div>
                  <input
                    type="email"
                    placeholder="PayPal Email Address"
                    value={paymentDetails.paypalEmail}
                    onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.paypalEmail ? 'border-red-500' : 'border-gray-700'
                      }`}
                  />
                  {validationErrors.paypalEmail && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.paypalEmail}</p>
                  )}
                </div>
              </div>
            )}

            {selectedPaymentMethod === 'bank' && (
              <div className="bg-gray-900 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2" />
                  Bank Transfer Information
                </h3>

                <div className="mb-6">
                  <h4 className="text-md font-semibold mb-2">Transfer to this account:</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p><strong>Bank Name:</strong> {appBankDetails.bankName}</p>
                    <p><strong>Account Number:</strong> {appBankDetails.accountNumber}</p>
                    <p><strong>Routing Number:</strong> {appBankDetails.routingNumber}</p>
                    <p><strong>Account Holder:</strong> {appBankDetails.accountHolder}</p>
                    <p><strong>SWIFT Code:</strong> {appBankDetails.swiftCode}</p>
                    <p className="text-gray-400">{appBankDetails.instructions}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Transaction ID/Reference"
                      value={paymentDetails.transactionId}
                      onChange={(e) => handleInputChange('transactionId', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${validationErrors.transactionId ? 'border-red-500' : 'border-gray-700'
                        }`}
                    />
                    {validationErrors.transactionId && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.transactionId}</p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Upload Transaction Screenshot</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="transaction-screenshot"
                      />
                      <label
                        htmlFor="transaction-screenshot"
                        className="cursor-pointer flex items-center space-x-2 p-3 bg-gray-800 border rounded-lg w-full text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <Upload className="w-5 h-5" />
                        <span>{paymentDetails.transactionScreenshot ? paymentDetails.transactionScreenshot.name : 'Choose file'}</span>
                      </label>
                    </div>
                    {validationErrors.transactionScreenshot && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.transactionScreenshot}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                // This would be your handleRecharge function
                alert('Recharge functionality would be implemented here');
              }}
              disabled={recharging}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              {recharging ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{selectedPaymentMethod === 'bank' ? 'Submitting Request...' : 'Processing Payment...'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>{selectedPaymentMethod === 'bank' ? 'Submit Recharge Request' : `Complete Payment - ${selectedAmount || customAmount}`}</span>
                </div>
              )}
            </button>

            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Lock className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Secure Payment</span>
              </div>
              <p className="text-xs text-gray-400">
                Your payment information is encrypted and secure. We never store your card details.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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

      <div className="sticky top-0 bg-black/95 backdrop-blur-lg border-b border-gray-800 z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Points</h1>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400">{pointsBalance.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400">Current Balance</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Star className="w-8 h-8 text-yellow-300" />
              <h2 className="text-3xl font-bold text-white">{pointsBalance.toLocaleString()}</h2>
            </div>
            <p className="text-purple-100">Available Points</p>
          </div>
        </div>

        <div className="flex bg-gray-900 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('recharge')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${activeTab === 'recharge'
                ? 'bg-pink-600 text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Recharge
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${activeTab === 'history'
                ? 'bg-pink-600 text-white'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            History
          </button>
        </div>

        {activeTab === 'recharge' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Amount</h3>
              <div className="grid grid-cols-1 gap-3">
                {rechargeOptions.map((option) => (
                  <button
                    key={option.amount}
                    onClick={() => {
                      setSelectedAmount(option.amount);
                      setCustomAmount('');
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all ${selectedAmount === option.amount
                        ? 'border-pink-500 bg-pink-600/20'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl font-bold">${option.amount}</span>
                          {option.popular && (
                            <span className="bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-medium">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">
                            {(option.points + option.bonus).toLocaleString()} points
                          </span>
                          {option.bonus > 0 && (
                            <span className="text-green-400 text-sm">
                              (+{option.bonus} bonus)
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedAmount === option.amount && (
                        <CheckCircle className="w-6 h-6 text-pink-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Or Enter Custom Amount</h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter amount (1-500)"
                />
              </div>
              {customAmount && (
                <div className="mt-2 flex items-center space-x-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">
                    You'll get {calculatePoints(parseFloat(customAmount)).toLocaleString()} points
                  </span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${selectedPaymentMethod === method.id
                          ? 'border-pink-500 bg-pink-600/20'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <IconComponent className="w-6 h-6" />
                          <div className="text-left">
                            <span className="text-sm font-medium block">{method.name}</span>
                            <span className="text-xs text-gray-400">{method.description}</span>
                          </div>
                        </div>
                        {selectedPaymentMethod === method.id && (
                          <CheckCircle className="w-5 h-5 text-pink-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={proceedToCheckout}
              disabled={!selectedAmount && !customAmount || recharging}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                {recharging ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {selectedPaymentMethod === 'usdt' ? 'Pay with USDT' : 'Proceed to Checkout'} - ${selectedAmount || customAmount || '0'}
                    </span>
                  </>
                )}
              </div>
            </button>

            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Points Usage</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Send virtual gifts to creators</li>
                <li>• Boost your videos for more visibility</li>
                <li>• Access premium features and filters</li>
                <li>• Support your favorite content creators</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {(!history || history.length === 0) ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No transaction history</p>
                <p className="text-gray-500">Your points transactions will appear here</p>
              </div>
            ) : (
              <HistorySkeleton />
            )}

            {history.length > 0 && (
              <div className="space-y-3">
                {history.map((transaction, index) => (
                  <div
                    key={transaction._id || transaction.transactionId || index}
                    className="bg-gray-900 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(getCategoryForIcon(transaction))}
                        <div>
                          <p className="font-medium">{transaction.description || transaction.categoryDisplay || 'Transaction'}</p>
                          <p className="text-sm text-gray-400">
                            {formatDate(transaction.createdAt || transaction.requestedAt)}
                          </p>
                          {transaction.transactionId && (
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {transaction.transactionId}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getTransactionColor(getCategoryForColor(transaction))}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount || transaction.pointsToAdd}
                        </p>
                        <p className="text-xs text-gray-400">points</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsRechargeScreen;
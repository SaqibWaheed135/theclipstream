import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, DollarSign, Star, Gift, History, CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, Calendar, Lock, AlertCircle, Loader2 } from 'lucide-react';

const PointsRechargeScreen = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('recharge');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe');
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');
  
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
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking'
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

  const paymentMethods = [
    { 
      id: 'stripe', 
      name: 'Credit/Debit Card', 
      icon: CreditCard,
      description: 'Visa, Mastercard, American Express',
      fees: '2.9% + $0.30'
    },
    { 
      id: 'paypal', 
      name: 'PayPal', 
      icon: DollarSign,
      description: 'Pay with your PayPal account',
      fees: '2.9% + $0.30'
    },
    { 
      id: 'apple', 
      name: 'Apple Pay', 
      icon: Star,
      description: 'Quick and secure',
      fees: '2.9% + $0.30'
    },
    { 
      id: 'bank', 
      name: 'Bank Transfer', 
      icon: Gift,
      description: 'Direct bank transfer',
      fees: '$0.50 flat fee'
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
    }
  };

  // Fetch recharge packages
  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payment/packages`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      } else {
        // Fallback to default packages if API fails
        setPackages([
          { _id: '1', amount: 5, points: 50, bonusPoints: 0, name: 'Starter Pack', isPopular: false },
          { _id: '2', amount: 10, points: 100, bonusPoints: 10, name: 'Popular Pack', isPopular: true },
          { _id: '3', amount: 25, points: 250, bonusPoints: 50, name: 'Value Pack', isPopular: false },
          { _id: '4', amount: 50, points: 500, bonusPoints: 150, name: 'Power Pack', isPopular: false },
          { _id: '5', amount: 100, points: 1000, bonusPoints: 400, name: 'Premium Pack', isPopular: false },
        ]);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      // Use fallback packages
      setPackages([
        { _id: '1', amount: 5, points: 50, bonusPoints: 0, name: 'Starter Pack', isPopular: false },
        { _id: '2', amount: 10, points: 100, bonusPoints: 10, name: 'Popular Pack', isPopular: true },
        { _id: '3', amount: 25, points: 250, bonusPoints: 50, name: 'Value Pack', isPopular: false },
        { _id: '4', amount: 50, points: 500, bonusPoints: 150, name: 'Power Pack', isPopular: false },
        { _id: '5', amount: 100, points: 1000, bonusPoints: 400, name: 'Premium Pack', isPopular: false },
      ]);
    }
  };

  // Fetch points history
  const fetchPointsHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/points/history`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching points history:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPointsBalance(),
        fetchPackages(),
        fetchPointsHistory()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  const calculatePoints = (amount, pkg = null) => {
    if (pkg) {
      return {
        basePoints: pkg.points,
        bonusPoints: pkg.bonusPoints || 0,
        totalPoints: pkg.points + (pkg.bonusPoints || 0)
      };
    }
    
    // Custom amount calculation
    const basePoints = amount * 10; // 1 dollar = 10 points
    let bonusPoints = 0;
    
    if (amount >= 100) bonusPoints = amount * 4;
    else if (amount >= 50) bonusPoints = amount * 3;
    else if (amount >= 25) bonusPoints = amount * 2;
    else if (amount >= 10) bonusPoints = amount * 1;
    
    return {
      basePoints,
      bonusPoints,
      totalPoints: basePoints + bonusPoints
    };
  };

  const validateForm = () => {
    const errors = {};
    
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

    if (selectedPaymentMethod === 'stripe') {
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
    } else if (selectedPaymentMethod === 'paypal') {
      if (!paymentDetails.paypalEmail.trim()) {
        errors.paypalEmail = 'PayPal email is required';
      }
    } else if (selectedPaymentMethod === 'bank') {
      if (!paymentDetails.bankName.trim()) {
        errors.bankName = 'Bank name is required';
      }
      if (!paymentDetails.accountNumber.trim()) {
        errors.accountNumber = 'Account number is required';
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
    if (error) setError('');
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const proceedToCheckout = () => {
    const amount = selectedPackage?.amount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      setError('Please select or enter a valid amount');
      return;
    }

    if (amount < 1) {
      setError('Minimum recharge amount is $1');
      return;
    }

    if (amount > 1000) {
      setError('Maximum recharge amount is $1000');
      return;
    }

    setError('');
    setShowCheckout(true);
  };

  const initializePayment = async () => {
    if (!validateForm()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const amount = selectedPackage?.amount || parseFloat(customAmount);
      
      const response = await fetch(`${API_BASE_URL}/payment/initialize`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount,
          packageId: selectedPackage?._id,
          paymentMethod: selectedPaymentMethod,
          userInfo: {
            fullName: paymentDetails.fullName,
            email: paymentDetails.email,
            phone: paymentDetails.phone,
            address: selectedPaymentMethod === 'stripe' ? {
              street: paymentDetails.address,
              city: paymentDetails.city,
              state: paymentDetails.state,
              zipCode: paymentDetails.zipCode,
              country: paymentDetails.country || 'US'
            } : null
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentTransaction(data.transaction);
        setPaymentData(data.paymentData);
        
        // Handle different payment methods
        if (selectedPaymentMethod === 'stripe') {
          await handleStripePayment(data.paymentData);
        } else if (selectedPaymentMethod === 'paypal') {
          await handlePayPalPayment(data.paymentData);
        } else {
          // For other methods, show confirmation
          await confirmPayment(data.transaction.id, { confirmed: true });
        }
      } else {
        setError(data.msg || 'Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      setError('Payment initialization failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStripePayment = async (paymentData) => {
    try {
      // In a real implementation, you would use Stripe.js here
      // For demo purposes, we'll simulate the payment flow
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful payment
      const mockPaymentResult = {
        paymentIntent: {
          status: 'succeeded',
          id: paymentData.paymentIntentId
        }
      };
      
      if (mockPaymentResult.paymentIntent.status === 'succeeded') {
        await confirmPayment(currentTransaction.id, {
          paymentIntentId: mockPaymentResult.paymentIntent.id,
          status: 'succeeded'
        });
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Stripe payment error:', error);
      setError('Payment failed. Please try again.');
    }
  };

  const handlePayPalPayment = async (paymentData) => {
    try {
      // In a real implementation, you would integrate with PayPal SDK
      // For demo purposes, we'll simulate the payment flow
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful PayPal payment
      await confirmPayment(currentTransaction.id, {
        paymentID: 'PAYPAL_PAYMENT_ID',
        payerID: 'PAYPAL_PAYER_ID'
      });
    } catch (error) {
      console.error('PayPal payment error:', error);
      setError('PayPal payment failed. Please try again.');
    }
  };

  const confirmPayment = async (transactionId, paymentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payment/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          transactionId,
          paymentData
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Payment successful
        setPointsBalance(data.transaction.newBalance);
        
        // Reset form
        setSelectedPackage(null);
        setCustomAmount('');
        setShowCheckout(false);
        setCurrentTransaction(null);
        setPaymentData(null);
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
          bankName: '',
          accountNumber: '',
          routingNumber: '',
          accountType: 'checking'
        });
        setValidationErrors({});
        
        // Refresh history and show success
        await fetchPointsHistory();
        setActiveTab('history');
        
        // Show success message
        alert(`Successfully recharged ${data.transaction.pointsAdded} points!`);
      } else {
        setError(data.msg || 'Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setError('Payment confirmation failed. Please contact support.');
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

  const getTransactionIcon = (category) => {
    switch (category) {
      case 'recharge':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'gift':
      case 'boost':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'reward':
        return <Gift className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTransactionColor = (type) => {
    return type === 'credit' ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-400">Loading points data...</p>
        </div>
      </div>
    );
  }

  if (showCheckout) {
    const amount = selectedPackage?.amount || parseFloat(customAmount);
    const pointsCalc = calculatePoints(amount, selectedPackage);
    
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Checkout Header */}
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
              <div className="text-lg font-bold text-yellow-400">${amount}</div>
              <p className="text-xs text-gray-400">
                {pointsCalc.totalPoints.toLocaleString()} points
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto">
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-6 mb-6">
            <div className="text-center text-white">
              <h3 className="text-lg font-bold mb-2">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Amount:</span>
                  <span className="font-bold">${amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Base Points:</span>
                  <span className="font-bold text-yellow-300">{pointsCalc.basePoints.toLocaleString()}</span>
                </div>
                {pointsCalc.bonusPoints > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Bonus Points:</span>
                    <span className="font-bold text-green-300">+{pointsCalc.bonusPoints.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-purple-300/30 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total Points:</span>
                    <span className="font-bold text-xl text-yellow-300">{pointsCalc.totalPoints.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Payment Method:</span>
                  <span className="font-bold capitalize">{paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
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
                    value={paymentDetails.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      validationErrors.fullName ? 'border-red-500' : 'border-gray-700'
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
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      validationErrors.email ? 'border-red-500' : 'border-gray-700'
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
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      validationErrors.phone ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                  {validationErrors.phone && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Specific Fields */}
            {selectedPaymentMethod === 'stripe' && (
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
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        validationErrors.cardholderName ? 'border-red-500' : 'border-gray-700'
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
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        validationErrors.cardNumber ? 'border-red-500' : 'border-gray-700'
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
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                          validationErrors.expiryDate ? 'border-red-500' : 'border-gray-700'
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
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                          validationErrors.cvv ? 'border-red-500' : 'border-gray-700'
                        }`}
                      />
                      {validationErrors.cvv && (
                        <p className="text-red-400 text-sm mt-1">{validationErrors.cvv}</p>
                      )}
                    </div>
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
                    className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      validationErrors.paypalEmail ? 'border-red-500' : 'border-gray-700'
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
                  Bank Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={paymentDetails.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        validationErrors.bankName ? 'border-red-500' : 'border-gray-700'
                      }`}
                    />
                    {validationErrors.bankName && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={paymentDetails.accountNumber}
                      onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        validationErrors.accountNumber ? 'border-red-500' : 'border-gray-700'
                      }`}
                    />
                    {validationErrors.accountNumber && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.accountNumber}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Complete Payment Button */}
            <button
              onClick={initializePayment}
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              {processing ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Payment...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Complete Payment - ${amount}</span>
                </div>
              )}
            </button>

            {/* Security Notice */}
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

      {/* Balance Card */}
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

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-900 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('recharge')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'recharge'
                ? 'bg-pink-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Recharge
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-pink-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            History
          </button>
        </div>

        {/* Recharge Tab */}
        {activeTab === 'recharge' && (
          <div className="space-y-6">
            {/* Preset Packages */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Package</h3>
              <div className="grid grid-cols-1 gap-3">
                {packages.map((pkg) => {
                  const pointsCalc = calculatePoints(pkg.amount, pkg);
                  return (
                    <button
                      key={pkg._id}
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setCustomAmount('');
                        setError('');
                      }}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        selectedPackage?._id === pkg._id
                          ? 'border-pink-500 bg-pink-600/20'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-bold">${pkg.amount}</span>
                            {pkg.isPopular && (
                              <span className="bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-medium">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 font-medium">
                              {pointsCalc.totalPoints.toLocaleString()} points
                            </span>
                            {pointsCalc.bonusPoints > 0 && (
                              <span className="text-green-400 text-sm">
                                (+{pointsCalc.bonusPoints.toLocaleString()} bonus)
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{pkg.name}</p>
                        </div>
                        {selectedPackage?._id === pkg._id && (
                          <CheckCircle className="w-6 h-6 text-pink-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Or Enter Custom Amount</h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPackage(null);
                    setError('');
                  }}
                  className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Enter amount (1-1000)"
                />
              </div>
              {customAmount && parseFloat(customAmount) > 0 && (
                <div className="mt-2 flex items-center space-x-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">
                    You'll get {calculatePoints(parseFloat(customAmount)).totalPoints.toLocaleString()} points
                  </span>
                  {calculatePoints(parseFloat(customAmount)).bonusPoints > 0 && (
                    <span className="text-green-400">
                      ({calculatePoints(parseFloat(customAmount)).bonusPoints.toLocaleString()} bonus)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedPaymentMethod(method.id);
                        setError('');
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-pink-500 bg-pink-600/20'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-6 h-6" />
                        <div className="text-left flex-1">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-gray-400">{method.description}</div>
                          <div className="text-xs text-gray-500">Fee: {method.fees}</div>
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

            {/* Proceed to Checkout Button */}
            <button
              onClick={proceedToCheckout}
              disabled={!selectedPackage && !customAmount}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>
                  Proceed to Checkout - ${selectedPackage?.amount || customAmount || '0'}
                </span>
              </div>
            </button>

            {/* Disclaimer */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Points Usage</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Send virtual gifts to creators</li>
                <li>• Boost your videos for more visibility</li>
                <li>• Access premium features and filters</li>
                <li>• Support your favorite content creators</li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="font-medium mb-2 text-pink-400">Security & Privacy</h5>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• All payments are processed through secure, encrypted connections</li>
                  <li>• We never store your card details on our servers</li>
                  <li>• All transactions are monitored for fraud protection</li>
                  <li>• Refunds available within 24 hours of purchase</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 text-lg mb-2">No transaction history</p>
                <p className="text-gray-500">Your points transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="bg-gray-900 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.category)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-400">
                            {formatDate(transaction.createdAt)}
                          </p>
                          {transaction.transactionId && (
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {transaction.transactionId}
                            </p>
                          )}
                          {transaction.metadata?.relatedTransaction && (
                            <p className="text-xs text-blue-400 mt-1">
                              Payment ID: {transaction.metadata.relatedTransaction.transactionId}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">points</p>
                        <div className="text-xs text-gray-500 mt-1">
                          Balance: {transaction.balanceAfter.toLocaleString()}
                        </div>
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
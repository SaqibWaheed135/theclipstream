import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, DollarSign, Star, Gift, History, CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, Calendar, Lock } from 'lucide-react';

const PointsRechargeScreen = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('recharge');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    // User Details
    fullName: '',
    email: '',
    phone: '',
    
    // Billing Address
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    
    // Card Details (for card payments)
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    
    // PayPal Details
    paypalEmail: '',
    
    // Bank Details
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

  // Predefined recharge amounts (in dollars)
  const rechargeOptions = [
    { amount: 5, points: 50, popular: false, bonus: 0 },
    { amount: 10, points: 100, popular: true, bonus: 10 },
    { amount: 25, points: 250, popular: false, bonus: 50 },
    { amount: 50, points: 500, popular: false, bonus: 150 },
    { amount: 100, points: 1000, popular: false, bonus: 400 },
  ];

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
    { id: 'paypal', name: 'PayPal', icon: DollarSign },
    { id: 'apple', name: 'Apple Pay', icon: Star },
    { id: 'bank', name: 'Bank Transfer', icon: Gift },
  ];

  // Fetch points balance
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

  // Fetch points history
  const fetchPointsHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/points/history`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
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
        fetchPointsHistory()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  const calculatePoints = (amount) => {
    const basePoints = amount * 10; // 1 dollar = 10 points
    const option = rechargeOptions.find(opt => opt.amount === amount);
    const bonus = option?.bonus || 0;
    return basePoints + bonus;
  };

  const validateForm = () => {
    const errors = {};
    
    // Common validations
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

    // Payment method specific validations
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
      
      // Address for card payments
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
      if (!paymentDetails.bankName.trim()) {
        errors.bankName = 'Bank name is required';
      }
      if (!paymentDetails.accountNumber.trim()) {
        errors.accountNumber = 'Account number is required';
      }
      if (!paymentDetails.routingNumber.trim()) {
        errors.routingNumber = 'Routing number is required';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setPaymentDetails(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
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

    setShowCheckout(true);
  };

  const handleRecharge = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields correctly');
      return;
    }

    const amount = selectedAmount || parseFloat(customAmount);
    setRecharging(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      const response = await fetch(`${API_BASE_URL}/users/points/recharge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount,
          paymentMethod: selectedPaymentMethod,
          paymentDetails: paymentDetails,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPointsBalance(data.newBalance);
        alert(`Successfully recharged ${data.pointsAdded} points!`);
        
        // Reset form
        setSelectedAmount(null);
        setCustomAmount('');
        setShowCheckout(false);
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
        
        // Refresh history
        fetchPointsHistory();
        
        // Switch to history tab to show the transaction
        setActiveTab('history');
      } else {
        alert(data.msg || 'Recharge failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during recharge:', error);
      alert('Recharge failed. Please try again.');
    } finally {
      setRecharging(false);
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

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'recharge':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'spend':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'award':
        return <Gift className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'recharge':
      case 'award':
        return 'text-green-400';
      case 'spend':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading points data...</p>
        </div>
      </div>
    );
  }

  if (showCheckout) {
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
          {/* Order Summary */}
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

                {/* Billing Address */}
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
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        validationErrors.address ? 'border-red-500' : 'border-gray-700'
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
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                          validationErrors.city ? 'border-red-500' : 'border-gray-700'
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
                        className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                          validationErrors.zipCode ? 'border-red-500' : 'border-gray-700'
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

                  <div>
                    <input
                      type="text"
                      placeholder="Routing Number"
                      value={paymentDetails.routingNumber}
                      onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                      className={`w-full p-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        validationErrors.routingNumber ? 'border-red-500' : 'border-gray-700'
                      }`}
                    />
                    {validationErrors.routingNumber && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.routingNumber}</p>
                    )}
                  </div>

                  <select
                    value={paymentDetails.accountType}
                    onChange={(e) => handleInputChange('accountType', e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="checking">Checking Account</option>
                    <option value="savings">Savings Account</option>
                  </select>
                </div>
              </div>
            )}

            {/* Complete Payment Button */}
            <button
              onClick={handleRecharge}
              disabled={recharging}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              {recharging ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Complete Payment - ${selectedAmount || customAmount}</span>
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
            {/* Preset Amounts */}
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
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      selectedAmount === option.amount
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

            {/* Custom Amount */}
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

            {/* Payment Methods */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-pink-500 bg-pink-600/20'
                          : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <IconComponent className="w-6 h-6" />
                        <span className="text-sm font-medium">{method.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proceed to Checkout Button */}
            <button
              onClick={proceedToCheckout}
              disabled={!selectedAmount && !customAmount}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-700 hover:to-purple-700 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>
                  Proceed to Checkout - ${selectedAmount || customAmount || '0'}
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
                    key={transaction._id || `${transaction.type}-${transaction.createdAt}`}
                    className="bg-gray-900 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
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
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
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
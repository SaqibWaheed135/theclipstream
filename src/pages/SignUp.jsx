import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png"; // Assuming logo.png exists in src/assets

// Load Google Identity Services script
const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve(window.google);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // Handle manual signup
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate form
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("https://theclipstream-backend.onrender.com/api/auth/signup", { 
        username, 
        email, 
        password 
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.msg || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in callback
  const handleGoogleResponse = async (response) => {
    setGoogleLoading(true);
    setError("");
    
    try {
      const idToken = response.credential;
      const res = await axios.post("https://theclipstream-backend.onrender.com/api/auth/google", { idToken });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      console.error("Google signup error:", err);
      setError(err.response?.data?.msg || "Google signup failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    const initializeGoogleSignIn = async () => {
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        console.warn("VITE_GOOGLE_CLIENT_ID not found in environment variables");
        return;
      }

      try {
        await loadGoogleScript();
        
        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false
          });
          
          const googleButtonDiv = document.getElementById("googleSignInDiv");
          if (googleButtonDiv) {
            googleButtonDiv.innerHTML = '';
            
            window.google.accounts.id.renderButton(googleButtonDiv, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "signup_with",
              shape: "rectangular",
              logo_alignment: "left"
            });
          }
        }
      } catch (error) {
        console.error("Failed to load Google Sign-In:", error);
        const googleButtonDiv = document.getElementById("googleSignInDiv");
        if (googleButtonDiv) {
          googleButtonDiv.innerHTML = `
            <div className="flex items-center justify-center w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed">
              <span className="text-sm">Google Sign-In unavailable</span>
            </div>
          `;
        }
      }
    };

    initializeGoogleSignIn();
  }, []);

  return (
    <div className="min-h-screen flex bg-black">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pink-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          {/* Logo from assets */}
          <div className="mb-8">
            <img src={logo} alt="ClipStream Logo" className="w-40 h-40 rounded-2xl shadow-2xl" />
          </div>
          
          <p className="text-xl text-center text-pink-100 max-w-md leading-relaxed">
            Join us! Create an account to start your creative journey with our powerful video editing platform.
          </p>
          
          {/* Decorative elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white bg-opacity-5 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-black px-6 py-12">
        <div className="w-full max-w-md bg-gray-900 rounded-lg p-8 shadow-xl">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={logo} alt="ClipStream Logo" className="w-20 h-20 rounded-xl mx-auto mb-4" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400">Join us today</p>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Google Sign-Up Button */}
          <div className="mb-6">
            <div 
              id="googleSignInDiv" 
              className={`${googleLoading ? 'opacity-50 pointer-events-none' : ''}`}
            ></div>
            {googleLoading && (
              <div className="flex items-center justify-center mt-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
                <span className="text-gray-400 text-sm ml-2">Creating account with Google...</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-900 text-gray-400">Or create with email</span>
            </div>
          </div>

          {/* Manual Signup Form */}
          <form className="space-y-5" onSubmit={handleSignup}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <input 
                id="username"
                type="text" 
                placeholder="Enter your username"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                disabled={loading}
                minLength={3}
                maxLength={30}
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input 
                id="email"
                type="email" 
                placeholder="Enter your email"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input 
                id="password"
                type="password" 
                placeholder="Enter your password"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={loading}
                minLength={6}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input 
                id="confirmPassword"
                type="password" 
                placeholder="Confirm your password"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                disabled={loading}
                minLength={6}
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Terms and Privacy */}
          <p className="text-xs text-gray-400 text-center mt-6">
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="text-pink-500 hover:text-pink-400">Terms</Link> and{" "}
            <Link to="/privacy" className="text-pink-500 hover:text-pink-400">Privacy Policy</Link>
          </p>

          {/* Login Link */}
          <p className="text-gray-400 text-center mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-pink-500 hover:text-pink-400 font-medium transition-colors">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
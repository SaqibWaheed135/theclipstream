import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

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
      const res = await axios.post("http://localhost:5000/api/auth/signup", { 
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
      const res = await axios.post("http://localhost:5000/api/auth/google", { idToken });
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
        // Load Google script
        await loadGoogleScript();
        
        if (window.google && window.google.accounts) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false
          });
          
          // Render the button
          const googleButtonDiv = document.getElementById("googleSignInDiv");
          if (googleButtonDiv) {
            // Clear any existing content
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
        // Show fallback button or error message
        const googleButtonDiv = document.getElementById("googleSignInDiv");
        if (googleButtonDiv) {
          googleButtonDiv.innerHTML = `
            <div class="flex items-center justify-center w-full p-3 border border-gray-600 rounded-lg bg-white text-black hover:bg-gray-50 transition-colors cursor-not-allowed opacity-50">
              <span class="text-sm">Google Sign-In unavailable</span>
            </div>
          `;
        }
      }
    };

    initializeGoogleSignIn();
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join us today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Google Sign-Up Button */}
        <div className="mb-6">
          <div 
            id="googleSignInDiv" 
            className={`${googleLoading ? 'opacity-50 pointer-events-none' : ''}`}
          ></div>
          {googleLoading && (
            <div className="flex items-center justify-center mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
              <span className="text-gray-400 text-sm ml-2">Creating account with Google...</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-black text-gray-400">Or create with email</span>
          </div>
        </div>

        {/* Manual Signup Form */}
        <form className="space-y-4" onSubmit={handleSignup}>
          <div>
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-pink-500 focus:outline-none transition-colors"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              disabled={loading}
              minLength={3}
              maxLength={30}
            />
          </div>
          
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-pink-500 focus:outline-none transition-colors"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>
          
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-pink-500 focus:outline-none transition-colors"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <div>
            <input 
              type="password" 
              placeholder="Confirm Password" 
              className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:border-pink-500 focus:outline-none transition-colors"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required 
              disabled={loading}
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        {/* Terms and Privacy */}
        <p className="text-xs text-gray-500 text-center mt-4">
          By creating an account, you agree to our{" "}
          <Link to="/terms" className="text-pink-500 hover:text-pink-400">Terms</Link> and{" "}
          <Link to="/privacy" className="text-pink-500 hover:text-pink-400">Privacy Policy</Link>
        </p>

        {/* Login Link */}
        <p className="text-gray-400 text-center mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-pink-500 hover:text-pink-400 transition-colors">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
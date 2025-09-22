import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://theclipstream-backend.onrender.com/api/admin/auth/getAd"; // ✅ your backend endpoint

const AdBanner = () => {
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isVisible, setVisible] = useState(true);

  useEffect(() => {
    fetchAds();

    // Fetch new ads every 40s
    const fetchInterval = setInterval(() => {
      fetchAds();
    }, 40000);

    return () => clearInterval(fetchInterval);
  }, []);

  useEffect(() => {
    if (ads.length === 0) return;

    // Cycle ads every 3s
    const cycleInterval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 3000);

    return () => clearInterval(cycleInterval);
  }, [ads.length]);

  const fetchAds = async () => {
    try {
      const res = await axios.get(API_URL);
      const fetchedAds = res.data.data;

      if (fetchedAds && fetchedAds.length > 0) {
        // sort by latest
        const sorted = fetchedAds.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setAds(sorted);
        setCurrentAdIndex(0);
      }
    } catch (err) {
      console.error("Failed to fetch ads:", err);
    }
  };

  if (ads.length === 0 || !isVisible) return null;

  const currentAd = ads[currentAdIndex];

  return (
    <div className="relative w-[85%] h-[90px] mx-auto my-2">
      {/* Ad link */}
      <a href={currentAd.adLink} target="_blank" rel="noopener noreferrer">
        <img
          src={currentAd.displayPhoto}
          alt={currentAd.title}
          className="w-full h-full rounded object-cover"
        />
      </a>

      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-1 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center"
      >
        ×
      </button>

      {/* Dots indicator */}
      {ads.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-1">
          {ads.map((_, index) => (
            <span
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentAdIndex
                  ? "bg-white"
                  : "bg-white/50"
              }`}
            ></span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdBanner;

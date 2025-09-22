import { useEffect } from "react";

const GoogleAd = ({ slot, style = { display: "block" }, format = "auto" }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("Adsense error", err);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client="ca-pub-8409467940178850"  // your publisher ID
      data-ad-slot={slot}                       // your ad slot ID
      data-ad-format={format}
      data-full-width-responsive="true"
    ></ins>
  );
};

export default GoogleAd;

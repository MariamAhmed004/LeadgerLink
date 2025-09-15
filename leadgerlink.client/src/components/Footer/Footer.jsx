import React from "react";

const Footer = () => (
  <footer className="bg-primary text-white text-center py-3 mt-auto">
    <div className="container">
      <span>&copy; {new Date().getFullYear()} LeadgerLink. All rights reserved.</span>
    </div>
  </footer>
);

export default Footer;

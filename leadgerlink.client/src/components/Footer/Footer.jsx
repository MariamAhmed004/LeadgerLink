import React from "react";
import { FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";

const Footer = () => (
    <footer className="bg-primary text-white pt-4 pb-3 mt-5">
        <div className="container">
            <div className="row">
                {/* Branding and Social */}
                <div className="col-md-4 mb-4 mb-md-0">
                    <div className="d-flex align-items-center mb-2">
                        <img
                            src="/LeadgerLink_Logo.png"
                            alt="LedgerLink Logo"
                            style={{ width: "32px", marginRight: "8px" }}
                        />
                        
                    </div>
                    <p className="small">
                        Connect your business with its management securely and efficiently.
                        <br />
                        Every detail is preserved, every action traceable.
                        <br />
                        Minimize waste, maximize clarity.
                    </p>
                    <div className="d-flex gap-3">
                        <a
                            href="https://instagram.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white"
                            aria-label="Instagram"
                        >
                            <FaInstagram size={20} />
                        </a>
                        <a
                            href="https://linkedin.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white"
                            aria-label="LinkedIn"
                        >
                            <FaLinkedin size={20} />
                        </a>
                        <a
                            href="https://youtube.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white"
                            aria-label="YouTube"
                        >
                            <FaYoutube size={20} />
                        </a>
                    </div>
                </div>

                {/* Information Links */}
                <div className="col-md-4 mb-4 mb-md-0">
                    <h5>INFORMATION</h5>
                    <ul className="list-unstyled">
                        <li>
                            <a href="/faqs" className="text-white text-decoration-none">
                                FAQs
                            </a>
                        </li>
                        <li>
                            <a href="/privacy-policy" className="text-white text-decoration-none">
                                Privacy Policy
                            </a>
                        </li>
                        <li>
                            <a href="/terms-of-service" className="text-white text-decoration-none">
                                Terms of Service
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div className="col-md-4">
                    <h5>CONTACT US</h5>
                    <address className="small">
                        XXX Manama Avenue
                        <br />
                        Manama, MA 1203
                        <br />
                        Bahrain
                        <br />
                        (+973) 17XX XXXX
                        <br />
                        <a href="mailto:info@ledgerlink.com" className="text-white text-decoration-none">
                            info@ledgerlink.com
                        </a>
                    </address>
                </div>
            </div>

            <hr className="border-light mt-4" />
            <div className="text-center small">© 2025 LedgerLink. All rights reserved.</div>
        </div>
    </footer>
);

export default Footer;
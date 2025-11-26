import React from "react";
import { FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";
import { Link } from 'react-router-dom';

const Footer = () => (
    <footer className="bg-primary text-white pt-4 pb-3 mt-5">
        <div className="container">
            <div className="row">
                {/* Branding and Social */}
                <div className="col-md-4 mb-4 mb-md-0">
                    <div className="d-flex align-items-center justify-content-center mb-2 ">
                        <img
                            src="/LeadgerLink_Logo.png"
                            alt="LedgerLink Logo"
                            style={{ width: "45%" }}
                        />
                    </div>
                    <p className="small text-start ms-4">
                        Connect your business with its management securely and efficiently.
                        <br />
                        Every detail is preserved, every action traceable.
                        <br />
                        Minimize waste, maximize clarity.
                    </p>
                    <div className="d-flex gap-3 justify-content-center">
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
                    <h6 className="my-4">INFORMATION</h6>
                    <ul className="list-unstyled small d-flex flex-column gap-2">
                        <li>
                            <Link
                                to="/faqs"
                                className="text-white text-decoration-underline fst-italic fw-light"
                                style={{ fontStyle: "italic" }}
                            >
                                FAQs
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/privacypolicy"
                                className="text-white text-decoration-underline fst-italic fw-light"
                                style={{ fontStyle: "italic" }}
                            >
                                Privacy Policy
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="/termsofservice"
                                className="text-white text-decoration-underline fst-italic fw-light"
                                style={{ fontStyle: "italic" }}
                            >
                                Terms of Service
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div className="col-md-4">
                    <h6 className="my-4">CONTACT US</h6>
                    <address className="small " style={{ fontStyle: "italic" }}>
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
            <div className="text-center small">&copy; 2025 LedgerLink. All rights reserved.</div>
        </div>
    </footer>
);

export default Footer;
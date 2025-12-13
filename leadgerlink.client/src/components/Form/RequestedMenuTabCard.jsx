import React, { useEffect, useState } from "react";
import { FaRegImage } from "react-icons/fa";

/*
  RequestedMenuTabCard
  - Lightweight card variant used only for the requested-items TabbedMenu in the
    InventoryTransferApprove page.
  - Displays: name, description, image, and quantity requested.
  - Intentionally does NOT include selection controls, price or available stock.
*/
const RequestedMenuTabCard = ({ data }) => {
  const {
    name,
    description,
    imageUrl,
    quantity = 0, // quantity requested (display-only)
  } = data;

  const [imgSrc, setImgSrc] = useState(imageUrl || "");
  const [imgFailed, setImgFailed] = useState(!imageUrl);

  useEffect(() => {
    setImgSrc(imageUrl || "");
    setImgFailed(!imageUrl);
  }, [imageUrl]);

  const handleImgError = () => setImgFailed(true);

  return (
    <div className="bg-white rounded-3 p-3 border border-light" style={{ width: "100%" }}>
      <div className="row g-3 align-items-center">
        <div className="col-12 col-md-3">
          <div className="d-flex align-items-center justify-content-center bg-light rounded-2" style={{ minHeight: 80 }}>
            {!imgFailed && imgSrc ? (
              <img
                src={imgSrc}
                alt={name}
                className="img-fluid"
                style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6 }}
                onError={handleImgError}
              />
            ) : (
              <div className="p-2">
                <FaRegImage size={36} className="text-muted" />
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="text-start">
            <div className="fw-semibold" style={{ fontSize: "1rem", whiteSpace: "normal" }}>{name}</div>
            {description && <div className="text-muted small mt-1">{description}</div>}
          </div>
        </div>

        <div className="col-12 col-md-3 text-md-end text-start">
          <div className="small text-secondary">Quantity Requested</div>
          <div className="fw-semibold">{Number(quantity || 0)}</div>
        </div>
      </div>
    </div>
  );
};

export default RequestedMenuTabCard;
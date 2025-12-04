import React from "react";
import { FaExchangeAlt } from "react-icons/fa";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";

/*
  InventoryTransferView (static)
  - Rewritten to use the shared `DetailViewWithMetadata` template.
  - Static placeholder values (no image) matching the provided mockup.
*/

const InventoryTransferView = () => {
  const headerProps = {
    icon: <FaExchangeAlt size={28} />,
    title: "View Transfer",
    descriptionLines: [],
    actions: [],
  };

  const detail = {
    title: "ID XX: Transfer Date (From Store A to Store B)",
    rows: [
      { label: "Requester", value: "Measured in ...." },
      { label: "Requested From", value: "36XX12XX" },
      { label: "Status", value: "IT" },
      { label: "Requested At", value: "CR3323" },
      { label: "Received At", value: "XX-XX-XXXX" },
      { label: "Requested By", value: "www.organization.com" },
      { label: "Approved By", value: "XX-XX-XXXX" },
      { label: "Driver Name", value: "XX-XX-XXXX" },
      { label: "Driver Email", value: "www.organization.com" },
      {
        label: "Notes",
        value:
          "Transferred 12 packs of premium Angus beef (Item #B204) from Riffa Branch to Adliya Branch due to increased weekend reservations. Approved by operations manager on Nov 13, 2025. Items packed and temperature-verified by kitchen staff at origin. ETA: Nov 14, 2025. Receiving team notified for cold storage prep. No issues reported during dispatch.",
      },
    ],
  };

  const metadata = {
    title: "About This Transfer",
    rows: [
      { label: "Created At", value: "XX-XX-XXXX" },
      { label: "Created By", value: "XX Employee name" },
      { label: "Updated At", value: "XX-XX-XXXX" },
    ],
  };

  return <DetailViewWithMetadata headerProps={headerProps} detail={detail} metadata={metadata} actions={[]} />;
};

export default InventoryTransferView;
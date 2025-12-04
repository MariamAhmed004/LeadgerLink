import React from "react";
import { FaStore, FaPencilAlt } from "react-icons/fa";
import DetailViewWithMetadata from "../Templates/DetailViewWithMetadata";

/*
  Static Store view (sample)
  - Uses the shared DetailViewWithMetadata template.
  - Static placeholder values match the provided mockup.
*/

const StoreView = () => {
  const headerProps = {
    icon: <FaStore size={28} />,
    title: "View Store",
    descriptionLines: [],
    actions: [],
  };

  const detail = {
    title: "ID XX: Store Name",
    rows: [
      { label: "Location", value: "Measured in ...." },
      { label: "Branch Manager", value: "36XX12XX" },
      { label: "Email", value: "store@example.com" },
      { label: "Phone", value: "CR3323" },
      { label: "Opening Date", value: "XX-XX-XXXX" },
      { label: "Operational Status", value: "Operational" },
      { label: "Working Hours", value: "09:00 - 22:00" },
    ],
  };

  const metadata = {
    title: "About This Store",
    rows: [
      { label: "Created At", value: "XX-XX-XXXX" },
      { label: "Updated At", value: "XX-XX-XXXX" },
    ],
  };

  const actions = [
    {
      icon: <FaPencilAlt />,
      title: "Edit Store Record",
      route: "/stores/edit/XX",
    },
  ];

  return (
    <DetailViewWithMetadata
      headerProps={headerProps}
      detail={detail}
      metadata={metadata}
      actions={actions}
    />
  );
};

export default StoreView;
import React from "react";
import { FaBoxOpen, FaPencilAlt } from "react-icons/fa";
import DetailViewWithImage from "../Templates/DetailViewWithImage";

/*
  ProductView (static sample)
  - Uses the existing DetailViewWithImage template.
  - Static placeholder values matching the provided mockup.
*/

const ProductView = () => {
  const headerProps = {
    icon: <FaBoxOpen size={28} />,
    title: "View Product",
    descriptionLines: [],
    actions: [],
  };

  const detail = {
    title: "ID XX: Product Name",
    rows: [
      { label: "Cost", value: "XX.XXX BHD" },
      { label: "VAT", value: "10% VAT" },
      { label: "Selling Price", value: "XX.XXX BHD" },
      { label: "Is the product a Recipe", value: "Yes / No" },
      {
        label: "Item of Product",
        // present as a link-like text to match mockup
        value: <a href="#" className="text-decoration-underline">Recipe Name / Product Name</a>,
      },
      {
        label: "Product Description",
        value: (
          <div>
            <div>Recipe Description / Product Description</div>
          </div>
        ),
      },
    ],
  };

  const metadata = {
    title: "About This Product",
    rows: [
      { label: "Created At", value: "XX-XX-XXXX" },
      { label: "Created By", value: "XX Employee name" },
      { label: "Updated At", value: "XX-XX-XXXX" },
    ],
  };

  const actions = [
    {
      icon: <FaPencilAlt />,
      title: "Edit Product Record",
      route: "/products/edit/XX",
    },
  ];

    return <DetailViewWithImage headerProps={headerProps} detail={detail} metadataUnderImage={metadata} actions={actions} />;
};

export default ProductView;
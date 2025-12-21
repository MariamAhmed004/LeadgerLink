import React, { useEffect, useState } from "react";
import {  FaPencilAlt } from "react-icons/fa";
import { useParams } from "react-router-dom";
import DetailViewWithImage from "../Templates/DetailViewWithImage";
import { BiSolidPackage } from "react-icons/bi";

/*
  ProductView (data-backed)
  Summary:
  - Fetches and displays details for a single product using GET /api/products/{id}.
  - Shows main detail rows (cost, VAT, price, description), image and metadata
    indicating whether the product is a recipe and its linked item.
*/

// --------------------------------------------------
// STATE / HOOKS
// --------------------------------------------------
const ProductView = () => {
  const { id } = useParams();
  // loading flag while fetching
  const [loading, setLoading] = useState(true);
  // error message shown on failure
  const [error, setError] = useState("");
  // fetched product DTO
  const [product, setProduct] = useState(null);

  // --------------------------------------------------
  // EFFECT: load product by id
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setError("Missing product id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Server returned ${res.status}`);
        }

        const json = await res.json();
        if (!mounted) return;
        setProduct(json);
      } catch (ex) {
        console.error("Failed to load product", ex);
        if (mounted) setError(ex?.message || "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  // --------------------------------------------------
  // PREPARE VIEW PROPS
  // --------------------------------------------------
  const headerProps = {
      icon: <BiSolidPackage size={55} />,
    title: product ? `Product ${product.productId}` : "View Product",
    descriptionLines: []
  };

  // edit action (routes to edit page when product loaded)
  const actions = [
    { icon: <FaPencilAlt />, title: 'Edit Product', route: product ? `/products/edit/${product.productId}` : `/products` }
  ];

  // --------------------------------------------------
  // RENDER: loading / error / not found handling
  // --------------------------------------------------
  if (loading) {
    return <DetailViewWithImage headerProps={headerProps} detail={{ title: 'Loading...', rows: [] }} metadataUnderImage={{ title: '', rows: [] }} actions={actions} />;
  }

  if (error) {
    return <DetailViewWithImage headerProps={headerProps} detail={{ title: 'Error', rows: [{ label: 'Message', value: error }] }} metadataUnderImage={{ title: '', rows: [] }} actions={actions} />;
  }

  if (!product) {
    return <DetailViewWithImage headerProps={headerProps} detail={{ title: 'Not found', rows: [] }} metadataUnderImage={{ title: '', rows: [] }} actions={actions} />;
  }

  // --------------------------------------------------
  // DATA PROCESSING: derive links and labels
  // --------------------------------------------------
  // Determine whether product points to recipe or inventory item
  const isRecipe = product.isRecipe === true;

  // link for item of product (recipe or inventory item)
  const itemLink = isRecipe && product.recipeId ? `/recipes/${product.recipeId}` : (!isRecipe && product.inventoryItemId ? `/inventory-items/${product.inventoryItemId}` : null);
  const itemLabel = isRecipe ? (product.recipeName || `Recipe #${product.recipeId}`) : (product.inventoryItemName || `Item #${product.inventoryItemId}`);

  // main detail rows for the primary panel
  const detail = {
    title: `ID ${product.productId}: ${product.productName}`,
    rows: [
      { label: 'Cost', value: product.costPrice ? `BHD ${Number(product.costPrice).toFixed(3)}` : '' },
      { label: 'VAT', value: product.vatCategoryName ? product.vatCategoryName : '' },
      { label: 'Selling Price', value: product.sellingPrice ? `BHD ${Number(product.sellingPrice).toFixed(3)}` : '' },
      { label: 'Product Description', value: product.description || '' }
    ]
  };

    const image = {
        url: product.imageUrl || "",
        alt: product.productName || `recipe ${product.productId}`
    };

  // metadata shown under the image (is recipe, item link)
  const metadataUnderImage = {
    title: 'Product Info',
    rows: [
      { label: 'Is the product a Recipe', value: isRecipe ? 'Yes' : 'No' },
      { label: 'Item of Product', value: itemLink ? (<a href={itemLink} className="text-decoration-underline">{itemLabel}</a>) : 'N/A' }
    ]
  };

    return <DetailViewWithImage headerProps={headerProps} detail={detail} metadataUnderImage={metadataUnderImage} actions={actions} image={image} />;
};

export default ProductView;
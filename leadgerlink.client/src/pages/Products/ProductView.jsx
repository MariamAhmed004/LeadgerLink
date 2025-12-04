import React, { useEffect, useState } from "react";
import { FaBoxOpen, FaPencilAlt } from "react-icons/fa";
import { useParams } from "react-router-dom";
import DetailViewWithImage from "../Templates/DetailViewWithImage";

/*
  ProductView (data-backed)
  - Fetches product detail via repository endpoint
  - Moves "Is recipe" and "Item of product" into metadataUnderImage
  - Detail table shows cost/VAT/price/description
*/

const ProductView = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);

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

  const headerProps = {
    icon: <FaBoxOpen size={28} />,
    title: product ? `Product ${product.productId}` : "View Product",
    descriptionLines: []
  };

  const actions = [
    { icon: <FaPencilAlt />, title: 'Edit Product', route: product ? `/products/edit/${product.productId}` : `/products` }
  ];

  if (loading) {
    return <DetailViewWithImage headerProps={headerProps} detail={{ title: 'Loading...', rows: [] }} metadataUnderImage={{ title: '', rows: [] }} actions={actions} />;
  }

  if (error) {
    return <DetailViewWithImage headerProps={headerProps} detail={{ title: 'Error', rows: [{ label: 'Message', value: error }] }} metadataUnderImage={{ title: '', rows: [] }} actions={actions} />;
  }

  if (!product) {
    return <DetailViewWithImage headerProps={headerProps} detail={{ title: 'Not found', rows: [] }} metadataUnderImage={{ title: '', rows: [] }} actions={actions} />;
  }

  // Determine whether product points to recipe or inventory item
  const isRecipe = product.isRecipe === true;

  // link for item of product
  const itemLink = isRecipe && product.recipeId ? `/recipes/${product.recipeId}` : (!isRecipe && product.inventoryItemId ? `/inventory-items/${product.inventoryItemId}` : null);
  const itemLabel = isRecipe ? (product.recipeName || `Recipe #${product.recipeId}`) : (product.inventoryItemName || `Item #${product.inventoryItemId}`);

  const detail = {
    title: `ID ${product.productId}: ${product.productName}`,
    rows: [
      { label: 'Cost', value: product.costPrice ? `BHD ${Number(product.costPrice).toFixed(3)}` : '' },
      { label: 'VAT', value: product.vatCategoryId ? `VAT category #${product.vatCategoryId}` : '' },
      { label: 'Selling Price', value: product.sellingPrice ? `BHD ${Number(product.sellingPrice).toFixed(3)}` : '' },
      { label: 'Product Description', value: product.description || '' }
    ]
  };

  const metadataUnderImage = {
    title: 'Product Info',
    rows: [
      { label: 'Is the product a Recipe', value: isRecipe ? 'Yes' : 'No' },
      { label: 'Item of Product', value: itemLink ? (<a href={itemLink} className="text-decoration-underline">{itemLabel}</a>) : 'N/A' }
    ]
  };

  return <DetailViewWithImage headerProps={headerProps} detail={detail} metadataUnderImage={metadataUnderImage} actions={actions} />;
};

export default ProductView;
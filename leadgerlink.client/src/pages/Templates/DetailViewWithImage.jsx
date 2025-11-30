import React from "react";
import PageHeader from "../../components/Listing/PageHeader";
import DetailTable from "../../components/Listing/DetailTable";
import MetadataTable from "../../components/Listing/MetadataTable";
import DetailPageAction from "../../components/Listing/DetailPageAction";

/*
 Props:
 - headerProps: object passed to PageHeader (icon, title, descriptionLines, actions)
 - detail: { title, rows }  -> the main detail table (60%)
 - image: { url, alt, placeholder } -> shown in right column
 - metadataUnderImage: { title, rows } -> shown under the image (in right column)
 - actions: array for DetailPageAction (displayed below everything)
*/
const DetailViewWithImage = ({
  headerProps = {},
  detail = { title: "", rows: [] },
  image = { url: "", alt: "" },
  metadataUnderImage = { title: "", rows: [] },
  actions = []
}) => {
  return (
    <div className="container py-5">
      <PageHeader {...headerProps} />

      <div className="row g-4">
        {/* Left: detail table (60%) */}
        <div className="col-md-7">
          <DetailTable title={detail.title} rows={detail.rows} />
        </div>

        {/* Right: image placeholder on top, metadata below */}
        <div className="col-md-5">
          <div className="card mb-3" style={{ border: "none", background: "transparent" }}>
            <div className="card-body p-0 text-center">
              {image && image.url ? (
                <img
                  src={image.url}
                  alt={image.alt ?? "image"}
                  style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 8 }}
                />
              ) : (
                <div
                  className="detail-image-placeholder"
                  style={{ width: "100%", height: 220, display: "inline-block" }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* metadata under image */}
          <MetadataTable title={metadataUnderImage.title} rows={metadataUnderImage.rows} />
        </div>
      </div>

      {/* Actions - full width row below everything (horizontal for image page) */}
      <div className="row">
        <div className="col-12">
          <DetailPageAction actions={actions.length ? actions : headerProps.actions ?? []} orientation="horizontal" />
        </div>
      </div>
    </div>
  );
};

export default DetailViewWithImage;
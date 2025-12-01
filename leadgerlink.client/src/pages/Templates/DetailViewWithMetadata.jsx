import React from "react";
import PageHeader from "../../components/Listing/PageHeader";
import DetailTable from "../../components/Listing/DetailTable";
import MetadataTable from "../../components/Listing/MetadataTable";
import DetailPageAction from "../../components/Listing/DetailPageAction";

/*
 Props:
 - headerProps: object passed to PageHeader (icon, title, descriptionLines, actions)
 - detail: { title, rows }  -> rows: [{ label, value }]
 - metadata: { title, rows } -> rows: [{ label, value }]
 - actions: array for DetailPageAction (if not provided headerProps.actions can be used)
*/
const DetailViewWithMetadata = ({
  headerProps = {},
  detail = { title: "", rows: [] },
  metadata = { title: "", rows: [] },
  actions = []
}) => {
  const footerActions = actions.length ? actions : headerProps.actions ?? [];

  return (
    <div className="container py-5">
      <PageHeader {...headerProps} />

      {/* Main detail table (full width) */}
      <DetailTable title={detail.title} rows={detail.rows} />

      {/* Row: metadata (60%) + actions (40%) */}
      <div className="row align-items-start">
        <div className="col-md-7">
          <MetadataTable title={metadata.title} rows={metadata.rows} />
        </div>

        <div className="col-md-5 d-flex align-items-start justify-content-center">
          {/* Keep actions visually aligned; use vertical stacking for non-image page */}
          <div style={{ width: "100%", maxWidth: 420 }}>
                      <DetailPageAction actions={footerActions} orientation="vertical" align="center" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailViewWithMetadata;
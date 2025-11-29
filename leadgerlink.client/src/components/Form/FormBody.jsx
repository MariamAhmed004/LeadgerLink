import React from "react";

/*
  Generic form body wrapper.
  - If `plain` is true the form renders without card/background/shadow.
*/
const FormBody = ({ onSubmit, children, className = "", plain = false }) => {
  if (plain) {
    return (
      <form onSubmit={onSubmit} className={className}>
        {children}
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="card shadow-sm border-light">
        <div className="card-body">{children}</div>
      </div>
    </form>
  );
};

export default FormBody;
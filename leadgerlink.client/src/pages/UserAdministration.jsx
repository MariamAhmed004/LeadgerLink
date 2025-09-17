import React, { useState } from "react";

const initialUsers = [
  { id: 1, name: "Alice Smith", email: "alice@example.com", role: "Admin" },
  { id: 2, name: "Bob Johnson", email: "bob@example.com", role: "User" },
  { id: 3, name: "Charlie Lee", email: "charlie@example.com", role: "User" },
];

const UserAdministration = () => {
  const [users, setUsers] = useState(initialUsers);

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-primary">User Administration</h2>
      <table className="table table-bordered table-hover">
        <thead className="table-primary">
          <tr>
            <th scope="col">#</th>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <th scope="row">{user.id}</th>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <button className="btn btn-sm btn-outline-primary mx-1" disabled>Edit</button>
                <button className="btn btn-sm btn-outline-danger mx-1" disabled>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add user functionality can be implemented here */}
    </div>
  );
};

export default UserAdministration;
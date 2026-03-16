import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      <ul>
        <li><Link to="/admin/blog">Manage Blog</Link></li>
        <li><Link to="/admin/services">Manage Services</Link></li>
        <li><Link to="/admin/faqs">Manage FAQs</Link></li>
      </ul>
    </div>
  );
};

export default AdminDashboard;

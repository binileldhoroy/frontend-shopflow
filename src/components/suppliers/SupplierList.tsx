import React from 'react';
import { Supplier } from '../../types/supplier.types';
import { Edit2, Trash2, Inbox, CheckCircle, XCircle } from 'lucide-react';

interface SupplierListProps {
  suppliers: Supplier[];
  loading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete?: (supplier: Supplier) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({
  suppliers,
  loading,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No suppliers found</p>
      </div>
    );
  }

  return (
    <div className="table-container flex-1 overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact Person</th>
            <th>Phone</th>
            <th>City</th>
            <th>GSTIN</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td>
                <strong>{supplier.name}</strong>
                {supplier.email && (
                  <div className="text-xs text-gray-500">{supplier.email}</div>
                )}
              </td>
              <td>{supplier.contact_person || '-'}</td>
              <td>{supplier.phone}</td>
              <td>{supplier.city}</td>
              <td>{supplier.gstin || '-'}</td>
              <td>
                {supplier.is_active ? (
                  <span className="badge badge-success flex items-center gap-1 w-fit">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="badge badge-secondary flex items-center gap-1 w-fit">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </td>
              <td>
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline-primary text-sm"
                    onClick={() => onEdit(supplier)}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {onDelete && (
                    <button
                      className="btn btn-outline-danger text-sm"
                      onClick={() => onDelete(supplier)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupplierList;

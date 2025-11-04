import React, { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

const BreakGlassAccess = ({ patientId, onAccessGranted, onCancel }) => {
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBreakGlass = async () => {
    if (justification.trim().length < 20) {
      toast.error('Justification must be at least 20 characters');
      return;
    }

    try {
      setLoading(true);
      await onAccessGranted(justification);
      toast.success('Emergency access granted');
    } catch (error) {
      toast.error('Failed to grant emergency access');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-10 w-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Emergency Access Required
          </h3>
          <p className="text-sm text-gray-600">
            You're requesting break glass access to patient records
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Warning:</strong> This access will be logged and reviewed by administration. Only use in genuine emergency situations.
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Justification * (minimum 20 characters)
          </label>
          <textarea
            rows="4"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Patient arrived unconscious with severe allergic reaction. Need to check allergy history before administering medication..."
            required
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {justification.length} / 20 characters
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleBreakGlass}
            disabled={justification.trim().length < 20 || loading}
            className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Granting Access...' : 'Grant Emergency Access'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakGlassAccess;

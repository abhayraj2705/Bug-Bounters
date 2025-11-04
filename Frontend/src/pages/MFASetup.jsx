import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Copy, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const MFASetup = () => {
  const { setupMFA, enableMFA, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.mfaEnabled) {
      initMFASetup();
    } else {
      // MFA already enabled, show step 3 (success)
      setStep(3);
    }
  }, []);

  const initMFASetup = async () => {
    try {
      setLoading(true);
      const data = await setupMFA();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
    } catch (error) {
      console.error('MFA setup failed:', error);
      if (error.response?.status === 400 && error.response?.data?.message === 'MFA is already enabled') {
        toast.info('MFA is already enabled for your account');
        setStep(3); // Show success page
      } else {
        toast.error('Failed to initialize MFA setup');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await enableMFA(verificationCode);
      setStep(3);
    } catch (error) {
      toast.error('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    const allCodes = backupCodes.join('\n');
    navigator.clipboard.writeText(allCodes);
    toast.success('All backup codes copied!');
  };

  const downloadBackupCodes = () => {
    const text = `EHR System - MFA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes in a safe place!`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mfa-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded!');
  };

  if (user?.mfaEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Shield className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            MFA Already Enabled
          </h2>
          <p className="text-gray-600 mb-6">
            Two-factor authentication is active on your account.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>

            <div className="text-center mb-8">
              <Shield className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Enable Two-Factor Authentication
              </h2>
              <p className="text-gray-600">
                Scan the QR code with your authenticator app
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  {qrCode && (
                    <img 
                      src={qrCode} 
                      alt="MFA QR Code" 
                      className="w-64 h-64 border-4 border-indigo-100 rounded-lg"
                    />
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-3">
                    <code className="text-sm font-mono text-gray-800">
                      {secret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(secret, 'secret')}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      {copiedCode === 'secret' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    📱 Recommended Authenticator Apps:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Google Authenticator</li>
                    <li>• Microsoft Authenticator</li>
                    <li>• Authy</li>
                    <li>• 1Password</li>
                  </ul>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  I've Scanned the Code →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Shield className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Verify Your Code
              </h2>
              <p className="text-gray-600">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-300 rounded-lg py-4 focus:border-indigo-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={verificationCode.length !== 6 || loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Enable MFA'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-gray-600 hover:text-gray-800"
              >
                ← Back to QR Code
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-8">
              <Check className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                MFA Enabled Successfully!
              </h2>
              <p className="text-gray-600">
                Save these backup codes in a safe place
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Important:</strong> Store these codes securely. You can use them if you lose access to your authenticator app. Each code can only be used once.
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">Backup Codes ({backupCodes.length})</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={copyAllCodes}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy All
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white border border-gray-300 rounded-lg p-3"
                  >
                    <code className="text-sm font-mono text-gray-800">
                      {code}
                    </code>
                    <button
                      onClick={() => copyToClipboard(code, index)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      {copiedCode === index ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : 
                                     user.role === 'doctor' ? '/doctor/dashboard' : 
                                     '/nurse/dashboard')}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetup;

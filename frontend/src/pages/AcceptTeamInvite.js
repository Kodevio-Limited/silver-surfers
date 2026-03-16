import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { acceptTeamInvitation, getInvitationDetails, getMe } from '../api';

const AcceptTeamInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in URL.');
      setLoading(false);
      return;
    }

    // Check authentication and load invitation details
    const initInvitation = async () => {
      try {
        // Check if user is authenticated
        const userResult = await getMe();
        const authenticated = !userResult.error;
        setIsAuthenticated(authenticated);
        
        if (authenticated && userResult.email) {
          setCurrentUserEmail(userResult.email.toLowerCase());
        }

        // Fetch invitation details
        const inviteDetails = await getInvitationDetails(token);
        
        if (inviteDetails.error) {
          setError(inviteDetails.error);
          setLoading(false);
          return;
        }

        setInvitationDetails(inviteDetails);

        // If not authenticated, redirect to signup with invite context
        if (!authenticated) {
          // Store invite token in localStorage to preserve it through auth flow
          localStorage.setItem('pendingInviteToken', token);
          localStorage.setItem('pendingInviteEmail', inviteDetails.invitedEmail);
          
          // Redirect to signup page with email hint
          navigate(`/signup?invite=${token}&email=${encodeURIComponent(inviteDetails.invitedEmail)}`);
          return;
        }

        // If authenticated but email doesn't match the invitation
        if (authenticated && userResult.email && 
            userResult.email.toLowerCase() !== inviteDetails.invitedEmail.toLowerCase()) {
          setError(`This invitation is for ${inviteDetails.invitedEmail}. You are logged in as ${userResult.email}. Please log out and create an account or log in with ${inviteDetails.invitedEmail}.`);
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Init invitation error:', err);
        setError('Failed to load invitation details.');
        setLoading(false);
      }
    };

    initInvitation();
  }, [token, navigate]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setError('No invitation token found.');
      return;
    }

    // Double-check email match
    if (invitationDetails && currentUserEmail && 
        currentUserEmail !== invitationDetails.invitedEmail.toLowerCase()) {
      setError(`Email mismatch. This invitation is for ${invitationDetails.invitedEmail}.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await acceptTeamInvitation(token);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        
        // Clear stored invite data
        localStorage.removeItem('pendingInviteToken');
        localStorage.removeItem('pendingInviteEmail');
        
        // Redirect to subscription page after 3 seconds
        setTimeout(() => {
          navigate('/subscription');
        }, 3000);
      }
    } catch (err) {
      setError('Failed to accept invitation. Please try again.');
      console.error('Accept invitation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.setItem('pendingInviteToken', token);
    if (invitationDetails) {
      localStorage.setItem('pendingInviteEmail', invitationDetails.invitedEmail);
    }
    navigate(`/signup?invite=${token}&email=${encodeURIComponent(invitationDetails?.invitedEmail || '')}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6">
              <svg className="animate-spin h-16 w-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              {isAuthenticated && invitationDetails && (
                <button
                  onClick={handleLogout}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Log Out & Continue with {invitationDetails.invitedEmail}
                </button>
              )}
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Team!</h1>
            <p className="text-gray-600 mb-6">
              You have successfully joined the SilverSurfers team. You now have access to all team features and will share the subscription benefits.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Redirecting to your subscription dashboard...
            </p>
            <button
              onClick={() => navigate('/subscription')}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-green-950 via-teal-950 to-cyan-900 pt-24 pb-10">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Invitation</h1>
            <p className="text-gray-600 mb-2">
              You've been invited to join a SilverSurfers team!
            </p>
            {invitationDetails && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Team Owner:</strong> {invitationDetails.teamOwnerEmail}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Plan:</strong> {invitationDetails.planName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Invited Email:</strong> {invitationDetails.invitedEmail}
                </p>
              </div>
            )}
          </div>

          <div className="mb-8">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">What you'll get access to:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Website accessibility audits
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Detailed accessibility reports
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Shared team usage limits
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleAcceptInvitation}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accepting Invitation...
                </>
              ) : (
                'Accept Invitation'
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            By accepting this invitation, you'll be added to the team and gain access to shared subscription benefits.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptTeamInvite;

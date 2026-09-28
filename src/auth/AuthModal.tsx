import React from 'react';
import { useAuth } from './AuthContext';
import { soundEngine } from '../audio/soundEngine';
import { X, ShieldCheck, AlertCircle, Sparkles, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  journalTitle?: string;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  journalTitle = 'MY JOURNAL',
  onClose,
}) => {
  const { signInWithGoogle, authState, authError, isConfigured, clearAuthError } = useAuth();

  if (!isOpen) return null;

  const handleSignIn = async () => {
    soundEngine.playClaspClick();
    await signInWithGoogle();
  };

  const isAuthenticating = authState === 'authenticating';

  return (
    <div className="antique-modal-backdrop" onClick={onClose}>
      <div 
        className="antique-modal-card auth-modal-card" 
        style={{ maxWidth: '440px', textAlign: 'center', position: 'relative' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={() => {
            clearAuthError();
            onClose();
          }}
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Embossed Provenance Emblem */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #D5B766 0%, #B58B3C 70%, #75492B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.6)',
            color: '#170D08'
          }}>
            <Sparkles size={22} />
          </div>
        </div>

        {/* Journal Title Header */}
        <div style={{ 
          fontFamily: 'var(--font-classical)', 
          fontSize: '11px', 
          letterSpacing: '0.24em', 
          color: 'var(--c-brass-antique)', 
          textTransform: 'uppercase',
          marginTop: '6px'
        }}>
          Personal Chronicle
        </div>

        <h2 style={{ 
          fontFamily: 'Cinzel, Georgia, serif', 
          fontSize: '24px', 
          fontWeight: 700,
          color: 'var(--c-leather-rich)', 
          letterSpacing: '0.08em',
          margin: '4px 0 10px',
          textTransform: 'uppercase'
        }}>
          {journalTitle}
        </h2>

        <p style={{ 
          fontFamily: 'var(--font-heading)', 
          fontStyle: 'italic', 
          fontSize: '19px', 
          color: '#382014', 
          lineHeight: 1.4,
          marginBottom: '26px' 
        }}>
          "Continue your story."
        </p>

        {/* Display Error Message If Any */}
        {authError && (
          <div style={{
            background: 'rgba(109, 36, 36, 0.1)',
            border: '1px solid rgba(109, 36, 36, 0.3)',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} color="#8B2525" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#5A1818', fontFamily: 'var(--font-serif)' }}>
              {authError}
            </div>
          </div>
        )}

        {/* If Supabase is Not Yet Configured in .env */}
        {!isConfigured ? (
          <div style={{
            background: 'rgba(181, 139, 60, 0.12)',
            border: '1px dashed var(--c-brass-antique)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-leather-rich)', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
              <KeyRound size={15} color="var(--c-brass-antique)" />
              <span>Connect Your Supabase Project</span>
            </div>
            <p style={{ fontSize: '12px', color: '#75492B', lineHeight: 1.5, margin: 0 }}>
              To enable cloud persistence and Google authentication, create a free project at <strong>supabase.com</strong>, run the migration in <code>supabase/schema.sql</code>, and add your keys to <code>.env</code>:
            </p>
            <pre style={{
              background: '#2A1F17',
              color: '#FFCF8A',
              padding: '8px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              marginTop: '10px',
              overflowX: 'auto',
              fontFamily: 'monospace'
            }}>
{`VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...`}
            </pre>
          </div>
        ) : (
          /* Google Sign In Button */
          <div style={{ marginBottom: '22px' }}>
            <button
              type="button"
              className="google-auth-btn"
              onClick={handleSignIn}
              disabled={isAuthenticating}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '30px',
                border: '1px solid rgba(181, 139, 60, 0.45)',
                background: 'linear-gradient(180deg, #FDFBF7 0%, #EFE3C8 100%)',
                color: '#2A1F17',
                fontFamily: 'var(--font-classical)',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                cursor: isAuthenticating ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.15), inset 0 1px 1px #FFF',
                transition: 'all 0.25s ease'
              }}
            >
              {/* Google Brand G SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.43l4.03-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{isAuthenticating ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        )}

        {/* Private Privacy Assurance */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'var(--font-serif)',
          fontSize: '12px',
          color: '#75492B',
          opacity: 0.9,
          borderTop: '1px solid rgba(181, 139, 60, 0.25)',
          paddingTop: '14px'
        }}>
          <ShieldCheck size={16} color="var(--c-brass-antique)" />
          <span>Your journal is private to your account.</span>
        </div>
      </div>
    </div>
  );
};
